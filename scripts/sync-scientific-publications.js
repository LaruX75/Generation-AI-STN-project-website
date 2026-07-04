#!/usr/bin/env node
"use strict";

/**
 * Hakee uudet julkaisut OpenAlexista kaikille hankkeen tutkijoille ja
 * lisää ne scientificPublications.data.json:iin (olemassa olevia ei ylikirjoiteta).
 *
 * Käyttö:
 *   node scripts/sync-scientific-publications.js            # kirjoittaa tiedostoon
 *   node scripts/sync-scientific-publications.js --dry-run  # vain tulostaa, ei kirjoita
 */

const fs   = require("node:fs");
const path = require("node:path");

const DATA_PATH   = path.join(__dirname, "../src/_data/scientificPublications.data.json");
const CONFIG_PATH = path.join(__dirname, "../src/_data/researchfi.config.json");

const OPENALEX  = "https://api.openalex.org";
const MAILTO    = process.env.OPENALEX_MAILTO || "jari.laru@gmail.com";
const MIN_YEAR  = 2022;
const DELAY_MS  = 300;
const DRY_RUN   = process.argv.includes("--dry-run");

// OpenAlex work types → Finnish OKM publication codes (educated guess)
const TYPE_TO_CODE = {
  "article":            "A1",
  "review":             "A2",
  "proceedings-article": "A4",
  "book-chapter":       "A3c",
  "book":               "B1",
  "edited-book":        "E1",
  "dissertation":       "G5",
  "report":             "B3",
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchJson(url) {
  const resp = await fetch(url, {
    headers: { "User-Agent": `GenerationAI-publications-sync/1.0 (mailto:${MAILTO})` }
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status} — ${url}\n${text.slice(0, 200)}`);
  }
  return resp.json();
}

/** Palauttaa OpenAlex author ID:n (ilman base URL:ia) tai null */
async function resolveAuthorId(person) {
  // Suora OpenAlex ID configissa — tarkin vaihtoehto
  if (person.openAlexId) return person.openAlexId;

  // ORCID-haku on luotettavin
  if (person.orcid) {
    const url = `${OPENALEX}/authors?filter=orcid:https://orcid.org/${person.orcid}&mailto=${MAILTO}`;
    const data = await fetchJson(url);
    const hit  = data.results?.[0];
    if (hit?.id) return hit.id.replace("https://openalex.org/", "");
    // ORCID ei löydy suoraan, kokeile worksista
  }

  // Nimihaku — vaaditaan suomalainen instituutio väärän osuman välttämiseksi
  const url = `${OPENALEX}/authors?search=${encodeURIComponent(person.name)}&per-page=10&mailto=${MAILTO}`;
  const data = await fetchJson(url);
  const candidates = data.results || [];
  if (!candidates.length) return null;

  const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const personNorm = norm(person.name);

  const isFinnish = (c) =>
    (c.last_known_institutions || []).some(i =>
      (i.country_code || "").toUpperCase() === "FI"
    );

  // 1) Täsmällinen nimi + suomalainen instituutio
  const exactFinnish = candidates.find(c => norm(c.display_name) === personNorm && isFinnish(c));
  if (exactFinnish) return exactFinnish.id.replace("https://openalex.org/", "");

  // 2) Osittainen nimivastaavuus + suomalainen instituutio
  const partialFinnish = candidates.find(c =>
    isFinnish(c) && (
      norm(c.display_name).includes(personNorm) ||
      personNorm.includes(norm(c.display_name))
    )
  );
  if (partialFinnish) return partialFinnish.id.replace("https://openalex.org/", "");

  // Ei löydy suomalaisesta instituutiosta — jätetään pois
  return null;
}

/** Hakee kaikki julkaisut authorId:llä alkaen MIN_YEAR */
async function fetchWorksForAuthor(authorId, personName) {
  const url =
    `${OPENALEX}/works` +
    `?filter=authorships.author.id:${authorId},publication_year:%3E${MIN_YEAR - 1}` +
    `&per-page=100` +
    `&select=id,doi,display_name,publication_year,type,primary_location,authorships` +
    `&mailto=${MAILTO}`;

  const data = await fetchJson(url);
  return (data.results || []).map(w => ({ ...w, _resolvedFor: personName }));
}

function normalizeDoi(raw) {
  if (!raw) return "";
  return raw.replace(/^https?:\/\/doi\.org\//i, "").toLowerCase().trim();
}

function formatAuthors(authorships) {
  return (authorships || [])
    .map(a => a.author?.display_name)
    .filter(Boolean)
    .join("; ");
}

function guessCode(openAlexType) {
  return TYPE_TO_CODE[openAlexType || ""] || "";
}

async function main() {
  const existing = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const config   = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

  const existingDois   = new Set(existing.map(i => normalizeDoi(i.doi)).filter(Boolean));
  const existingTitles = new Set(
    existing.map(i => (i.title || "").toLowerCase().trim()).filter(Boolean)
  );

  const allWorks = new Map(); // OpenAlex work ID → work object

  console.log(`Haetaan julkaisuja ${config.people.length} tutkijalle (OpenAlex)...\n`);

  for (const person of config.people) {
    process.stdout.write(`  ${person.name} ... `);
    try {
      await sleep(DELAY_MS);
      const authorId = await resolveAuthorId(person);
      if (!authorId) {
        console.log("ei löydy OpenAlexista");
        continue;
      }
      await sleep(DELAY_MS);
      const works = await fetchWorksForAuthor(authorId, person.name);
      console.log(`${works.length} julkaisua (${authorId})`);
      for (const w of works) {
        if (!allWorks.has(w.id)) allWorks.set(w.id, w);
      }
    } catch (err) {
      console.log(`virhe — ${err.message.split("\n")[0]}`);
      await sleep(DELAY_MS * 3);
    }
  }

  console.log(`\nOpenAlexista yhteensä: ${allWorks.size} uniikkia julkaisua`);

  const newItems = [];
  let nextIdx = existing.length + 1;

  for (const work of allWorks.values()) {
    const doi   = normalizeDoi(work.doi);
    const title = (work.display_name || "").toLowerCase().trim();

    if (doi   && existingDois.has(doi))     continue;
    if (title && existingTitles.has(title)) continue;

    // Älä lisää preprinttejä / postauksista
    if (["preprint", "posted-content"].includes(work.type)) continue;

    const year  = work.publication_year || null;
    const code  = guessCode(work.type);
    const venue = work.primary_location?.source?.display_name || "";

    const idSlug =
      (code.toLowerCase().replace(/[^a-z0-9]/g, "") || "pub") +
      "-" + (year || "nodate") +
      "-" + nextIdx;

    newItems.push({
      id:          idSlug,
      code,
      year,
      status:      "Published",
      authorsText: formatAuthors(work.authorships),
      title:       work.display_name || "",
      venue,
      doi,
      url:         doi ? "" : (work.id || ""),
      notes:       ""
    });

    existingDois.add(doi);
    existingTitles.add(title);
    nextIdx++;
  }

  if (!newItems.length) {
    console.log("\nKaikki julkaisut ovat jo listalla — ei muutoksia.");
    return;
  }

  // Järjestä uudet vuoden mukaan laskevasti
  newItems.sort((a, b) => (b.year || 0) - (a.year || 0));

  console.log(`\nUusia julkaisuja: ${newItems.length}`);
  newItems.forEach(i =>
    console.log(`  [${i.code || "?"}] ${i.year || "?"} — ${i.title.slice(0, 70)}`)
  );

  if (DRY_RUN) {
    console.log("\n(--dry-run: tiedostoa ei kirjoitettu)");
    return;
  }

  const updated = [...existing, ...newItems];
  fs.writeFileSync(DATA_PATH, JSON.stringify(updated, null, 2) + "\n", "utf8");
  console.log(`\nTallennettu → ${DATA_PATH} (yhteensä ${updated.length} julkaisua)`);
}

main().catch(err => {
  console.error("\nVirhe:", err.message);
  process.exit(1);
});
