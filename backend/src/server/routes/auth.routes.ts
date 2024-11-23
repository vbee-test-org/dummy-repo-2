import { Request, Response, Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const router = Router();

router.get("/login", AuthController.LoginUsingGithubOAuth);

router.get("/logout", AuthController.LogOut);

router.get("/callback", AuthController.HandleGithubCallback);

router.get("/status", AuthController.getLoginStatus);

export { router as authRoutes };
