import { CommitModel, RepositoryModel } from "@/models";
import octokit from "@/services/octokit";
import { Request, RequestHandler, Response } from "express";

const getCommitById: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { owner, repo, id } = req.params;

    if (!owner || !repo || !id) {
      res.status(400).json({
        error: "Invalid request parameters",
      });
      return;
    }

    const repository = await RepositoryModel.findOne({
      full_name: `${owner}/${repo}`,
    });

    if (!repository) {
      res.status(404).json({
        success: false,
        error: "Repository not found",
      });
      return;
    }

    const commit = await CommitModel.aggregate([
      {
        $match: {
          _id: id,
          repo_id: repository._id,
        },
      },
      {
        $lookup: {
          from: "repositories",
          localField: "repo_id",
          foreignField: "_id",
          as: "repository",
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branch_id",
          foreignField: "_id",
          as: "branch",
        },
      },
      {
        $unwind: {
          path: "$repository",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$branch",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          commit_message: 1,
          author: 1,
          repository: {
            _id: 1,
            full_name: 1,
            private: 1,
          },
          branch: {
            _id: 1,
            name: 1,
          },
        },
      },
    ]);

    if (!commit || commit.length === 0) {
      res.status(404).json({
        success: false,
        message: "Commit not found",
      });
      return;
    }

    res.status(200).json({
      data: commit[0],
    });
    return;
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : `Unknown error: ${error}`,
    });
    return;
  }
};

const getAllCommits: RequestHandler = async (req: Request, res: Response) => {
  let commits;
  try {
    commits = await octokit.repos.listCommits({
      owner: req.params.owner,
      repo: req.params.repo,
    });
  } catch (err) {
    res.status(500).json({ error: err });
    return;
  }

  res.status(200).json({ commits });
  return;
};

export default { getCommitById, getAllCommits };
