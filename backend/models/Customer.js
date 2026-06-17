const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    crn: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    contact: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    activeFrom: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);