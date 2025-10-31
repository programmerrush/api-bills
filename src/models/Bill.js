const mongoose = require("mongoose");

const BillSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: function () {
        return this.role !== "admin";
      },
    },
    // flexible fields container
    jsonObj: { type: mongoose.Schema.Types.Mixed, required: true },
    // payment related fields
    paymentStatus: { type: String, default: "pending" },
    paid: { type: Boolean, default: false },
    paymentDate: { type: Date, default: null },
    amount: { type: Number, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
  }
);

const Bill = mongoose.model("Bill", BillSchema);

module.exports = Bill;
