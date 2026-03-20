const { test, expect } = require("@playwright/test");

async function dismissCookies(page) {
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

test.use({
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  hasTouch: false,
});

test("About megamenu stays inside the desktop viewport", async ({ page }) => {
  await page.goto("/");
  await dismissCookies(page);

  const projectItem = page
    .locator(".kb-nav-menu > .kb-nav-item")
    .filter({ has: page.locator('.kb-nav-link-row > .kb-nav-link[href="/hankkeen-toiminta/"]') })
    .first();

  const toggle = projectItem.locator(".kb-nav-link-row > .kb-nav-item-toggle");
  const megaMenu = projectItem.locator(".kb-mega-menu");

  await expect(projectItem).toBeVisible();
  await toggle.click();
  await expect(megaMenu).toBeVisible();

  const bounds = await megaMenu.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      viewport: window.innerWidth,
    };
  });

  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
});
