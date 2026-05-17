const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  if (!password) {
    throw new Error("Password is required.");
  }

  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) {
    return false;
  }

  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  hashPassword,
  comparePassword,
};
