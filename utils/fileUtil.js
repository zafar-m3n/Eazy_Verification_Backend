const fs = require("fs");
const path = require("path");

function normalizePath(filePath) {
  if (!filePath) {
    return null;
  }

  return filePath.replace(/\\/g, "/");
}

function getPublicFilePath(filePath) {
  if (!filePath) {
    return null;
  }

  const normalizedPath = normalizePath(filePath);

  if (normalizedPath.startsWith("/")) {
    return normalizedPath;
  }

  return `/${normalizedPath}`;
}

function deleteFileIfExists(filePath) {
  if (!filePath) {
    return;
  }

  const absolutePath = path.resolve(filePath);

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

function deleteUploadedFiles(files = []) {
  if (!files) {
    return;
  }

  if (Array.isArray(files)) {
    files.forEach((file) => {
      if (file && file.path) {
        deleteFileIfExists(file.path);
      }
    });

    return;
  }

  Object.values(files).forEach((fileGroup) => {
    if (Array.isArray(fileGroup)) {
      fileGroup.forEach((file) => {
        if (file && file.path) {
          deleteFileIfExists(file.path);
        }
      });
    }
  });
}

function getFileExtension(fileName) {
  if (!fileName) {
    return "";
  }

  return path.extname(fileName).toLowerCase();
}

function getFileUrl(req, filePath) {
  if (!req || !filePath) {
    return null;
  }

  const normalizedPath = normalizePath(filePath);
  const publicPath = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;

  return `${req.protocol}://${req.get("host")}${publicPath}`;
}

module.exports = {
  normalizePath,
  getPublicFilePath,
  deleteFileIfExists,
  deleteUploadedFiles,
  getFileExtension,
  getFileUrl,
};
