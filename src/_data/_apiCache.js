const { mkdir, readFile, stat, writeFile } = require("node:fs/promises");
const { createHash } = require("node:crypto");
const path = require("node:path");

const DEFAULT_CACHE_DIR = path.join(process.cwd(), ".cache", "researchfi");
const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

function getCacheDir() {
  return process.env.RESEARCHFI_CACHE_DIR || DEFAULT_CACHE_DIR;
}

function getTtlSeconds(ttlSeconds) {
  if (Number.isFinite(ttlSeconds)) return ttlSeconds;

  const fromEnv = Number(process.env.RESEARCHFI_CACHE_TTL_SECONDS);
  return Number.isFinite(fromEnv) && fromEnv >= 0 ? fromEnv : DEFAULT_TTL_SECONDS;
}

function buildCachePath(key) {
  const safeName = createHash("sha1").update(String(key)).digest("hex");
  return path.join(getCacheDir(), `${safeName}.json`);
}

async function readCache(key, { ttlSeconds } = {}) {
  const cachePath = buildCachePath(key);
  const ttl = getTtlSeconds(ttlSeconds);

  try {
    const fileStats = await stat(cachePath);

    if (ttl > 0) {
      const ageMs = Date.now() - fileStats.mtimeMs;
      if (ageMs > ttl * 1000) return null;
    }

    const raw = await readFile(cachePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeCache(key, value) {
  const cachePath = buildCachePath(key);
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(value, null, 2), "utf8");
  return value;
}

async function remember(key, factory, options = {}) {
  if (!options.forceRefresh) {
    const cached = await readCache(key, options);
    if (cached !== null) return cached;

    const stale = await readCache(key, { ttlSeconds: 0 });
    if (stale !== null) return stale;
  }

  const value = await factory();
  await writeCache(key, value);
  return value;
}

module.exports = {
  buildCachePath,
  getCacheDir,
  readCache,
  remember,
  writeCache
};
