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

const scanWorkflows = async (
  client: Octokit,
  repository: Repository,
  branch: Branch,
  commits: Commit[],
  opts: {
    filter?: string;
    return?: boolean;
  } = {},
): Promise<Deployment[] | void> => {
  if (!commits?.length) {
    console.log("No commits provided!");
    return opts.return ? [] : undefined;
  }

  let runs;
  try {
    runs = await client.paginate("GET /repos/{owner}/{repo}/actions/runs", {
      owner: repository.owner,
      repo: repository.name,
      branch: branch.name,
    });
  } catch (error) {
    console.error("[Worker]: Error fetching workflow runs", error);
    return opts.return ? [] : undefined;
  }

  // Early return if no runs
  if (!runs?.length) {
    console.log("No workflow runs found!");
    return opts.return ? [] : undefined;
  }

  const filterName = opts.filter?.toLowerCase();
  const filteredRuns = filterName
    ? runs.filter((run) => run.name?.toLowerCase().includes(filterName))
    : runs;

  if (!filteredRuns.length) {
    console.log("No matching workflow runs found with the specified filter!");
    return opts.return ? [] : undefined;
  }

  const commitMap = new Map(commits.map((commit) => [commit.sha, commit]));

  const deploymentPromises = filteredRuns
    .map((run) => {
      const commit = commitMap.get(run.head_sha);
      if (!commit) return null;

      return DeploymentModel.findOne({
        repo_id: repository._id,
        branch_id: branch._id,
        commit_id: commit._id,
        name: run.name,
      })
        .then((existingDeployment) => {
          if (existingDeployment) return existingDeployment;

          return DeploymentModel.create({
            repo_id: repository._id,
            branch_id: branch._id,
            commit_id: commit._id,
            name: run.name,
            status: run.conclusion,
            started_at: run.created_at,
            finished_at: run.updated_at,
          });
        })
        .catch((error) => {
          console.error(
            `[Worker]: Error processing deployment for run ${run.name}:`,
            error,
          );
          return null;
        });
    })
    .filter(Boolean) as Promise<Deployment>[];

  if (opts.return) {
    const deployments = (await Promise.all(deploymentPromises)).filter(
      (deployment): deployment is Deployment => deployment !== null,
    );
    return deployments;
  }
};

const scanReleases = async (
  client: Octokit,
  repository: Repository,
  branch: Branch,
  commits: Commit[],
  opts: {
    return?: boolean;
  } = {},
): Promise<Deployment[] | void> => {
  if (!commits?.length) {
    console.log("No commits provided");
    return opts.return ? [] : undefined;
  }

  let tags, releases;
  try {
    [tags, releases] = await Promise.all([
      client.paginate("GET /repos/{owner}/{repo}/tags", {
        owner: repository.owner,
        repo: repository.name,
      }),
      client.paginate("GET /repos/{owner}/{repo}/releases", {
        owner: repository.owner,
        repo: repository.name,
      }),
    ]);
  } catch (error) {
    console.error("[Worker]: Error fetching tags or releases", error);
    return opts.return ? [] : undefined;
  }

  if (!tags?.length || !releases?.length) {
    console.log("No tags or releases found");
    return opts.return ? [] : undefined;
  }

  const commitMap = new Map(commits.map((commit) => [commit.sha, commit]));
  const commitStatusMap = new Map(commits.map((commit) => [commit.sha, false]));
  const tagsByName = new Map(tags.map((tag) => [tag.name, tag]));

  const deploymentPromises = releases
    .map((release) => {
      const matchingTag = tagsByName.get(release.tag_name);
      if (!matchingTag) return null;

      const matchingCommit = commitMap.get(matchingTag.commit.sha);
      if (!matchingCommit) return null;

      commitStatusMap.set(matchingCommit.sha, true);

      return DeploymentModel.create({
        repo_id: repository._id,
        commit_id: matchingCommit._id,
        name: release.name || matchingTag.name,
        status: "success",
        branch_id: branch._id,
        started_at: matchingCommit.created_at,
        finished_at: release.published_at,
      }).catch((error) => {
        console.log(
          `[Worker]: Error creating deployment for release ${release.name}:`,
          error,
        );
        return null;
      });
    })
    .filter(Boolean) as Promise<Deployment>[];

  // Await all deployments
  const processedDeployments = (await Promise.all(deploymentPromises)).filter(
    (deployment): deployment is Deployment => deployment !== null,
  );

  // Handle edge cases
  const finalDeployments = handleDeploymentEdgeCases(
    processedDeployments,
    commitMap,
    commitStatusMap,
  );

  return opts.return ? finalDeployments : undefined;
};
const scanDeploymentsFromGoogleDocs = async (
  client: Octokit,
  repository: Repository,
  branch: Branch,
  commits: Commit[],
): Promise<void> => {
  console.log("TO BE IMPLEMENTED");
};

const handleDeploymentEdgeCases = async (
  deployments: Deployment[],
  commitMap: Map<string, Commit>,
  commitStatusMap: Map<string, boolean>,
): Promise<Deployment[]> => {
  // Sort existing deployments
  deployments.sort((a, b) => a.started_at.getTime() - b.started_at.getTime());

  const deploymentPromises: Promise<Deployment>[] = [];

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

        const newDeployment = DeploymentModel.create({
          repo_id: targetDeployment.repo_id,
          branch_id: targetDeployment.branch_id,
          commit_id: commit._id,
          name: targetDeployment.name,
          status: targetDeployment.status,
          started_at: commit.created_at,
          finished_at: targetDeployment.finished_at,
        });

        deploymentPromises.push(newDeployment);
      } else {
        console.log(
          `Skipping commit with sha ${sha}, no matching deployment found.`,
        );
      }
    }
  }

  const additionalDeployments = await Promise.all(deploymentPromises);
  const allDeployments = [...deployments, ...additionalDeployments].sort(
    (a, b) => a.started_at.getTime() - b.started_at.getTime(),
  );

  return allDeployments;
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
  scanWorkflows,
  scanReleases,
  scanDeploymentsFromGoogleDocs,
};

export { TaskController };
