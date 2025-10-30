const Company = require("../models/Company");
const User = require("../models/User"); // Assuming you have a User model

exports.getAllCompanies = async (req, res) => {
  try {
    const companys = await Company.find();
    res.status(200).json(companys);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.createCompany = async (req, res) => {
  try {
    const { name, address, email, contact_person_name, contact_person_phone } =
      req.body;
    const image = req.file ? req.file.filename : null;
    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
      return res.status(400).json({ message: "Company name already in use" });
    }

    const newCompany = await Company.create({
      name,
      address,
      image,
      email,
      contact_person_name,
      contact_person_phone,
    });
    res
      .status(201)
      .json({ message: "Company created successfully", company: newCompany });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.status(200).json(company);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.getMyCompany = async (req, res) => {
  // console.log("getMyCompany", req.user);
  try {
    const userId = req.user.id; // Assuming `req.user` contains the authenticated user's details

    // Fetch the user's company ID
    const user = await User.findById(userId).select("company");
    if (!user || !user.company) {
      return res.status(404).json({ message: "User or company not found" });
    }

    // Fetch the company details
    const company = await Company.findById(user.company);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json(company);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const {
      name,
      address,

      electricityRate,
      billingCycleDate,

      shiftAFrom,
      shiftATo,
      shiftBFrom,
      shiftBTo,
      shiftCFrom,
      shiftCTo,

      email,
      contact_person_name,
      contact_person_phone,
    } = req.body;

    // Build the update object dynamically
    const updateData = {
      name,
      address,

      electricityRate,
      billingCycleDate,

      shiftAFrom,
      shiftATo,
      shiftBFrom,
      shiftBTo,
      shiftCFrom,
      shiftCTo,

      email,
      contact_person_name,
      contact_person_phone,
    };

    // Include image field only if a file is uploaded
    if (req.file) {
      updateData.image = req.file.filename;
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json({
      message: "Company updated successfully",
      company: updatedCompany,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.updateMyCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const {
      name,
      address,

      electricityRate,
      billingCycleDate,

      shiftAFrom,
      shiftATo,
      shiftBFrom,
      shiftBTo,
      shiftCFrom,
      shiftCTo,

      email,
      contact_person_name,
      contact_person_phone,
    } = req.body;

    // Build the update object dynamically
    const updateData = {
      name,
      address,

      electricityRate,
      billingCycleDate,

      shiftAFrom,
      shiftATo,
      shiftBFrom,
      shiftBTo,
      shiftCFrom,
      shiftCTo,

      email,
      contact_person_name,
      contact_person_phone,
    };

    // Include image field only if a file is uploaded
    if (req.file) {
      updateData.image = req.file.filename;
    }

    const userId = req.user.id; // Assuming `req.user` contains the authenticated user's details

    // Fetch the user's company ID
    const user = await User.findById(userId).select("company");
    if (!user || !user.company) {
      return res.status(404).json({ message: "User or company not found" });
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      user.company,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json({
      message: "Company updated successfully",
      company: updatedCompany,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    const deletedCompany = await Company.findByIdAndDelete(companyId);
    if (!deletedCompany) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json({ message: "Company deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
