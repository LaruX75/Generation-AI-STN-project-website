#!/usr/bin/env node
/**
 * manage-categories.js — Category management tool for Generation AI content
 *
 * Usage:
 *   node scripts/manage-categories.js stats          # Show category usage stats
 *   node scripts/manage-categories.js list           # List all unique categories per language
 *   node scripts/manage-categories.js migrate --dry  # Preview category migrations
 *   node scripts/manage-categories.js migrate        # Apply category migrations to files
 *   node scripts/manage-categories.js unknown        # Show categories not in the canonical list
 */

const fs = require("node:fs");
const path = require("node:path");
const { glob } = require("node:fs/promises");

// ── Canonical category hierarchy ──────────────────────────────────────────────
// Format: "Parent / Child" or just "Parent" for top-level.
// Edit this object to update canonical categories for all three languages.

const CANONICAL = {
  fi: [
    "Ajankohtaista",
    "Ajankohtaista / Ajankohtaista hankkeen ulkopuolella",
    "Ajankohtaista / Blogikirjoitus",
    "Ajankohtaista / GenAI hankkeen henkilöstö mediassa",
    "Ajankohtaista / GenAI hankkeen henkilöstö tapahtumissa",
    "Ajankohtaista / GenAI hankkeen kouluttamassa",
    "Ajankohtaista / GenAI työkalut ja materiaalit hankkeen ulkopuolella",
    "Ajankohtaista / Haastattelu",
    "Ajankohtaista / Mielipidekirjoitus",
    "Ajankohtaista / Podcast",
    "Ajankohtaista / Webinaari",
    "Ajankohtaista / YLE",
    "Esiopetus",
    "FCAI",
    "Generation AI kuukausittaiset tekoälykuulumiset (uutiskirje)",
    "Hankkeen toiminta",
    "Helsingin yliopisto",
    "Heureka",
    "Itä-Suomen yliopisto",
    "Kolumni",
    "Konferenssit ja seminaarit",
    "Luento",
    "MTV3",
    "Media",
    "Sovellukset",
    "Sovellukset / Luokittelija",
    "Tutkimus",
    "Tutkimus / Julkaisu",
    "Tutkimus / Konferenssijulkaisu",
    "Tutkimus / Lasten oikeudet",
    "Työpaja",
    "Yliopistojen uutiset",
    "Youtube",
  ],
  en: [
    "News from",
    "News from / Blog post",
    "News from / GenAI project staff at events",
    "News from / GenAI project staff in the media",
    "News from / Opinion piece",
    "News from / Podcast",
    "News from / Webinar",
    "News from / YLE",
    "Generation AI Monthly AI News (newsletter)",
    "Media",
    "Project activities",
    "Research",
    "Research / Children's rights",
    "Research / Conference proceedings",
    "Research / Published on",
    "University of Helsinki",
  ],
  sv: [
    "Nyheter från",
    "Nyheter från / Blogginlägg",
    "Nyheter från / Debattartikel",
    "Nyheter från / GenAI-projektets personal i media",
    "Nyheter från / GenAI-projektets personal vid evenemang",
    "Nyheter från / Podcast",
    "Nyheter från / Webbinarium",
    "Nyheter från / YLE",
    "Forskning",
    "Forskning / Barns rättigheter",
    "Forskning / Konferenshandlingar",
    "Forskning / Publicerad på",
    "Generation AI Monthly AI News (nyhetsbrev)",
    "Helsingfors universitet",
    "Media",
    "Projektaktiviteter",
  ],
};

// ── Migration map ─────────────────────────────────────────────────────────────
// Maps old/inconsistent category names → canonical names.
// Add entries here to fix existing content.

