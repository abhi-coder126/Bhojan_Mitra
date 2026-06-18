const Customer = require("../models/Customer");
const Sale = require("../models/Sale");
const RestaurantOrder = require("../models/RestaurantOrder");
const DeletionLog = require("../models/DeletionLog");
const { verifyDeletePassword } = require("../utils/deleteAuth");

const generateCRN = async () => {
  const lastCustomer = await Customer.findOne().sort({ createdAt: -1 });

  if (!lastCustomer || !lastCustomer.crn) {
    return "CRN_001";
  }

  const lastNumber = Number(lastCustomer.crn.replace("CRN_", ""));
  const nextNumber = lastNumber + 1;

  return `CRN_${String(nextNumber).padStart(3, "0")}`;
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, address } = req.body;
    const contact = String(req.body.contact || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!name || !contact) {
      return res.status(400).json({
        success: false,
        message: "Customer name and contact number required",
      });
    }

    const existing = await Customer.findOne({
      $or: [{ contact }, ...(email ? [{ email }] : [])],
    }).sort({ createdAt: 1 });

    if (existing) {
      existing.name = name || existing.name;
      existing.contact = existing.contact || contact;
      existing.email = email || existing.email || "";
      existing.address = address || existing.address || "";
      await existing.save();
      return res.json({
        success: false,
        message: "Customer already exists. Existing CRN updated.",
        customer: existing,
      });
    }

    const crn = await generateCRN();

    const customer = await Customer.create({
      crn,
      name,
      contact,
      email,
      address,
      activeFrom: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Customer create error",
      error: error.message,
    });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Customers fetch error",
      error: error.message,
    });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { name, address } = req.body;
    const contact = String(req.body.contact || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!contact) {
      return res.status(400).json({ success: false, message: "Contact number required" });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { name, contact, email, address },
      { new: true }
    );

    res.json({
      success: true,
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Customer update error",
      error: error.message,
    });
  }
};

exports.getCustomerHistory = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const sales = await Sale.find({
      $or: [
        { customerPhone: customer.contact },
        { customerName: customer.name },
      ],
    }).sort({ createdAt: -1 });

    const restaurantOrders = await RestaurantOrder.find({
      $or: [
        { customerPhone: customer.contact },
        { customerName: customer.name },
      ],
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      customer,
      sales,
      restaurantOrders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Customer history error",
      error: error.message,
    });
  }
};
exports.deleteCustomer = async (req, res) => {
  try {
    const user = await verifyDeletePassword(req);
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

    await Customer.findByIdAndDelete(req.params.id);
    await DeletionLog.create({
      recordType: "Customer",
      recordNo: customer.crn,
      title: customer.name,
      deletedBy: user.name,
      details: customer.contact,
    });

    res.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.searchCustomer = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res.json({
        success: true,
        customers: [],
      });
    }

    const customers = await Customer.find({
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { crn: { $regex: keyword, $options: "i" } },
        { contact: { $regex: keyword, $options: "i" } },
      ],
    }).limit(10);

    res.json({
      success: true,
      customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Customer search error",
      error: error.message,
    });
  }
};
