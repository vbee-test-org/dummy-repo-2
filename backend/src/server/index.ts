import env from "@/env";
import express, { Express, Request } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { limiter } from "./middlewares/ratelimit";
import { connectDB } from "@/services/mongoose";
import { Server } from "http";
import { apiRoutes } from "./routes";
import path from "path";

export const startServer = async (): Promise<Server> => {
  await connectDB("server");

  const app = express();

  // Content-Type
  app.use(express.json());

  // Security
  app.use(
    cors<Request>({
      origin: ["http://127.0.0.1:5173", "http://localhost:5173"],
      methods: ["HEAD", "GET", "POST"],
    }),
  );
  app.use(helmet());

  // Logging
  app.use(morgan(":method :url :status - :response-time ms"));

  // Rate limiting
  app.use(limiter);

  // Routes
  app.use("/api", apiRoutes);

  if (process.env.NODE_ENV === "production") {
    app.use(
      express.static(path.join(import.meta.dirname, "../../../frontend/dist")),
    );

    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../../../frontend/dist/index.html"));
    });
  }

  const port = env.PORT || 5000;
  return new Promise<Server>((resolve) => {
    const server = app.listen(port, () => {
      console.log("✅[Server]: Express server is ready");
      console.log(`
          \x1b[35m\n 🚀 DORA-tracker 1.0.0\x1b[0m
          - Local:\thttp://localhost:${port}/
          
          Note that the development build is not optimized.
          To create a production build, use \x1b[32mnpm run build\x1b[0m.\n
        `);
      resolve(server);
    });
  });
};
