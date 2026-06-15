const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { Op } = require("sequelize");

const { User, Admin, VerificationSubmission, VerificationAnswer, VerificationDocument } = require("../../models");

const { resSuccess, resError } = require("../../utils/responseUtil");
const {
  convertDDMMYYYYToYYYYMMDD,
  convertYYYYMMDDToDDMMYYYY,
  formatDateTimeToDDMMYYYY,
} = require("../../utils/dateUtil");
const { getFileUrl } = require("../../utils/fileUtil");

const PDF_COLORS = {
  background: "#f7f7f5",
  card: "#ffffff",
  text: "#171717",
  muted: "#737373",
  softText: "#a3a3a3",
  border: "#e5e5e5",
  dark: "#111111",
  accentSoft: "#ecfccb",
  accent: "#65a30d",
  accentDark: "#3f6212",
  dangerSoft: "#fee2e2",
  danger: "#b91c1c",
  warningSoft: "#fef3c7",
  warning: "#92400e",
};

const complianceQuestionKeys = ["fatca_reportable_person", "politically_exposed_person"];

const goalQuestionKeys = ["short_term_financial_goals", "long_term_financial_goals"];

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

function getClientFullName(user) {
  if (!user) {
    return "client";
  }

  return [user.first_name, user.surname].filter(Boolean).join(" ").trim() || "client";
}

function getInitials(user) {
  const first = user?.first_name || "";
  const last = user?.surname || "";

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }

  return getClientFullName(user).substring(0, 2).toUpperCase();
}

