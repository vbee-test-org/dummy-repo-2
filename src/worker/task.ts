import { Repository, Branch } from "@/models";
import { Job } from "bullmq";
import {
  createBranches,
  createCommits,
  createRepository,
} from "./controllers/task.controller";

const processRepo = async (job: Job) => {
  console.log("processing job");
  const { link, id } = job.data;

  console.log("Scanning for repository...");
  // Extract owner and repository name from link
  // e.g: https://github.com/mui/material-ui => owner: mui, repo: material-ui
  const [owner, repo] = extractUserInput(link);

  // Checks for repository on database, if doesn't exist, create a new repository document
  const repository: Repository = await createRepository(owner, repo);

  // Checks for branches in the specific repository, if doesn't exist, create new branch document(s)
  if (typeof repository._id === "number") {
    const branches = await createBranches(owner, repo, repository._id);
    await job.updateProgress(50);

    // Adding commits
    for (const branch of branches) {
      await createCommits(owner, repo, repository._id, branch);
    }

    await job.updateProgress(100);
  } else {
    throw new Error("Repository ID is invalid. Expected a number.");
  }
};

const extractUserInput = (link: string): [string, string] => {
  const parts = link.split("/");
  const owner = parts[parts.length - 2];
  const repo = parts[parts.length - 1];
  return [owner, repo];
};

export default { processRepo };
