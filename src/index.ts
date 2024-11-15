import "dotenv/config";
import env from "@/env";
import express, { Request } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { deploymentRoutes } from "./routes/deployment.routes";
import path from "path";
import { jobRoutes } from "./routes/job.routes";

const app = express();
const port = env.PORT || 5000;

// Content-Type
app.use(express.json());

// Security
app.use(cors<Request>({ origin: "*" }));
app.use(helmet());

// Logging
app.use(morgan(":method :url :status - :response-time ms"));

app.use("/public", express.static(path.join(__dirname, "../public")));

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/health", (req, res) => {
  res.status(200).json({
    msg: "Server is healthy",
    last_checked: new Date().toISOString(),
  });
});

app.use("/repos", deploymentRoutes);
app.use("/job", jobRoutes);

// Server start
mongoose
  .connect(env.MONGO_URI, { dbName: env.MONGO_DB_NAME })
  .then(() => {
    app.listen(port, () => {
      console.log(`
      \x1b[35m\n 🚀 DORA-tracker 1.0.0\n\x1b[0m
      - Local:\thttp://localhost:${port}/
      
      Note that the development build is not optimized.
      To create a production build, use \x1b[32mnpm run build\x1b[0m.\n
    `);
    });
  })
  .catch((err) => console.log(`\x1B[31m${err}\x1B[0m`));
