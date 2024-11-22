import env from "@/env";
import express, { Express, Request } from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import session from "express-session";
import { limiter } from "./middlewares/ratelimit";
import { connectDB } from "@/services/mongoose";
import { Server } from "http";
import { apiRoutes } from "./routes";

export const startServer = async (): Promise<Server> => {
  await connectDB("server");

  const app = express();

  app.use(
    session({
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 3 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      },
    }),
  );

  // Content-Type
  app.use(express.json());

  // Security
  if (process.env.NODE_ENV === "development") {
    app.use(
      cors<Request>({
        origin: ["http://127.0.0.1:5173", "http://localhost:5173"],
        methods: ["HEAD", "GET", "POST"],
      }),
    );
  }

  app.use(helmet());

  // Logging
  app.use(morgan(":method :url :status - :response-time ms"));

  // Routes
  app.use("/api", apiRoutes);

  if (process.env.NODE_ENV === "production") {
    app.use(limiter);
    app.use(
      express.static(path.join(import.meta.dirname, "../../../frontend/dist")),
    );

    app.get("*", (req, res) => {
      res.sendFile(
        path.join(import.meta.dirname, "../../../frontend/dist/index.html"),
      );
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
