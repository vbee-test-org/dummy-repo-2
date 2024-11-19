import { Repository, Branch } from "@/models";
import { Job } from "bullmq";
import { TaskController } from "./controllers/task.controller";

const processRepo = async (job: Job) => {
  console.log("processing job");
  const { link, id } = job.data;

  console.log("Scanning for repository...");
  // Extract owner and repository name from link
  // e.g: https://github.com/mui/material-ui => owner: mui, repo: material-ui
  const [owner, repo] = TaskController.extractUserInput(link);

  // Checks for repository on database, if doesn't exist, create a new repository document
  const repository: Repository = await TaskController.createRepository(
    owner,
    repo,
  );

  // Checks for branches in repository (hard-coded branches, may fix later)
  const [dev, uat, prod]: Branch[] = await Promise.all([
    TaskController.createBranch(repository, "dev"),
    //TaskController.createBranch(repository, "uat"),
    //TaskController.createBranch(repository, "prod"),
  ]);
  await job.updateProgress(50);

  // Scan for Docker image deployments in dev branch, releases in uat branch
  await Promise.all([
    TaskController.scanDeployments(repository, dev),
    TaskController.scanReleases(repository, uat),
  ]);

  await job.updateProgress(100);
};

export default { processRepo };
