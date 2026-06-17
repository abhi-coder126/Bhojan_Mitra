const express = require("express");
const {
  createProduct,
  getProducts,
  searchProducts,
  updateProduct,
  deleteProduct,
  clearProducts,
} = require("../controllers/productController");

const router = express.Router();

router.post("/", createProduct);
router.get("/", getProducts);
router.get("/search", searchProducts);
router.delete("/clear/all", clearProducts);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
