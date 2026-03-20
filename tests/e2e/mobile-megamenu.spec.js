const { test, expect } = require("@playwright/test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const fixtureUrl = pathToFileURL(path.join(__dirname, "..", "fixtures", "mobile-nav.html")).href;

async function openMobileMenu(page) {
  await page.goto(fixtureUrl);

  const menuToggle = page.getByRole("button", {
    name: /Avaa navigaatio|Toggle navigation|Öppna navigering/i,
  });

  await expect(menuToggle).toBeVisible();
  await menuToggle.click();
  await expect(page.locator("#site-nav-menu")).toBeVisible();
}

function topLevelNavItem(page, label) {
  return page
    .locator("#site-nav-menu > .kb-nav-menu > .kb-nav-item")
    .filter({ has: page.locator(".kb-nav-link-row > .kb-nav-link", { hasText: label }) })
    .first();
}

function directToggleFor(item) {
  return item.locator("> .kb-nav-link-row > .kb-nav-item-toggle");
}

function directPanelFor(item) {
  return item.locator("> .kb-nav-sub-menu, > .kb-mega-menu");
}

test.describe("Mobile megamenu", () => {
  test("opens the teacher megamenu without horizontal overflow", async ({ page }) => {
    await openMobileMenu(page);

    const teachersItem = topLevelNavItem(page, "Opettajalle");
    const teachersToggle = directToggleFor(teachersItem);

    await expect(teachersItem).toBeVisible();
    await teachersToggle.click();

    await expect(teachersItem).toHaveClass(/is-open/);
    await expect(directPanelFor(teachersItem)).toBeVisible();

    const overflow = await page.evaluate(() => {
      const nav = document.querySelector("#site-nav-menu");
      const offending = [];
      const selectors = [
        ".site-navigation",
        ".kb-mega-menu",
        ".kb-mega-menu-cols",
        ".kb-mega-menu-col",
        ".kb-mega-col-heading",
        ".kb-mega-link",
        ".kb-nav-link",
      ];

      if (!nav) {
        return { viewport: window.innerWidth, navScrollWidth: 0, pageOverflow: 0, offending };
      }

      document.querySelectorAll(selectors.join(",")).forEach(element => {
        const rect = element.getBoundingClientRect();
        if (rect.right > window.innerWidth + 1 || rect.left < -1) {
          offending.push({
            className: element.className,
            text: (element.textContent || "").trim().slice(0, 120),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          });
        }
      });

      return {
        viewport: window.innerWidth,
        navScrollWidth: nav.scrollWidth,
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        offending,
      };
    });

    expect(overflow.pageOverflow).toBeLessThanOrEqual(1);
    expect(overflow.navScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
    expect(overflow.offending).toEqual([]);
  });

  test("opening another megamenu closes the previous one", async ({ page }) => {
    await openMobileMenu(page);

    const teachersItem = topLevelNavItem(page, "Opettajalle");
    const researchItem = topLevelNavItem(page, "Tutkijalle");

    await directToggleFor(teachersItem).click();
    await expect(teachersItem).toHaveClass(/is-open/);

    await directToggleFor(researchItem).click();

    await expect(researchItem).toHaveClass(/is-open/);
    await expect(directPanelFor(researchItem)).toBeVisible();
    await expect(teachersItem).not.toHaveClass(/is-open/);
    await expect(directPanelFor(teachersItem)).not.toBeVisible();
  });

  test("closing a megamenu restores sibling top-level navigation", async ({ page }) => {
    await openMobileMenu(page);

    const teachersItem = topLevelNavItem(page, "Opettajalle");
    const researchItem = topLevelNavItem(page, "Tutkijalle");
    const teachersToggle = directToggleFor(teachersItem);
    const researchToggle = directToggleFor(researchItem);

    await teachersToggle.click();
    await expect(teachersItem).toHaveClass(/is-open/);

    await teachersToggle.click();
    await expect(teachersItem).not.toHaveClass(/is-open/);
    await expect(directPanelFor(teachersItem)).not.toBeVisible();

    await researchToggle.click();
    await expect(researchItem).toHaveClass(/is-open/);
    await expect(directPanelFor(researchItem)).toBeVisible();
  });

  test("closing a nested submenu restores access to top-level items", async ({ page }) => {
    await openMobileMenu(page);

    const audienceItem = topLevelNavItem(page, "Yleisölle");
    const audienceToggle = directToggleFor(audienceItem);
    const eventsItem = audienceItem
      .locator("> .kb-nav-sub-menu > .kb-nav-item")
      .filter({ has: page.locator("> .kb-nav-link-row > .kb-nav-link", { hasText: "Tapahtumat" }) })
      .first();
    const eventsToggle = directToggleFor(eventsItem);
    const researchItem = topLevelNavItem(page, "Tutkijalle");
    const researchToggle = directToggleFor(researchItem);

    await audienceToggle.click();
    await expect(audienceItem).toHaveClass(/is-open/);

    await eventsToggle.click();
    await expect(eventsItem).toHaveClass(/is-open/);
    await expect(directPanelFor(eventsItem)).toBeVisible();

    await audienceToggle.click();
    await expect(audienceItem).not.toHaveClass(/is-open/);
    await expect(directPanelFor(audienceItem)).not.toBeVisible();

    await researchToggle.click();
    await expect(researchItem).toHaveClass(/is-open/);
    await expect(directPanelFor(researchItem)).toBeVisible();
  });
});
