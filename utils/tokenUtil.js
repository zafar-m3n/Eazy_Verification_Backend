const jwt = require("jsonwebtoken");
require("dotenv").config();

function generateToken(payload) {
  if (!process.env.NODE_EAZY_VERIFICATION_JWT_SECRET) {
    throw new Error("JWT secret is missing.");
  }

  return jwt.sign(payload, process.env.NODE_EAZY_VERIFICATION_JWT_SECRET, {
    expiresIn: process.env.NODE_EAZY_VERIFICATION_JWT_EXPIRES_IN || "7d",
  });
}

function verifyToken(token) {
  if (!process.env.NODE_EAZY_VERIFICATION_JWT_SECRET) {
    throw new Error("JWT secret is missing.");
  }

  return jwt.verify(token, process.env.NODE_EAZY_VERIFICATION_JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken,
};
