const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const auditedPages = [
  { name: "Finnish home", url: "/" },
  { name: "Teachers", url: "/opettajalle/" },
  { name: "Research", url: "/tutkijalle/" },
  { name: "For everyone", url: "/yleisolle/" },
  { name: "Current affairs", url: "/ajankohtaista/" },
  { name: "Project activities", url: "/hankkeen-toiminta/" },
  { name: "Teachable machine page", url: "/genai-opetettava-kone/" },
  { name: "Publication layout", url: "/henkilotietojen-kasittely-alakoulussa/" },
  { name: "Doc layout", url: "/materiaalit/somekone/somekone-yleista/kuinka-saan-somekoneen-kayttooni/" },
  { name: "English home", url: "/en/" },
  { name: "Swedish home", url: "/sv/" },
];

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

function formatViolations(violations) {
  return violations
    .map(violation => {
      const nodes = violation.nodes
        .slice(0, 5)
        .map(node => `${node.target.join(" ")} -> ${node.failureSummary || node.html}`)
        .join("\n");

      return `${violation.id}: ${violation.help}\n${violation.helpUrl}\n${nodes}`;
    })
    .join("\n\n");
}

test.describe("WCAG 2.1 AA accessibility", () => {
  for (const auditedPage of auditedPages) {
    test(`${auditedPage.name} has no detectable WCAG 2.1 AA violations`, async ({ page }) => {
      await page.goto(auditedPage.url);
      await acceptNecessaryCookies(page);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();

      expect(
        results.violations,
        formatViolations(results.violations)
      ).toEqual([]);
    });
  }
});
