import "dotenv/config";
import env from "@/env";
import { startServer } from "./server";
import { startWorker } from "./worker";
import mongoose from "mongoose";

async function bootstrap() {
  try {
    console.log("\n=== Starting DORA Tracker Services ===\n");

    const serverPromise = startServer().catch((error) => {
      console.error("Server failed to start:", error);
      process.exit(1);
    });

    const workerPromise = startWorker().catch((error) => {
      console.error("Worker failed to start:", error);
      process.exit(1);
    });

    await Promise.all([serverPromise, workerPromise]);

    console.log("\n✨ All services are up and running!\n");
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

bootstrap();
