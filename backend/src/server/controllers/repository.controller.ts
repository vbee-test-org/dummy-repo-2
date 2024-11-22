import { CommitModel, RepositoryModel } from "@/models";
import { Request, RequestHandler, Response } from "express";

const getCommitById: RequestHandler = async (req: Request, res: Response) => {};

const getAllCommits: RequestHandler = async (req: Request, res: Response) => {};

const RepositoryController = {
  getCommitById,
  getAllCommits,
};

export { RepositoryController };
