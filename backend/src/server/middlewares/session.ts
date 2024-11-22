import { NextFunction, Request, Response } from "express";

export const sessionChecker = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.session.user) {
    return res.redirect(302, "/login");
  }
  next();
};
