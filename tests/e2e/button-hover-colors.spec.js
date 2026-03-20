const { test, expect } = require("@playwright/test");

function parseRgb(rgb) {
  const matches = rgb.match(/\d+/g) || [];
  return matches.slice(0, 3).map(Number);
}

function relativeLuminance([r, g, b]) {
  const normalize = value => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  };

  const [red, green, blue] = [r, g, b].map(normalize);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const fg = relativeLuminance(parseRgb(foreground));
  const bg = relativeLuminance(parseRgb(background));
  const [lighter, darker] = fg > bg ? [fg, bg] : [bg, fg];
  return (lighter + 0.05) / (darker + 0.05);
}

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

async function expectHoverColors(page, selector, expected) {
  const locator = page.locator(selector).first();
  await expect(locator).toBeVisible();
  await locator.hover();

  const styles = await locator.evaluate(element => {
    const computed = window.getComputedStyle(element);
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
    };
  });

  if (expected.color) {
    expect(styles.color).toBe(expected.color);
  }

  expect(contrastRatio(styles.color, styles.backgroundColor)).toBeGreaterThanOrEqual(4.5);
}

test("Homepage CTA buttons keep readable hover colors", async ({ page }) => {
  await page.goto("/");
  await acceptNecessaryCookies(page);

  await expectHoverColors(page, ".home-intro-btn--primary", {
    color: "rgb(255, 255, 255)",
  });

  await expectHoverColors(page, ".home-tools-btn", {
    color: "rgb(255, 255, 255)",
  });

  await expectHoverColors(page, ".genai-brand-strip-cta", {
    color: "rgb(68, 109, 51)",
  });
});

test("Teacher page CTA buttons keep readable hover colors", async ({ page }) => {
  await page.goto("/opettajalle/");
  await acceptNecessaryCookies(page);

  await expectHoverColors(page, ".teacher-intro-btn--primary", {
    color: "rgb(255, 255, 255)",
  });

  await expectHoverColors(page, ".teacher-guide-btn", {
    color: "rgb(255, 255, 255)",
  });
});

test("Research page CTA buttons keep readable hover colors", async ({ page }) => {
  await page.goto("/tutkijalle/");
  await acceptNecessaryCookies(page);

  await expectHoverColors(page, ".researcher-intro-btn--primary", {
    color: "rgb(255, 255, 255)",
  });

  await expectHoverColors(page, ".researcher-shield-btn", {
    color: "rgb(49, 78, 37)",
  });
});

test("Public page CTA buttons keep readable hover colors", async ({ page }) => {
  await page.goto("/yleisölle/");
  await acceptNecessaryCookies(page);

  await expectHoverColors(page, ".public-intro-btn--primary", {
    color: "rgb(255, 255, 255)",
  });

  await expectHoverColors(page, ".public-book-btn--primary", {
    color: "rgb(49, 78, 37)",
  });
});
