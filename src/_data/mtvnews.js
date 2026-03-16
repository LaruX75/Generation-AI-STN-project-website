const fs = require("node:fs");
const path = require("node:path");
const { gunzipSync } = require("node:zlib");
const { remember } = require("./_apiCache");

const MTV_BASE_URL = "https://www.mtvuutiset.fi";
const MTV_TOP_TAGS_SITEMAP_URL =
  "https://www.mtvuutiset.fi/data/sitemap/Sites/MTVUutiset/TopTags/sitemap1.xml.gz";
const MTV_NEWS_SITEMAP_URL = "https://www.mtvuutiset.fi/newssitemap";
const DEFAULT_LIMIT = 10;

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&hellip;/g, "...");
}

function buildAbsoluteUrl(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return new URL(normalized, MTV_BASE_URL).toString();
}

function slugify(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferTypeFromUrl(url) {
  const pathname = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url || "";
    }
  })();

  if (pathname.includes("/video/")) return "video";
  if (pathname.includes("/artikkeli/")) return "article";
  if (pathname.includes("/aihe/")) return "topic";
  return "item";
}

function buildSourceId(url) {
  const match = String(url || "").match(/\/(\d+)(?:\/)?$/);
  return match ? match[1] : "";
}

function loadConfigFile() {
  const explicitPath = process.env.MTV_NEWS_CONFIG_PATH;
  const candidatePaths = [
    explicitPath,
    path.join(process.cwd(), "mtvnews.config.json"),
    path.join(process.cwd(), "src", "_data", "mtvnews.config.json")
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    if (!fs.existsSync(candidatePath)) continue;
    return JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  }

  return null;
}

function loadConfiguredPeople() {
  const envMultiple = process.env.MTV_NEWS_PEOPLE;
  const envSingle = process.env.MTV_NEWS_PERSON;

  if (envMultiple) {
    return envMultiple
      .split(",")
      .map(item => item.trim())
      .filter(Boolean)
      .map(name => ({ name }));
  }

  if (envSingle) {
    return [{ name: envSingle.trim() }].filter(item => item.name);
  }

  const fileConfig = loadConfigFile();
  if (!fileConfig) return [];

  const source = fileConfig.people || fileConfig.queries || [];
  return (Array.isArray(source) ? source : [source])
    .map(item => (typeof item === "string" ? { name: item.trim() } : item))
    .filter(item => item && normalizeWhitespace(item.name || item.query || item.topicSlug));
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml,text/xml",
      "User-Agent": "GenAI7-Eleventy-Build/1.0",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const isGzip =
    response.headers.get("content-encoding") === "gzip" ||
    (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b);

  if (!isGzip) {
    return buffer.toString("utf8");
  }

  try {
    return gunzipSync(buffer).toString("utf8");
  } catch {
    return buffer.toString("utf8");
  }
}

async function getTopTagsSitemapEntries() {
  const forceRefresh = parseBoolean(process.env.MTV_NEWS_FORCE_REFRESH);

  return remember(
    "mtv:top-tags-sitemap:v1",
    async () => {
      const xml = await fetchText(MTV_TOP_TAGS_SITEMAP_URL, {
        headers: { "Accept-Encoding": "gzip,deflate" }
      });
      return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(match => match[1]);
    },
    { forceRefresh }
  );
}

async function getNewsSitemapItems() {
  const forceRefresh = parseBoolean(process.env.MTV_NEWS_FORCE_REFRESH);

  return remember(
    "mtv:news-sitemap:v1",
    async () => {
      const xml = await fetchText(MTV_NEWS_SITEMAP_URL, {
        headers: { "Accept-Encoding": "gzip,deflate" }
      });
      const items = [];
      const pattern =
        /<url><loc>([^<]+)<\/loc><news:news>[\s\S]*?<news:title>([\s\S]*?)<\/news:title><news:publication_date>([^<]+)<\/news:publication_date>(?:<news:keywords>([\s\S]*?)<\/news:keywords>)?[\s\S]*?<\/news:news><\/url>/g;

      let match;
      while ((match = pattern.exec(xml))) {
        const url = buildAbsoluteUrl(match[1]);
        const title = normalizeWhitespace(decodeHtmlEntities(match[2]));
        const datePublished = normalizeWhitespace(match[3]);
        const keywords = normalizeWhitespace(decodeHtmlEntities(match[4] || ""))
          .split(",")
          .map(keyword => normalizeWhitespace(keyword))
          .filter(Boolean);

        items.push({
          sourceId: buildSourceId(url),
          url,
          title,
          datePublished,
          dateDisplay: datePublished,
          type: inferTypeFromUrl(url),
          keywords
        });
      }

      return items;
    },
    { forceRefresh }
  );
}

