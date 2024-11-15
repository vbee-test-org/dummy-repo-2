import { getJobStatus, queueJob } from "@/controllers/job.controller";
import { Request, Response, Router } from "express";

const router = Router();

router.get("/:id", getJobStatus);

router.post("/", queueJob);

export { router as jobRoutes };
