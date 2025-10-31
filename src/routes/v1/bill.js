const express = require("express");
const {
  getAllCompanies,
  createCompany,
  getCompanyById,
  getMyCompany,
  updateCompany,
  deleteCompany,
  updateMyCompany,
} = require("../../controllers/companyController");
const authenticateToken = require("../../middlewares/auth");
const {
  checkSuper,
  checkAdmin,
  checkManager,
  checkSupervisor,
  checkOperator,
  checkSales,
  checkAccounts,
  checkTechincal,
  checkRoles,
} = require("../../middlewares/checkRole");
const upload = require("../../middlewares/upload");
const router = express.Router();

router.get(
  "/",
  authenticateToken,
  checkRoles("super", "admin"),
  getAllCompanies
);
router.get(
  "/my",
  authenticateToken,
  // checkManager,
  getMyCompany
);
router.post("/", upload.single("image"), createCompany);

// authenticateToken, checkAdmin,

router.get("/:companyId", authenticateToken, checkAdmin, getCompanyById);

router.put("/my", authenticateToken, upload.single("image"), updateMyCompany);

router.put(
  "/:companyId",
  authenticateToken,
  upload.single("image"),
  updateCompany
);

router.delete("/:companyId", authenticateToken, checkAdmin, deleteCompany);

module.exports = router;
