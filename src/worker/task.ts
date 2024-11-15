import { Repository, Branch, Commit } from "@/models";
import octokit from "@/services/octokit";
import { Job } from "bullmq";

const processRepo = async (job: Job) => {
  console.log("processing job");
  const { link, id } = job.data;

  console.log("Scanning for repository...");
  // Extract owner and repository name from link
  // e.g: https://github.com/mui/material-ui => owner: mui, repo: material-ui
  const [owner, repo] = extractUserInput(link);

  // Checks for repository on database, if doesn't exist, create a new repository document
  let repository = await Repository.findOne({
    full_name: `${owner}/${repo}`,
  });
  if (!repository) {
    const data = await octokit.repos.get({
      owner,
      repo,
    });
    repository = await Repository.create({
      _id: data.data.id,
      full_name: data.data.full_name,
      private: data.data.private,
    });
  }

  // Checks for branches in the specific repository, if doesn't exist, create new branch document(s)
  const branches = ["dev", "main"];
  const branchDocs = await Promise.all(
    branches.map(async (branchName) => {
      let branch = await Branch.findOne({
        name: branchName,
        repo_id: repository._id,
      });
      if (!branch) {
        branch = await Branch.create({
          repo_id: repository._id,
          name: branchName,
        });
      }
      return branch;
    }),
  );
  await job.updateProgress(50);

  // Adding commits
  for (const branchDoc of branchDocs) {
    const commits = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branchDoc?.name,
    });

    await Promise.all(
      commits.data.map(async (commitData) => {
        const {
          sha,
          commit: { message, author },
        } = commitData;

        // Check if the commit already exists
        let commit = await Commit.findById(sha);
        if (!commit) {
          commit = await Commit.create({
            _id: sha,
            repo_id: repository._id,
            branch_id: branchDoc!._id,
            commit_message: message,
            author: author?.name,
          });
        }
        return commit;
      }),
    );
  }
  await job.updateProgress(100);
};

const extractUserInput = (link: string): [string, string] => {
  const parts = link.split("/");
  const owner = parts[parts.length - 2];
  const repo = parts[parts.length - 1];
  return [owner, repo];
};

export default { processRepo };
