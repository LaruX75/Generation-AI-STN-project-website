const path = require("node:path");
const { spawn } = require("node:child_process");

function runPagefind(options = {}) {
  const site = String(
    options.site || process.argv[2] || process.env.ELEVENTY_OUTPUT_DIR || "_site"
  );
  const pagefindBin = path.join(process.cwd(), "node_modules", ".bin", "pagefind");
  const outputPath = path.join(site, "pagefind");

  return new Promise((resolve, reject) => {
    const child = spawn(pagefindBin, ["--site", site, "--output-path", outputPath], {
      stdio: "inherit",
    });

    child.on("exit", code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Pagefind exited with code ${code ?? 1}`));
    });

    child.on("error", error => {
      reject(error);
    });
  });
}

if (require.main === module) {
  runPagefind().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  runPagefind,
};
