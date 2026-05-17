const { Op } = require("sequelize");

const { User, VerificationSubmission, VerificationDocument } = require("../../models");

const { resSuccess, resError } = require("../../utils/responseUtil");
const { convertYYYYMMDDToDDMMYYYY, formatDateTimeToDDMMYYYY } = require("../../utils/dateUtil");

function getTodayDateRange() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  return {
    startOfToday,
    endOfToday,
  };
}

function formatRecentSubmission(submission) {
  const user = submission.user;

  return {
    id: submission.id,
    status: submission.status,
    submitted_at: formatDateTimeToDDMMYYYY(submission.submitted_at),
    reviewed_at: formatDateTimeToDDMMYYYY(submission.reviewed_at),

    user: user
      ? {
          id: user.id,
          first_name: user.first_name,
          surname: user.surname,
          email: user.email,
          phone: user.phone,
          id_passport_number: user.id_passport_number,
          date_of_birth: convertYYYYMMDDToDDMMYYYY(user.date_of_birth),
          country_of_residence: user.country_of_residence,
        }
      : null,
  };
}

async function getDashboardCounts(req, res) {
  try {
    const { startOfToday, endOfToday } = getTodayDateRange();

    const [
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      todaySubmissions,
      totalUsers,
      totalDocuments,
      pendingDocuments,
      approvedDocuments,
      rejectedDocuments,
      recentSubmissions,
    ] = await Promise.all([
      VerificationSubmission.count(),

      VerificationSubmission.count({
        where: { status: "pending" },
      }),

      VerificationSubmission.count({
        where: { status: "approved" },
      }),

      VerificationSubmission.count({
        where: { status: "rejected" },
      }),

      VerificationSubmission.count({
        where: {
          submitted_at: {
            [Op.between]: [startOfToday, endOfToday],
          },
        },
      }),

      User.count(),

      VerificationDocument.count(),

      VerificationDocument.count({
        where: { status: "pending" },
      }),

      VerificationDocument.count({
        where: { status: "approved" },
      }),

      VerificationDocument.count({
        where: { status: "rejected" },
      }),

      VerificationSubmission.findAll({
        limit: 5,
        order: [["submitted_at", "DESC"]],
        include: [
          {
            model: User,
            as: "user",
            attributes: [
              "id",
              "first_name",
              "surname",
              "email",
              "phone",
              "id_passport_number",
              "date_of_birth",
              "country_of_residence",
            ],
          },
        ],
      }),
    ]);

    return resSuccess(
      res,
      {
        submissions: {
          total: totalSubmissions,
          pending: pendingSubmissions,
          approved: approvedSubmissions,
          rejected: rejectedSubmissions,
          today: todaySubmissions,
        },

        users: {
          total: totalUsers,
        },

        documents: {
          total: totalDocuments,
          pending: pendingDocuments,
          approved: approvedDocuments,
          rejected: rejectedDocuments,
        },

        recent_submissions: recentSubmissions.map(formatRecentSubmission),
      },
      200,
      "Dashboard counts fetched successfully.",
    );
  } catch (error) {
    console.error("Dashboard counts error:", error);
    return resError(res, "Failed to fetch dashboard counts.", 500);
  }
}

module.exports = {
  getDashboardCounts,
};
