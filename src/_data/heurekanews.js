const { readCache, remember } = require("./_apiCache");

const HEUREKA_SITE_URL = "https://www.heureka.fi";
const HEUREKA_SITEMAP_INDEX_URL = `${HEUREKA_SITE_URL}/sitemap.xml`;
const HTML_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml"
};

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
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
    .replace(/&hellip;/g, "...")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, "...")
    .replace(/&#038;/g, "&")
    .replace(/&#160;/g, " ");
}

function textFromHtml(value) {
  return normalizeWhitespace(decodeHtmlEntities(stripTags(value)));
}

function absoluteUrl(url) {
  if (!url) return "";

  try {
    return new URL(url, HEUREKA_SITE_URL).toString();
  } catch {
    return "";
  }
}

function slugFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, "");
    return pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    return "";
  }
}

function inferLanguageFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    if (pathname.startsWith("/en/")) return "en";
    if (pathname.startsWith("/sv/")) return "sv";
    return "fi";
  } catch {
    return "fi";
  }
}

function extractMetaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([\\s\\S]*?)["'][^>]*>`,
      "i"
    )
  );
  return match ? decodeHtmlEntities(match[1]) : "";
}

function extractCanonicalUrl(html) {
  const match = String(html || "").match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return match ? absoluteUrl(match[1]) : "";
}

function extractTitle(html) {
  return (
    normalizeWhitespace(
      decodeHtmlEntities(
        extractMetaContent(html, "og:title") ||
          extractMetaContent(html, "twitter:title") ||
          (String(html || "").match(/<title>([\s\S]*?)<\/title>/i) || [null, ""])[1]
      )
    ) || ""
  );
}

function extractDescription(html) {
  return normalizeWhitespace(
    decodeHtmlEntities(
      extractMetaContent(html, "description") ||
        extractMetaContent(html, "og:description") ||
        extractMetaContent(html, "twitter:description")
    )
  );
}

function extractImageUrl(html) {
  return absoluteUrl(
    extractMetaContent(html, "og:image") || extractMetaContent(html, "twitter:image") || ""
  );
}

function extractDatePublished(html) {
  const candidates = [
    extractMetaContent(html, "article:published_time"),
    extractMetaContent(html, "publish_date"),
    extractMetaContent(html, "published_at"),
    extractMetaContent(html, "date"),
    extractMetaContent(html, "ms.date")
  ].filter(Boolean);

  return candidates[0] || "";
}

function extractDateModified(html) {
  const candidates = [
    extractMetaContent(html, "article:modified_time"),
    extractMetaContent(html, "updated_at"),
    extractMetaContent(html, "og:updated_time")
  ].filter(Boolean);

  return candidates[0] || "";
}

function extractMainContentHtml(html) {
  const patterns = [
    /<article[^>]*>[\s\S]*?<div[^>]+class="[^"]*article-template__content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/article>/i,
    /<article[^>]*>[\s\S]*?<div[^>]+class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/article>/i,
    /<div[^>]+class="[^"]*page-width[^"]*page-width--narrow[^"]*"[^>]*>[\s\S]*?<div[^>]+class="[^"]*\brte\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*id="MainContent"[^>]*>([\s\S]*?)<\/main>/i
  ];

  for (const pattern of patterns) {
    const match = String(html || "").match(pattern);
    if (match && normalizeWhitespace(match[1])) return match[1].trim();
  }

  return "";
}

function parseSitemapEntries(xml) {
  const entries = [];
  const locMatches = Array.from(String(xml || "").matchAll(/<url>([\s\S]*?)<\/url>/g));

  for (const match of locMatches) {
    const block = match[1];
    const url = absoluteUrl((block.match(/<loc>([^<]+)<\/loc>/i) || [null, ""])[1]);
    const lastmod = decodeHtmlEntities((block.match(/<lastmod>([^<]+)<\/lastmod>/i) || [null, ""])[1]);

    if (url) {
      entries.push({ url, lastmod });
    }
  }

  return entries;
}

function normalizeSearchTerms(terms) {
  return Array.isArray(terms)
    ? terms.map(term => normalizeWhitespace(term).toLowerCase()).filter(Boolean)
    : [];
}

function maybeCandidateUrl(url, terms) {
  if (!terms.length) return true;

  const lowerUrl = String(url || "").toLowerCase();
  return terms.some(term => {
    const compact = term.replace(/[^\p{L}\p{N}]+/gu, "");
    return lowerUrl.includes(term) || (compact && lowerUrl.includes(compact));
  });
}

