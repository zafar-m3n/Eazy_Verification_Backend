const path = require("path");
const dotenv = require("dotenv");

const { getMulterUpload } = require("../config/multerConfig");

dotenv.config();

const uploadPath = process.env.NODE_EAZY_VERIFICATION_UPLOAD_PATH || "uploads/verifications";

const absoluteUploadPath = path.resolve(uploadPath);

const upload = getMulterUpload(absoluteUploadPath);

const verificationDocumentUpload = upload.fields([
  {
    name: "id_front",
    maxCount: 1,
  },
  {
    name: "id_back",
    maxCount: 1,
  },
  {
    name: "proof_of_address",
    maxCount: 1,
  },
]);

function handleVerificationDocumentUpload(req, res, next) {
  verificationDocumentUpload(req, res, function (error) {
    if (error) {
      return next(error);
    }

    next();
  });
}

module.exports = {
  handleVerificationDocumentUpload,
};
