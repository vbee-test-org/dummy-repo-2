import { Request, Response, Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const router = Router();

router.get("/", AuthController.RedirectGithubOauth);

router.get("/callback", AuthController.HandleGithubCallback);

export { router as authRoutes };
