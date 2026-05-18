const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const VerificationAnswer = sequelize.define(
  "VerificationAnswer",
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

    section: {
      type: DataTypes.ENUM("personal_details", "professional_work_experience", "financial_information", "documents"),
      allowNull: false,
    },

    question_key: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    question_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    answer_type: {
      type: DataTypes.ENUM("text", "date", "checkbox", "single_choice", "multiple_choice"),
      allowNull: false,
    },

    answer_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    answer_label: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    other_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "verification_answers",
    timestamps: true,
    underscored: true,
  },
);

module.exports = VerificationAnswer;
