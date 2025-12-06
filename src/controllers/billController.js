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

    // FIXED: Look for bill_month and bill_year in various locations within the bill data
    const query = {
      company: companyId,
      $or: [
        // Check in jsonObj fields
        { 'jsonObj.bill_year': y, 'jsonObj.bill_month': m },
        { 'jsonObj.year': y, 'jsonObj.month': m },
        
        // Also check in jsonObj.fields if that's where your data is stored
        { 'jsonObj.fields.bill_year': y, 'jsonObj.fields.bill_month': m },
        { 'jsonObj.fields.year': y, 'jsonObj.fields.month': m },
        
        // Check in billingPeriod object
        { 'jsonObj.billingPeriod.year': y, 'jsonObj.billingPeriod.month': m },
        { 'jsonObj.billing_period.year': y, 'jsonObj.billing_period.month': m },
        
        // Alternative field names
        { 'jsonObj.billing_year': y, 'jsonObj.billing_month': m },
        { 'jsonObj.period_year': y, 'jsonObj.period_month': m },
        
        // Check in meta field
        { 'meta.bill_year': y, 'meta.bill_month': m },
        { 'meta.year': y, 'meta.month': m }
      ]
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
const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];


exports.getBillCaseDetails = async (req, res) => {
  try {
    const { companyId, year, caseId } = req.params;
    const y = parseInt(year, 10);
    const c = parseInt(caseId, 10);

    if (!Number.isFinite(y)) {
      return res.status(400).json({ message: "Invalid year" });
    }

    if (![1, 2, 3, 4, 5,6].includes(c)) {
      return res.status(400).json({ message: "Invalid caseId. Use 1–6." });
    }

    // Prepare an empty data array for all months
    const monthsData = [];
    for (let month = 1; month <= 12; month++) {
      const start = new Date(y, month - 1, 1); // Start date for the month
      const end = new Date(y, month, 1); // End date for the month

      // Query to fetch data for the given month
      const query = {
        company: companyId,
        $or: [
          { "jsonObj.year": y, "jsonObj.month": month },
          { "jsonObj.billingPeriod.year": y, "jsonObj.billingPeriod.month": month },
          { "jsonObj.billing_period.year": y, "jsonObj.billing_period.month": month },
          { "meta.year": y, "meta.month": month },
          { createdAt: { $gte: start, $lt: end } }
        ]
      };

      const bill = await Bill.findOne(query).lean();

      // Add month data based on the caseId
      let data = { month: MONTH_SHORT[month - 1] }; // Use short month name (JAN, FEB, etc.)

      if (bill) {
        const j = bill.jsonObj?.fields || {};

        const toNum = (v) => {
          const n = parseFloat(v);
          return Number.isFinite(n) ? n : null;
        };

        switch (c) {
          case 1: { // Power Factor (case 1)
            const billed_pf = toNum(j.billed_pf);
            data = { month: MONTH_SHORT[month - 1], billed_pf: billed_pf != null ? billed_pf : null };
            break;
          }

          case 2: { // Consumption Trend (case 2)
            const energy_charges = toNum(j.energy_charges);
            const consumption_rate = toNum(j.total_consumption_rate_per_units);
            const total_units = toNum(j.total_consumption_units);
            const derived_units =
              energy_charges != null && consumption_rate && consumption_rate !== 0
                ? energy_charges / consumption_rate
                : null;

            data = {
              month: MONTH_SHORT[month - 1],
              energy_charges,
              consumption_rate,
              total_units,
              derived_units
            };
            break;
          }

          case 3: { // Incentives (case 3)
            const bcr = toNum(j.bulk_consumption_rebate);
            const icr = toNum(j.incremental_consumption_rebate);
            const excess_demand = toNum(j.charges_for_excess_demand);
            const total_amount =
              toNum(j.total_bill_amount_rounded) ?? toNum(j.total_current_bill);

            data = {
              month: MONTH_SHORT[month - 1],
              bcr,
              icr,
              excess_demand,
              total_amount
            };
            break;
          }

          case 4: { // Demand Details (case 4)
            const contract_demand = toNum(j.contract_demand_kva);
            const recorded_demand = toNum(j.recorder_max_demand);
            const billed_demand = toNum(j.billed_demand_kva);
            const seventy_five_contract_demand = toNum(j.demand_75pct_kva);

            data = {
              month: MONTH_SHORT[month - 1],
              contract_demand,
              recorded_demand,
              billed_demand,
              seventy_five_contract_demand
            };
            break;
          }

          case 5: { // Bill Components (case 5)
            const energy_charges = toNum(j.energy_charges);
            const wheeling_charges = toNum(j.wheeling_charge);
            const demand_charges = toNum(j.demand_charges);
            const electricity_duty = toNum(j.electricity_duty);
            const total_units = toNum(j.total_consumption_units);
            const tax_rate_psu = toNum(j.tax_on_sale_rate_psu);

            const tax_on_sale =
              total_units != null && tax_rate_psu != null
                ? (total_units * tax_rate_psu) / 100 // convert paise to ₹
                : null;

            data = {
              month: MONTH_SHORT[month - 1],
              energy_charges,
              wheeling_charges,
              demand_charges,
              electricity_duty,
              tax_on_sale,
              total_units,
              tax_rate_psu
            };
            break;
          }

          case 6: { // Total Bill & Consumption (NEW case 6)
            const total_bill_amount_rounded = toNum(j.total_bill_amount_rounded);
            const total_consumption_units = toNum(j.total_consumption_units);

            data = {
              month: MONTH_SHORT[month - 1],
              total_bill_amount_rounded,
              total_consumption_units
            };
            break;
          }

          default:
            return res.status(400).json({ message: "Invalid caseId" });
        }
      } else {
        // If no data found for that month, return null values for the relevant caseId
        switch (c) {
          case 1: // Power Factor (case 1)
            data = { month: MONTH_SHORT[month - 1], billed_pf: null };
            break;

          case 2: // Consumption Trend (case 2)
            data = {
              month: MONTH_SHORT[month - 1],
              energy_charges: null,
              consumption_rate: null,
              total_units: null,
              derived_units: null
            };
            break;

          case 3: // Incentives (case 3)
            data = {
              month: MONTH_SHORT[month - 1],
              bcr: null,
              icr: null,
              excess_demand: null,
              total_amount: null
            };
            break;

          case 4: // Demand Details (case 4)
            data = {
              month: MONTH_SHORT[month - 1],
              contract_demand: null,
              recorded_demand: null,
              billed_demand: null,
              seventy_five_contract_demand: null
            };
            break;

          case 5: // Bill Components (case 5)
            data = {
              month: MONTH_SHORT[month - 1],
              energy_charges: null,
              wheeling_charges: null,
              demand_charges: null,
              electricity_duty: null,
              tax_on_sale: null,
              total_units: null,
              tax_rate_psu: null
            };
            break;

          case 6: // Total Bill & Consumption (NEW case 6)
            data = {
              month: MONTH_SHORT[month - 1],
              total_bill_amount_rounded: null,
              total_consumption_units: null
            };
            break;
          

          default:
            return res.status(400).json({ message: "Invalid caseId" });
        }
      }

      monthsData.push(data); // Add the data for the current month
    }

    return res.status(200).json({
      companyId,
      year: y,
      caseId: c,
      data: monthsData
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

