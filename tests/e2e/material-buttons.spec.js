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

test("Materials page action buttons keep their intended colors", async ({ page }) => {
  await page.goto("/materiaalit/");
  await acceptNecessaryCookies(page);

  const primaryToolButton = page.locator(".gen-ai-tool-card-link").first();
  const primaryPublicationButton = page.locator(".mat-pub-card-btn--primary").first();
  const secondaryPublicationButton = page.locator(".mat-pub-card-btn--secondary").first();

  await expect(primaryToolButton).toBeVisible();
  await expect(primaryPublicationButton).toBeVisible();
  await expect(secondaryPublicationButton).toBeVisible();

  const styles = await page.evaluate(() => {
    function getStyles(selector) {
      const element = document.querySelector(selector);
      const computed = window.getComputedStyle(element);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
        textDecorationLine: computed.textDecorationLine,
      };
    }

    return {
      toolPrimary: getStyles(".gen-ai-tool-card-link"),
      publicationPrimary: getStyles(".mat-pub-card-btn--primary"),
      publicationSecondary: getStyles(".mat-pub-card-btn--secondary"),
    };
  });

  expect(styles.toolPrimary.color).toBe("rgb(255, 255, 255)");
  expect(styles.toolPrimary.backgroundColor).toBe("rgb(68, 109, 51)");
  expect(styles.publicationPrimary.color).toBe("rgb(255, 255, 255)");
  expect(styles.publicationPrimary.backgroundColor).toBe("rgb(68, 109, 51)");
  expect(styles.publicationSecondary.color).toBe("rgb(68, 109, 51)");
  expect(styles.publicationSecondary.borderColor).toBe("rgb(68, 109, 51)");
  expect(styles.publicationSecondary.textDecorationLine).toBe("none");
});

test("Materials page action buttons keep readable colors on hover", async ({ page }) => {
  await page.goto("/materiaalit/");
  await acceptNecessaryCookies(page);

  const primaryToolButton = page.locator(".gen-ai-tool-card-link").first();
  const primaryPublicationButton = page.locator(".mat-pub-card-btn--primary").first();

  await expect(primaryToolButton).toBeVisible();
  await expect(primaryPublicationButton).toBeVisible();

  await primaryToolButton.hover();
  const toolHover = await primaryToolButton.evaluate(element => {
    const computed = window.getComputedStyle(element);
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
    };
  });

  expect(toolHover.color).toBe("rgb(255, 255, 255)");
  expect(contrastRatio(toolHover.color, toolHover.backgroundColor)).toBeGreaterThanOrEqual(4.5);

  await primaryPublicationButton.hover();
  const publicationHover = await primaryPublicationButton.evaluate(element => {
    const computed = window.getComputedStyle(element);
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
    };
  });

  expect(publicationHover.color).toBe("rgb(255, 255, 255)");
  expect(contrastRatio(publicationHover.color, publicationHover.backgroundColor)).toBeGreaterThanOrEqual(4.5);
});
