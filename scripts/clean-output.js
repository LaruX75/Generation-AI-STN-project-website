const fs = require("fs");
const path = require("path");

const outputDirName = process.argv[2] || process.env.ELEVENTY_OUTPUT_DIR || "_site";
const outputDir = path.join(process.cwd(), outputDirName);

fs.rmSync(outputDir, {
  recursive: true,
  force: true,
  maxRetries: 5,
  retryDelay: 100,
});
