const { test, expect } = require("@playwright/test");

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
