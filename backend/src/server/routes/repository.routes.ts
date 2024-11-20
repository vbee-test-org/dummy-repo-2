import octokit from "@/services/octokit";
import { Request, Response, Router } from "express";
import { RepositoryController } from "../controllers";

const router = Router();

router.get("/:owner/:repo", RepositoryController.getAllCommits);

router.get("/:owner/:repo/:id", RepositoryController.getCommitById);

export { router as repositoryRoutes };
