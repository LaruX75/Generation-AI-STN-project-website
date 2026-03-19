const fs = require("fs");
const path = require("path");

const outputDir = path.join(process.cwd(), "_site");

fs.rmSync(outputDir, {
  recursive: true,
  force: true,
  maxRetries: 5,
  retryDelay: 100,
});
