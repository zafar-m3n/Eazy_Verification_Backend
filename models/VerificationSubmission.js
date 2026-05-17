const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const VerificationSubmission = sequelize.define(
  "VerificationSubmission",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },

    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    reviewed_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    internal_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "verification_submissions",
    timestamps: true,
    underscored: true,
  },
);

module.exports = VerificationSubmission;
