const { Admin } = require("../models");
const { verifyToken } = require("../utils/tokenUtil");
const { resError } = require("../utils/responseUtil");

async function adminAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return resError(res, "Authorization token is missing.", 401);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return resError(res, "Authorization token is missing.", 401);
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return resError(res, "Invalid authorization token.", 401);
    }

    const admin = await Admin.findOne({
      where: {
        id: decoded.id,
        is_active: true,
      },
      attributes: ["id", "name", "email", "is_active", "created_at", "updated_at"],
    });

    if (!admin) {
      return resError(res, "Admin account not found or inactive.", 401);
    }

    req.admin = admin;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return resError(res, "Authorization token has expired.", 401);
    }

    if (error.name === "JsonWebTokenError") {
      return resError(res, "Invalid authorization token.", 401);
    }

    return resError(res, "Authentication failed.", 401);
  }
}

module.exports = adminAuthMiddleware;
