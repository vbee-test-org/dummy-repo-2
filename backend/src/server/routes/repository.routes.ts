import { Request, Response, Router } from "express";
import { RepositoryController } from "../controllers/repository.controller";
import { sessionChecker } from "../middlewares/session";

const router = Router();

router.get("/:owner/:repo", sessionChecker, RepositoryController.getAllCommits);

router.get(
  "/:owner/:repo/:id",
  sessionChecker,
  RepositoryController.getCommitById,
);

export { router as repositoryRoutes };
