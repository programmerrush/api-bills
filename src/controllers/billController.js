const Bill = require("../models/Bill");
const Company = require("../models/Company");

// Helper: ensure the requester is allowed to operate on this company
function isAuthorizedForCompany(reqUser, companyId) {
  if (!reqUser) return false;
  if (reqUser.role === "admin" || reqUser.role === "super") return true;
  if (!reqUser.company) return false;
  return String(reqUser.company) === String(companyId);
}

exports.getHistoricalBills = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!isAuthorizedForCompany(req.user, companyId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const match = { company: companyId };

    // optional date range
    if (req.query.startDate || req.query.endDate) {
      match.createdAt = {};
      if (req.query.startDate) match.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) match.createdAt.$lte = new Date(req.query.endDate);
    }

    const bills = await Bill.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Bill.countDocuments(match);

    res.status(200).json({ data: bills, meta: { total, page, limit } });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.createBill = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!isAuthorizedForCompany(req.user, companyId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // ensure company exists
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    const { jsonObj, paymentStatus, amount, meta } = req.body;
    if (!jsonObj) return res.status(400).json({ message: "jsonObj is required" });

    const bill = await Bill.create({
      company: companyId,
      jsonObj,
      paymentStatus: paymentStatus || "pending",
      amount: amount || null,
      meta: meta || null,
    });

    res.status(201).json({ message: "Bill created", bill });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.updateBillPayment = async (req, res) => {
  try {
    const { companyId, billId } = req.params;
    if (!isAuthorizedForCompany(req.user, companyId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { paymentStatus, paid, paymentDate, amount, meta } = req.body;

    const bill = await Bill.findOne({ _id: billId, company: companyId });
    if (!bill) return res.status(404).json({ message: "Bill not found for this company" });

    if (paymentStatus !== undefined) bill.paymentStatus = paymentStatus;
    if (paid !== undefined) bill.paid = paid;
    if (paymentDate !== undefined) bill.paymentDate = paymentDate ? new Date(paymentDate) : null;
    if (amount !== undefined) bill.amount = amount;
    if (meta !== undefined) bill.meta = meta;

    await bill.save();

    res.status(200).json({ message: "Bill updated", bill });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get a single bill by company and bill id
exports.getBill = async (req, res) => {
  try {
    const { companyId, billId } = req.params;

    if (!isAuthorizedForCompany(req.user, companyId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const bill = await Bill.findOne({ _id: billId, company: companyId }).lean();
    if (!bill) return res.status(404).json({ message: "Bill not found for this company" });

    return res.status(200).json({ bill });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get bill by companyId and year-month (open bill)
// Route: GET /api/v1/bill/:companyId/open/:year/:month
exports.getBillOpen = async (req, res) => {
  try {
    const { companyId, year, month } = req.params;

    // if (!isAuthorizedForCompany(req.user, companyId)) {
    //   return res.status(403).json({ message: "Forbidden" });
    // }

    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      return res.status(400).json({ message: "Invalid year or month" });
    }

    // Build possible match shapes inside jsonObj or meta
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    const query = {
      company: companyId,
      $or: [
        { 'jsonObj.year': y, 'jsonObj.month': m },
        { 'jsonObj.billingPeriod.year': y, 'jsonObj.billingPeriod.month': m },
        { 'jsonObj.billing_period.year': y, 'jsonObj.billing_period.month': m },
        { 'meta.year': y, 'meta.month': m },
        { createdAt: { $gte: start, $lt: end } },
      ],
    };

    // Try to find one bill matching the period
    const bill = await Bill.findOne(query).lean();
    if (!bill) return res.status(404).json({ message: 'Bill not found for the specified period' });

    return res.status(200).json({ bill });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Delete a bill by company and bill id
exports.deleteBill = async (req, res) => {
  try {
    const { companyId, billId } = req.params;

    if (!isAuthorizedForCompany(req.user, companyId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const bill = await Bill.findOneAndDelete({ _id: billId, company: companyId });
    if (!bill) return res.status(404).json({ message: "Bill not found for this company" });

    return res.status(200).json({ message: "Bill deleted successfully", billId: bill._id });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Return distinct jsonObj top-level keys used across all historical bills for a company
exports.getBillParams = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!isAuthorizedForCompany(req.user, companyId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const agg = await Bill.aggregate([
      { $match: { company: require('mongoose').Types.ObjectId(companyId) } },
      { $project: { kv: { $objectToArray: "$jsonObj" } } },
      { $unwind: "$kv" },
      { $group: { _id: null, keys: { $addToSet: "$kv.k" } } },
      { $project: { _id: 0, keys: 1 } },
    ]);

    const keys = agg.length ? agg[0].keys : [];
    res.status(200).json({ keys });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get partial / computed bill details by caseId (1–5)
// Route: GET /api/v1/bill/:companyId/open/:year/:month/case/:caseId
exports.getBillCaseDetails = async (req, res) => {
  try {
    const { companyId, year, month, caseId } = req.params;

    // Enable auth if needed
    // if (!isAuthorizedForCompany(req.user, companyId)) {
    //   return res.status(403).json({ message: "Forbidden" });
    // }

    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const c = parseInt(caseId, 10);

    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      return res.status(400).json({ message: "Invalid year or month" });
    }

    if (![1, 2, 3, 4, 5].includes(c)) {
      return res.status(400).json({ message: "Invalid caseId. Use 1–5." });
    }

    // Same logic as getBillOpen
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    const query = {
      company: companyId,
      $or: [
        { "jsonObj.year": y, "jsonObj.month": m },
        { "jsonObj.billingPeriod.year": y, "jsonObj.billingPeriod.month": m },
        { "jsonObj.billing_period.year": y, "jsonObj.billing_period.month": m },
        { "meta.year": y, "meta.month": m },
        { createdAt: { $gte: start, $lt: end } }
      ]
    };

    const bill = await Bill.findOne(query).lean();
    if (!bill) {
      return res
        .status(404)
        .json({ message: "Bill not found for the specified period" });
    }

    const j = (bill.jsonObj && bill.jsonObj.fields) || {};
    const meta = bill.meta || {};

    const toNum = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };

    let data;

    switch (c) {
      // case 1 = pf
      // parameters = billed_pf
      case 1: {
        const billed_pf = toNum(j.billed_pf);
        data = { billed_pf };
        break;
      }

      // case 2 = consumption trend
      // parameters = energy_charges divided by consumption_rate
      // here: consumption_rate = total_consumption_rate_per_units
      case 2: {
        const energy_charges = toNum(j.energy_charges);
        const consumption_rate = toNum(j.total_consumption_rate_per_units);
        const total_units = toNum(j.total_consumption_units);

        const derived_units =
          energy_charges != null && consumption_rate && consumption_rate !== 0
            ? energy_charges / consumption_rate
            : null;

        data = {
          energy_charges,
          consumption_rate,    // total_consumption_rate_per_units
          total_units,         // total_consumption_units (raw from bill)
          derived_units        // energy_charges / rate  (kWh approx.)
        };
        break;
      }

      // case 3 = incentives
      // parameters = bcr,icr,excess_demand,total_amount
      // mapping:
      //  bcr  -> bulk_consumption_rebate
      //  icr  -> incremental_consumption_rebate
      //  excess_demand -> charges_for_excess_demand
      //  total_amount  -> total_bill_amount_rounded
      case 3: {
        const bcr = toNum(j.bulk_consumption_rebate);
        const icr = toNum(j.incremental_consumption_rebate);
        const excess_demand = toNum(j.charges_for_excess_demand);
        const total_amount =
          toNum(j.total_bill_amount_rounded) ??
          toNum(j.total_current_bill);

        data = {
          bcr,
          icr,
          excess_demand,
          total_amount
        };
        break;
      }

      // case 4 = demand details
      // parameters = contract_demand, recorded_demand, billed_demand, 75_contract_demand
      // mapping:
      //  contract_demand      -> contract_demand_kva
      //  recorded_demand      -> recorder_max_demand
      //  billed_demand        -> billed_demand_kva
      //  75_contract_demand   -> demand_75pct_kva
      case 4: {
        const contract_demand = toNum(j.contract_demand_kva);
        const recorded_demand = toNum(j.recorder_max_demand);
        const billed_demand = toNum(j.billed_demand_kva);
        const seventy_five_contract_demand = toNum(j.demand_75pct_kva);

        data = {
          contract_demand,
          recorded_demand,
          billed_demand,
          seventy_five_contract_demand
        };
        break;
      }

      // case 5 = bill components
      // parameters = energy_charges,wheeling_charges,demand_charges,electricity_duty,tax_on_sale
      // mapping:
      //  wheeling_charges  -> wheeling_charge
      //  tax_on_sale       -> computed from total_consumption_units & tax_on_sale_rate_psu
      case 5: {
        const energy_charges = toNum(j.energy_charges);
        const wheeling_charges = toNum(j.wheeling_charge);
        const demand_charges = toNum(j.demand_charges);
        const electricity_duty = toNum(j.electricity_duty);

        const total_units = toNum(j.total_consumption_units);
        const tax_rate_psu = toNum(j.tax_on_sale_rate_psu);

        // tax_on_sale_rate_psu = paise per unit → convert to ₹:
        const tax_on_sale =
          total_units != null && tax_rate_psu != null
            ? (total_units * tax_rate_psu) / 100 // divide by 100 to go paise → ₹
            : null;

        data = {
          energy_charges,
          wheeling_charges,
          demand_charges,
          electricity_duty,
          tax_on_sale,
          // extra context if you need on FE:
          total_units,
          tax_rate_psu
        };
        break;
      }

      default:
        return res.status(400).json({ message: "Invalid caseId" });
    }

    return res.status(200).json({
      companyId,
      year: y,
      month: m,
      caseId: c,
      data
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
