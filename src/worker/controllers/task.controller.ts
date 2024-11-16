import {
  Branch,
  BranchModel,
  CommitModel,
  Repository,
  RepositoryModel,
} from "@/models";
import octokit from "@/services/octokit";

const createRepository = async (
  owner: string,
  repo: string,
): Promise<Repository> => {
  let repository = await RepositoryModel.findOne({
    full_name: `${owner}/${repo}`,
  });
  if (!repository) {
    const data = await octokit.repos.get({
      owner,
      repo,
    });
    repository = await RepositoryModel.create({
      _id: data.data.id,
      full_name: data.data.full_name,
      private: data.data.private,
    });
  }
  return repository;
};

const createBranches = async (
  owner: string,
  repo: string,
  repoId: number,
): Promise<Branch[]> => {
  console.log("Checking branches...");
  const branchNames = ["dev", "uat", "prod"];
  const existingBranches = [];

  for (const branchName of branchNames) {
    try {
      await octokit.repos.getBranch({ owner, repo, branch: branchName });
      existingBranches.push(branchName);
    } catch (error) {
      console.error(`Error checking branch ${branchName}:`, error);
    }
  }

  return Promise.all(
    existingBranches.map(async (branchName) => {
      let branch = await BranchModel.findOne({
        name: branchName,
        repo_id: repoId,
      });
      if (!branch) {
        branch = await BranchModel.create({
          repo_id: repoId,
          name: branchName,
        });
      }
      return branch;
    }),
  );
};

const createCommits = async (
  owner: string,
  repo: string,
  repoId: number,
  branch: Branch,
): Promise<void> => {
  const commits = await octokit.repos.listCommits({
    owner,
    repo,
    sha: branch.name,
  });

  await Promise.all(
    commits.data.map(async (commitData) => {
      const {
        sha,
        commit: { message, author },
      } = commitData;

      // Check if the commit already exists
      let commit = await CommitModel.findOne({
        _id: sha,
        repo_id: repoId,
      });
      if (!commit) {
        commit = await CommitModel.create({
          _id: sha,
          repo_id: repoId,
          branch_id: branch._id,
          commit_message: message,
          author: author?.name,
        });
      }
      return commit;
    }),
  );
};

export { createRepository, createBranches, createCommits };
