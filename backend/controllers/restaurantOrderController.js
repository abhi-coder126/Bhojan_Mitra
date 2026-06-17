const Product = require("../models/Product");
const RestaurantOrder = require("../models/RestaurantOrder");
const Customer = require("../models/Customer");
const Coupon = require("../models/Coupon");

exports.getMenuProducts = async (req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 } })
      .select("name barcode category foodType description spiceLevel isRecommended image unit sellingPrice mrp gst stock")
      .sort({ category: 1, name: 1 });

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createRestaurantOrder = async (req, res) => {
  try {
    const {
      orderType = "dine-in",
      tableNo,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      note,
      couponCode,
      items = [],
    } = req.body;

    if (orderType !== "delivery" && !tableNo) {
      return res.status(400).json({ message: "Table number required" });
    }

    if (!customerName || !customerPhone) {
      return res.status(400).json({ message: "Customer name and contact number required" });
    }

    if (orderType === "delivery" && !deliveryAddress) {
      return res.status(400).json({ message: "Delivery address required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one menu item required" });
    }

    const productIds = items.map((item) => item.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const orderItems = [];
    let subTotal = 0;
    let gstAmount = 0;

    for (const item of items) {
      const product = productMap.get(String(item.productId));
      const qty = Math.max(Number(item.qty || 0), 0);

      if (!product || qty <= 0) continue;

      if (Number(product.stock) < qty) {
        return res.status(400).json({
          message: `${product.name} has only ${product.stock} in stock`,
        });
      }

      const rate = Number(product.mrp || product.sellingPrice || 0);
      const gst = Number(product.gst || 0);
      const lineTotal = rate * qty;
      const line = gst > 0 ? lineTotal / (1 + gst / 100) : lineTotal;
      const lineGst = lineTotal - line;

      subTotal += line;
      gstAmount += lineGst;

      orderItems.push({
        productId: product._id,
        name: product.name,
        category: product.category,
        qty,
        rate,
        gst,
        taxableAmount: line,
        gstAmount: lineGst,
        total: lineTotal,
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ message: "Valid menu item required" });
    }

    const billAmount = subTotal + gstAmount;
    let appliedCouponCode = "";
    let discountAmount = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: String(couponCode).trim().toUpperCase(),
        status: "Active",
      });

      if (!coupon) {
        return res.status(404).json({ message: "Coupon not found or inactive" });
      }

      const now = new Date();
      if (coupon.startDate && now < coupon.startDate) {
        return res.status(400).json({ message: "Coupon not started yet" });
      }

      if (coupon.endDate && now > coupon.endDate) {
        return res.status(400).json({ message: "Coupon expired" });
      }

      if (billAmount < Number(coupon.minimumBillAmount || 0)) {
        return res.status(400).json({
          message: `Minimum bill amount Rs ${coupon.minimumBillAmount} required`,
        });
      }

      if (
        Number(coupon.usageLimit || 0) > 0 &&
        Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)
      ) {
        return res.status(400).json({ message: "Coupon usage limit reached" });
      }

      discountAmount =
        coupon.discountType === "Percent"
          ? (billAmount * Number(coupon.discountValue || 0)) / 100
          : Number(coupon.discountValue || 0);
      discountAmount = Math.min(discountAmount, billAmount);
      appliedCouponCode = coupon.code;
      await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
    }

    const order = await RestaurantOrder.create({
      orderType,
      tableNo: orderType === "delivery" ? "DELIVERY" : tableNo,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      note,
      items: orderItems,
      subTotal,
      gstAmount,
      couponCode: appliedCouponCode,
      discountAmount,
      grandTotal: Math.max(billAmount - discountAmount, 0),
    });

    await Product.bulkWrite(
      orderItems.map((item) => ({
        updateOne: {
          filter: { _id: item.productId },
          update: { $inc: { stock: -Number(item.qty || 0) } },
        },
      }))
    );

    if (customerPhone) {
      await Customer.findOneAndUpdate(
        { contact: customerPhone },
        {
          $setOnInsert: {
            crn: `CRN_${Date.now()}`,
            contact: customerPhone,
            activeFrom: new Date(),
          },
          $set: {
            name: customerName,
            email: customerEmail || "",
            address: deliveryAddress || "",
          },
        },
        { upsert: true, new: true }
      );
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markRestaurantOrderPaid = async (req, res) => {
  try {
    const { mode, cash = 0, upi = 0, card = 0 } = req.body;

    if (!["Cash", "UPI", "Card", "Partial"].includes(mode)) {
      return res.status(400).json({ message: "Payment mode required" });
    }

    const order = await RestaurantOrder.findByIdAndUpdate(
      req.params.id,
      {
        paymentStatus: "paid",
        payment: {
          mode,
          cash: Number(cash || 0),
          upi: Number(upi || 0),
          card: Number(card || 0),
          paidAt: new Date(),
        },
        status: "served",
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const restoreRestaurantOrderStock = async (orders) => {
  const stockByProduct = new Map();

  orders.forEach((order) => {
    if (order.status === "cancelled") return;
    (order.items || []).forEach((item) => {
      if (!item.productId) return;
      const key = String(item.productId);
      stockByProduct.set(key, (stockByProduct.get(key) || 0) + Number(item.qty || 0));
    });
  });

  if (stockByProduct.size === 0) return;

  await Product.bulkWrite(
    Array.from(stockByProduct.entries()).map(([productId, qty]) => ({
      updateOne: {
        filter: { _id: productId },
        update: { $inc: { stock: qty } },
      },
    }))
  );
};

exports.deleteRestaurantOrder = async (req, res) => {
  try {
    const order = await RestaurantOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Restaurant order not found" });
    }

    await restoreRestaurantOrderStock([order]);
    await RestaurantOrder.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Restaurant invoice/order deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.clearRestaurantOrders = async (req, res) => {
  try {
    const orders = await RestaurantOrder.find();
    await restoreRestaurantOrderStock(orders);
    const result = await RestaurantOrder.deleteMany({});

    res.json({
      success: true,
      deletedCount: result.deletedCount || 0,
      message: "All restaurant orders and invoices deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRestaurantOrders = async (req, res) => {
  try {
    const orders = await RestaurantOrder.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRestaurantOrderById = async (req, res) => {
  try {
    const order = await RestaurantOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRestaurantOrderStatus = async (req, res) => {
  try {
    const order = await RestaurantOrder.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
