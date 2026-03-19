const config = require("./github_genai_apps.config.json");
const snapshot = require("./github_genai_apps.snapshot.json");
const { isNetworkEnabled, parseBoolean, readCache, writeCache } = require("./_apiCache");

const GITHUB_API_BASE_URL = "https://api.github.com";

function shouldUseNetwork() {
  if (parseBoolean(process.env.GITHUB_FORCE_REFRESH)) return true;
  if (!isNetworkEnabled()) return false;
  return parseBoolean(process.env.GITHUB_ENABLE_NETWORK);
}

function cacheKeyForRepo(fullName) {
  return `github:repo:${fullName}`;
}

function cacheKeyForUser(login) {
  return `github:user:${login}`;
}

function normalizeRepoData(repo, appConfig) {
  if (!repo) return null;

  return {
    id: appConfig.id,
    appTitle: appConfig.appTitle,
    appUrl: appConfig.appUrl,
    fullName: repo.full_name || appConfig.repo,
    repoUrl: repo.html_url || `https://github.com/${appConfig.repo}`,
    description: repo.description || "",
    createdAt: repo.created_at || "",
    updatedAt: repo.updated_at || "",
    pushedAt: repo.pushed_at || "",
    stargazersCount: Number(repo.stargazers_count || 0),
    forksCount: Number(repo.forks_count || 0),
    openIssuesCount: Number(repo.open_issues_count || 0),
    language: repo.language || "",
    defaultBranch: repo.default_branch || "",
    license: repo.license?.name || repo.license || null,
    ownerLogin: (repo.owner && repo.owner.login) || appConfig.repo.split("/")[0]
  };
}

function normalizeUserData(user, ownerConfig, genaiReposFound) {
  if (!user) return null;

  const owner = snapshot.owners.find(item => item.login === ownerConfig.login) || {};

  return {
    login: ownerConfig.login,
    label: ownerConfig.label,
    profileUrl: user.html_url || owner.profileUrl || `https://github.com/${ownerConfig.login}`,
    publicRepos: Number(user.public_repos || 0),
    followers: Number(user.followers || 0),
    following: Number(user.following || 0),
    genaiReposFound: Number.isFinite(genaiReposFound) ? genaiReposFound : Number(owner.genaiReposFound || 0),
    note: owner.note || ""
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Generation-AI-Site"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function getRepoData(appConfig) {
  const cacheKey = cacheKeyForRepo(appConfig.repo);
  const cached = await readCache(cacheKey);
  if (cached) return normalizeRepoData(cached, appConfig);

  const stale = await readCache(cacheKey, { ttlSeconds: 0 });
  if (stale) return normalizeRepoData(stale, appConfig);

  const snap = snapshot.items.find(item => item.id === appConfig.id);

  if (!shouldUseNetwork()) return snap || null;

  try {
    const repo = await fetchJson(`${GITHUB_API_BASE_URL}/repos/${appConfig.repo}`);
    await writeCache(cacheKey, repo);
    return normalizeRepoData(repo, appConfig);
  } catch (error) {
    if (snap) return snap;
    console.warn(`[github_genai_apps] Repository lookup failed for ${appConfig.repo}: ${error.message}`);
    return null;
  }
}

async function getOwnerData(ownerConfig, genaiReposFound) {
  const cacheKey = cacheKeyForUser(ownerConfig.login);
  const cached = await readCache(cacheKey);
  if (cached) return normalizeUserData(cached, ownerConfig, genaiReposFound);

  const stale = await readCache(cacheKey, { ttlSeconds: 0 });
  if (stale) return normalizeUserData(stale, ownerConfig, genaiReposFound);

  const snap = snapshot.owners.find(item => item.login === ownerConfig.login);

  if (!shouldUseNetwork()) {
    return snap
      ? {
          ...snap,
          login: ownerConfig.login,
          label: ownerConfig.label,
          genaiReposFound: Number.isFinite(genaiReposFound) ? genaiReposFound : snap.genaiReposFound
        }
      : null;
  }

  try {
    const user = await fetchJson(`${GITHUB_API_BASE_URL}/users/${ownerConfig.login}`);
    await writeCache(cacheKey, user);
    return normalizeUserData(user, ownerConfig, genaiReposFound);
  } catch (error) {
    if (snap) {
      return {
        ...snap,
        login: ownerConfig.login,
        label: ownerConfig.label,
        genaiReposFound: Number.isFinite(genaiReposFound) ? genaiReposFound : snap.genaiReposFound
      };
    }
    console.warn(`[github_genai_apps] Profile lookup failed for ${ownerConfig.login}: ${error.message}`);
    return null;
  }
}

module.exports = async function githubGenAiAppsDataSource() {
  const items = (await Promise.all(config.apps.map(getRepoData))).filter(Boolean);
  const ownerRepoCounts = items.reduce((acc, item) => {
    acc[item.ownerLogin] = (acc[item.ownerLogin] || 0) + 1;
    return acc;
  }, {});

  const owners = (await Promise.all(
    config.owners.map(owner => getOwnerData(owner, ownerRepoCounts[owner.login] || 0))
  )).filter(Boolean);

  const appMap = Object.fromEntries(items.map(item => [item.id, item]));
  const ownerMap = Object.fromEntries(owners.map(owner => [owner.login, owner]));

  return {
    checkedAt: snapshot.checkedAt,
    items,
    appMap,
    owners,
    ownerMap
  };
};
