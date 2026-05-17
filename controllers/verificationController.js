const path = require("path");
const { Op } = require("sequelize");

const { sequelize } = require("../config/database");
const { User, VerificationSubmission, VerificationAnswer, VerificationDocument } = require("../models");

const { resSuccess, resError } = require("../utils/responseUtil");
const { convertDDMMYYYYToYYYYMMDD } = require("../utils/dateUtil");
const { normalizePath, deleteUploadedFiles } = require("../utils/fileUtil");
const { sendVerificationSubmittedEmail } = require("../utils/emailUtil");

function parseAnswers(rawAnswers) {
  if (!rawAnswers) {
    return [];
  }

  if (Array.isArray(rawAnswers)) {
    return rawAnswers;
  }

  try {
    const parsedAnswers = JSON.parse(rawAnswers);

    if (!Array.isArray(parsedAnswers)) {
      throw new Error("Answers must be an array.");
    }

    return parsedAnswers;
  } catch (error) {
    throw new Error("Invalid answers format. Expected a valid JSON array.");
  }
}

function getUploadedFile(files, fieldName) {
  if (!files || !files[fieldName] || !files[fieldName][0]) {
    return null;
  }

  return files[fieldName][0];
}

function getRelativeFilePath(filePath) {
  if (!filePath) {
    return null;
  }

  const relativePath = path.relative(process.cwd(), filePath);

  return normalizePath(relativePath);
}

function validateRequiredFiles(files) {
  const idFront = getUploadedFile(files, "id_front");
  const idBack = getUploadedFile(files, "id_back");
  const proofOfAddress = getUploadedFile(files, "proof_of_address");

  if (!idFront || !idBack || !proofOfAddress) {
    throw new Error("ID front, ID back, and proof of address are required.");
  }

  return {
    idFront,
    idBack,
    proofOfAddress,
  };
}

function validateAnswers(answers) {
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new Error("Answers are required.");
  }

  const requiredFields = ["section", "question_key", "question_text", "answer_type"];

  for (const answer of answers) {
    for (const field of requiredFields) {
      if (!answer[field]) {
        throw new Error(`Answer field "${field}" is required.`);
      }
    }
  }
}

function buildAnswerRows(submissionId, answers) {
  return answers.map((answer) => ({
    submission_id: submissionId,
    section: answer.section,
    question_key: answer.question_key,
    question_text: answer.question_text,
    answer_type: answer.answer_type,
    answer_value:
      answer.answer_value === undefined || answer.answer_value === null ? null : String(answer.answer_value),
    answer_label:
      answer.answer_label === undefined || answer.answer_label === null ? null : String(answer.answer_label),
    other_value: answer.other_value === undefined || answer.other_value === null ? null : String(answer.other_value),
    sort_order: Number(answer.sort_order || 0),
  }));
}

function buildDocumentRows(submissionId, files) {
  const documents = [
    {
      file: files.idFront,
      document_type: "id_front",
      document_label: "ID front side",
    },
    {
      file: files.idBack,
      document_type: "id_back",
      document_label: "ID back side",
    },
    {
      file: files.proofOfAddress,
      document_type: "proof_of_address",
      document_label: "Proof of Address",
    },
  ];

  return documents.map((document) => ({
    submission_id: submissionId,
    document_type: document.document_type,
    document_label: document.document_label,
    original_file_name: document.file.originalname,
    saved_file_name: document.file.filename,
    file_path: getRelativeFilePath(document.file.path),
    mime_type: document.file.mimetype,
    file_size: document.file.size,
    status: "pending",
  }));
}

async function submitVerification(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const { first_name, surname, email, phone, id_passport_number, date_of_birth, country_of_residence } = req.body;

    if (!first_name || !surname || !email || !phone) {
      throw new Error("First name, surname, email, and phone are required.");
    }

    if (!id_passport_number || !date_of_birth || !country_of_residence) {
      throw new Error("ID/passport number, date of birth, and country of residence are required.");
    }

    const answers = parseAnswers(req.body.answers);
    validateAnswers(answers);

    const requiredFiles = validateRequiredFiles(req.files);

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { phone }],
      },
      transaction,
    });

    if (existingUser) {
      throw new Error("A verification submission already exists for this email or phone number.");
    }

    const convertedDateOfBirth = convertDDMMYYYYToYYYYMMDD(date_of_birth);

    const user = await User.create(
      {
        first_name,
        surname,
        email,
        phone,
        id_passport_number,
        date_of_birth: convertedDateOfBirth,
        country_of_residence,
      },
      { transaction },
    );

    const submission = await VerificationSubmission.create(
      {
        user_id: user.id,
        status: "pending",
        submitted_at: new Date(),
      },
      { transaction },
    );

    const answerRows = buildAnswerRows(submission.id, answers);

    await VerificationAnswer.bulkCreate(answerRows, { transaction });

    const documentRows = buildDocumentRows(submission.id, requiredFiles);

    await VerificationDocument.bulkCreate(documentRows, { transaction });

    await transaction.commit();

    let emailSent = true;

    try {
      await sendVerificationSubmittedEmail(user);
    } catch (emailError) {
      emailSent = false;
      console.error("Verification confirmation email failed:", emailError.message);
    }

    return resSuccess(
      res,
      {
        submission: {
          id: submission.id,
          status: submission.status,
          submitted_at: submission.submitted_at,
        },
        email_sent: emailSent,
      },
      201,
      emailSent
        ? "Verification submitted successfully."
        : "Verification submitted successfully, but confirmation email could not be sent.",
    );
  } catch (error) {
    await transaction.rollback();

    deleteUploadedFiles(req.files);

    const statusCode = error.message.includes("already exists") || error.message.includes("already") ? 409 : 400;

    return resError(res, error.message, statusCode);
  }
}

module.exports = {
  submitVerification,
};
