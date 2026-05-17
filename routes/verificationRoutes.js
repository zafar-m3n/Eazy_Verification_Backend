const express = require("express");

const { submitVerification } = require("../controllers/verificationController");

const { handleVerificationDocumentUpload } = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.post("/submit", handleVerificationDocumentUpload, submitVerification);

module.exports = router;
