import "dotenv/config";
import express, { Request } from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import env from "@/env";

const app = express();
const port = env.PORT || 5000;

// Content-Type
app.use(express.json());

// Security
app.use(cors<Request>());
app.use(helmet());

// Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// End-points
app.get("/", (req, res) => {
  res.status(200).json({
    msg: "Server is healthy",
    last_checked: new Date().toISOString(),
  });
});

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
