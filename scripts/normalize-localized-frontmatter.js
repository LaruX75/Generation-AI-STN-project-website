const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const TARGET_DIRS = [
  path.join(ROOT, "content", "en"),
  path.join(ROOT, "content", "sv")
];
const TARGET_EXTENSIONS = new Set([".njk", ".md", ".html"]);
const TEXT_KEYS = ["title", "excerpt"];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function unwrapScalar(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    const quote = value[0];
    let inner = value.slice(1, -1);
    if (quote === "'") {
      inner = inner.replace(/''/g, "'");
    } else {
      inner = inner.replace(/\\"/g, '"');
    }
    return inner;
  }

  return value;
}

function quoteYaml(value) {
  if (!value) return '""';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function detectLocale(frontMatter, filePath) {
  const langMatch = frontMatter.match(/^lang:\s*([a-z]{2})\s*$/m);
  if (langMatch) return langMatch[1];

  const normalizedPath = filePath.split(path.sep).join("/");
  if (normalizedPath.includes("/content/en/")) return "en";
  if (normalizedPath.includes("/content/sv/")) return "sv";
  return "";
}

function foldBlockTextScalars(frontMatter) {
  return frontMatter.replace(
    /^(title|excerpt):\s*'?(>[+-]?|\|[+-]?)'?\s*\n((?:[ \t]+.*(?:\n|$))*)/gm,
    (_, key, __indicator, block) => {
      const text = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      return `${key}: ${quoteYaml(text)}\n`;
    }
  );
}

function normalizePermalinks(frontMatter, locale) {
  if (!locale) return frontMatter;

  const duplicatedPrefix = new RegExp(`^permalink:\\s*["']?/${locale}/${locale}(?=/|$)`, "gm");
  return frontMatter.replace(duplicatedPrefix, `permalink: /${locale}`);
}

function normalizeTextLines(frontMatter) {
  const patterns = TEXT_KEYS.map((key) => new RegExp(`^${key}:\\s*(.+)$`, "gm"));
  let next = frontMatter;

  patterns.forEach((pattern, index) => {
    const key = TEXT_KEYS[index];
    next = next.replace(pattern, (_, rawValue) => {
      const unwrapped = unwrapScalar(rawValue);
      const normalized = unwrapped === "[object Object]" ? "" : unwrapped;
      return `${key}: ${quoteYaml(normalized)}`;
    });
  });

  return next;
}

function normalizeFile(source, filePath) {
  if (!source.startsWith("---\n")) {
    return { changed: false, content: source };
  }

  const endIndex = source.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return { changed: false, content: source };
  }

  const originalFrontMatter = source.slice(4, endIndex);
  const body = source.slice(endIndex + 5);
  const locale = detectLocale(originalFrontMatter, filePath);

  let nextFrontMatter = originalFrontMatter;
  nextFrontMatter = foldBlockTextScalars(nextFrontMatter);
  nextFrontMatter = normalizePermalinks(nextFrontMatter, locale);
  nextFrontMatter = normalizeTextLines(nextFrontMatter);

  if (nextFrontMatter === originalFrontMatter) {
    return { changed: false, content: source };
  }

  return {
    changed: true,
    content: `---\n${nextFrontMatter}\n---\n${body}`
  };
}

let updatedFiles = 0;

for (const dir of TARGET_DIRS) {
  if (!fs.existsSync(dir)) continue;

  for (const filePath of walk(dir)) {
    const source = fs.readFileSync(filePath, "utf8");
    const result = normalizeFile(source, filePath);
    if (!result.changed) continue;

    fs.writeFileSync(filePath, result.content);
    updatedFiles += 1;
  }
}

console.log(`Normalized localized front matter in ${updatedFiles} file(s).`);
