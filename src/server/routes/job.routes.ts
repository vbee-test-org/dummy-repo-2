import { Request, Response, Router } from "express";
import { JobController } from "../controllers";

const router = Router();

router.get("/:id", JobController.getJobStatus);

router.post("/", JobController.queueJob);

export { router as jobRoutes };
