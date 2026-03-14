const { readCache, remember } = require("./_apiCache");

const OULU_BASE_URL = "https://www.oulu.fi";
const OULU_HTML_HEADERS = {
  Accept: "text/html,application/xhtml+xml"
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

function slugFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, "");
    return pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    return "";
  }
}

function normalizeLanguage(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "fi" || normalized === "en" ? normalized : "";
}

function normalizeContentType(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function resolveUrl(url) {
  if (!url) return "";

  try {
    return new URL(url, OULU_BASE_URL).toString();
  } catch {
    return "";
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
  const match = String(html || "").match(/<link rel="canonical" href="([^"]+)"/i);
  return match ? match[1] : "";
}

function parseJsonLdBlocks(html) {
  const matches = String(html || "").matchAll(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
  );
  const blocks = [];

  for (const match of matches) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // Ignore malformed JSON-LD.
    }
  }

  return blocks;
}

function findArticleJsonLd(html) {
  for (const block of parseJsonLdBlocks(html)) {
    const graph = Array.isArray(block?.["@graph"]) ? block["@graph"] : [block];

    for (const entry of graph) {
      const type = Array.isArray(entry?.["@type"]) ? entry["@type"] : [entry?.["@type"]];
      if (type.includes("NewsArticle") || type.includes("Article")) {
        return entry;
      }
    }
  }

  return null;
}

function inferLanguageFromUrl(url) {
  if (url.includes("/fi/") || url.includes(".fi/fi/")) return "fi";
  if (url.includes("/en/") || url.includes(".fi/en/")) return "en";
  return "";
}

function inferSourceKind(url) {
  if (url.includes("/uutiset/") || url.includes("/news/")) return "oulu-news";
  if (url.includes("/tapahtumat/") || url.includes("/events/")) return "oulu-event";
  return "oulu";
}

function inferContentTypeFromUrl(url) {
  if (url.includes("/uutiset/") || url.includes("/news/")) return "news";
  if (url.includes("/tapahtumat/") || url.includes("/events/")) return "event";
  if (url.includes("/vaitokset/") || url.includes("/dissertations/")) return "dissertation";
  return "";
}

function normalizeSearchHit(hit = {}) {
  const url = resolveUrl(hit.url);
  const title = normalizeWhitespace(hit.title);
  const contentType = normalizeWhitespace(hit.contentType || inferContentTypeFromUrl(url));

  return {
    source: inferSourceKind(url),
    sourceId: url,
    url,
    slug: slugFromUrl(url),
    language: normalizeLanguage(hit.language) || inferLanguageFromUrl(url),
    title,
    description: normalizeWhitespace(hit.description || ""),
    contentType,
    datePublished: normalizeWhitespace(hit.date || ""),
    dateModified: "",
    imageUrl: "",
    highlight: "",
    raw: hit
  };
}

function buildDedupeKey(item) {
  return [
    item.source || "",
    normalizeContentType(item.contentType),
    normalizeWhitespace(item.title).toLowerCase()
  ].join("::");
}

function dedupeItems(items, preferredLanguages = ["fi", "en"]) {
  const languageRank = new Map(preferredLanguages.map((language, index) => [language, index]));
  const byKey = new Map();

  for (const item of items) {
    const key = buildDedupeKey(item);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }

    const existingRank = languageRank.get(existing.language) ?? Number.MAX_SAFE_INTEGER;
    const nextRank = languageRank.get(item.language) ?? Number.MAX_SAFE_INTEGER;

    if (nextRank < existingRank) {
      byKey.set(key, item);
    }
  }

  return Array.from(byKey.values());
}

function sortItemsByDate(items) {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.datePublished || left.dateModified || "") || 0;
    const rightTime = Date.parse(right.datePublished || right.dateModified || "") || 0;

    if (rightTime !== leftTime) return rightTime - leftTime;
    return String(left.title || "").localeCompare(String(right.title || ""), "fi");
  });
}

