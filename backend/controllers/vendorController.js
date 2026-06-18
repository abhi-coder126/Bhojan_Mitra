const Vendor = require("../models/Vendor");
const DeletionLog = require("../models/DeletionLog");
const { verifyDeletePassword } = require("../utils/deleteAuth");

exports.createVendor = async (req, res) => {
  try {
    const vendor = await Vendor.create(req.body);
    res.status(201).json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.json({ success: true, vendors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const user = await verifyDeletePassword(req);
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    await Vendor.findByIdAndDelete(req.params.id);
    await DeletionLog.create({
      recordType: "Vendor",
      recordNo: vendor.gstNumber || vendor.phone || "",
      title: vendor.name,
      deletedBy: user.name,
      details: `Pending Rs ${Number(vendor.pendingAmount || 0).toFixed(2)}`,
    });
    res.json({ success: true, message: "Vendor deleted" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
