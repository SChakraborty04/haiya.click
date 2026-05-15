import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import authRoute from "./routes/auth.routes.js";
import pollRoute from "./routes/poll.routes.js";
import questionRoute from "./routes/question.routes.js";

const app = express();
app.set("trust proxy", true);

const allowed = ["http://localhost:5173", "http://localhost:3000", process.env.FRONTEND_URL];

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//Routes
app.use("/api/auth", authRoute);
app.use("/api/polls", pollRoute);
app.use("/api/questions", questionRoute);

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Only log 500s or unknown errors to console
  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

export default app;