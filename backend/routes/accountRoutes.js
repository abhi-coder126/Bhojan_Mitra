const express = require("express");
const {
  getPendingSupplierBills,
  addVendorPayment,
  getVendorPayments,
} = require("../controllers/accountController");

const router = express.Router();

router.get("/pending-bills", getPendingSupplierBills);
router.post("/vendor-payment", addVendorPayment);
router.get("/vendor-payments", getVendorPayments);

module.exports = router;