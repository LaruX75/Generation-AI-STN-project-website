#!/usr/bin/env node
/**
 * check-translations.js
 * Analysoi kieliversioiden puutteet ja ehdottaa toimenpiteitä.
 * Ei tee muutoksia – vain lukee ja raportoi.
 *
 * Käyttö:
 *   node scripts/check-translations.js
 *   node scripts/check-translations.js --lang en
 *   node scripts/check-translations.js --only posts
 *   node scripts/check-translations.js --only pages
 */

const fs = require("node:fs");
const path = require("node:path");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT, "content");

const LANGS = ["en", "sv"];
const LANG_LABELS = { fi: "Suomi (fi)", en: "Englanti (en)", sv: "Ruotsi (sv)" };

// PAGE_ALIAS_GROUPS: each entry is [fi-slug, en-slug, sv-slug] or [fi-slug, en-slug] etc.
// Must match _data/translations.js
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
  ["materiaalit-joista", "materials-from", "material-fran"],
];

// Pages intentionally missing certain languages (slug → langs that are expected to be absent)
const INTENTIONALLY_MISSING = {
  "encyclopedia": ["sv"],          // only fi+en
  "home": ["en"],                   // fi+sv only (en has different slug pattern)
};

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const langFilter = args.includes("--lang") ? args[args.indexOf("--lang") + 1].split(",") : LANGS;
const onlyArg = args.includes("--only") ? args[args.indexOf("--only") + 1] : null; // "posts" | "pages"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const fp = path.join(dir, e.name);
    return e.isDirectory() ? walk(fp) : [fp];
  });
}

