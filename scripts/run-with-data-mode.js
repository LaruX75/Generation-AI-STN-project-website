const { spawn } = require("node:child_process");
const { buildDataFetchEnv } = require("./data-fetch-env");

const [, , mode, ...command] = process.argv;

if (!mode || !["offline", "live"].includes(mode) || command.length === 0) {
  console.error("Usage: node scripts/run-with-data-mode.js <offline|live> <command> [args...]");
  process.exit(1);
}

const child = spawn(command[0], command.slice(1), {
  stdio: "inherit",
  env: {
    ...process.env,
    ...buildDataFetchEnv({ mode }),
  },
});

child.on("exit", code => {
  process.exit(code ?? 1);
});

child.on("error", error => {
  console.error(error.message);
  process.exit(1);
});
