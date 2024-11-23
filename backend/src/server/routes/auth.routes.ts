import { Request, Response, Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { sessionChecker } from "../middlewares/session";

const router = Router();

router.get("/login", AuthController.LoginUsingGithubOAuth);

router.get("/logout", sessionChecker, AuthController.LogOut);

router.get("/callback", AuthController.HandleGithubCallback);

router.get("/status", sessionChecker, (req, res) => {
  res.status(200).json({ message: "User is logged in" });
  return;
});

export { router as authRoutes };
