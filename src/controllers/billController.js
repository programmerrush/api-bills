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