function itemMatchesFilters(item, options = {}) {
  const languages = Array.isArray(options.languages)
    ? options.languages.map(normalizeLanguage).filter(Boolean)
    : [];
  const contentTypes = Array.isArray(options.contentTypes)
    ? options.contentTypes.map(normalizeContentType).filter(Boolean)
    : [];

  if (languages.length && !languages.includes(item.language)) {
    return false;
  }

  if (contentTypes.length && !contentTypes.includes(normalizeContentType(item.contentType))) {
    return false;
  }

  return true;
}

async function fetchTextWithCache(cacheKey, url, headers = {}) {
  const forceRefresh = parseBoolean(process.env.OULU_FORCE_REFRESH);

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

    console.warn(`[oulunews] Lookup failed for ${url}: ${error.message}`);
    return null;
  }
}

function buildSearchUrl(query, language = "fi", page = 0) {
  const normalizedLanguage = normalizeLanguage(language) || "fi";
  const params = new URLSearchParams({
    search_api_fulltext: String(query || "")
  });

  if (page > 0) {
    params.set("page", String(page));
  }

  return `${OULU_BASE_URL}/${normalizedLanguage}/search?${params.toString()}`;
}

function parseSearchResults(html) {
  const results = [];
  const pattern =
    /<a\s+href=([^\s>]+)\s+class="teaser\s+([^"]+)"\s+lang=([a-z]+)[^>]*>\s*<article>[\s\S]*?<div class="teaser__content">([\s\S]*?)<\/article>\s*<\/a>/gi;

  for (const match of String(html || "").matchAll(pattern)) {
    const url = decodeHtmlEntities(match[1]).replace(/^["']|["']$/g, "");
    const content = match[4];
    const typeMatch = content.match(/<div class="teaser__type">\s*([\s\S]*?)\s*<\/div>/i);
    const dateMatch = content.match(/<div class="teaser__date">\s*([\s\S]*?)\s*<\/div>/i);
    const titleMatch = content.match(/<h3[^>]*>\s*([\s\S]*?)\s*<\/h3>/i);
    const footerMatch = content.match(/<div class="teaser__footer">\s*([\s\S]*?)\s*<\/div>/i);

    results.push({
      url,
      language: match[3],
      teaserClass: normalizeWhitespace(match[2]),
      contentType: textFromHtml(typeMatch ? typeMatch[1] : ""),
      date: textFromHtml(dateMatch ? dateMatch[1] : ""),
      title: textFromHtml(titleMatch ? titleMatch[1] : ""),
      description: textFromHtml(footerMatch ? footerMatch[1] : "")
    });
  }

  return results;
}

function extractIntroHtml(html) {
  const match = String(html || "").match(
    /<div class="field-introductory-text[^"]*">([\s\S]*?)<\/div>\s*<\/div>/i
  );
  return match ? match[1].trim() : "";
}

function extractBodyHtml(html) {
  const match = String(html || "").match(
    /<div class="body field--type-text-with-summary[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="last-updated">/i
  );

  if (match) return match[1].trim();

  const fallback = String(html || "").match(
    /<article[\s\S]*?<div class="body field--type-text-with-summary[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/article>/i
  );
  return fallback ? fallback[1].trim() : "";
}

function extractLastUpdatedText(html) {
  const match = String(html || "").match(/<div class="last-updated">\s*([\s\S]*?)\s*<\/div>/i);
  return match ? textFromHtml(match[1]) : "";
}

