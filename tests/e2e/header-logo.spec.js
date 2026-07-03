const { test, expect } = require("@playwright/test");
const { acceptNecessaryCookies } = require("./helpers");

const logoRoutes = [
  { from: "/opettajalle/", to: "/" },
  { from: "/en/for-teachers/", to: "/en/" },
  { from: "/sv/for-larare/", to: "/sv/" },
];

for (const route of logoRoutes) {
  test(`Header logo navigates from ${route.from} to ${route.to}`, async ({ page }) => {
    await page.goto(route.from);
    await acceptNecessaryCookies(page);

    const logo = page.locator(".site-logo").first();
    await expect(logo).toBeVisible();
    await logo.click();

    await expect(page).toHaveURL(new RegExp(`${route.to.replace(/\//g, "\\/")}$`));
  });
}
