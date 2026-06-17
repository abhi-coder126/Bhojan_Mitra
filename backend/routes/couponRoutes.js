const express = require("express");
const {
  createCoupon,
  getCoupons,
  applyCoupon,
  deleteCoupon,
} = require("../controllers/couponController");

const router = express.Router();

router.post("/", createCoupon);
router.get("/", getCoupons);
router.post("/apply", applyCoupon);
router.delete("/:id", deleteCoupon);

module.exports = router;