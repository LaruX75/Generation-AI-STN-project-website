// Consent is pre-set via storageState in playwright.config.js so the banner
// never appears. This function is a fast safety fallback for edge cases.
async function acceptNecessaryCookies(page) {
  await page.waitForLoadState("load");
  const labels = [/Vain välttämättömät/i, /Necessary only/i, /Endast nödvändiga/i];
  await Promise.race(
    labels.map(label =>
      page.getByRole("button", { name: label }).first()
        .waitFor({ state: "visible", timeout: 1500 })
        .then(() => page.getByRole("button", { name: label }).first().click())
        .catch(() => {})
    )
  );
}

module.exports = { acceptNecessaryCookies };
