const express = require("express");
const {
  getHistoricalBills,
  createBill,
  updateBillPayment,
  getBillParams,
  getBill,
  getBillOpen,
  deleteBill,
  getBillCaseDetails
} = require("../../controllers/billController");
const authenticateToken = require("../../middlewares/auth");
const { checkRoles } = require("../../middlewares/checkRole");

const router = express.Router();

// List historical bills for a company (supports page, limit, startDate, endDate)
// GET /api/v1/bill/:companyId/historical
router.get("/:companyId/historical", authenticateToken, getHistoricalBills);

// Get distinct parameter keys used in jsonObj for a company's bills
// GET /api/v1/bill/:companyId/params
router.get("/:companyId/params", authenticateToken, getBillParams);

// Create a bill for a company. Body must include `jsonObj`.
// POST /api/v1/bill/:companyId
router.post("/:companyId", authenticateToken, createBill);

// Update a bill's payment status
// PATCH /api/v1/bill/:companyId/:billId/payment
// Restrict to accounts/admin roles for payment updates
router.patch(
  "/:companyId/:billId/payment",
  authenticateToken,
  checkRoles("68f0500fe931769b9f25b1db", "super_admin", "admin", "accounts"),
  updateBillPayment
);

// Get a single bill by id
// GET /api/v1/bill/:companyId/:billId
router.get("/:companyId/:billId", authenticateToken, getBill);

// Get bill by company and year/month
// GET /api/v1/bill/open/:companyId/:year/:month
router.get("/open/:companyId/:year/:month", getBillOpen);

// Delete a bill by id
// DELETE /api/v1/bill/:companyId/:billId
// Restrict to admin/accounts
router.delete(
  "/:companyId/:billId",
  authenticateToken,
  checkRoles("68f0500fe931769b9f25b1db", "super_admin", "admin", "accounts"),
  deleteBill
);

// GET case-wise bill details
router.get(
  "/bill/:companyId/open/:year/:month/case/:caseId",
  getBillCaseDetails
);


module.exports = router;
