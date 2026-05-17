const dotenv = require("dotenv");
const colors = require("colors");

const { sequelize, connectDB } = require("../config/database");
const { Admin } = require("../models");
const { hashPassword } = require("../utils/passwordUtil");

dotenv.config();

async function seedAdmin() {
  try {
    await connectDB();

    const name = process.env.NODE_EAZY_VERIFICATION_ADMIN_NAME;
    const email = process.env.NODE_EAZY_VERIFICATION_ADMIN_EMAIL;
    const password = process.env.NODE_EAZY_VERIFICATION_ADMIN_PASSWORD;

    if (!name || !email || !password) {
      console.error("Admin seed failed: name, email, and password are required in .env".bgRed.white);
      process.exit(1);
    }

    const existingAdmin = await Admin.findOne({
      where: { email },
    });

    if (existingAdmin) {
      console.log(`Admin already exists: ${email}`.bgYellow.black);
      process.exit(0);
    }

    const hashedPassword = await hashPassword(password);

    await Admin.create({
      name,
      email,
      password: hashedPassword,
      is_active: true,
    });

    console.log(`Admin seeded successfully: ${email}`.bgGreen.white);
    process.exit(0);
  } catch (error) {
    console.error(`Admin seed error: ${error.message}`.bgRed.white);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedAdmin();
