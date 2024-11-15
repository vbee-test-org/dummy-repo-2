import { Request, Response, Router } from "express";
import { getJobStatus, queueJob } from "../controllers/job.controller";

const router = Router();

router.get("/:id", getJobStatus);

router.post("/", queueJob);

export { router as jobRoutes };
