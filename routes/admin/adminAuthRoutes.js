const express = require("express");

const { loginAdmin, getAdminProfile } = require("../../controllers/admin/adminAuthController");

const adminAuthMiddleware = require("../../middlewares/adminAuthMiddleware");

const router = express.Router();

router.post("/login", loginAdmin);

router.get("/profile", adminAuthMiddleware, getAdminProfile);

module.exports = router;
