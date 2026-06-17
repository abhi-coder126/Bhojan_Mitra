const express = require("express");
const {
  createVendor,
  getVendors,
  updateVendor,
  deleteVendor,
} = require("../controllers/vendorController");

const router = express.Router();

router.post("/", createVendor);
router.get("/", getVendors);
router.put("/:id", updateVendor);
router.delete("/:id", deleteVendor);

module.exports = router;