import "dotenv/config";
import { Job, Worker } from "bullmq";
import queue from ".";
import octokit from "@/services/octokit";
import env from "@/env";

const worker = new Worker(
  "runtimeQueue",
  async (job) => {
    console.log("processing job");
    const { link, id } = job.data;

    try {
      // Extract owner and repository name from link
      // e.g: https://github.com/mui/material-ui => owner: mui, repo: material-ui
      const [owner, repo] = extractUserInput(link);

      // Dev - get Docker image build time
      const {
        data: { workflow_runs },
      } = await octokit.actions.listWorkflowRunsForRepo({
        owner,
        repo,
      });

      job.updateProgress(50);

      const devBranchRuns = workflow_runs.filter(
        (run) => run.head_branch === "dev",
      );

      job.updateProgress(100);

      console.log(devBranchRuns);
    } catch (error) {
      console.log(error);
    }
  },
  {
    connection: { url: env.REDIS_URL },
    removeOnFail: { age: 1800, count: 10 },
    removeOnComplete: { age: 1800, count: 10 },
  },
);

worker.on("active", (job) => {
  console.log(`Job ${job.id} is now active!`);
});

worker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(`${job!.id} has failed with ${err.message}`);
});

const extractUserInput = (link: string): [string, string] => {
  const parts = link.split("/");
  const owner = parts[parts.length - 2];
  const repo = parts[parts.length - 1];
  return [owner, repo];
};

export default worker;
