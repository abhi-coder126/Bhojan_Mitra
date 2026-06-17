const mongoose = require("mongoose");

const restaurantOrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    category: String,
    qty: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    gst: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const restaurantOrderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, unique: true },
    orderType: {
      type: String,
      enum: ["dine-in", "delivery"],
      default: "dine-in",
    },
    tableNo: { type: String, default: "", trim: true },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    customerEmail: { type: String, trim: true },
    deliveryAddress: { type: String, trim: true },
    note: { type: String, trim: true },
    items: [restaurantOrderItemSchema],
    subTotal: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    couponCode: { type: String, default: "", trim: true },
    discountAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    payment: {
      mode: {
        type: String,
        enum: ["", "Cash", "UPI", "Card", "Partial"],
        default: "",
      },
      cash: { type: Number, default: 0 },
      upi: { type: Number, default: 0 },
      card: { type: Number, default: 0 },
      paidAt: Date,
    },
    status: {
      type: String,
      enum: ["new", "accepted", "preparing", "ready", "served", "cancelled"],
      default: "new",
    },
  },
  { timestamps: true }
);

restaurantOrderSchema.pre("save", async function setOrderNo() {
  if (this.orderNo) return;

  const count = await mongoose.model("RestaurantOrder").countDocuments();
  this.orderNo = `DINE-${String(count + 1).padStart(5, "0")}`;
});

module.exports = mongoose.model("RestaurantOrder", restaurantOrderSchema);
