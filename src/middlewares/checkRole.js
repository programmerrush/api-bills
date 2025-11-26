const checkSuper = (req, res, next) => {
  if (req.user.role !== "super") {
    return res.status(403).json({ message: "Access denied. Super only." });
  }
  next();
};

const checkAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};

const checkManager = (req, res, next) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({ message: "Access denied. Managers only." });
  }
  next();
};

const checkSupervisor = (req, res, next) => {
  if (req.user.role !== "supervisor") {
    return res
      .status(403)
      .json({ message: "Access denied. Supervisors only." });
  }
  next();
};

const checkOperator = (req, res, next) => {
  if (req.user.role !== "operator") {
    return res.status(403).json({ message: "Access denied. Operators only." });
  }
  next();
};

const checkSales = (req, res, next) => {
  if (req.user.role !== "sales") {
    return res.status(403).json({ message: "Access denied. Saless only." });
  }
  next();
};

const checkAccounts = (req, res, next) => {
  if (req.user.role !== "accounts") {
    return res.status(403).json({ message: "Access denied. Accounts only." });
  }
  next();
};

const checkTechincal = (req, res, next) => {
  if (req.user.role !== "techincal") {
    return res.status(403).json({ message: "Access denied. Techincals only." });
  }
  next();
};

function checkRoles(...roles) {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ message: "Forbidden 2" });
  };
}

module.exports = {
  checkSuper,
  checkAdmin,
  checkManager,
  checkSupervisor,
  checkOperator,
  checkSales,
  checkAccounts,
  checkTechincal,
  checkRoles,
};
