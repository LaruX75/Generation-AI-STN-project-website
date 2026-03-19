const fs = require("node:fs/promises");
const path = require("node:path");
const { buildDataFetchEnv } = require("./data-fetch-env");

Object.assign(process.env, buildDataFetchEnv({ mode: "live", forceRefresh: true }));

const DATA_DIR = path.join(process.cwd(), "_data");

async function loadDataModule(filePath) {
  const loaded = require(filePath);
  return loaded && loaded.default ? loaded.default : loaded;
}

async function run() {
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const jsFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith(".js"))
    .map(entry => entry.name)
    .sort((left, right) => left.localeCompare(right, "fi"));

  for (const fileName of jsFiles) {
    const filePath = path.join(DATA_DIR, fileName);
    const relativePath = path.relative(process.cwd(), filePath);
    const dataModule = await loadDataModule(filePath);

    process.stdout.write(`Refreshing ${relativePath}...\n`);

    if (typeof dataModule === "function") {
      await dataModule();
    }
  }

  process.stdout.write("Data cache refresh complete.\n");
}

run().catch(error => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
