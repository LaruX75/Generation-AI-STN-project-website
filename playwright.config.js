const { defineConfig, devices } = require("@playwright/test");
const PLAYWRIGHT_PORT = process.env.PLAYWRIGHT_PORT || "41783";
const BASE_URL = `http://127.0.0.1:${PLAYWRIGHT_PORT}`;

module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [["list"]],
  webServer: {
    command: `npm run build:test && python3 -m http.server ${PLAYWRIGHT_PORT} -d _site_playwright`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});
