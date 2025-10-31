const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const BillSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      // required: true,
      required: function () {
        return this.role !== "admin";
      },
    },
    jsonObj: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
  }
);

const Bill = mongoose.model("Bill", BillSchema);

module.exports = User;
