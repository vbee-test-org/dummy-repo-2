import { Request, Response, Router } from "express";
import { JobController } from "../controllers/job.controller";
import { sessionChecker } from "../middlewares/session";

const router = Router();

router.get("/:id", JobController.getJobStatus);

router.post("/", sessionChecker, JobController.queueJob);

export { router as jobRoutes };
