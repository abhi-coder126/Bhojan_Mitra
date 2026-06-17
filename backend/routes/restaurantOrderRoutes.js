const express = require("express");
const {
  createRestaurantOrder,
  getRestaurantOrderById,
  getMenuProducts,
  getRestaurantOrders,
  markRestaurantOrderPaid,
  updateRestaurantOrderStatus,
  deleteRestaurantOrder,
  clearRestaurantOrders,
} = require("../controllers/restaurantOrderController");

const router = express.Router();

router.get("/menu", getMenuProducts);
router.post("/", createRestaurantOrder);
router.get("/", getRestaurantOrders);
router.delete("/clear/all", clearRestaurantOrders);
router.get("/:id", getRestaurantOrderById);
router.patch("/:id/status", updateRestaurantOrderStatus);
router.patch("/:id/payment", markRestaurantOrderPaid);
router.delete("/:id", deleteRestaurantOrder);

module.exports = router;
