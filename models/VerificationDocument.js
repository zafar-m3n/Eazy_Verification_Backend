const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const VerificationDocument = sequelize.define(
  "VerificationDocument",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    submission_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    document_type: {
      type: DataTypes.ENUM("id_front", "id_back", "proof_of_address"),
      allowNull: false,
    },

    document_label: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    original_file_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    saved_file_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },

    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    file_size: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },

    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "verification_documents",
    timestamps: true,
    underscored: true,
  },
);

module.exports = VerificationDocument;
