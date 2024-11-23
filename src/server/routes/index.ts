import { Router } from "express";
import { jobRoutes } from "./job.routes";
import { repositoryRoutes } from "./repository.routes";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    msg: "Server is healthy",
    last_checked: new Date().toISOString(),
  });
});

router.use("/v1/jobs", jobRoutes);

router.use("/v1/repos", repositoryRoutes);

export { router as apiRoutes };
