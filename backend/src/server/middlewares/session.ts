import { NextFunction, Request, Response } from "express";

export const sessionChecker = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized, please log in" });
  }
  next();
};