const MIGRATIONS = {
  fi: {
    "GenAI hankkeen henkilöstö mediassa": "Ajankohtaista / GenAI hankkeen henkilöstö mediassa",
    "GenAI hankkeen henkilöstö tapahtumissa": "Ajankohtaista / GenAI hankkeen henkilöstö tapahtumissa",
    "Haastattelu": "Ajankohtaista / Haastattelu",
    "Blogikirjoitus": "Ajankohtaista / Blogikirjoitus",
    "Mielipidekirjoitus": "Ajankohtaista / Mielipidekirjoitus",
    "Podcast": "Ajankohtaista / Podcast",
    "Webinaari": "Ajankohtaista / Webinaari",
    "YLE": "Ajankohtaista / YLE",
    "Ajankohtaista hankkeen ulkopuolella": "Ajankohtaista / Ajankohtaista hankkeen ulkopuolella",
    "GenAI työkalut ja materiaalit hankkeen ulkopuolella": "Ajankohtaista / GenAI työkalut ja materiaalit hankkeen ulkopuolella",
    "Luokittelija": "Sovellukset / Luokittelija",
    "Itä-suomen yliopisto": "Itä-Suomen yliopisto",
    "Lasten oikeudet": "Tutkimus / Lasten oikeudet",
    "Uncategorized @fi": null,
  },
  en: {
    "Current Affairs": "News from",
    "Current affairs": "News from",
    "Current News": "News from",
    "Current news outside the project": "News from",
    "Current affairs outside the project": "News from",
    "News and Current Topics": "News from",
    "News and Updates": "News from",
    "News and updates": "News from",
    "News": "News from",
    "GenAI project staff in media": "News from / GenAI project staff in the media",
    "GenAI Project Staff in Media": "News from / GenAI project staff in the media",
    "GenAI Project Staff in the Media": "News from / GenAI project staff in the media",
    "Generation AI project staff in the media": "News from / GenAI project staff in the media",
    "GenAI project staff at events": "News from / GenAI project staff at events",
    "GenAI Project Staff at Events": "News from / GenAI project staff at events",
    "GenAI project staff events": "News from / GenAI project staff at events",
    "GenAI Project Staff at events": "News from / GenAI project staff at events",
    "Blog post": "News from / Blog post",
    "Opinion piece": "News from / Opinion piece",
    "Podcast": "News from / Podcast",
    "Webinar": "News from / Webinar",
    "Workshop": "News from / Webinar",
    "Interview": "News from / GenAI project staff in the media",
    "Conferences and seminars": "Research / Conference proceedings",
    "Conferences and Seminars": "Research / Conference proceedings",
    "University news": "University of Helsinki",
    "Project Activities": "Project activities",
    "GenAI Tools and Materials Beyond the Project": "News from",
    "Children's rights": "Research / Children's rights",
    "Classifier": "Research",
    "Lecture": "News from",
    "Preschool": "News from",
    "University of Eastern Finland": "University of Helsinki",
    "Applications": "Project activities",
    "Column": "News from / Opinion piece",
    "FCAI": "News from",
    "GenAI project staff in the media": "News from / GenAI project staff in the media",
    "MTV3": "News from",
    "YLE": "News from / YLE",
    "Youtube": "News from",
    "Uncategorized": null,
  },
  sv: {
    "Aktuellt": "Nyheter från",
    "Aktuellt utanför projektet": "Nyheter från",
    "GenAI-projektets personal i media": "Nyheter från / GenAI-projektets personal i media",
    "GenAI-projektets medarbetare i media": "Nyheter från / GenAI-projektets personal i media",
    "Generation AI-projektets personal i media": "Nyheter från / GenAI-projektets personal i media",
    "GenAI-projektets personal på evenemang": "Nyheter från / GenAI-projektets personal vid evenemang",
    "GenAI-projektets personal vid evenemang": "Nyheter från / GenAI-projektets personal vid evenemang",
    "GenAI-projektpersonalens evenemang": "Nyheter från / GenAI-projektets personal vid evenemang",
    "Generation AI-projektets personal på evenemang": "Nyheter från / GenAI-projektets personal vid evenemang",
    "Blogginlägg": "Nyheter från / Blogginlägg",
    "Debattartikel": "Nyheter från / Debattartikel",
    "Podcast": "Nyheter från / Podcast",
    "Webbinarium": "Nyheter från / Webbinarium",
    "Workshop": "Nyheter från / Webbinarium",
    "Intervju": "Nyheter från / GenAI-projektets personal i media",
    "Kolumn": "Nyheter från / Debattartikel",
    "Konferenser och seminarier": "Forskning / Konferenshandlingar",
    "Klassificerare": "Forskning",
    "Applikationer": "Forskning",
    "Barns rättigheter": "Forskning / Barns rättigheter",
    "Universitetsnyheter": "Helsingfors universitet",
    "Projektverksamhet": "Projektaktiviteter",
    "Östfinlands universitet": "Helsingfors universitet",
    "GenAI-verktyg och material utanför projektet": "Nyheter från",
    "Föreläsning": "Nyheter från",
    "Förskola": "Nyheter från",
    // Finnish categories appearing in SV posts (migration artefacts)
    "Ajankohtaista": "Nyheter från",
    "Ajankohtaista hankkeen ulkopuolella": "Nyheter från",
    "Blogikirjoitus": "Nyheter från / Blogginlägg",
    "FCAI": "Nyheter från",
    "GenAI hankkeen henkilöstö mediassa": "Nyheter från / GenAI-projektets personal i media",
    "Hankkeen toiminta": "Projektaktiviteter",
    "Helsingin yliopisto": "Helsingfors universitet",
    "Lasten oikeudet": "Forskning / Barns rättigheter",
    "MTV3": "Nyheter från",
    "Okategoriserad": null,
    "Tutkimus": "Forskning",
    "Työpaja": "Nyheter från / Webbinarium",
    "YLE": "Nyheter från / YLE",
    "Yliopistojen uutiset": "Helsingfors universitet",
    "Youtube": "Nyheter från",
  },
};

