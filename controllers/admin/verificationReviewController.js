const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");

const { User, Admin, VerificationSubmission, VerificationAnswer, VerificationDocument } = require("../../models");

const { resSuccess, resError } = require("../../utils/responseUtil");
const {
  convertDDMMYYYYToYYYYMMDD,
  convertYYYYMMDDToDDMMYYYY,
  formatDateTimeToDDMMYYYY,
} = require("../../utils/dateUtil");
const { getFileUrl } = require("../../utils/fileUtil");

function getPagination(query) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
}

function buildSubmissionWhere(query) {
  const where = {};

  if (query.status && ["pending", "approved", "rejected"].includes(query.status)) {
    where.status = query.status;
  }

  if (query.date_from || query.date_to) {
    const dateWhere = {};

    if (query.date_from) {
      const fromDate = convertDDMMYYYYToYYYYMMDD(query.date_from);
      dateWhere[Op.gte] = new Date(`${fromDate} 00:00:00`);
    }

    if (query.date_to) {
      const toDate = convertDDMMYYYYToYYYYMMDD(query.date_to);
      dateWhere[Op.lte] = new Date(`${toDate} 23:59:59`);
    }

    where.submitted_at = dateWhere;
  }

  return where;
}

function buildUserWhere(query) {
  const search = query.search ? String(query.search).trim() : "";

  if (!search) {
    return null;
  }

  return {
    [Op.or]: [
      {
        first_name: {
          [Op.like]: `%${search}%`,
        },
      },
      {
        surname: {
          [Op.like]: `%${search}%`,
        },
      },
      {
        email: {
          [Op.like]: `%${search}%`,
        },
      },
      {
        phone: {
          [Op.like]: `%${search}%`,
        },
      },
      {
        id_passport_number: {
          [Op.like]: `%${search}%`,
        },
      },
      {
        country_of_residence: {
          [Op.like]: `%${search}%`,
        },
      },
    ],
  };
}

function formatUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    first_name: user.first_name,
    surname: user.surname,
    email: user.email,
    phone: user.phone,
    id_passport_number: user.id_passport_number,
    date_of_birth: convertYYYYMMDDToDDMMYYYY(user.date_of_birth),
    country_of_residence: user.country_of_residence,
    created_at: formatDateTimeToDDMMYYYY(user.created_at),
    updated_at: formatDateTimeToDDMMYYYY(user.updated_at),
  };
}

function formatReviewer(admin) {
  if (!admin) {
    return null;
  }

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
  };
}

function formatAnswer(answer) {
  return {
    id: answer.id,
    section: answer.section,
    question_key: answer.question_key,
    question_text: answer.question_text,
    answer_type: answer.answer_type,
    answer_value: answer.answer_value,
    answer_label: answer.answer_label,
    other_value: answer.other_value,
    sort_order: answer.sort_order,
  };
}

function formatDocument(req, document) {
  return {
    id: document.id,
    document_type: document.document_type,
    document_label: document.document_label,
    original_file_name: document.original_file_name,
    saved_file_name: document.saved_file_name,
    file_path: document.file_path,
    file_url: getFileUrl(req, document.file_path),
    download_url: `${req.protocol}://${req.get("host")}/api/v1/admin/verifications/${
      document.submission_id
    }/documents/${document.id}/download`,
    mime_type: document.mime_type,
    file_size: document.file_size,
    status: document.status,
    rejection_reason: document.rejection_reason,
    created_at: formatDateTimeToDDMMYYYY(document.created_at),
    updated_at: formatDateTimeToDDMMYYYY(document.updated_at),
  };
}

function formatSubmissionListItem(submission) {
  return {
    id: submission.id,
    status: submission.status,
    submitted_at: formatDateTimeToDDMMYYYY(submission.submitted_at),
    reviewed_at: formatDateTimeToDDMMYYYY(submission.reviewed_at),
    rejection_reason: submission.rejection_reason,
    internal_notes: submission.internal_notes,
    user: formatUser(submission.user),
    reviewer: formatReviewer(submission.reviewer),
    created_at: formatDateTimeToDDMMYYYY(submission.created_at),
    updated_at: formatDateTimeToDDMMYYYY(submission.updated_at),
  };
}

function formatSubmissionDetails(req, submission) {
  return {
    ...formatSubmissionListItem(submission),
    answers: submission.answers ? submission.answers.map(formatAnswer).sort((a, b) => a.sort_order - b.sort_order) : [],
    documents: submission.documents ? submission.documents.map((document) => formatDocument(req, document)) : [],
  };
}

async function getVerificationSubmissions(req, res) {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const submissionWhere = buildSubmissionWhere(req.query);
    const userWhere = buildUserWhere(req.query);

    const include = [
      {
        model: User,
        as: "user",
        where: userWhere || undefined,
        required: Boolean(userWhere),
      },
      {
        model: Admin,
        as: "reviewer",
        attributes: ["id", "name", "email"],
        required: false,
      },
    ];

    const { rows, count } = await VerificationSubmission.findAndCountAll({
      where: submissionWhere,
      include,
      limit,
      offset,
      order: [["submitted_at", "DESC"]],
      distinct: true,
    });

    return resSuccess(
      res,
      {
        submissions: rows.map(formatSubmissionListItem),
        pagination: {
          total: count,
          page,
          limit,
          total_pages: Math.ceil(count / limit),
        },
      },
      200,
      "Verification submissions fetched successfully.",
    );
  } catch (error) {
    console.error("Get verification submissions error:", error);
    return resError(res, error.message || "Failed to fetch verification submissions.", 500);
  }
}

