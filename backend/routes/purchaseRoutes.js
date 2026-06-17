const express = require("express");
const {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchasePayment,
  fullUpdatePurchase,
} = require("../controllers/purchaseController");
const router = express.Router();

router.post("/", createPurchase);
router.get("/", getPurchases);
router.get("/:id", getPurchaseById);
router.put("/:id/payment", updatePurchasePayment);
router.put("/:id/full-update", fullUpdatePurchase);
module.exports = router;