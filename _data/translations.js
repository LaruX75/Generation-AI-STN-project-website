const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT, "content");
const TRANSLATED_DIRS = [
  path.join(CONTENT_ROOT, "pages"),
  path.join(CONTENT_ROOT, "en", "pages"),
  path.join(CONTENT_ROOT, "sv", "pages"),
  path.join(CONTENT_ROOT, "posts"),
  path.join(CONTENT_ROOT, "en", "posts"),
  path.join(CONTENT_ROOT, "sv", "posts")
];
const PAGE_ALIAS_GROUPS = [
  ["home", "startsida"],
  ["ajankohtaista", "current-affairs", "aktuellt"],
  ["materiaalit", "materials", "material"],
  ["hankkeen-toiminta", "what-we-do", "verksamhet"],
  ["konsortio", "consortium", "konsortium"],
  ["ollaan-yhteydessa", "get-in-touch", "kontakta-oss"],
  ["opettajalle", "for-teachers", "for-larare"],
  ["tutkijalle", "research", "forskning"],
  ["yleisölle", "for-everyone", "for-allmanheten"],
  ["vastuurajoitus", "liability-limitation", "ansvarsbegransning"],
  ["posts-search", "search", "sok"],
  ["itk2025-palautelomake", "itk2025-feedback-form", "itk2025-feedbackformular"],
  ["genai-opetettava-kone", "genai-opetettava-kone", "genai-larmaskinen"],
  ["uutiskirje", "newsletter", "nyhetsbrev"],
  ["shield-ohjelma", "shield-programme", "shield-program"],
  ["saavutettavuusseloste", "accessibility-statement", "tillganglighetsredogorelse"],
  ["educa-2025-palautelomake", "educa-2025-feedback-form", "educa-2025-feedback-formular"],
  ["tilannekuva-2022-tiivistelma", "situation-report-2022-summary", "lagesrapport-2022-sammanfattning"],
  ["cookiepolitiikka-eu", "cookie-policy-eu", "cookiepolicy-eu"],
  ["tietosuojaseloste-eu", "privacy-statement-eu", "dataskyddserklaring-eu"],
  ["uutiskirjeen-tietosuojaseloste", "newsletter-privacy-statement", "nyhetsbrevets-dataskyddsinformation"],
  ["henkilotietojen-kasittely-alakoulussa", "processing-personal-data-in-primary-school", "personuppgiftsbehandling-i-grundskolan"],
  ["materiaalit-joista", "materials-from", "material-fran"]
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return [fullPath];
  });
}

function stripQuotes(value) {
  return String(value || "").trim().replace(/^['"]|['"]$/g, "");
}

function readFrontMatter(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.startsWith("---\n")) return { data: {}, body: source };

  const endIndex = source.indexOf("\n---\n", 4);
  if (endIndex === -1) return { data: {}, body: source };

  const frontMatter = source.slice(4, endIndex);
  const body = source.slice(endIndex + 5);
  const data = {};

  for (const line of frontMatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    data[match[1]] = stripQuotes(match[2]);
  }

  return { data, body };
}

function detectLocale(filePath, frontMatter) {
  if (frontMatter.lang === "en" || frontMatter.lang === "sv" || frontMatter.lang === "fi") {
    return frontMatter.lang;
  }

  const normalizedPath = filePath.split(path.sep).join("/");
  if (normalizedPath.includes("/content/en/")) return "en";
  if (normalizedPath.includes("/content/sv/")) return "sv";
  return "fi";
}

function relativeContentPath(filePath) {
  return path.relative(CONTENT_ROOT, filePath).split(path.sep).join("/");
}

function findUniqueId(body) {
  const match = body.match(/"uniqueID":\s*"([^"]+)"/);
  return match ? match[1] : "";
}

function getStem(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function getAliasKey(stem) {
  const match = PAGE_ALIAS_GROUPS.find(group => group.includes(stem));
  return match ? `alias:${match[0]}` : "";
}

function buildTranslationKey(item) {
  if (item.translationKeyValue) return `translationKey:${item.translationKeyValue}`;
  if (item.sourceId) return `sourceId:${item.sourceId}`;
  if (item.sourceUrl) return `sourceUrl:${item.sourceUrl}`;
  if (item.uniqueId) return `uniqueId:${item.uniqueId}`;

  const aliasKey = item.sourceType === "pages" ? getAliasKey(item.stem) : "";
  if (aliasKey) return aliasKey;

  if (item.sourceType === "posts") {
    return `post:${item.date}|${item.updated}`;
  }

  return `page:${item.date}|${item.updated}|${item.stem}`;
}

function toLocalizedEntry(item) {
  return {
    url: item.permalink,
    title: item.title,
    sourceType: item.sourceType,
    relativePath: item.relativePath
  };
}

function shouldReplaceLocaleEntry(existingItem, nextItem) {
  if (!existingItem) return true;
  const existingLength = (existingItem.permalink || "").length;
  const nextLength = (nextItem.permalink || "").length;
  return nextLength > 0 && (existingLength === 0 || nextLength < existingLength);
}

module.exports = function() {
  const items = [];

  for (const dir of TRANSLATED_DIRS) {
    for (const filePath of walk(dir)) {
      const extension = path.extname(filePath);
      if (![".njk", ".md", ".html"].includes(extension)) continue;

      const { data, body } = readFrontMatter(filePath);
      const sourceType = data.sourceType || "";
      if (!["pages", "posts"].includes(sourceType)) continue;

      const locale = detectLocale(filePath, data);
      const uniqueId = findUniqueId(body);
      const stem = getStem(filePath);
      const item = {
        locale,
        sourceType,
        title: data.title || "",
        permalink: data.permalink || "",
        translationKeyValue: data.translationKey || "",
        sourceId: data.sourceId || "",
        sourceUrl: data.sourceUrl || "",
        date: data.date || "",
        updated: data.updated || "",
        uniqueId,
        stem,
        relativePath: relativeContentPath(filePath)
      };

      item.translationKey = buildTranslationKey(item);
      items.push(item);
    }
  }

  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.translationKey)) {
      groups.set(item.translationKey, {});
    }
    const localizedGroup = groups.get(item.translationKey);
    if (shouldReplaceLocaleEntry(localizedGroup[item.locale], item)) {
      localizedGroup[item.locale] = item;
    }
  }

  const byUrl = {};
  for (const item of items) {
    const group = groups.get(item.translationKey) || {};
    byUrl[item.permalink] = Object.fromEntries(
      Object.entries(group).map(([locale, groupedItem]) => [locale, toLocalizedEntry(groupedItem)])
    );
  }

  return {
    byUrl,
    keys: Object.fromEntries(
      Array.from(groups.entries()).map(([key, group]) => [
        key,
        Object.fromEntries(
          Object.entries(group).map(([locale, groupedItem]) => [locale, toLocalizedEntry(groupedItem)])
        )
      ])
    )
  };
};
