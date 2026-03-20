const { test, expect } = require("@playwright/test");
const navigation = require("../../_data/navigation.json");

const mainMenu = Array.isArray(navigation)
  ? navigation.find(menu => menu.slug === "paavalikko")
  : null;

const mainMenuUrls = (mainMenu?.items || [])
  .filter(item => item && typeof item.url === "string" && item.url.startsWith("/"))
  .map(item => ({
    title: item.title,
    url: item.url,
  }));

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

async function getHeroSignature(page, url) {
  await page.goto(url);
  await acceptNecessaryCookies(page);

  const hero = page.locator(".entry-hero.page-hero-section");
  const heroImage = hero.locator(".hero-bg-image");
  const blurLayer = hero.locator(".hero-bg-blur");

  await expect(hero, `${url} should render the shared hero section`).toBeVisible();
  await expect(heroImage, `${url} should render the sharp hero image`).toBeVisible();

  const signature = await page.evaluate(() => {
    const image = document.querySelector(".entry-hero.page-hero-section .hero-bg-image");
    const blur = document.querySelector(".entry-hero.page-hero-section .hero-bg-blur");
    const preload = document.querySelector('link[rel="preload"][as="image"]');

    return {
      currentSrc: image?.currentSrc || image?.getAttribute("src") || "",
      blurImage: blur ? window.getComputedStyle(blur).backgroundImage : "",
      preloadHref: preload?.getAttribute("href") || "",
      naturalWidth: image?.naturalWidth || 0,
      naturalHeight: image?.naturalHeight || 0,
    };
  });

  expect(signature.naturalWidth, `${url} hero image should load`).toBeGreaterThan(0);
  expect(signature.naturalHeight, `${url} hero image should load`).toBeGreaterThan(0);

  return signature;
}

test.describe("Shared hero consistency", () => {
  test("main navigation pages use the same hero image treatment", async ({ page }) => {
    expect(mainMenuUrls.length).toBeGreaterThan(0);

    const [referencePage, ...otherPages] = mainMenuUrls;
    const referenceHero = await getHeroSignature(page, referencePage.url);

    for (const item of otherPages) {
      const candidateHero = await getHeroSignature(page, item.url);

      expect(
        candidateHero.currentSrc,
        `${item.title} should use the same sharp hero image as ${referencePage.title}`
      ).toBe(referenceHero.currentSrc);

      expect(
        candidateHero.blurImage,
        `${item.title} should use the same blurred hero background as ${referencePage.title}`
      ).toBe(referenceHero.blurImage);

      expect(
        candidateHero.preloadHref,
        `${item.title} should preload the same hero asset as ${referencePage.title}`
      ).toBe(referenceHero.preloadHref);
    }
  });
});
