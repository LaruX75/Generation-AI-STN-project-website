#!/usr/bin/env node
"use strict";

/**
 * Hakee opinnäytteet OuluREPO:sta kaikille hankkeen tutkijoille
 * (dc.contributor.thesisadvisor-kenttä) ja lisää ne theses.data.json:iin.
 *
 * Huom: UEF eRepo ja Helda eivät julkaise thesisadvisor-metadataa API:ssa —
 * UEF- ja Helsinki-opinnäytteet lisätään manuaalisesti admin-työkalulla.
 *
 * Käyttö:
 *   node scripts/sync-theses.js            # kirjoittaa tiedostoon
 *   node scripts/sync-theses.js --dry-run  # vain tulostaa, ei kirjoita
 */

const fs   = require("node:fs");
const path = require("node:path");

const DATA_PATH   = path.join(__dirname, "../src/_data/theses.data.json");
const CONFIG_PATH = path.join(__dirname, "../src/_data/researchfi.config.json");

const BASE    = "https://oulurepo.oulu.fi/open-search/";
const RPP     = 100;
const MIN_YEAR = 2022;
const DELAY_MS = 400;
const DRY_RUN  = process.argv.includes("--dry-run");

const TYPE_MAP = {
  masterThesis:    "pro gradu",
  bachelorThesis:  "kandidaatti",
  doctoralThesis:  "väitöskirja",
  licentiateThesis:"lisensiaatti",
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchPage(lastName, start = 0) {
  const query =
    `dc.contributor.thesisadvisor:${lastName}* AND ` +
    `(type:masterThesis OR type:bachelorThesis)`;
  const params = new URLSearchParams({
    query, format: "kk", rpp: RPP, start, sort_by: 2, order: "desc",
  });
  const url = `${BASE}?${params}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "GenerationAI-theses-sync/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

function decodeXml(str) {
  return str
    .replace(/&#13;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function parseKK(xmlStr) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xmlStr)) !== null) {
    const block = m[1];

    const getOne = (el, q) => {
      const re = new RegExp(
        `<metadata[^>]*element="${el}"[^>]*qualifier="${q}"[^>]*>([^<]*)</metadata>`
      );
      const hit = block.match(re);
      return hit ? decodeXml(hit[1].trim()) : "";
    };

    const getAll = (el, q) => {
      const re = new RegExp(
        `<metadata[^>]*element="${el}"[^>]*qualifier="${q}"[^>]*>([^<]*)</metadata>`,
        "g"
      );
      const out = [];
      let hit;
      while ((hit = re.exec(block)) !== null) {
        if (hit[1].trim()) out.push(decodeXml(hit[1].trim()));
      }
      return out;
    };

    const title = getOne("title", "") || getOne("title", "alternative");
    if (!title) continue;

    const issued = getOne("date", "issued");
    const year   = Number((issued.match(/\d{4}/) || [])[0]) || null;
    if (year && year < MIN_YEAR) continue;

    const link =
      getOne("identifier", "uri") ||
      (block.match(/<url>([^<]*)<\/url>/) || [])[1] || "";

    items.push({
      title,
      year,
      author:      getAll("contributor", "author").join("; "),
      advisors:    getAll("contributor", "thesisadvisor"),
      type:        getOne("type", "publication"),
      link,
      abstract:    getOne("description", "abstract"),
      language:    getOne("language", "iso"),
      keywords:    getAll("subject", "discipline"),
    });
  }
  return items;
}

async function fetchAllForName(lastName) {
  const items = [];
  for (let page = 0; page < 20; page++) {
    const xml  = await fetchPage(lastName, page * RPP);
    const page_items = parseKK(xml);
    items.push(...page_items);
    if (page_items.length < RPP) break;
    await sleep(DELAY_MS);
  }
  return items;
}

// "Jari Laru" → "Laru"
// "Lindroos-Hovinheimo, Susanna M" → "Lindroos-Hovinheimo"  (Last, First format)
// "Jussi Koivisto, KM" → "Koivisto"  (First Last, Degree format)
function extractLastName(fullName) {
  const name = fullName.trim();
  if (name.includes(",")) {
    const beforeComma = name.split(",")[0].trim();
    const words = beforeComma.split(/\s+/).filter(Boolean);
    // Single word before comma → it's the last name ("Lindroos-Hovinheimo, Susanna")
    if (words.length === 1) return words[0];
    // Multiple words before comma → last of those is the last name ("Jussi Koivisto, KM")
    return words[words.length - 1];
  }
  // No comma: last word is last name ("Jari Laru")
  const words = name.split(/\s+/).filter(p => p.length > 1);
  return words[words.length - 1] || name;
}

function makeId(item, idx) {
  const typeSlug = (item.type || "thesis").replace(/[^a-z]/gi, "").toLowerCase();
  return `oulu-${typeSlug}-${item.year || "nodate"}-${idx}`;
}

function normalizeTitle(t) {
  return (t || "").toLowerCase().trim();
}

async function main() {
  const existing = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const config   = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

  const existingUrls   = new Set(existing.map(t => t.url).filter(Boolean));
  const existingTitles = new Set(existing.map(t => normalizeTitle(t.title)).filter(Boolean));

  // Unique last names to search — deduplicated
  const lastNames = [...new Set(
    config.people.map(p => extractLastName(p.name)).filter(Boolean)
  )];

  console.log(`Haetaan opinnäytteitä OuluREPO:sta — ${lastNames.length} nimeä...\n`);

  const allItems = new Map(); // link → item (dedup within fetch run)

  for (const lastName of lastNames) {
    process.stdout.write(`  ${lastName} ... `);
    try {
      await sleep(DELAY_MS);
      const items = await fetchAllForName(lastName);
      // Client-side verify: advisor name must actually match
      const filtered = items.filter(item =>
        item.advisors.some(a => a.toLowerCase().includes(lastName.toLowerCase()))
      );
      console.log(`${filtered.length} (${items.length} haettu)`);
      for (const item of filtered) {
        if (item.link && !allItems.has(item.link)) {
          allItems.set(item.link, item);
        }
      }
    } catch (err) {
      console.log(`virhe — ${err.message.split("\n")[0]}`);
      await sleep(DELAY_MS * 3);
    }
  }

  console.log(`\nOuluREPO: ${allItems.size} uniikkia opinnäytettä löydetty`);

  const newItems = [];
  let nextIdx = existing.length + 1;

  for (const item of allItems.values()) {
    const titleNorm = normalizeTitle(item.title);
    if (item.link && existingUrls.has(item.link)) continue;
    if (titleNorm  && existingTitles.has(titleNorm)) continue;

    newItems.push({
      id:          makeId(item, nextIdx),
      type:        TYPE_MAP[item.type] || item.type || "",
      year:        item.year,
      title:       item.title,
      author:      item.author,
      language:    item.language || "",
      supervisors: item.advisors.join("; "),
      university:  "Oulun yliopisto",
      url:         item.link,
      keywords:    item.keywords.join("; "),
      abstract:    item.abstract,
      notes:       "",
    });

    if (item.link)   existingUrls.add(item.link);
    if (titleNorm)   existingTitles.add(titleNorm);
    nextIdx++;
  }

  newItems.sort((a, b) => (b.year || 0) - (a.year || 0));

  if (!newItems.length) {
    console.log("\nKaikki opinnäytteet ovat jo listalla — ei muutoksia.");
    return;
  }

  console.log(`\nUusia opinnäytteitä: ${newItems.length}`);
  newItems.forEach(i =>
    console.log(`  [${i.type || "?"}] ${i.year || "?"} — ${i.title.slice(0, 70)}`)
  );

  if (DRY_RUN) {
    console.log("\n(--dry-run: tiedostoa ei kirjoitettu)");
    return;
  }

  const updated = [...existing, ...newItems];
  fs.writeFileSync(DATA_PATH, JSON.stringify(updated, null, 2) + "\n", "utf8");
  console.log(`\nTallennettu → ${DATA_PATH} (yhteensä ${updated.length} opinnäytettä)`);
}

main().catch(err => {
  console.error("\nVirhe:", err.message);
  process.exit(1);
});