function normalizeFetchedPage(url, html, fallback = {}) {
  const articleJsonLd = findArticleJsonLd(html);
  const canonicalUrl = extractCanonicalUrl(html) || url;
  const introHtml = extractIntroHtml(html);
  const bodyHtml = extractBodyHtml(html);
  const title =
    articleJsonLd?.headline ||
    extractMetaContent(html, "og:title") ||
    normalizeWhitespace(fallback.title);
  const description =
    articleJsonLd?.description ||
    extractMetaContent(html, "og:description") ||
    textFromHtml(introHtml) ||
    normalizeWhitespace(fallback.description);
  const contentHtml = [introHtml, bodyHtml].filter(Boolean).join("\n");
  const lastUpdatedText = extractLastUpdatedText(html);
  const createdMatch = lastUpdatedText.match(/(?:Luotu|Created)\s+([0-9.:-]+)/i);
  const modifiedMatch = lastUpdatedText.match(/(?:Muokattu|Updated)\s+([0-9.:-]+)/i);

  return {
    source: inferSourceKind(canonicalUrl),
    sourceId: canonicalUrl,
    url: canonicalUrl,
    slug: slugFromUrl(canonicalUrl),
    language: fallback.language || inferLanguageFromUrl(canonicalUrl),
    title: normalizeWhitespace(title),
    description: normalizeWhitespace(description),
    contentType: normalizeWhitespace(fallback.contentType || inferContentTypeFromUrl(canonicalUrl)),
    datePublished:
      articleJsonLd?.datePublished ||
      extractMetaContent(html, "article:published_time") ||
      (createdMatch ? createdMatch[1] : "") ||
      normalizeWhitespace(fallback.datePublished),
    dateModified:
      articleJsonLd?.dateModified ||
      extractMetaContent(html, "article:modified_time") ||
      (modifiedMatch ? modifiedMatch[1] : ""),
    imageUrl:
      articleJsonLd?.image?.url ||
      (typeof articleJsonLd?.image === "string" ? articleJsonLd.image : "") ||
      extractMetaContent(html, "og:image"),
    contentHtml,
    contentText: textFromHtml(contentHtml),
    raw: {
      html
    }
  };
}

async function fetchPage(itemOrUrl) {
  const fallback = typeof itemOrUrl === "string" ? {} : itemOrUrl || {};
  const url = typeof itemOrUrl === "string" ? itemOrUrl : itemOrUrl?.url;
  if (!url) return null;

  const html = await fetchTextWithCache(`oulu:page:${url}`, url, OULU_HTML_HEADERS);
  if (!html) return null;

  return normalizeFetchedPage(url, html, fallback);
}

async function searchOuluContent(query, options = {}) {
  const languages = Array.isArray(options.languages) && options.languages.length
    ? options.languages.map(normalizeLanguage).filter(Boolean)
    : ["fi"];
  const maxPages =
    Number.isFinite(Number(options.maxPages)) && Number(options.maxPages) > 0
      ? Number(options.maxPages)
      : 1;
  const rawItems = [];

  for (const language of languages) {
    for (let page = 0; page < maxPages; page += 1) {
      const url = buildSearchUrl(query, language, page);
      const html = await fetchTextWithCache(`oulu:search:${language}:${query}:${page}`, url, OULU_HTML_HEADERS);
      if (!html) break;

      const items = parseSearchResults(html).map(normalizeSearchHit);
      if (!items.length) break;

      rawItems.push(...items);
    }
  }

  const filtered = rawItems.filter(item => itemMatchesFilters(item, options));
  return sortItemsByDate(dedupeItems(filtered, options.preferredLanguages || ["fi", "en"]));
}

async function discoverPagesByQuery(query, options = {}) {
  const items = await searchOuluContent(query, options);
  const pages = (
    await Promise.all(
      items.map(async item => {
        const page = await fetchPage(item);
        return page ? { item, page } : null;
      })
    )
  ).filter(Boolean);
  const matchTerms = Array.isArray(options.matchTerms)
    ? options.matchTerms.map(term => normalizeWhitespace(term).toLowerCase()).filter(Boolean)
    : [];

  const filtered = pages.filter(({ item, page }) => {
    if (!matchTerms.length) return true;

    const haystack = [page.title, page.description, page.contentText, item.title, item.description]
      .map(value => String(value || "").toLowerCase())
      .join("\n");

    return matchTerms.some(term => haystack.includes(term));
  }).map(({ page }) => page);

  return sortItemsByDate(filtered);
}

async function ouluNewsDataSource() {
  return [];
}

module.exports = ouluNewsDataSource;
module.exports.fetchPage = fetchPage;
module.exports.searchOuluContent = searchOuluContent;
module.exports.discoverPagesByQuery = discoverPagesByQuery;
