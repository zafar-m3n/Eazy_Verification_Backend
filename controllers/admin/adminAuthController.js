const { Admin } = require("../../models");
const { comparePassword } = require("../../utils/passwordUtil");
const { generateToken } = require("../../utils/tokenUtil");
const { resSuccess, resError } = require("../../utils/responseUtil");

async function loginAdmin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return resError(res, "Email and password are required.", 400);
    }

    const admin = await Admin.findOne({
      where: { email },
    });

    if (!admin) {
      return resError(res, "Invalid email or password.", 401);
    }

    if (!admin.is_active) {
      return resError(res, "Admin account is inactive.", 403);
    }

    const isPasswordValid = await comparePassword(password, admin.password);

    if (!isPasswordValid) {
      return resError(res, "Invalid email or password.", 401);
    }

    const token = generateToken({
      id: admin.id,
      email: admin.email,
    });

    return resSuccess(
      res,
      {
        token,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          is_active: admin.is_active,
        },
      },
      200,
      "Admin logged in successfully.",
    );
  } catch (error) {
    console.error("Admin login error:", error);
    return resError(res, "Admin login failed.", 500);
  }
}

async function getAdminProfile(req, res) {
  try {
    return resSuccess(
      res,
      {
        admin: req.admin,
      },
      200,
      "Admin profile fetched successfully.",
    );
  } catch (error) {
    console.error("Get admin profile error:", error);
    return resError(res, "Failed to fetch admin profile.", 500);
  }
}

module.exports = {
  loginAdmin,
  getAdminProfile,
};
