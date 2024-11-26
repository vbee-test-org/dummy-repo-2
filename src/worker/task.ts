import { Repository, Branch } from "@/models";
import { Job } from "bullmq";
import { TaskController } from "./controllers/task.controller";
import { Octokit } from "@octokit/rest";
import env from "@/env";

interface WData {
  link: string;
  user_id: string;
}

const processRepo = async (job: Job<WData>) => {
  console.log("processing job");
  const { link } = job.data;

  const octokit = new Octokit({
    auth: env.GH_PAT,
  });

  console.log("Scanning for repository...");
  // Extract owner and repository name from link
  // e.g: https://github.com/mui/material-ui => owner: mui, repo: material-ui
  const [owner, repo] = TaskController.scanUserInput(link);

  // Checks for repository on database, if doesn't exist, create a new repository document
  const repository: Repository = await TaskController.scanRepository(
    octokit,
    owner,
    repo,
  );

  console.log(
    `Scanning for default branch in ${repository.owner}/${repository.name}...`,
  );
  const branch = await TaskController.scanDefaultBranch(repository);

  console.log(
    `Scanning commits from ${branch.name} - ${repository.owner}/${repository.name}...`,
  );
  const commits = await TaskController.scanCommits(octokit, repository, branch);

  await job.updateProgress(50);

  console.log(
    `Scanning deployments from ${repository.owner}/${repository.name}`,
  );
  await Promise.all([
    TaskController.scanWorkflows(octokit, repository, branch, commits),
    TaskController.scanReleases(octokit, repository, branch, commits),
    //TaskController.scanDeploymentsFromGoogleDocs(octokit, repository, prod),
  ]);

  await job.updateProgress(100);
};

export default { processRepo };
