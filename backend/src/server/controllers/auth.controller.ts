import env from "@/env";
import { User, UserModel } from "@/models";
import axios from "axios";
import { Request, RequestHandler, Response } from "express";

const LoginUsingGithubOAuth: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  res.redirect(
    302,
    `https://github.com/login/oauth/authorize?client_id=${env.GH_CLIENT_ID}&scope=read:user%20repo`,
  );
};

const LogOut: RequestHandler = async (req, res) => {
  const sessionUser = req.session.user;
  if (!sessionUser) {
    res.status(500).json({ error: "Failed to fetch user's session" });
  }

  try {
    await Promise.all([
      UserModel.updateOne(
        {
          github_id: sessionUser?.github_id,
        },
        { is_authenticated: false },
      ),
      new Promise<void>((resolve, reject) => {
        req.session.destroy((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }),
    ]);

    res.clearCookie("connect.sid");

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error destroying session:", error);
    res.status(500).json({ message: "Failed to log out" });
  }
};

const HandleGithubCallback: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const code = req.query.code;

    const { data: tokenData } = await axios.post(
      `https://github.com/login/oauth/access_token?client_id=${env.GH_CLIENT_ID}&client_secret=${env.GH_CLIENT_SECRET}&code=${code}`,
      {},
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    const { access_token } = tokenData;
    if (!access_token) {
      res.status(400).json({ error: "Failed to retrieve access token" });
      return;
    }

    const { data: userData } = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `token ${access_token}` },
    });

    let user = await UserModel.findOne({ github_id: userData.id });

    if (!user) {
      user = await UserModel.create({
        github_id: userData.id,
        username: userData.login || `gh_user_${userData.id}`,
        display_name: userData.name,
        access_token,
        is_authenticated: true,
        last_login: new Date().toISOString(),
      });
    } else {
      (user.is_authenticated = true), (user.last_login = new Date());
      await user.save();
    }

    req.session.user = user;

    return res.redirect(302, "/");
  } catch (error) {
    res.status(500).json({ error });
  }
};

const AuthController = {
  HandleGithubCallback,
  LoginUsingGithubOAuth,
  LogOut,
};

export { AuthController };