function itemMatchesTerms(item, terms) {
  if (!terms.length) return true;

  const haystack = [
    item.title,
    item.description,
    item.contentText,
    item.url,
    item.slug
  ]
    .map(value => String(value || "").toLowerCase())
    .join("\n");

  return terms.some(term => haystack.includes(term));
}

function sortItemsByDate(items) {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.datePublished || left.dateModified || "") || 0;
    const rightTime = Date.parse(right.datePublished || right.dateModified || "") || 0;

    if (rightTime !== leftTime) return rightTime - leftTime;
    return String(left.title || "").localeCompare(String(right.title || ""), "fi");
  });
}

function dedupeItems(items) {
  const seen = new Set();

  return items.filter(item => {
    const key = item.url || item.sourceId || item.slug;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchTextWithCache(cacheKey, url, headers = {}) {
  const forceRefresh = parseBoolean(process.env.HEUREKA_FORCE_REFRESH);

  try {
    return await remember(
      cacheKey,
      async () => {
        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status} ${response.statusText}`);
        }

        return response.text();
      },
      { forceRefresh }
    );
  } catch (error) {
    const stale = await readCache(cacheKey, { ttlSeconds: 0 });
    if (stale) return stale;

    console.warn(`[heurekanews] Lookup failed for ${url}: ${error.message}`);
    return null;
  }
}

async function fetchSitemapIndexUrls() {
  const xml = await fetchTextWithCache(
    `heureka:sitemap-index:${HEUREKA_SITEMAP_INDEX_URL}`,
    HEUREKA_SITEMAP_INDEX_URL,
    HTML_HEADERS
  );
  if (!xml) return [];

  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map(match => absoluteUrl(decodeHtmlEntities(match[1])))
    .filter(url => url && /sitemap_(pages|blogs)_/i.test(url));
}

async function fetchSitemapEntries() {
  const sitemapUrls = await fetchSitemapIndexUrls();
  const results = [];

  for (const sitemapUrl of sitemapUrls) {
    const xml = await fetchTextWithCache(`heureka:sitemap:${sitemapUrl}`, sitemapUrl, HTML_HEADERS);
    if (!xml) continue;

    results.push(...parseSitemapEntries(xml));
  }

  return results;
}

function normalizeHeurekaItem(entry, html) {
  const canonicalUrl = extractCanonicalUrl(html) || absoluteUrl(entry.url);
  const contentHtml = extractMainContentHtml(html);
  const sourceKind = canonicalUrl.includes("/blogs/") ? "heureka-blog" : "heureka-page";

  return {
    source: sourceKind,
    sourceId: canonicalUrl || entry.url,
    url: canonicalUrl,
    slug: slugFromUrl(canonicalUrl),
    language: inferLanguageFromUrl(canonicalUrl),
    title: extractTitle(html),
    description: extractDescription(html),
    contentHtml,
    contentText: textFromHtml(contentHtml),
    datePublished: extractDatePublished(html) || entry.lastmod || "",
    dateModified: extractDateModified(html) || entry.lastmod || "",
    imageUrl: extractImageUrl(html),
    contentType: sourceKind === "heureka-blog" ? "article" : "page",
    raw: {
      sitemap: entry
    }
  };
}

async function searchHeurekaContent(query, options = {}) {
  const matchTerms = normalizeSearchTerms(options.matchTerms?.length ? options.matchTerms : [query]);
  const languages = Array.isArray(options.languages) && options.languages.length ? options.languages : ["fi"];
  const limit = Number.isFinite(options.limit) ? options.limit : 24;

  const entries = await fetchSitemapEntries();
  const candidates = entries.filter(entry => {
    if (!maybeCandidateUrl(entry.url, matchTerms)) return false;

    const language = inferLanguageFromUrl(entry.url);
    return languages.includes(language);
  });

  const items = [];

  for (const entry of candidates) {
    const html = await fetchTextWithCache(`heureka:html:${entry.url}`, entry.url, HTML_HEADERS);
    if (!html) continue;

    const item = normalizeHeurekaItem(entry, html);
    if (!item.title) continue;
    if (!itemMatchesTerms(item, matchTerms)) continue;

    items.push(item);
  }

  return sortItemsByDate(dedupeItems(items)).slice(0, limit);
}

module.exports = {
  searchHeurekaContent
};
