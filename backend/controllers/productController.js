const Product = require("../models/Product");

exports.createProduct = async (req, res) => {
  try {
    const generatedCode = req.body.barcode || `MENU-${Date.now()}`;
    const mrp = Number(req.body.mrp || req.body.sellingPrice || 0);
    const exist = await Product.findOne({ barcode: generatedCode });

    if (exist) {
      return res.status(400).json({ message: "Menu item already exists" });
    }

    const product = await Product.create({
      ...req.body,
      barcode: generatedCode,
      purchasePrice: Number(req.body.purchasePrice || 0),
      sellingPrice: Number(req.body.sellingPrice || mrp),
      mrp,
      gst: Number(req.body.gst || 0),
      unit: req.body.unit || "Plate",
      stock: Number(req.body.openingStock || req.body.stock || 9999),
      lowStockLimit: Number(req.body.lowStockLimit || 0),
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("vendorId", "name gstNumber phone")
      .sort({ createdAt: -1 });

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const keyword = req.query.keyword || "";

    const products = await Product.find({
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { barcode: { $regex: keyword, $options: "i" } },
        { sku: { $regex: keyword, $options: "i" } },
        { category: { $regex: keyword, $options: "i" } },
      ],
    }).limit(10);

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const mrp = Number(req.body.mrp || req.body.sellingPrice || 0);
    const payload = {
      ...req.body,
      purchasePrice: Number(req.body.purchasePrice || 0),
      sellingPrice: Number(req.body.sellingPrice || mrp),
      mrp,
      gst: Number(req.body.gst || 0),
      unit: req.body.unit || "Plate",
    };

    const product = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
    });

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.clearProducts = async (req, res) => {
  try {
    const result = await Product.deleteMany({});
    res.json({
      success: true,
      deletedCount: result.deletedCount || 0,
      message: "All menu items deleted",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