// ── File discovery ─────────────────────────────────────────────────────────────

const FOLDERS = {
  fi: "content/posts",
  en: "content/en/posts",
  sv: "content/sv/posts",
};

function getAllFiles(folder) {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder)
    .filter(f => f.endsWith(".md") || f.endsWith(".njk"))
    .map(f => path.join(folder, f));
}

// Keep old name as alias for backwards compat within this file
const getMdFiles = getAllFiles;

// ── Frontmatter parsing ────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { fm: {}, raw: "", rest: content };
  const raw = match[1];
  const rest = content.slice(match[0].length);
  const fm = {};
  let currentKey = null;
  let inList = false;
  for (const line of raw.split("\n")) {
    const listItem = line.match(/^  - (.+)$/);
    const keyValue = line.match(/^(\w[\w-]*): (.+)$/);
    const keyOnly = line.match(/^(\w[\w-]*):\s*$/);
    if (listItem && inList) {
      fm[currentKey].push(listItem[1].replace(/^['"]|['"]$/g, ""));
    } else if (keyValue) {
      inList = false;
      fm[keyValue[1]] = keyValue[2].replace(/^['"]|['"]$/g, "");
    } else if (keyOnly) {
      currentKey = keyOnly[1];
      fm[currentKey] = [];
      inList = true;
    }
  }
  return { fm, raw, rest };
}

function serializeFrontmatter(fm, originalRaw) {
  // Rebuild only the categories section, preserve rest of frontmatter
  const lines = originalRaw.split("\n");
  const result = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].match(/^categories:\s*$/) || lines[i].match(/^categories: \[\]/)) {
      const cats = fm.categories || [];
      if (cats.length === 0) {
        result.push("categories: []");
      } else {
        result.push("categories:");
        for (const c of cats) result.push(`  - ${JSON.stringify(c)}`);
      }
      // skip old list items
      i++;
      while (i < lines.length && lines[i].match(/^  - /)) i++;
    } else {
      result.push(lines[i]);
      i++;
    }
  }
  return result.join("\n");
}

function serializeSplitFrontmatter(fm, originalRaw) {
  const lines = originalRaw.split("\n");
  const result = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].match(/^categories:\s*$/) || lines[i].match(/^categories: \[\]/)) {
      // Skip old categories block
      i++;
      while (i < lines.length && lines[i].match(/^  - /)) i++;
      // Insert new fields
      if (fm.mainCategory) {
        result.push(`mainCategory: ${JSON.stringify(fm.mainCategory)}`);
      }
      if (fm.subCategories && fm.subCategories.length) {
        result.push("subCategories:");
        for (const c of fm.subCategories) result.push(`  - ${JSON.stringify(c)}`);
      }
      if (fm.extraCategories && fm.extraCategories.length) {
        result.push("extraCategories:");
        for (const c of fm.extraCategories) result.push(`  - ${JSON.stringify(c)}`);
      }
    } else {
      result.push(lines[i]);
      i++;
    }
  }
  return result.join("\n");
}

// ── Commands ───────────────────────────────────────────────────────────────────

function cmdStats() {
  for (const [lang, folder] of Object.entries(FOLDERS)) {
    const files = getMdFiles(folder);
    const counts = {};
    for (const file of files) {
      const { fm } = parseFrontmatter(fs.readFileSync(file, "utf8"));
      for (const cat of (fm.categories || [])) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
    console.log(`\n── ${lang.toUpperCase()} (${files.length} files) ──`);
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, n]) => console.log(`  ${n.toString().padStart(3)}  ${cat}`));
  }
}

function cmdList() {
  for (const [lang, cats] of Object.entries(CANONICAL)) {
    console.log(`\n── ${lang.toUpperCase()} ──`);
    for (const cat of cats) {
      const indent = cat.includes(" / ") ? "    " : "  ";
      console.log(`${indent}${cat}`);
    }
  }
}

function cmdUnknown() {
  for (const [lang, folder] of Object.entries(FOLDERS)) {
    const files = getMdFiles(folder);
    const canonical = new Set(CANONICAL[lang]);
    const migrations = MIGRATIONS[lang];
    const unknown = new Set();
    for (const file of files) {
      const { fm } = parseFrontmatter(fs.readFileSync(file, "utf8"));
      for (const cat of (fm.categories || [])) {
        if (!canonical.has(cat) && !(cat in migrations)) {
          unknown.add(cat);
        }
      }
    }
    console.log(`\n── ${lang.toUpperCase()} — unknown categories (${unknown.size}) ──`);
    for (const cat of [...unknown].sort()) console.log(`  "${cat}"`);
  }
}