function parseFrontmatter(source) {
  if (!source.startsWith("---\n")) return { data: {}, body: source };
  const end = source.indexOf("\n---\n", 4);
  if (end === -1) return { data: {}, body: source };
  const raw = source.slice(4, end);
  const body = source.slice(end + 5);
  const data = {};
  let currentKey = null;
  let inList = false;
  let listItems = [];

  for (const line of raw.split(/\r?\n/)) {
    const scalarMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    const listItemMatch = line.match(/^\s{2}-\s+(.+)$/);
    const topListMatch = line.match(/^([A-Za-z0-9_-]+):\s*$/);

    if (scalarMatch && !line.startsWith(" ")) {
      if (inList && currentKey) { data[currentKey] = listItems; listItems = []; inList = false; }
      const [, key, val] = scalarMatch;
      currentKey = key;
      data[key] = val.trim().replace(/^['"]|['"]$/g, "") || "";
    } else if (topListMatch && !line.startsWith(" ")) {
      if (inList && currentKey) { data[currentKey] = listItems; listItems = []; }
      currentKey = topListMatch[1];
      inList = true;
      listItems = [];
    } else if (listItemMatch && inList) {
      listItems.push(listItemMatch[1].replace(/^['"]|['"]$/g, ""));
    }
  }
  if (inList && currentKey) data[currentKey] = listItems;
  return { data, body };
}

function getDateKey(data) {
  return `${data.date || ""}|${data.updated || ""}`;
}

function shortDate(dateStr) {
  return (dateStr || "").slice(0, 10);
}

// ---------------------------------------------------------------------------
// Analysis: posts
// ---------------------------------------------------------------------------

function analyzePosts(targetLangs) {
  const fiDir = path.join(CONTENT_ROOT, "posts");
  const fiFiles = walk(fiDir).filter(f => /\.(md|njk)$/.test(f));

  // Read all Finnish posts
  const fiPosts = fiFiles
    .map(f => {
      const { data } = parseFrontmatter(fs.readFileSync(f, "utf8"));
      return { file: f, data };
    })
    .filter(p => p.data.sourceType === "posts" && p.data.date);

  // Build dateKey → file maps for translated languages
  const translatedKeys = {};
  for (const lang of targetLangs) {
    translatedKeys[lang] = new Set();
    const langDir = path.join(CONTENT_ROOT, lang, "posts");
    for (const f of walk(langDir).filter(f => /\.(md|njk)$/.test(f))) {
      const { data } = parseFrontmatter(fs.readFileSync(f, "utf8"));
      if (data.date) translatedKeys[lang].add(getDateKey(data));
    }
  }

  // Find missing translations per language
  const missing = {};
  for (const lang of targetLangs) {
    missing[lang] = fiPosts.filter(p => !translatedKeys[lang].has(getDateKey(p.data)));
  }

  return {
    total: fiPosts.length,
    translatedCounts: Object.fromEntries(
      targetLangs.map(lang => [lang, fiPosts.length - missing[lang].length])
    ),
    missing,
  };
}

// ---------------------------------------------------------------------------
// Analysis: pages
// ---------------------------------------------------------------------------

function getPageSlugs(dir) {
  const slugs = new Set();
  for (const f of walk(dir).filter(f => /\.(md|njk)$/.test(f))) {
    const base = path.basename(f).replace(/\.(md|njk)$/, "").replace(/\.11tydata$/, "");
    slugs.add(base);
  }
  return slugs;
}

function analyzePages(targetLangs) {
  const fiSlugs = getPageSlugs(path.join(CONTENT_ROOT, "pages"));
  const langSlugs = {
    en: getPageSlugs(path.join(CONTENT_ROOT, "en", "pages")),
    sv: getPageSlugs(path.join(CONTENT_ROOT, "sv", "pages")),
  };

  // Map fi-slug → { en: slug, sv: slug } via PAGE_ALIAS_GROUPS
  const aliasMap = {}; // fi-slug → { en: slug|null, sv: slug|null }
  for (const group of PAGE_ALIAS_GROUPS) {
    const [fi, en, sv] = group;
    if (!aliasMap[fi]) aliasMap[fi] = { en: null, sv: null };
    if (en) aliasMap[fi].en = en;
    if (sv) aliasMap[fi].sv = sv;
  }

  const missing = {}; // lang → [{fiSlug, expectedSlug}]
  for (const lang of targetLangs) {
    missing[lang] = [];
  }

  for (const [fiSlug, aliases] of Object.entries(aliasMap)) {
    const intentional = INTENTIONALLY_MISSING[fiSlug] || [];
    for (const lang of targetLangs) {
      if (intentional.includes(lang)) continue;
      const expectedSlug = aliases[lang];
      if (!expectedSlug) continue; // not defined in alias groups
      if (!langSlugs[lang]?.has(expectedSlug)) {
        missing[lang].push({ fiSlug, expectedSlug });
      }
    }
  }

  // Pages in fi not in any alias group at all
  const aliasedFiSlugs = new Set(Object.keys(aliasMap));
  const untracked = [...fiSlugs].filter(
    s => !aliasedFiSlugs.has(s) && !s.endsWith("-redirect") && !s.endsWith(".11tydata")
  );

  return { missing, untracked, aliasMap };
}

// ---------------------------------------------------------------------------
// Report output
// ---------------------------------------------------------------------------

function hr(char = "─", len = 60) { return char.repeat(len); }

function printReport(postResult, pageResult, targetLangs) {
  const today = new Date().toISOString().slice(0, 10);

  console.log();
  console.log("╔" + "═".repeat(58) + "╗");
  console.log("║   KIELIVERSIOANALYYSI – generation-ai-stn.fi" + " ".repeat(11) + "║");
  console.log("║   Päivitetty: " + today + " ".repeat(31) + "║");
  console.log("╚" + "═".repeat(58) + "╝");

  // ── Posts ──────────────────────────────────────────────────
  if (!onlyArg || onlyArg === "posts") {
    console.log("\n📰 JULKAISUT (posts)\n" + hr());
    console.log(`  ${LANG_LABELS.fi}: ${postResult.total} julkaisua`);
    for (const lang of targetLangs) {
      const count = postResult.translatedCounts[lang];
      const gap = postResult.total - count;
      const flag = gap > 0 ? ` ⚠️  puuttuu ${gap}` : " ✓";
      console.log(`  ${LANG_LABELS[lang]}: ${count} julkaisua${flag}`);
    }

    for (const lang of targetLangs) {
      const list = postResult.missing[lang];
      if (list.length === 0) continue;

      console.log(`\n  Puuttuvat ${lang.toUpperCase()}-käännökset (${list.length} kpl):`);
      for (const p of list) {
        const date = shortDate(p.data.date);
        const title = p.data.title || "(ei otsikkoa)";
        const relFile = path.relative(ROOT, p.file);
        console.log(`    ${date}  "${title}"`);
        console.log(`              ${relFile}`);
      }
    }
  }

  // ── Pages ──────────────────────────────────────────────────
  if (!onlyArg || onlyArg === "pages") {
    console.log("\n📄 SIVUT (pages)\n" + hr());

    let anyPageGaps = false;
    for (const lang of targetLangs) {
      const list = pageResult.missing[lang];
      if (list.length === 0) continue;
      anyPageGaps = true;
      console.log(`  Puuttuvat ${lang.toUpperCase()}-versiot (${list.length} kpl):`);
      for (const { fiSlug, expectedSlug } of list) {
        console.log(`    fi: ${fiSlug}  →  ${lang}: ${expectedSlug}  (puuttuu)`);
      }
    }
    if (!anyPageGaps) {
      console.log("  ✓ Kaikki sivut löytyvät kaikilta kieliltä.");
    }

    if (pageResult.untracked.length > 0) {
      console.log(`\n  ℹ️  Suomenkieliset sivut ilman alias-ryhmää (${pageResult.untracked.length} kpl):`);
      for (const s of pageResult.untracked) {
        console.log(`    ${s}`);
      }
      console.log("  → Lisää tarvittaessa PAGE_ALIAS_GROUPS-kohtaan (_data/translations.js)");
    }
  }

  // ── Ehdotetut toimenpiteet ─────────────────────────────────
  console.log("\n💡 EHDOTETUT TOIMENPITEET\n" + hr());

  let actionCount = 0;

  if (!onlyArg || onlyArg === "posts") {
    for (const lang of targetLangs) {
      const list = postResult.missing[lang];
      if (list.length === 0) continue;
      actionCount++;
      console.log(`\n  ${actionCount}. Käännä puuttuvat ${lang.toUpperCase()}-julkaisut (${list.length} kpl):`);
      console.log();

      if (list.length <= 5) {
        // Show individual commands
        for (const p of list) {
          const relFile = path.relative(ROOT, p.file);
          console.log(`     node scripts/translate-content.js --file ${relFile} --lang ${lang}`);
        }
        console.log();
        console.log(`     TAI kaikki kerralla:`);
      }
      console.log(`     node scripts/translate-content.js --all --lang ${lang}`);
      console.log();
      console.log(`     Esikatselu (ei kirjoita tiedostoja):`);
      console.log(`     node scripts/translate-content.js --all --lang ${lang} --dry-run`);
    }
  }

  if (!onlyArg || onlyArg === "pages") {
    const allPageMissing = targetLangs.flatMap(lang =>
      (pageResult.missing[lang] || []).map(m => ({ lang, ...m }))
    );
    if (allPageMissing.length > 0) {
      actionCount++;
      console.log(`\n  ${actionCount}. Puuttuvat sivuversiot vaativat manuaalisen luonnin:`);
      for (const { lang, fiSlug, expectedSlug } of allPageMissing) {
        console.log(`     - Luo content/${lang}/pages/${expectedSlug}.njk  (käännös: fi/${fiSlug})`);
      }
    }
  }

  if (actionCount === 0) {
    console.log("  ✓ Ei toimenpiteitä – kaikki kieliversiot ovat ajan tasalla.");
  }

  console.log("\n" + hr() + "\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const targetLangs = langFilter.filter(l => LANGS.includes(l));
  if (targetLangs.length === 0) {
    console.error("Virhe: tuntematon kieli. Käytä: --lang en tai --lang sv tai --lang en,sv");
    process.exit(1);
  }

  const postResult = (!onlyArg || onlyArg === "posts") ? analyzePosts(targetLangs) : null;
  const pageResult = (!onlyArg || onlyArg === "pages") ? analyzePages(targetLangs) : null;

  printReport(
    postResult || { total: 0, translatedCounts: {}, missing: {} },
    pageResult || { missing: {}, untracked: [], aliasMap: {} },
    targetLangs
  );
}

main();
