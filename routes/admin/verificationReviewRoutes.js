const express = require("express");

const {
  getVerificationSubmissions,
  getVerificationSubmissionById,
  approveVerificationSubmission,
  rejectVerificationSubmission,
  updateVerificationNotes,
  getVerificationDocumentsForDownload,
  downloadVerificationDocument,
  downloadVerificationProfilePdf,
} = require("../../controllers/admin/verificationReviewController");

const adminAuthMiddleware = require("../../middlewares/adminAuthMiddleware");

const router = express.Router();

router.use(adminAuthMiddleware);

router.get("/", getVerificationSubmissions);

router.get("/:id", getVerificationSubmissionById);

router.patch("/:id/approve", approveVerificationSubmission);

router.patch("/:id/reject", rejectVerificationSubmission);

router.patch("/:id/notes", updateVerificationNotes);

router.get("/:id/profile-pdf", downloadVerificationProfilePdf);

router.get("/:id/download-documents", getVerificationDocumentsForDownload);

router.get("/:id/documents/:documentId/download", downloadVerificationDocument);

module.exports = router;