function matchTopicUrl(entries, topicSlug) {
  const normalizedSlug = slugify(topicSlug);
  if (!normalizedSlug) return "";

  const exact = entries.find(entry => entry.includes(`/aihe/${normalizedSlug}/`));
  return exact || "";
}

async function resolveTopicUrl(options = {}) {
  if (options.topicUrl) return buildAbsoluteUrl(options.topicUrl);
  if (options.topicPath) return buildAbsoluteUrl(options.topicPath);

  const exactTopicSlug = normalizeWhitespace(options.topicSlug || "");
  const exactQuerySlug = slugify(options.query || options.name || "");
  const entries = await getTopTagsSitemapEntries();

  if (exactTopicSlug) {
    const found = matchTopicUrl(entries, exactTopicSlug);
    if (found) return found;
  }

  if (exactQuerySlug) {
    const found = matchTopicUrl(entries, exactQuerySlug);
    if (found) return found;
  }

  return "";
}

function parseArticleJsonLd(html) {
  const scripts = Array.from(
    String(html || "").matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)
  );

  for (const script of scripts) {
    try {
      const payload = JSON.parse(script[1]);
      const nodes = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.["@graph"])
          ? payload["@graph"]
          : [payload];
      const article = nodes.find(node =>
        ["NewsArticle", "Article", "VideoObject"].includes(node?.["@type"])
      );
      if (!article) continue;
      return article;
    } catch {
      continue;
    }
  }

  return null;
}

async function getArticleMetadata(url) {
  const forceRefresh = parseBoolean(process.env.MTV_NEWS_FORCE_REFRESH);
  const cacheKey = `mtv:article:${url}`;

  return remember(
    cacheKey,
    async () => {
      const html = await fetchText(url);
      const article = parseArticleJsonLd(html) || {};

      return {
        datePublished: normalizeWhitespace(article.datePublished || ""),
        title: normalizeWhitespace(decodeHtmlEntities(article.headline || article.name || "")),
        description: normalizeWhitespace(decodeHtmlEntities(article.description || "")),
        keywords: normalizeWhitespace(article.keywords || "")
          .split(",")
          .map(keyword => normalizeWhitespace(keyword))
          .filter(Boolean)
      };
    },
    { forceRefresh }
  );
}

function normalizeTopicItem(item = {}, context = {}) {
  return {
    personName: context.personName || context.query || "",
    query: context.query || "",
    sourceId: buildSourceId(item.url),
    datePublished: item.datePublished || "",
    dateDisplay: item.dateDisplay || item.datePublished || "",
    title: normalizeWhitespace(item.title || ""),
    type: inferTypeFromUrl(item.url),
    url: item.url || "",
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    topicUrl: context.topicUrl || "",
    matchedBy: item.matchedBy || context.matchedBy || "topic"
  };
}

async function parseTopicPageItems(topicUrl, options = {}) {
  const forceRefresh = parseBoolean(process.env.MTV_NEWS_FORCE_REFRESH);
  const cacheKey = `mtv:topic-page:${topicUrl}`;
  const limit = Number(options.limit) > 0 ? Number(options.limit) : DEFAULT_LIMIT;

  const rawItems = await remember(
    cacheKey,
    async () => {
      const html = await fetchText(topicUrl);
      const items = [];
      const seen = new Set();
      const blocks = Array.from(
        html.matchAll(/<li[^>]*data-testid="article-media-list-item-component"[\s\S]*?<\/li>/g)
      );

      for (const blockMatch of blocks) {
        const block = blockMatch[0];
        const hrefMatch = block.match(/href="(\/(?:artikkeli|video)\/[^"]+)"/);
        const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
        const dateMatch = block.match(/<span class="typography-tab[^"]*">([\s\S]*?)<\/span>/);

        if (!hrefMatch || !titleMatch) continue;

        const url = buildAbsoluteUrl(hrefMatch[1]);
        if (seen.has(url)) continue;
        seen.add(url);

        items.push({
          url,
          title: normalizeWhitespace(decodeHtmlEntities(titleMatch[1])),
          dateDisplay: normalizeWhitespace(decodeHtmlEntities(dateMatch ? dateMatch[1] : "")),
          matchedBy: "topic"
        });
      }

      return items;
    },
    { forceRefresh }
  );

  const selected = rawItems.slice(0, limit);
  const enriched = [];

  for (const item of selected) {
    const metadata = await getArticleMetadata(item.url);
    enriched.push({
      ...item,
      datePublished: metadata.datePublished || "",
      title: metadata.title || item.title,
      keywords: metadata.keywords || []
    });
  }

  return enriched;
}

