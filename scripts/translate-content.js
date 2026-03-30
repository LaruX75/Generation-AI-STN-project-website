#!/usr/bin/env node
/**
 * translate-content.js
 * Translates Finnish content files to English and/or Swedish using Claude API.
 *
 * Usage:
 *   node scripts/translate-content.js --file content/posts/2026-03-24-foo.md
 *   node scripts/translate-content.js --all
 *   node scripts/translate-content.js --all --lang en
 *   node scripts/translate-content.js --all --dry-run
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

const fs = require("node:fs");
const path = require("node:path");
const Anthropic = require("@anthropic-ai/sdk");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT, "content");

const LOCALE_CONFIG = {
  en: {
    dir: path.join(CONTENT_ROOT, "en"),
    categoryMap: {
      "Ajankohtaista": "Current affairs",
      "Hankkeen toiminta": "Project activities",
      "Hanke mediassa": "Generation AI project staff in the media",
      "Blogikirjoitus": "Blog post",
      "Tutkimus": "Research",
      "Tapahtumat": "Events",
      "Materiaalit": "Materials",
      "Tiedotteet": "Press releases",
    },
    postDir: "current-affairs",
    pageDir: "pages",
  },
  sv: {
    dir: path.join(CONTENT_ROOT, "sv"),
    categoryMap: {
      "Ajankohtaista": "Aktuellt",
      "Hankkeen toiminta": "Projektverksamhet",
      "Hanke mediassa": "Generation AI-projektets personal i media",
      "Blogikirjoitus": "Blogginlägg",
      "Tutkimus": "Forskning",
      "Tapahtumat": "Evenemang",
      "Materiaalit": "Material",
      "Tiedotteet": "Pressmeddelanden",
    },
    postDir: "aktuellt",
    pageDir: "pages",
  },
};

const CATEGORY_PERMALINK = {
  en: {
    "Current affairs": "current-affairs",
    "Project activities": "project-activities",
    "Generation AI project staff in the media": "project-activities",
    "Blog post": "current-affairs",
    "Research": "research",
    "Events": "current-affairs",
    "Materials": "materials",
    "Press releases": "current-affairs",
  },
  sv: {
    "Aktuellt": "aktuellt",
    "Projektverksamhet": "projektverksamhet",
    "Generation AI-projektets personal i media": "aktuellt",
    "Blogginlägg": "aktuellt",
    "Forskning": "forskning",
    "Evenemang": "aktuellt",
    "Material": "material",
    "Pressmeddelanden": "aktuellt",
  },
};

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const fileArg = args.includes("--file") ? args[args.indexOf("--file") + 1] : null;
const all = args.includes("--all");
const dryRun = args.includes("--dry-run");
const langArg = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : "en,sv";
const targetLangs = langArg.split(",").map(l => l.trim()).filter(l => LOCALE_CONFIG[l]);

if (!fileArg && !all) {
  console.error("Usage: node scripts/translate-content.js --file <path> | --all [--lang en,sv] [--dry-run]");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is not set.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Frontmatter parsing / serialisation
// ---------------------------------------------------------------------------

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

function buildFrontmatter(data) {
  const lines = ["---"];
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      lines.push(`${key}:`);
      for (const item of val) lines.push(`  - "${item}"`);
    } else if (val === "" || val === null || val === undefined) {
      lines.push(`${key}: ""`);
    } else if (typeof val === "boolean") {
      lines.push(`${key}: ${val}`);
    } else {
      const escaped = String(val).replace(/"/g, '\\"');
      lines.push(`${key}: "${escaped}"`);
    }
  }
  lines.push("---\n");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Find untranslated posts
// ---------------------------------------------------------------------------

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const fp = path.join(dir, e.name);
    return e.isDirectory() ? walk(fp) : [fp];
  });
}

function getDateKey(data) {
  return `${data.date || ""}|${data.updated || ""}`;
}

function findUntranslated(lang) {
  const cfg = LOCALE_CONFIG[lang];
  const fiPosts = walk(path.join(CONTENT_ROOT, "posts")).filter(f => /\.(md|njk)$/.test(f));
  const translated = new Set();

  for (const f of walk(path.join(cfg.dir, "posts")).filter(f => /\.(md|njk)$/.test(f))) {
    const { data } = parseFrontmatter(fs.readFileSync(f, "utf8"));
    if (data.date) translated.add(getDateKey(data));
  }

  return fiPosts.filter(f => {
    const { data } = parseFrontmatter(fs.readFileSync(f, "utf8"));
    if (data.sourceType !== "posts") return false;
    return !translated.has(getDateKey(data));
  });
}

// ---------------------------------------------------------------------------
// Slugification
// ---------------------------------------------------------------------------

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[äå]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Claude translation
// ---------------------------------------------------------------------------

const client = new Anthropic();

async function translateFile(sourcePath, lang) {
  const cfg = LOCALE_CONFIG[lang];
  const source = fs.readFileSync(sourcePath, "utf8");
  const { data, body } = parseFrontmatter(source);

  const isNjk = sourcePath.endsWith(".njk");

  const langName = lang === "en" ? "English" : "Swedish";

  const prompt = `You are translating a Finnish website post to ${langName} for the Generation AI project website (generation-ai-stn.fi), a Finnish research project on AI education.

Translate the following fields and content. Return a JSON object with these exact keys:
- "title": translated title
- "excerpt": translated excerpt (keep under 300 chars)
- "slug": URL-friendly slug in ${langName} (lowercase, hyphens, ASCII only)
- "categories": array of translated categories
- "tags": array of translated tags (keep lowercase, translate to ${langName})
- "body": translated body content

Rules:
- Preserve all Markdown formatting (##, **, *, tables, etc.)
- Preserve all HTML tags and attributes exactly
- Preserve all links (href/src values unchanged, translate visible link text)
- Do NOT translate code blocks, technical terms, proper names, or organisation names
- Do NOT translate: Generation AI, Elements of AI, Business Weekly, Heureka, Pagefind, MailerLite, etc.
- Keep Chinese/other non-Latin characters as-is
- For ${lang === "sv" ? "Swedish" : "English"}: use natural, professional tone
${isNjk ? "- The body contains Nunjucks template syntax ({% %}, {{ }}). Do NOT translate or modify template tags, only translate visible text strings within them." : ""}

--- SOURCE FRONTMATTER ---
title: ${data.title}
excerpt: ${data.excerpt || ""}
categories: ${JSON.stringify(data.categories || [])}
tags: ${JSON.stringify(data.tags || [])}

--- SOURCE BODY ---
${body.trim()}

Return ONLY valid JSON, no markdown code fences.`;

  console.log(`  Calling Claude for ${lang.toUpperCase()}...`);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content[0].text.trim();
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    // Strip possible markdown fences
    const cleaned = responseText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    parsed = JSON.parse(cleaned);
  }

  // Build translated frontmatter
  const cats = (parsed.categories || []).map(c => {
    const mapped = cfg.categoryMap[c];
    return mapped || c;
  });

  // Determine permalink category segment
  const firstCat = cats[0] || "";
  const postDir = CATEGORY_PERMALINK[lang][firstCat] || cfg.postDir;

  const translatedSlug = parsed.slug || slugify(parsed.title);
  const permalink = `/${lang === "en" ? "en" : "sv"}/${postDir}/${translatedSlug}/`;

  // Determine output filename
  const srcBase = path.basename(sourcePath);
  const datePrefix = srcBase.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
  const ext = sourcePath.endsWith(".njk") ? ".njk" : ".md";
  const outFilename = datePrefix ? `${datePrefix}-${translatedSlug}${ext}` : `${translatedSlug}${ext}`;

  const outDir = path.join(cfg.dir, "posts");
  const outPath = path.join(outDir, outFilename);

  const newData = {
    title: parsed.title,
    date: data.date,
    updated: data.updated,
    slug: translatedSlug,
    permalink,
    status: data.status || "publish",
    sourceType: "posts",
    excerpt: parsed.excerpt || "",
    categories: cats,
    tags: parsed.tags || data.tags || [],
    lang,
    author: data.author || "admin",
    layout: data.layout || "layouts/post.njk",
  };

  if (data.pageHero) newData.pageHero = true;
  if (data.heroImage) newData.heroImage = data.heroImage;

  const output = buildFrontmatter(newData) + (parsed.body || "").trimStart();

  return { outPath, output };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let sourceFiles = [];

  if (fileArg) {
    const resolved = path.isAbsolute(fileArg) ? fileArg : path.join(ROOT, fileArg);
    sourceFiles = [resolved];
  } else {
    // Collect untranslated for all target langs (union)
    const seen = new Set();
    for (const lang of targetLangs) {
      for (const f of findUntranslated(lang)) {
        if (!seen.has(f)) { seen.add(f); sourceFiles.push(f); }
      }
    }
    if (sourceFiles.length === 0) {
      console.log("All posts already have translations. Nothing to do.");
      return;
    }
  }

  console.log(`\nFound ${sourceFiles.length} file(s) to translate → [${targetLangs.join(", ")}]\n`);

  for (const srcPath of sourceFiles) {
    const rel = path.relative(ROOT, srcPath);
    console.log(`\n📄 ${rel}`);

    const { data } = parseFrontmatter(fs.readFileSync(srcPath, "utf8"));
    if (!data.title) { console.log("  Skipping: no title in frontmatter"); continue; }

    for (const lang of targetLangs) {
      // Skip if already translated (when --file used)
      if (!fileArg) {
        const cfg = LOCALE_CONFIG[lang];
        const existing = walk(path.join(cfg.dir, "posts")).filter(f => /\.(md|njk)$/.test(f));
        const dateKey = getDateKey(data);
        const alreadyDone = existing.some(f => {
          const { data: d } = parseFrontmatter(fs.readFileSync(f, "utf8"));
          return getDateKey(d) === dateKey;
        });
        if (alreadyDone) { console.log(`  [${lang.toUpperCase()}] Already translated, skipping.`); continue; }
      }

      try {
        const { outPath, output } = await translateFile(srcPath, lang);
        const relOut = path.relative(ROOT, outPath);

        if (dryRun) {
          console.log(`  [${lang.toUpperCase()}] DRY RUN → would write: ${relOut}`);
        } else {
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          fs.writeFileSync(outPath, output, "utf8");
          console.log(`  [${lang.toUpperCase()}] ✓ Written: ${relOut}`);
        }
      } catch (err) {
        console.error(`  [${lang.toUpperCase()}] ERROR: ${err.message}`);
      }
    }
  }

  console.log("\nDone.");
}

main().catch(err => { console.error(err); process.exit(1); });
