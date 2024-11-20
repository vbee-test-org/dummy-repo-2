import {
  Branch,
  BranchModel,
  Commit,
  CommitModel,
  DeploymentModel,
  Repository,
  RepositoryModel,
} from "@/models";
import octokit from "@/services/octokit";

const extractUserInput = (link: string): [string, string] => {
  const parts = link.split("/");
  const owner = parts[parts.length - 2];
  const repo = parts[parts.length - 1];
  return [owner, repo];
};

const createRepository = async (
  owner: string,
  repo: string,
): Promise<Repository> => {
  let repository = await RepositoryModel.findOne({
    name: repo,
    owner,
  });
  if (!repository) {
    const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
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
  repository: Repository,
  branch: Branch,
  options: {
    filter?: string;
  } = {},
): Promise<void> => {
  const {
    data: { total_count: count, workflow_runs: runs },
  } = await octokit.request("GET /repos/{owner}/{repo}/actions/runs", {
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
  repository: Repository,
  branch: Branch,
): Promise<void> => {
  const [{ data: prs }, { data: tags }, { data: releases }] = await Promise.all(
    [
      octokit.request("GET /repos/{owner}/{repo}/pulls", {
        owner: repository.owner,
        repo: repository.name,
        state: "closed",
        base: branch.name,
      }),
      octokit.request("GET /repos/{owner}/{repo}/tags", {
        owner: repository.owner,
        repo: repository.name,
      }),
      octokit.request("GET /repos/{owner}/{repo}/releases", {
        owner: repository.owner,
        repo: repository.name,
      }),
    ],
  );

  const prsSHAs = prs.map((pr) => ({
    sha: pr.merge_commit_sha,
    type: "pull_request",
    info: pr,
  }));
  const tagsData = tags.map((tag) => ({
    sha: tag.commit.sha,
    tagName: tag.name,
    type: "tag",
    info: tag,
  }));
  const releasesData = releases.map((release) => ({
    tagName: release.tag_name,
    type: "release",
    info: release,
  }));

  // Create a map of commit SHAs with their source and details
  const shaMap = new Map<string, { sources: Set<string>; details: any[] }>();
  [...prsSHAs, ...tagsData].forEach(({ sha, type, info }) => {
    if (!shaMap.has(sha!)) {
      shaMap.set(sha!, { sources: new Set(), details: [] });
    }
    shaMap.get(sha!)!.sources.add(type);
    shaMap.get(sha!)!.details.push(info);
  });

  // Find matching PRs and Tags by SHA
  const shaMatches = Array.from(shaMap.entries())
    .filter(([_, { sources }]) => sources.size > 1)
    .map(([sha, { sources, details }]) => ({
      sha,
      sources: Array.from(sources),
      details,
    }));

  // Match Releases by Tag Name
  const tagNameMap = new Map<
    string,
    { sources: Set<string>; details: any[] }
  >();
  [...tagsData, ...releasesData].forEach(({ tagName, type, info }) => {
    if (!tagNameMap.has(tagName)) {
      tagNameMap.set(tagName, { sources: new Set(), details: [] });
    }
    tagNameMap.get(tagName)!.sources.add(type);
    tagNameMap.get(tagName)!.details.push(info);
  });

  // Find tag name matches across tags and releases
  const tagNameMatches = Array.from(tagNameMap.entries())
    .filter(([_, { sources }]) => sources.size > 1)
    .map(([tagName, { sources, details }]) => ({
      tagName,
      sources: Array.from(sources),
      details,
    }));

  // Iterate through matched SHAs and create commits and deployments
  for (const shaMatch of shaMatches) {
    for (const prInfo of shaMatch.details) {
      if (prInfo.type === "pull_request") {
        const pr = prInfo as any;
        const matchingTag = tagsData.find(
          (tag) => tag.sha === pr.merge_commit_sha,
        );

        if (matchingTag) {
          // Now find a matching release based on the tag name
          const matchingRelease = releasesData.find(
            (release) => release.tagName === matchingTag.tagName,
          );

          if (matchingRelease) {
            // Create Commit
            const commitMessage = pr.body || "No commit message provided";
            const commit = await CommitModel.create({
              sha: pr.merge_commit_sha,
              repo_id: repository._id,
              branch_id: branch._id,
              commit_message: commitMessage,
              author: pr.user.login,
              created_at: new Date(pr.merged_at),
            });

            // Create Deployment
            const deployment = await DeploymentModel.create({
              repo_id: repository._id,
              commit_id: commit._id,
              name:
                matchingRelease.info.name ||
                `Deployment for ${matchingRelease.tagName}`,
              branch_id: branch._id,
              started_at: pr.merged_at,
              finished_at: matchingRelease.info.published_at,
            });

            // Save deployment
            await deployment.save();
          }
        }
      }
    }
  }
};

const scanCustomDeployments = async (
  repository: Repository,
  branch: Branch,
): Promise<void> => {};

const TaskController = {
  extractUserInput,
  createRepository,
  createBranch,
  scanDeployments,
  scanReleases,
  scanCustomDeployments,
};

export { TaskController };
