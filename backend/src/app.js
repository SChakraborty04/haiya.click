import cookieParser from "cookie-parser";
import express from "express";
import authRoute from "./routes/auth.routes.js";
import pollRoute from "./routes/poll.routes.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//Routes
app.use("/api/auth", authRoute);
app.use("/api/polls", pollRoute);

export default app;