function getSafePdfFileName(user) {
  const clientName = getClientFullName(user)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${clientName || "client"}_profile.pdf`;
}

function formatPdfValue(value) {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  return String(value);
}

function getPrettyLabel(value) {
  if (!value) {
    return "N/A";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function getStatusStyles(status) {
  if (status === "approved") {
    return {
      background: PDF_COLORS.accentSoft,
      text: PDF_COLORS.accentDark,
    };
  }

  if (status === "rejected") {
    return {
      background: PDF_COLORS.dangerSoft,
      text: PDF_COLORS.danger,
    };
  }

  return {
    background: PDF_COLORS.warningSoft,
    text: PDF_COLORS.warning,
  };
}

function isImageDocument(document) {
  return ["image/jpeg", "image/jpg", "image/png"].includes(String(document.mime_type || "").toLowerCase());
}

function groupAnswers(answers) {
  const questionMap = new Map();

  answers.forEach((answer) => {
    if (!questionMap.has(answer.question_key)) {
      questionMap.set(answer.question_key, {
        question_key: answer.question_key,
        question_text: answer.question_text,
        sort_order: answer.sort_order,
        values: [],
      });
    }

    const question = questionMap.get(answer.question_key);

    const displayValue = answer.other_value
      ? `${answer.answer_label || "Other"}: ${answer.other_value}`
      : answer.answer_label || answer.answer_value || "N/A";

    question.values.push(displayValue);
  });

  return Array.from(questionMap.values())
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((question) => ({
      ...question,
      display_value: question.values.join(", "),
    }));
}

function getAnswersByKeys(answers, keys) {
  return groupAnswers(answers.filter((answer) => keys.includes(answer.question_key)));
}

function getPreparedAnswers(submission) {
  const answers = submission.answers
    ? submission.answers.map(formatAnswer).sort((a, b) => a.sort_order - b.sort_order)
    : [];

  return {
    complianceAnswers: getAnswersByKeys(answers, complianceQuestionKeys),
    professionalAnswers: groupAnswers(answers.filter((answer) => answer.section === "professional_work_experience")),
    financialAnswers: groupAnswers(answers.filter((answer) => answer.section === "financial_information")),
  };
}

function findAnswerByKey(answers, questionKey) {
  return answers.find((answer) => answer.question_key === questionKey);
}

function findAnswerByText(answers, keywords) {
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());

  return answers.find((answer) => {
    const combinedText = `${answer.question_key || ""} ${answer.question_text || ""}`.toLowerCase();

    return normalizedKeywords.some((keyword) => combinedText.includes(keyword));
  });
}

function getAnswerValue(answers, questionKey, fallback = "Not provided") {
  const answer = findAnswerByKey(answers, questionKey);

  return answer?.display_value || fallback;
}

function getFinancialValue(financialAnswers, keywords, fallback = "Not provided") {
  const answer = findAnswerByText(financialAnswers, keywords);

  return answer?.display_value || fallback;
}

function getWorkSummary(professionalAnswers) {
  const jobTitle = getAnswerValue(professionalAnswers, "current_job_title_designation", "");
  const industry = getAnswerValue(professionalAnswers, "industry_business_sector", "");
  const experience = getAnswerValue(professionalAnswers, "years_of_work_experience", "");

  if (!jobTitle && !industry && !experience) {
    return "Professional information not provided.";
  }

  if (jobTitle && industry && experience) {
    return `Worked as ${jobTitle} in ${industry} for ${experience}.`;
  }

  if (jobTitle && experience) {
    return `Worked as ${jobTitle} for ${experience}.`;
  }

  if (jobTitle && industry) {
    return `Worked as ${jobTitle} in ${industry}.`;
  }

  if (industry && experience) {
    return `Worked in ${industry} for ${experience}.`;
  }

  return jobTitle || industry || experience;
}

function getTraderProfileItems(financialAnswers) {
  return [
    {
      label: "Trading Experience",
      value: getAnswerValue(financialAnswers, "trading_experience"),
    },
    {
      label: "Investment Knowledge",
      value: getAnswerValue(financialAnswers, "knowledge_of_cfds"),
    },
    {
      label: "Annual Income",
      value: getAnswerValue(financialAnswers, "annual_income"),
    },
    {
      label: "Savings & Investments",
      value: getAnswerValue(financialAnswers, "savings_and_investments_value"),
    },
    {
      label: "Source of Funds",
      value: getAnswerValue(financialAnswers, "source_of_funds"),
    },
    {
      label: "Trading Purpose",
      value: getAnswerValue(financialAnswers, "main_purpose_for_investing_trading"),
    },
    {
      label: "Income Source",
      value: getAnswerValue(financialAnswers, "income_source"),
    },
    {
      label: "Risk Appetite",
      value: getFinancialValue(financialAnswers, ["risk", "risk appetite", "loss"]),
    },
  ];
}

function getComplianceItems(complianceAnswers) {
  return [
    {
      label: "FATCA",
      value: getAnswerValue(complianceAnswers, "fatca_reportable_person"),
    },
    {
      label: "PEP",
      value: getAnswerValue(complianceAnswers, "politically_exposed_person"),
    },
  ];
}

function getOtherFinancialAnswers(financialAnswers) {
  const usedAnswers = new Set([
    "trading_experience",
    "knowledge_of_cfds",
    "annual_income",
    "savings_and_investments_value",
    "source_of_funds",
    "main_purpose_for_investing_trading",
    "income_source",
  ]);

  const normalAnswers = financialAnswers.filter(
    (answer) => !usedAnswers.has(answer.question_key) && !goalQuestionKeys.includes(answer.question_key),
  );

  const goalAnswers = goalQuestionKeys
    .map((questionKey) => financialAnswers.find((answer) => answer.question_key === questionKey))
    .filter(Boolean);

  return [...normalAnswers, ...goalAnswers];
}

function setPageBackground(doc) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(PDF_COLORS.background);
}

function ensurePdfSpace(doc, neededHeight = 80) {
  if (doc.y + neededHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    setPageBackground(doc);
    doc.y = doc.page.margins.top;
  }
}

function drawStatusPill(doc, status, x, y) {
  const styles = getStatusStyles(status);
  const label = getPrettyLabel(status);
  const width = Math.max(66, doc.widthOfString(label) + 26);

  doc.roundedRect(x, y, width, 22, 11).fill(styles.background);

  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor(styles.text)
    .text(label, x, y + 7, {
      width,
      align: "center",
    });

  return width;
}

function drawModalLikeHeader(doc, submission) {
  const user = submission.user;
  const x = doc.page.margins.left;
  const y = doc.y;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.roundedRect(x, y, width, 82, 18).fill(PDF_COLORS.card);

  doc.roundedRect(x + 16, y + 18, 46, 46, 12).fill(PDF_COLORS.accentSoft);
  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .fillColor(PDF_COLORS.accentDark)
    .text(getInitials(user), x + 16, y + 34, {
      width: 46,
      align: "center",
    });

  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(PDF_COLORS.text)
    .text(getClientFullName(user), x + 76, y + 20, {
      width: width - 190,
      lineGap: 1,
    });

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(PDF_COLORS.softText)
    .text(user?.email || "No email provided", x + 76, y + 46, {
      width: width - 190,
    });

  drawStatusPill(doc, submission.status, x + width - 95, y + 28);

  doc.y = y + 102;
}

function drawCard(doc, title, options = {}) {
  ensurePdfSpace(doc, options.height || 120);

  const x = options.x || doc.page.margins.left;
  const y = options.y || doc.y;
  const width = options.width || doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const height = options.height || 120;

  doc.roundedRect(x, y, width, height, 18).fill(PDF_COLORS.card);

  if (title) {
    doc.roundedRect(x + 14, y + 14, 28, 28, 8).fill(PDF_COLORS.accentSoft);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(PDF_COLORS.accentDark)
      .text("•", x + 14, y + 20, {
        width: 28,
        align: "center",
      });

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(PDF_COLORS.text)
      .text(title, x + 52, y + 20, {
        width: width - 68,
      });
  }

  return {
    x,
    y,
    width,
    height,
    contentX: x + 16,
    contentY: title ? y + 58 : y + 16,
    contentWidth: width - 32,
  };
}

function drawDetailRow(doc, x, y, width, label, value) {
  doc.fontSize(7).font("Helvetica-Bold").fillColor(PDF_COLORS.softText).text(String(label).toUpperCase(), x, y, {
    width,
  });

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(PDF_COLORS.text)
    .text(formatPdfValue(value), x, y + 11, {
      width,
      lineGap: 1,
    });
}

function drawSmallMetric(doc, x, y, width, label, value) {
  doc.roundedRect(x, y, width, 54, 12).fill(PDF_COLORS.background);

  doc
    .fontSize(7)
    .font("Helvetica-Bold")
    .fillColor(PDF_COLORS.softText)
    .text(String(label).toUpperCase(), x + 10, y + 10, {
      width: width - 20,
    });

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(PDF_COLORS.text)
    .text(formatPdfValue(value), x + 10, y + 24, {
      width: width - 20,
      lineGap: 1,
    });
}

function drawClientAndWorkCard(doc, submission, professionalAnswers) {
  const user = submission.user;
  const card = drawCard(doc, "Client Information", {
    height: 260,
  });

  const rowWidth = (card.contentWidth - 16) / 2;

  drawSmallMetric(doc, card.contentX, card.contentY, rowWidth, "Phone", user?.phone);
  drawSmallMetric(
    doc,
    card.contentX + rowWidth + 16,
    card.contentY,
    rowWidth,
    "ID / Passport",
    user?.id_passport_number,
  );
  drawSmallMetric(
    doc,
    card.contentX,
    card.contentY + 66,
    rowWidth,
    "Date of Birth",
    convertYYYYMMDDToDDMMYYYY(user?.date_of_birth),
  );
  drawSmallMetric(
    doc,
    card.contentX + rowWidth + 16,
    card.contentY + 66,
    rowWidth,
    "Country",
    user?.country_of_residence,
  );

  const workY = card.contentY + 142;

  doc.roundedRect(card.contentX, workY, card.contentWidth, 82, 14).fill(PDF_COLORS.background);

  doc
    .fontSize(7)
    .font("Helvetica-Bold")
    .fillColor(PDF_COLORS.softText)
    .text("WORK PROFILE", card.contentX + 12, workY + 12);
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(PDF_COLORS.text)
    .text(getWorkSummary(professionalAnswers), card.contentX + 12, workY + 28, {
      width: card.contentWidth - 24,
      lineGap: 2,
    });

  doc.y = card.y + card.height + 14;
}

function drawComplianceCard(doc, complianceAnswers) {
  const items = getComplianceItems(complianceAnswers);
  const card = drawCard(doc, "Compliance", {
    height: 128,
  });

  const itemWidth = (card.contentWidth - 16) / 2;

  items.forEach((item, index) => {
    const x = card.contentX + index * (itemWidth + 16);

    drawSmallMetric(doc, x, card.contentY, itemWidth, item.label, item.value);
  });

  doc.y = card.y + card.height + 14;
}

function drawTraderProfileCard(doc, financialAnswers) {
  const items = getTraderProfileItems(financialAnswers);
  const card = drawCard(doc, "Trader Profile", {
    height: 322,
  });

  const colWidth = (card.contentWidth - 18) / 2;
  const rowHeight = 58;

  items.forEach((item, index) => {
    const column = index < 4 ? 0 : 1;
    const row = column === 0 ? index : index - 4;
    const x = card.contentX + column * (colWidth + 18);
    const y = card.contentY + row * rowHeight;

    drawDetailRow(doc, x, y, colWidth, item.label, item.value);
  });

  doc.y = card.y + card.height + 14;
}

function drawReviewDetailsCard(doc, submission) {
  const reviewer = submission.reviewer;
  const card = drawCard(doc, "Review Details", {
    height: 172,
  });

  const rowWidth = (card.contentWidth - 16) / 2;

  drawSmallMetric(doc, card.contentX, card.contentY, rowWidth, "Submission ID", submission.id);
  drawSmallMetric(
    doc,
    card.contentX + rowWidth + 16,
    card.contentY,
    rowWidth,
    "Submitted At",
    formatDateTimeToDDMMYYYY(submission.submitted_at),
  );
  drawSmallMetric(
    doc,
    card.contentX,
    card.contentY + 66,
    rowWidth,
    "Reviewed At",
    formatDateTimeToDDMMYYYY(submission.reviewed_at),
  );
  drawSmallMetric(
    doc,
    card.contentX + rowWidth + 16,
    card.contentY + 66,
    rowWidth,
    "Reviewer",
    reviewer ? `${reviewer.name} (${reviewer.email})` : "N/A",
  );

  doc.y = card.y + card.height + 14;
}

function drawAdditionalInformation(doc, financialAnswers) {
  const additionalAnswers = getOtherFinancialAnswers(financialAnswers);

  if (!additionalAnswers.length) {
    return;
  }

  doc.addPage();
  setPageBackground(doc);
  doc.y = doc.page.margins.top;

  doc.fontSize(16).font("Helvetica-Bold").fillColor(PDF_COLORS.text).text("Additional Information");
  doc.moveDown(1);

  additionalAnswers.forEach((answer) => {
    ensurePdfSpace(doc, 74);

    const x = doc.page.margins.left;
    const y = doc.y;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const questionHeight = doc.heightOfString(answer.question_text, {
      width: width - 32,
    });
    const valueHeight = doc.heightOfString(answer.display_value || "N/A", {
      width: width - 32,
    });
    const height = Math.max(70, questionHeight + valueHeight + 38);

    doc.roundedRect(x, y, width, height, 14).fill(PDF_COLORS.card);

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(PDF_COLORS.text)
      .text(answer.question_text, x + 16, y + 14, {
        width: width - 32,
        lineGap: 2,
      });

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(PDF_COLORS.muted)
      .text(answer.display_value || "N/A", x + 16, y + 24 + questionHeight, {
        width: width - 32,
        lineGap: 2,
      });

    doc.y = y + height + 10;
  });
}

function drawProfilePages(doc, submission) {
  const { complianceAnswers, professionalAnswers, financialAnswers } = getPreparedAnswers(submission);

  setPageBackground(doc);
  drawModalLikeHeader(doc, submission);
  drawClientAndWorkCard(doc, submission, professionalAnswers);
  drawComplianceCard(doc, complianceAnswers);
  drawReviewDetailsCard(doc, submission);

  doc.addPage();
  setPageBackground(doc);
  doc.y = doc.page.margins.top;
  drawTraderProfileCard(doc, financialAnswers);

  if (submission.rejection_reason) {
    const card = drawCard(doc, "Rejection Reason", {
      height: 116,
    });

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(PDF_COLORS.danger)
      .text(submission.rejection_reason, card.contentX, card.contentY, {
        width: card.contentWidth,
        lineGap: 2,
      });

    doc.y = card.y + card.height + 14;
  }

  if (submission.internal_notes) {
    const card = drawCard(doc, "Internal Notes", {
      height: 116,
    });

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(PDF_COLORS.text)
      .text(submission.internal_notes, card.contentX, card.contentY, {
        width: card.contentWidth,
        lineGap: 2,
      });

    doc.y = card.y + card.height + 14;
  }

  drawAdditionalInformation(doc, financialAnswers);
}

function drawDocumentImagePage(doc, submission, document) {
  doc.addPage();
  setPageBackground(doc);
  doc.y = doc.page.margins.top;

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const header = drawCard(doc, null, {
    x,
    y: doc.y,
    width,
    height: 82,
  });

  doc.roundedRect(header.contentX, header.y + 18, 46, 46, 12).fill(PDF_COLORS.accentSoft);
  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .fillColor(PDF_COLORS.accentDark)
    .text("DOC", header.contentX, header.y + 34, {
      width: 46,
      align: "center",
    });

  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(PDF_COLORS.text)
    .text(document.document_label || "Uploaded Document", header.contentX + 60, header.y + 20, {
      width: width - 180,
    });

  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor(PDF_COLORS.softText)
    .text(
      document.original_file_name || document.saved_file_name || "Uploaded file",
      header.contentX + 60,
      header.y + 47,
      {
        width: width - 180,
      },
    );

  drawStatusPill(doc, document.status, x + width - 96, header.y + 30);

  doc.y = header.y + header.height + 16;

  if (document.rejection_reason) {
    const note = drawCard(doc, "Document Review Note", {
      height: 92,
    });

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(PDF_COLORS.danger)
      .text(document.rejection_reason, note.contentX, note.contentY, {
        width: note.contentWidth,
        lineGap: 2,
      });

    doc.y = note.y + note.height + 14;
  }

  const imageBoxY = doc.y;
  const imageBoxHeight = doc.page.height - imageBoxY - doc.page.margins.bottom - 8;

  doc.roundedRect(x, imageBoxY, width, imageBoxHeight, 18).fill(PDF_COLORS.card);

  if (!isImageDocument(document)) {
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(PDF_COLORS.muted)
      .text("This document is not an image file, so it was not embedded.", x + 18, imageBoxY + 18, {
        width: width - 36,
      });

    return;
  }

  const absoluteFilePath = path.resolve(document.file_path);

  if (!fs.existsSync(absoluteFilePath)) {
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(PDF_COLORS.muted)
      .text("Image file not found on the server.", x + 18, imageBoxY + 18, {
        width: width - 36,
      });

    return;
  }

  try {
    doc.image(absoluteFilePath, x + 18, imageBoxY + 18, {
      fit: [width - 36, imageBoxHeight - 36],
      align: "center",
      valign: "center",
    });
  } catch (error) {
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(PDF_COLORS.muted)
      .text("Image could not be embedded in the PDF.", x + 18, imageBoxY + 18, {
        width: width - 36,
      });
  }
}

function drawVerificationProfilePdf(doc, submission) {
  const documents = submission.documents || [];

  drawProfilePages(doc, submission);

  documents.forEach((document) => {
    drawDocumentImagePage(doc, submission, document);
  });
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

async function downloadVerificationProfilePdf(req, res) {
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

    const fileName = getSafePdfFileName(submission.user);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({
      size: "A4",
      margin: 36,
      autoFirstPage: true,
      bufferPages: true,
    });

    doc.pipe(res);

    drawVerificationProfilePdf(doc, submission);

    doc.end();
  } catch (error) {
    console.error("Download verification profile PDF error:", error);
    return resError(res, "Failed to download verification profile PDF.", 500);
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
  downloadVerificationProfilePdf,
};
