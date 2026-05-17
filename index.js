const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const colors = require("colors");
const path = require("path");

const { connectDB } = require("./config/database");

const verificationRoutes = require("./routes/verificationRoutes");
const adminAuthRoutes = require("./routes/admin/adminAuthRoutes");
const adminDashboardRoutes = require("./routes/admin/adminDashboardRoutes");
const verificationReviewRoutes = require("./routes/admin/verificationReviewRoutes");

const { notFoundMiddleware, errorMiddleware } = require("./middlewares/errorMiddleware");

dotenv.config();

const app = express();

const PORT = process.env.NODE_EAZY_VERIFICATION_PORT || 8080;
const MODE = process.env.NODE_EAZY_VERIFICATION_MODE || "development";
const CLIENT_URL = process.env.NODE_EAZY_VERIFICATION_CLIENT_URL || "http://localhost:5173";
const FRONTEND_URL = process.env.NODE_EAZY_VERIFICATION_FRONTEND_URL || "http://localhost:5173";

const allowedOrigins = [CLIENT_URL, FRONTEND_URL].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS."));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (MODE === "development") {
  app.use(morgan("dev"));
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  return res.status(200).json({
    code: "OK",
    message: "Eazy Verification Backend API is running.",
  });
});

app.get("/api/v1/health", (req, res) => {
  return res.status(200).json({
    code: "OK",
    message: "Server is healthy.",
    environment: MODE,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1/verification", verificationRoutes);
app.use("/api/v1/admin/auth", adminAuthRoutes);
app.use("/api/v1/admin/dashboard", adminDashboardRoutes);
app.use("/api/v1/admin/verifications", verificationReviewRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running in ${MODE} mode on port ${PORT}`.bgGreen.white);
    });
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`.bgRed.white);
    process.exit(1);
  }
}

startServer();
