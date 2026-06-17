const express = require("express");
const {
    createCustomer,
    getCustomers,
    updateCustomer,
    getCustomerHistory,
    deleteCustomer,
    searchCustomer,
} = require("../controllers/customerController");

const router = express.Router();

router.post("/", createCustomer);
router.get("/search/customer", searchCustomer);
router.get("/", getCustomers);
router.get("/:id/history", getCustomerHistory);
router.put("/:id", updateCustomer);

router.delete("/:id", deleteCustomer);
module.exports = router;