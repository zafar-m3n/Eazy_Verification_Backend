const fs = require("fs");
const path = require("path");
const multer = require("multer");
const dotenv = require("dotenv");

dotenv.config();

const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

const allowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"];

function createUploadDir(uploadDir) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

function sanitizeFileName(fileName) {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "");
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  const isAllowedMimeType = allowedMimeTypes.includes(file.mimetype);
  const isAllowedExtension = allowedExtensions.includes(ext);

  if (!isAllowedMimeType || !isAllowedExtension) {
    return cb(new Error("Only JPG, JPEG, PNG, and PDF files are allowed."), false);
  }

  cb(null, true);
}

function getMulterUpload(uploadDir) {
  createUploadDir(uploadDir);

  const maxFileSizeMb = Number(process.env.NODE_EAZY_VERIFICATION_MAX_FILE_SIZE_MB || 5);

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },

    filename: function (req, file, cb) {
      const fileExt = path.extname(file.originalname).toLowerCase();
      const baseName = path.basename(file.originalname, fileExt);
      const cleanBaseName = sanitizeFileName(baseName);

      const fieldName = sanitizeFileName(file.fieldname);
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

      const finalFileName = `${fieldName}-${uniqueSuffix}-${cleanBaseName}${fileExt}`;

      cb(null, finalFileName);
    },
  });

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxFileSizeMb * 1024 * 1024,
    },
  });
}

module.exports = { getMulterUpload };
