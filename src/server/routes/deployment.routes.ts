import octokit from "@/services/octokit";
import { Request, Response, Router } from "express";

const router = Router();

router.get("/:owner/:repo", async (req, res) => {
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
});

export { router as deploymentRoutes };
