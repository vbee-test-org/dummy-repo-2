import env from "@/env";
import express, { Request } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { connectDB } from "@/services/mongoose";
import { deploymentRoutes, jobRoutes } from "./routes";

export const startServer = async (): Promise<void> => {
  await connectDB("server");

  const app = express();
  const port = env.PORT || 3000;

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

  await new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`
        \x1b[35m\n 🚀 DORA-tracker 1.0.0\x1b[0m
        - Local:\thttp://localhost:${port}/
        
        Note that the development build is not optimized.
        To create a production build, use \x1b[32mnpm run build\x1b[0m.\n
      `);
      console.log("✅[Server]: Express server is ready");
      resolve();
    });
  });

  return app;
};
