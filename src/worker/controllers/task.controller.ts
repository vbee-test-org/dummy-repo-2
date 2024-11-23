import {
  Branch,
  BranchModel,
  Commit,
  CommitModel,
  DeploymentModel,
  Repository,
  RepositoryModel,
} from "@/models";
import { Octokit } from "@octokit/rest";

const extractUserInput = (link: string): [string, string] => {
  const parts = link.split("/");
  const owner = parts[parts.length - 2];
  const repo = parts[parts.length - 1];
  return [owner, repo];
};

const createRepository = async (
  client: Octokit,
  owner: string,
  repo: string,
): Promise<Repository> => {
  let repository = await RepositoryModel.findOne({
    name: repo,
    owner,
  });
  if (!repository) {
    const { data } = await client.request("GET /repos/{owner}/{repo}", {
      owner,
      repo,
    });
    repository = await RepositoryModel.create({
      name: repo,
      owner,
      private: data.private,
    });
  }
  return repository;
};

const createBranch = async (
  repository: Repository,
  name: string,
): Promise<Branch> => {
  let branch = await BranchModel.findOne({ name, repo_id: repository._id });

  if (!branch) {
    branch = await BranchModel.create({
      repo_id: repository._id,
      name,
    });
  }

  return branch;
};

const scanDeployments = async (
  client: Octokit,
  repository: Repository,
  branch: Branch,
  options: {
    filter?: string;
  } = {},
): Promise<void> => {
  const {
    data: { total_count: count, workflow_runs: runs },
  } = await client.request("GET /repos/{owner}/{repo}/actions/runs", {
    owner: repository.owner,
    repo: repository.name,
    branch: branch.name,
  });

  if (count === 0) {
    console.log("No workflow runs found!");
    return;
  }

  const filteredRuns = options.filter
    ? runs.filter((run) =>
        run.name?.toLowerCase().includes(options.filter!.toLowerCase()),
      )
    : runs;

  const processedDeployments = await Promise.all(
    filteredRuns.map(async (run) => {
      const commitDetails = run.head_commit;
      if (!commitDetails) {
        console.log(`Skipping run ${run.name} - no commit details`);
        return null;
      }

      try {
        // Get or create commit
        let commit = await CommitModel.findOne({
          sha: commitDetails.id,
        });
        if (!commit) {
          commit = await CommitModel.create({
            sha: commitDetails.id,
            commit_message: commitDetails.message,
            repo_id: repository._id,
            branch_id: branch._id,
            created_at: commitDetails.timestamp,
          });
          console.log(`Created new commit: ${commit.sha}`);
        }

        // Get or create deployment
        let deployment = await DeploymentModel.findOne({
          commit_id: commit._id,
        });

        if (!deployment) {
          deployment = await DeploymentModel.create({
            name: run.name,
            repo_id: repository._id,
            branch_id: branch._id,
            status: run.conclusion,
            commit_id: commit._id,
            started_at: run.run_started_at,
            finished_at: run.updated_at,
          });
        }

        return deployment;
      } catch (error) {
        console.error(`Error processing run ${run.name}:`, error);
        return null;
      }
    }),
  );
};

const scanReleases = async (
  client: Octokit,
  repository: Repository,
  branch: Branch,
): Promise<void> => {
  const [{ data: prs }, { data: tags }, { data: releases }] = await Promise.all(
    [
      client.request("GET /repos/{owner}/{repo}/pulls", {
        owner: repository.owner,
        repo: repository.name,
        state: "closed",
        base: branch.name,
      }),
      client.request("GET /repos/{owner}/{repo}/tags", {
        owner: repository.owner,
        repo: repository.name,
      }),
      client.request("GET /repos/{owner}/{repo}/releases", {
        owner: repository.owner,
        repo: repository.name,
      }),
    ],
  );

  const tagsBySha = new Map(tags.map((tag) => [tag.commit.sha, tag]));

  const releasesByTagName = new Map(
    releases.map((release) => [release.tag_name, release]),
  );

  const prPromises = prs.map(async (pr) => {
    try {
      // Find matching tag and release
      const matchingTag = tagsBySha.get(pr.merge_commit_sha!);
      if (!matchingTag) return;

      const matchingRelease = releasesByTagName.get(matchingTag.name);
      if (!matchingRelease) return;

      // Create and save commit
      const commit = await CommitModel.create({
        sha: pr.merge_commit_sha,
        repo_id: repository._id,
        branch_id: branch._id,
        commit_message: pr.body || "No commit message provided",
        author: pr.user?.login,
        created_at: pr.merged_at,
      });

      // Create and save deployment
      const deployment = await DeploymentModel.create({
        repo_id: repository._id,
        commit_id: commit._id,
        name: matchingRelease.name || matchingTag.name,
        status: "successful",
        branch_id: branch._id,
        started_at: pr.merged_at,
        finished_at: matchingRelease.published_at,
      });
    } catch (err) {
      console.log(err);
    }
  });
};

const scanDeploymentsFromGoogleDocs = async (
  client: Octokit,
  repository: Repository,
  branch: Branch,
): Promise<void> => {};

const TaskController = {
  extractUserInput,
  createRepository,
  createBranch,
  scanDeployments,
  scanReleases,
  scanDeploymentsFromGoogleDocs,
};

export { TaskController };
