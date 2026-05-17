const express = require("express");

const { getDashboardCounts } = require("../../controllers/admin/adminDashboardController");

const adminAuthMiddleware = require("../../middlewares/adminAuthMiddleware");

const router = express.Router();

router.use(adminAuthMiddleware);

router.get("/counts", getDashboardCounts);

module.exports = router;
