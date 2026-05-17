const Admin = require("./Admin");
const User = require("./User");
const VerificationSubmission = require("./VerificationSubmission");
const VerificationAnswer = require("./VerificationAnswer");
const VerificationDocument = require("./VerificationDocument");

// User -> VerificationSubmission
User.hasMany(VerificationSubmission, {
  foreignKey: "user_id",
  as: "submissions",
  onDelete: "CASCADE",
});

VerificationSubmission.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// Admin -> VerificationSubmission reviewed_by
Admin.hasMany(VerificationSubmission, {
  foreignKey: "reviewed_by",
  as: "reviewed_submissions",
  onDelete: "SET NULL",
});

VerificationSubmission.belongsTo(Admin, {
  foreignKey: "reviewed_by",
  as: "reviewer",
});

// VerificationSubmission -> VerificationAnswer
VerificationSubmission.hasMany(VerificationAnswer, {
  foreignKey: "submission_id",
  as: "answers",
  onDelete: "CASCADE",
});

VerificationAnswer.belongsTo(VerificationSubmission, {
  foreignKey: "submission_id",
  as: "submission",
});

// VerificationSubmission -> VerificationDocument
VerificationSubmission.hasMany(VerificationDocument, {
  foreignKey: "submission_id",
  as: "documents",
  onDelete: "CASCADE",
});

VerificationDocument.belongsTo(VerificationSubmission, {
  foreignKey: "submission_id",
  as: "submission",
});

module.exports = {
  Admin,
  User,
  VerificationSubmission,
  VerificationAnswer,
  VerificationDocument,
};