function cmdMigrate(dryRun) {
  let totalFiles = 0;
  let totalChanges = 0;
  for (const [lang, folder] of Object.entries(FOLDERS)) {
    const files = getMdFiles(folder);
    const migrations = MIGRATIONS[lang];
    const canonical = new Set(CANONICAL[lang]);
    for (const file of files) {
      const original = fs.readFileSync(file, "utf8");
      const { fm, raw, rest } = parseFrontmatter(original);
      const oldCats = fm.categories || [];
      if (!oldCats.length) continue;

      // Migrate each category
      const newCats = [];
      const seen = new Set();
      for (const cat of oldCats) {
        const migrated = cat in migrations ? migrations[cat] : cat;
        if (migrated === null) continue; // null = remove category
        // Add parent automatically if migrating to "X / Y"
        if (migrated.includes(" / ")) {
          const parent = migrated.split(" / ")[0];
          if (!seen.has(parent) && canonical.has(parent)) {
            seen.add(parent);
            newCats.push(parent);
          }
        }
        if (!seen.has(migrated)) {
          seen.add(migrated);
          newCats.push(migrated);
        }
      }

      const changed = JSON.stringify(oldCats.sort()) !== JSON.stringify(newCats.sort());
      if (!changed) continue;

      totalFiles++;
      totalChanges += newCats.length - oldCats.length;
      const shortFile = path.relative(process.cwd(), file);
      if (dryRun) {
        console.log(`\n  ${shortFile}`);
        console.log(`    Before: ${oldCats.join(", ")}`);
        console.log(`    After:  ${newCats.join(", ")}`);
      } else {
        fm.categories = newCats;
        const newRaw = serializeFrontmatter(fm, raw);
        const newContent = `---\n${newRaw}\n---${rest}`;
        fs.writeFileSync(file, newContent, "utf8");
        console.log(`  ✓ ${shortFile}`);
      }
    }
  }
  const mode = dryRun ? "[DRY RUN] " : "";
  console.log(`\n${mode}${totalFiles} files would be updated, net category change: ${totalChanges > 0 ? "+" : ""}${totalChanges}`);
}

function cmdSplit(dryRun) {
  let totalFiles = 0;
  for (const [lang, folder] of Object.entries(FOLDERS)) {
    const files = getAllFiles(folder);
    for (const file of files) {
      const original = fs.readFileSync(file, "utf8");
      const { fm, raw, rest } = parseFrontmatter(original);
      const cats = fm.categories || [];
      if (!cats.length) continue;

      const tops = cats.filter(c => !c.includes(" / "));
      const subs = cats.filter(c => c.includes(" / "));

      const mainCategory = tops[0] || null;
      const extraCategories = tops.slice(1);
      const subCategories = [...new Set(subs.map(c => c.split(" / ").slice(1).join(" / ")))];

      const shortFile = path.relative(process.cwd(), file);
      if (dryRun) {
        console.log(`\n  ${shortFile}`);
        console.log(`    mainCategory:    ${mainCategory || "(none)"}`);
        if (subCategories.length) console.log(`    subCategories:   ${subCategories.join(", ")}`);
        if (extraCategories.length) console.log(`    extraCategories: ${extraCategories.join(", ")}`);
      } else {
        fm.mainCategory = mainCategory;
        fm.subCategories = subCategories;
        fm.extraCategories = extraCategories;
        const newRaw = serializeSplitFrontmatter(fm, raw);
        fs.writeFileSync(file, `---\n${newRaw}\n---${rest}`, "utf8");
        console.log(`  ✓ ${shortFile}`);
      }
      totalFiles++;
    }
  }
  const mode = dryRun ? "[DRY RUN] " : "";
  console.log(`\n${mode}${totalFiles} files split`);
}

// ── Main ───────────────────────────────────────────────────────────────────────

const [,, cmd, flag] = process.argv;

switch (cmd) {
  case "stats":   cmdStats(); break;
  case "list":    cmdList(); break;
  case "unknown": cmdUnknown(); break;
  case "migrate":
    if (flag === "--dry") {
      console.log("DRY RUN — no files will be changed\n");
      cmdMigrate(true);
    } else {
      cmdMigrate(false);
    }
    break;
  case "split":
    if (flag === "--dry") {
      console.log("DRY RUN — no files will be changed\n");
      cmdSplit(true);
    } else {
      cmdSplit(false);
    }
    break;
  default:
    console.log(`Usage:
  node scripts/manage-categories.js stats          # Category usage statistics
  node scripts/manage-categories.js list           # Canonical category list
  node scripts/manage-categories.js unknown        # Categories not in canonical list
  node scripts/manage-categories.js migrate --dry  # Preview migrations
  node scripts/manage-categories.js migrate        # Apply migrations to files
  node scripts/manage-categories.js split --dry    # Preview split to mainCategory/subCategories
  node scripts/manage-categories.js split          # Apply split to all files`);
}
