import { Request, Response, Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const router = Router();

router.get("/", AuthController.LoginUsingGithubOAuth);

router.get("/callback", AuthController.HandleGithubCallback);

router.get("/status", AuthController.getUserLoginStatus);

export { router as authRoutes };