async function getVerificationSubmissionById(req, res) {
  try {
    const { id } = req.params;

    const submission = await VerificationSubmission.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
        },
        {
          model: Admin,
          as: "reviewer",
          attributes: ["id", "name", "email"],
          required: false,
        },
        {
          model: VerificationAnswer,
          as: "answers",
          required: false,
        },
        {
          model: VerificationDocument,
          as: "documents",
          required: false,
        },
      ],
      order: [[{ model: VerificationAnswer, as: "answers" }, "sort_order", "ASC"]],
    });

    if (!submission) {
      return resError(res, "Verification submission not found.", 404);
    }

    return resSuccess(
      res,
      {
        submission: formatSubmissionDetails(req, submission),
      },
      200,
      "Verification submission fetched successfully.",
    );
  } catch (error) {
    console.error("Get verification submission by ID error:", error);
    return resError(res, "Failed to fetch verification submission.", 500);
  }
}

async function approveVerificationSubmission(req, res) {
  try {
    const { id } = req.params;

    const submission = await VerificationSubmission.findByPk(id);

    if (!submission) {
      return resError(res, "Verification submission not found.", 404);
    }

    if (submission.status === "approved") {
      return resError(res, "Verification submission is already approved.", 400);
    }

    await submission.update({
      status: "approved",
      reviewed_at: new Date(),
      reviewed_by: req.admin.id,
      rejection_reason: null,
    });

    await VerificationDocument.update(
      {
        status: "approved",
        rejection_reason: null,
      },
      {
        where: {
          submission_id: submission.id,
        },
      },
    );

    return resSuccess(
      res,
      {
        submission: {
          id: submission.id,
          status: "approved",
        },
      },
      200,
      "Verification submission approved successfully.",
    );
  } catch (error) {
    console.error("Approve verification submission error:", error);
    return resError(res, "Failed to approve verification submission.", 500);
  }
}

async function rejectVerificationSubmission(req, res) {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason || !String(rejection_reason).trim()) {
      return resError(res, "Rejection reason is required.", 400);
    }

    const submission = await VerificationSubmission.findByPk(id);

    if (!submission) {
      return resError(res, "Verification submission not found.", 404);
    }

    if (submission.status === "rejected") {
      return resError(res, "Verification submission is already rejected.", 400);
    }

    await submission.update({
      status: "rejected",
      reviewed_at: new Date(),
      reviewed_by: req.admin.id,
      rejection_reason: String(rejection_reason).trim(),
    });

    await VerificationDocument.update(
      {
        status: "rejected",
        rejection_reason: String(rejection_reason).trim(),
      },
      {
        where: {
          submission_id: submission.id,
        },
      },
    );

    return resSuccess(
      res,
      {
        submission: {
          id: submission.id,
          status: "rejected",
          rejection_reason: String(rejection_reason).trim(),
        },
      },
      200,
      "Verification submission rejected successfully.",
    );
  } catch (error) {
    console.error("Reject verification submission error:", error);
    return resError(res, "Failed to reject verification submission.", 500);
  }
}

async function updateVerificationNotes(req, res) {
  try {
    const { id } = req.params;
    const { internal_notes } = req.body;

    const submission = await VerificationSubmission.findByPk(id);

    if (!submission) {
      return resError(res, "Verification submission not found.", 404);
    }

    await submission.update({
      internal_notes: internal_notes || null,
    });

    return resSuccess(
      res,
      {
        submission: {
          id: submission.id,
          internal_notes: submission.internal_notes,
        },
      },
      200,
      "Internal notes updated successfully.",
    );
  } catch (error) {
    console.error("Update verification notes error:", error);
    return resError(res, "Failed to update internal notes.", 500);
  }
}

async function getVerificationDocumentsForDownload(req, res) {
  try {
    const { id } = req.params;

    const submission = await VerificationSubmission.findByPk(id, {
      include: [
        {
          model: VerificationDocument,
          as: "documents",
        },
      ],
    });

    if (!submission) {
      return resError(res, "Verification submission not found.", 404);
    }

    return resSuccess(
      res,
      {
        documents: submission.documents.map((document) => formatDocument(req, document)),
      },
      200,
      "Verification documents fetched successfully.",
    );
  } catch (error) {
    console.error("Get verification documents for download error:", error);
    return resError(res, "Failed to fetch verification documents.", 500);
  }
}

async function downloadVerificationDocument(req, res) {
  try {
    const { id, documentId } = req.params;

    const document = await VerificationDocument.findOne({
      where: {
        id: documentId,
        submission_id: id,
      },
    });

    if (!document) {
      return resError(res, "Verification document not found.", 404);
    }

    const absoluteFilePath = path.resolve(document.file_path);

    if (!fs.existsSync(absoluteFilePath)) {
      return resError(res, "File does not exist on the server.", 404);
    }

    const downloadName = document.original_file_name || document.saved_file_name;

    return res.download(absoluteFilePath, downloadName);
  } catch (error) {
    console.error("Download verification document error:", error);
    return resError(res, "Failed to download verification document.", 500);
  }
}

module.exports = {
  getVerificationSubmissions,
  getVerificationSubmissionById,
  approveVerificationSubmission,
  rejectVerificationSubmission,
  updateVerificationNotes,
  getVerificationDocumentsForDownload,
  downloadVerificationDocument,
};