function matchesTerms(item, terms = []) {
  const haystack = [
    item.title,
    item.url,
    ...(Array.isArray(item.keywords) ? item.keywords : [])
  ]
    .join("\n")
    .toLowerCase();

  const normalizedTerms = terms
    .map(term => normalizeWhitespace(term).toLowerCase())
    .filter(Boolean);

  if (!normalizedTerms.length) return true;
  return normalizedTerms.some(term => haystack.includes(term));
}

function normalizeNewsSitemapItem(item = {}, context = {}) {
  return {
    personName: context.personName || context.query || "",
    query: context.query || "",
    sourceId: item.sourceId || buildSourceId(item.url),
    datePublished: item.datePublished || "",
    dateDisplay: item.dateDisplay || item.datePublished || "",
    title: normalizeWhitespace(item.title || ""),
    type: item.type || inferTypeFromUrl(item.url),
    url: item.url || "",
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    topicUrl: context.topicUrl || "",
    matchedBy: item.matchedBy || context.matchedBy || "news-sitemap"
  };
}

async function searchMtvNews(query, options = {}) {
  const normalizedQuery = normalizeWhitespace(query);
  const personName = normalizeWhitespace(options.personName || options.name || normalizedQuery);
  const limit = Number(options.limit) > 0 ? Number(options.limit) : DEFAULT_LIMIT;
  const topicUrl = await resolveTopicUrl({ ...options, query: normalizedQuery, name: personName });
  const matchTerms = Array.isArray(options.matchTerms)
    ? options.matchTerms
    : [personName || normalizedQuery, options.topicSlug].filter(Boolean);

  const items = [];

  if (topicUrl) {
    const topicItems = await parseTopicPageItems(topicUrl, { limit });
    items.push(
      ...topicItems
        .map(item => normalizeTopicItem(item, { personName, query: normalizedQuery, topicUrl }))
        .filter(item => item.url)
    );
  }

  if (items.length < limit || !topicUrl) {
    const sitemapItems = await getNewsSitemapItems();
    const matchedSitemapItems = sitemapItems
      .filter(item => matchesTerms(item, matchTerms))
      .slice(0, limit * 3)
      .map(item =>
        normalizeNewsSitemapItem(
          { ...item, matchedBy: topicUrl ? "topic+news-sitemap" : "news-sitemap" },
          { personName, query: normalizedQuery, topicUrl }
        )
      );

    items.push(...matchedSitemapItems);
  }

  const deduped = Array.from(new Map(items.map(item => [item.url, item])).values())
    .sort((left, right) => {
      const leftTime = Date.parse(left.datePublished || "") || 0;
      const rightTime = Date.parse(right.datePublished || "") || 0;
      return rightTime - leftTime;
    })
    .slice(0, limit);

  return {
    query: normalizedQuery,
    personName,
    topicUrl,
    total: deduped.length,
    items: deduped
  };
}

async function searchMtvNewsForPeople(people = [], options = {}) {
  const results = [];

  for (const person of people) {
    const query = normalizeWhitespace(person.query || person.name || person.topicSlug);
    if (!query && !person.topicSlug && !person.topicUrl) continue;

    const result = await searchMtvNews(query, {
      ...options,
      ...person,
      personName: normalizeWhitespace(person.name || query || person.topicSlug)
    });

    results.push(result);
  }

  return results;
}

module.exports = {
  getNewsSitemapItems,
  getTopTagsSitemapEntries,
  loadConfiguredPeople,
  parseTopicPageItems,
  resolveTopicUrl,
  searchMtvNews,
  searchMtvNewsForPeople
};
