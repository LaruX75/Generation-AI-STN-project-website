const { test, expect } = require("@playwright/test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const fixtureUrl = pathToFileURL(path.join(__dirname, "..", "fixtures", "mobile-nav.html")).href;

async function acceptNecessaryCookies(page) {
  const buttonLabels = [
    /Vain välttämättömät/i,
    /Necessary only/i,
    /Endast nödvändiga/i,
  ];

  for (const label of buttonLabels) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      return;
    }
  }
}

test("Skip link becomes visible and moves focus to main content", async ({ page }) => {
  await page.goto("/opettajalle/");
  await acceptNecessaryCookies(page);

  await page.keyboard.press("Tab");

  const skipLink = page.locator(".skip-to-main");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press("Enter");

  await expect(page.locator("#main-content")).toBeFocused();
});

test("Mobile navigation closes with Escape and returns focus to the menu toggle", async ({ page }) => {
  await page.goto(fixtureUrl);

  const menuToggle = page.getByRole("button", { name: /Avaa navigaatio|Toggle navigation|Öppna navigering/i });
  await menuToggle.click();

  await expect(page.locator("#site-nav-menu")).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(page.locator("#site-nav-menu")).not.toHaveClass(/is-open/);
  await expect(menuToggle).toBeFocused();
});

test("Desktop submenu closes with Escape and restores focus to its toggle", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto(fixtureUrl);

  const teachersToggle = page.getByRole("button", { name: /Avaa Opettajalle alavalikko/i });
  await teachersToggle.focus();
  await page.keyboard.press("Enter");

  const teachersItem = page.locator("#site-nav-menu > .kb-nav-menu > .kb-nav-item").first();
  await expect(teachersItem).toHaveClass(/is-open/);

  await page.keyboard.press("Escape");

  await expect(teachersItem).not.toHaveClass(/is-open/);
  await expect(teachersToggle).toBeFocused();
});
