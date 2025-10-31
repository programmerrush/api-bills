const express = require("express");
const {
  getHistoricalBills,
  createBill,
  updateBillPayment,
  getBillParams,
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
  checkRoles("admin", "accounts"),
  updateBillPayment
);

module.exports = router;
