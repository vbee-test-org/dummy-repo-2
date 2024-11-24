import {
  Branch,
  BranchModel,
  Commit,
  CommitModel,
  Deployment,
  DeploymentModel,
  Repository,
  RepositoryModel,
} from "@/models";
import { Octokit } from "@octokit/rest";
import { deploymentmanager_v2 } from "googleapis";

const extractUserInput = (link: string): [string, string] => {
  const parts = link.split("/");
  const owner = parts[parts.length - 2];
  const repo = parts[parts.length - 1];
  return [owner, repo];
};

const scanRepository = async (
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

const scanCommits = async (
  client: Octokit,
  repository: Repository,
  branch: Branch,
): Promise<Commit[]> => {
  const { data: commits } = await client.request(
    "GET /repos/{owner}/{repo}/commits",
    { owner: repository.owner, repo: repository.name, sha: branch.name },
  );

  const promisedCommits = commits.map(async (commit) => {
    try {
      // Check if commit exists
      let cmt = await CommitModel.findOne({
        repo_id: repository._id,
        branch_id: branch._id,
        sha: commit.sha,
      });
      // If not exist, create new
      if (!cmt) {
        const author = commit.commit.author?.name;
        const commit_message = commit.commit.message;
        const created_at = commit.commit.committer?.date;
        // No Date = skip
        if (!created_at) {
          console.warn(
            `Skipping commit ${commit.sha} due to missing required fields`,
          );
          return null;
        }

        cmt = await CommitModel.create({
          repo_id: repository._id,
          branch_id: branch._id,
          sha: commit.sha,
          commit_message,
          author,
          created_at,
        });
      }
      return cmt;
    } catch (error) {
      console.log(`Error processing commit ${commit.sha}: ${error}`);
      return null;
    }
  });

  const processedCommits = await Promise.all(promisedCommits);

  return processedCommits.filter((commit) => commit !== null);
};

const scanDeployments = async (
  client: Octokit,
  repository: Repository,
  branch: Branch,
  options: {
    filter?: string;
  } = {},
): Promise<Deployment[]> => {
  const {
    data: { total_count: count, workflow_runs: runs },
  } = await client.request("GET /repos/{owner}/{repo}/actions/runs", {
    owner: repository.owner,
    repo: repository.name,
    branch: branch.name,
  });

  if (count === 0) {
    console.log("No workflow runs found!");
    return [];
  }

  const filteredRuns = options.filter
    ? runs.filter((run) =>
        run.name?.toLowerCase().includes(options.filter!.toLowerCase()),
      )
    : runs;

  const commits = await scanCommits(client, repository, branch);

  const commitMap = new Map<string, Commit>(
    commits.map((commit) => [commit.sha, commit]),
  );

  const commitStatusMap = new Map<string, boolean>(
    Array.from(commitMap.keys()).map((sha) => [sha, false]),
  );

  const promisedDeployments = filteredRuns.map(async (run) => {
    const commit = commitMap.get(run.head_sha);
    if (!commit) {
      return null;
    }
    let deployment = await DeploymentModel.findOne({
      repo_id: repository._id,
      branch_id: branch._id,
      commit_id: commit._id,
      name: run.name,
    });
    if (!deployment) {
      deployment = await DeploymentModel.create({
        repo_id: repository._id,
        branch_id: branch._id,
        commit_id: commit._id,
        name: run.name,
        status: run.conclusion,
        started_at: commit.created_at,
        finished_at: run.updated_at,
      });
    }
    commitStatusMap.set(commit.sha, true);
    return deployment;
  });

  let processedDeployments = (await Promise.all(promisedDeployments)).filter(
    (deployment) => deployment !== null,
  ) as Deployment[];

  processedDeployments.sort(
    (a, b) => a.started_at.getTime() - b.started_at.getTime(),
  );

  for (const [sha, used] of commitStatusMap.entries()) {
    if (!used) {
      const commit = commitMap.get(sha);
      if (!commit) continue;

      // If commit.created_at > last deployement started_at => this is not deployed
      if (
        processedDeployments.length > 0 &&
        commit.created_at.getTime() >
          processedDeployments[
            processedDeployments.length - 1
          ].started_at.getTime()
      ) {
        continue;
      }

      let insertIndex = processedDeployments.length;
      for (let i = 0; i < processedDeployments.length; i++) {
        if (
          commit.created_at.getTime() <
          processedDeployments[i].started_at.getTime()
        ) {
          insertIndex = i;
          break;
        }
      }

      const newDeployment = await DeploymentModel.create({
        repo_id: repository._id,
        branch_id: branch._id,
        commit_id: commit._id,
        name: processedDeployments[insertIndex].name,
        status: processedDeployments[insertIndex].status,
        started_at: new Date(commit.created_at),
        finished_at: new Date(commit.created_at),
      });

      processedDeployments.splice(insertIndex, 0, newDeployment);
    }
  }

  return processedDeployments;
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
  scanRepository,
  createBranch,
  scanCommits,
  scanDeployments,
  scanReleases,
  scanDeploymentsFromGoogleDocs,
};

export { TaskController };
