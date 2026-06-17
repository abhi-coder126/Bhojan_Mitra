const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: "" },
    storeShortName: { type: String, default: "POS" },
    storeAddress: { type: String, default: "" },
    gstNumber: { type: String, default: "" },
    storeContact: { type: String, default: "" },
    storeEmail: { type: String, default: "" },
    logo: { type: String, default: "" },

    invoicePrefix: { type: String, default: "INV" },
    invoicePrintSize: {
      type: String,
      enum: ["58MM", "80MM", "A4"],
      default: "80MM",
    },

    thankYouMessage: { type: String, default: "Thank you for shopping!" },
    termsAndConditions: { type: String, default: "" },
    returnPolicy: { type: String, default: "" },

    showStoreDetails: { type: Boolean, default: true },
    showGSTDetails: { type: Boolean, default: true },
    showCustomerDetails: { type: Boolean, default: true },
    showTerms: { type: Boolean, default: true },
    showReturnPolicy: { type: Boolean, default: true },
    showThankYou: { type: Boolean, default: true },
    qrCodeEnabled: { type: Boolean, default: true },

    cashEnabled: { type: Boolean, default: true },
    upiEnabled: { type: Boolean, default: true },
    cardEnabled: { type: Boolean, default: true },
    partialPaymentEnabled: { type: Boolean, default: true },
    bankTransferEnabled: { type: Boolean, default: false },

    restaurantOrderSoundEnabled: { type: Boolean, default: true },
    restaurantOrderRepeatSound: { type: Boolean, default: true },
    restaurantOrderPopupEnabled: { type: Boolean, default: true },
    restaurantOrderRefreshSeconds: { type: Number, default: 5 },
    restaurantTableCount: { type: Number, default: 28 },

    lowStockAlertQty: { type: Number, default: 5 },
    expiryAlertDays: { type: Number, default: 30 },

    themeMode: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
