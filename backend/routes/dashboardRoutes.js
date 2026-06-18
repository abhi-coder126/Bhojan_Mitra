const express = require("express");
const { getDashboard, getDeletionLogs } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", getDashboard);
router.get("/deletions", getDeletionLogs);

module.exports = router;
