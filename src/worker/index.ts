import "dotenv/config";
import env from "@/env";
import { Job, Worker } from "bullmq";
import mongoose from "mongoose";
import task from "./task";
import { connectDB } from "@/services/mongoose";

export const startWorker = async () => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      await connectDB("worker");

      const worker = new Worker("runtimeQueue", task.processRepo, {
        connection: { url: env.REDIS_URL },
        removeOnFail: { count: 0 },
        removeOnComplete: { age: 300, count: 10 },
      });

      worker.on("active", (job) => {
        console.log(`[Worker]: Job ${job.id} is now active!`);
      });

      worker.on("completed", (job) => {
        console.log(`[Worker]: Job ${job.id} has completed!`);
      });

      worker.on("failed", (job, err) => {
        console.log(`[Worker]: Job ${job?.id} has failed with ${err.message}`);
      });

      console.log("✅[Worker]: Background worker is ready");
      resolve();
    } catch (error) {
      console.error("Failed to start worker:", error);
      reject(error);
    }
  });
};
