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
      default_branch: data.default_branch,
    });
  }
  return repository;
};

const scanDefaultBranch = async (repository: Repository): Promise<Branch> => {
  let branch = await BranchModel.findOne({
    name: repository.default_branch,
    repo_id: repository._id,
  });

  if (!branch) {
    branch = await BranchModel.create({
      repo_id: repository._id,
      name: repository.default_branch,
    });
  }

  return branch;
};

const scanCommits = async (
  client: Octokit,
  repository: Repository,
  branch: Branch,
): Promise<Commit[]> => {
  const commits = await client.paginate("GET /repos/{owner}/{repo}/commits", {
    owner: repository.owner,
    repo: repository.name,
    sha: branch.name,
  });

  const commitPromises = commits.map(async (commit) => {
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

  const processedCommits = await Promise.all(commitPromises);

  return processedCommits.filter((commit) => commit !== null);
};

const scanDeployments = async (
  client: Octokit,
  repository: Repository,
  branch: Branch,
  commits: Commit[],
  filter: {
    name?: string;
    since?: Date;
    to?: Date;
  } = {},
): Promise<void> => {
  const runs = await client.paginate("GET /repos/{owner}/{repo}/actions/runs", {
    owner: repository.owner,
    repo: repository.name,
    branch: branch.name,
  });

  if (runs.length === 0) {
    console.log("No workflow runs found!");
    return;
  }

  const filteredRuns = runs.filter((run) => {
    // If have name filter
    const nameMatches = filter.name
      ? run.name?.toLowerCase().includes(filter.name.toLowerCase())
      : true;

    // If have start date
    const sinceMatches = filter.since
      ? new Date(run.created_at) >= filter.since
      : true;

    // If have end date
    const toMatches = filter.to ? new Date(run.created_at) <= filter.to : true;

    return nameMatches && sinceMatches && toMatches;
  });

  const commitMap = new Map<string, Commit>(
    commits.map((commit) => [commit.sha, commit]),
  );

  const commitStatusMap = new Map<string, boolean>(
    Array.from(commitMap.keys()).map((sha) => [sha, false]),
  );

  // Deployments
  const deploymentPromises = filteredRuns.map(async (run) => {
    try {
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
    } catch (error) {
      console.error(
        "[Worker]: scanReleases - Error processing deployment:",
        error,
      );
      return null;
    }
  });

  let processedDeployments = (await Promise.all(deploymentPromises)).filter(
    (deployment) => deployment !== null,
  ) as Deployment[];

  //handleDeploymentEdgeCases(processedDeployments, commitMap, commitStatusMap);
};

const scanReleases = async (
  client: Octokit,
  repository: Repository,
  branch: Branch,
  commits: Commit[],
): Promise<void> => {
  const [tags, releases] = await Promise.all([
    client.paginate("GET /repos/{owner}/{repo}/tags", {
      owner: repository.owner,
      repo: repository.name,
    }),
    client.paginate("GET /repos/{owner}/{repo}/releases", {
      owner: repository.owner,
      repo: repository.name,
    }),
  ]);

  // Map commits by SHA for quick lookup
  const commitMap = new Map<string, Commit>(
    commits.map((commit) => [commit.sha, commit]),
  );

  const commitStatusMap = new Map<string, boolean>(
    Array.from(commitMap.keys()).map((sha) => [sha, false]),
  );

  // Map tags by name for matching release tags
  const tagsByName = new Map(tags.map((tag) => [tag.name, tag]));

  const deploymentPromises = releases.map(async (release) => {
    try {
      const matchingTag = tagsByName.get(release.tag_name);
      if (!matchingTag) return null;

      const matchingCommit = commitMap.get(matchingTag.commit.sha);
      if (!matchingCommit) return null;

      commitStatusMap.set(matchingCommit.sha, true);

      return await DeploymentModel.create({
        repo_id: repository._id,
        commit_id: matchingCommit._id,
        name: release.name || matchingTag.name,
        status: "success",
        branch_id: branch._id,
        started_at: matchingCommit.created_at,
        finished_at: release.published_at,
      });
    } catch (error) {
      console.log(
        "[Worker]: scanReleases - Error processing deployment:",
        error,
      );
      return null;
    }
  });

  let processedDeployments = (await Promise.all(deploymentPromises)).filter(
    (deployment) => deployment !== null,
  );

  handleDeploymentEdgeCases(processedDeployments, commitMap, commitStatusMap);
};

const scanDeploymentsFromGoogleDocs = async (
  client: Octokit,
  repository: Repository,
  branch: Branch,
): Promise<void> => {};

const handleDeploymentEdgeCases = async (
  deployments: Deployment[],
  commitMap: Map<string, Commit>,
  commitStatusMap: Map<string, boolean>,
): Promise<void> => {
  deployments.sort((a, b) => a.started_at.getTime() - b.started_at.getTime());

  const additionalDeployments = [];

  for (const [sha, used] of commitStatusMap.entries()) {
    if (!used) {
      const commit = commitMap.get(sha);
      if (!commit) continue;

      // Skip commits created after the last deployment
      if (
        deployments.length > 0 &&
        commit.created_at.getTime() >
          deployments[deployments.length - 1].started_at.getTime()
      ) {
        continue;
      }

      let targetIdx = deployments.length;
      for (let i = 0; i < deployments.length; i++) {
        if (commit.created_at.getTime() < deployments[i].started_at.getTime()) {
          targetIdx = i;
          break;
        }
      }

      // Ensure targetIdx is within bounds before accessing deployments[targetIdx]
      if (targetIdx < deployments.length) {
        const targetDeployment = deployments[targetIdx];
        additionalDeployments.push({
          repo_id: targetDeployment.repo_id,
          branch_id: targetDeployment.branch_id,
          commit_id: commit._id,
          name: targetDeployment.name || "Unknown Deployment",
          status: targetDeployment.status || "unknown",
          started_at: commit.created_at,
          finished_at: targetDeployment.finished_at,
        });
      } else {
        console.log(
          `Skipping commit with sha ${sha}, no matching deployment found.`,
        );
      }
    }
  }

  // Insert new deployments if any
  if (additionalDeployments.length > 0) {
    await DeploymentModel.insertMany(additionalDeployments);
  }
};

const scanUserInput = (link: string): [string, string] => {
  const parts = link.split("/");
  const owner = parts[parts.length - 2];
  const repo = parts[parts.length - 1];
  return [owner, repo];
};

const TaskController = {
  scanUserInput,
  scanRepository,
  scanDefaultBranch,
  scanCommits,
  scanDeployments,
  scanReleases,
  scanDeploymentsFromGoogleDocs,
};

export { TaskController };
