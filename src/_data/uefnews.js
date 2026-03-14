const { readCache, remember } = require("./_apiCache");

const UEF_ADDSEARCH_SITEKEY = "9247c7e785f81d2b504eedfae2b6ba69";
const UEF_ADDSEARCH_API_HOST = "api-eu.addsearch.com";
const UEF_HTML_HEADERS = {
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

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function findFirstDatePublished(html) {
  for (const block of parseJsonLdBlocks(html)) {
    const graph = Array.isArray(block?.["@graph"]) ? block["@graph"] : [block];

    for (const entry of graph) {
      if (entry?.datePublished) return entry.datePublished;
    }
  }

  const timeMatch = String(html || "").match(/<time[^>]+datetime="([^"]+)"/i);
  return timeMatch ? timeMatch[1] : "";
}

function findFirstDateModified(html) {
  for (const block of parseJsonLdBlocks(html)) {
    const graph = Array.isArray(block?.["@graph"]) ? block["@graph"] : [block];

    for (const entry of graph) {
      if (entry?.dateModified) return entry.dateModified;
    }
  }

  return extractMetaContent(html, "article:modified_time");
}

function extractLastMatch(source, pattern) {
  const matches = Array.from(String(source || "").matchAll(pattern));
  return matches.length ? matches[matches.length - 1][1] : "";
}

function extractUefArticleContentHtml(html) {
  return (
    extractLastMatch(
      html,
      /<div class="field_news_body[^"]*">([\s\S]*?)<\/div>\s*(?:<\/div>\s*){0,4}<\/article>/gi
    ) ||
    extractLastMatch(
      html,
      /<div class="body field_type_text_with_summary[^"]*">([\s\S]*?)<\/div>\s*(?:<\/div>\s*){0,4}(?:<div class="field_news_body|<\/article>)/gi
    ) ||
    ""
  ).trim();
}

function extractUefConnectContentHtml(html) {
  const sectionMatch = String(html || "").match(
    /<section id="information"[\s\S]*?<div class="single-profile-about-text">([\s\S]*?)<\/div>\s*<\/div>[\s\S]*?<section id="people"/i
  );

  if (sectionMatch) return sectionMatch[1].trim();

  const fallback = String(html || "").match(
    /<section id="information"[\s\S]*?<p>([\s\S]*?)<\/section>/i
  );
  return fallback ? fallback[1].trim() : "";
}

function inferLanguageFromUrl(url) {
  if (url.includes("uefconnect.uef.fi/en/")) return "en";
  if (url.includes("uefconnect.uef.fi/")) return "fi";
  if (url.includes("/fi/") || url.includes(".fi/fi/")) return "fi";
  if (url.includes("/en/") || url.includes(".fi/en/")) return "en";
  return "";
}

function inferLanguageFromCategories(categories = []) {
  if (categories.includes("1xfi")) return "fi";
  if (categories.includes("1xen")) return "en";
  return "";
}

function inferSourceKind(url) {
  if (url.includes("uefconnect.uef.fi")) return "uefconnect";
  if (url.includes("www.uef.fi")) return "uef-news";
  return "uef";
}

function normalizeSearchHit(hit = {}) {
  const categories = Array.isArray(hit.categories) ? hit.categories : [];
  const url = String(hit.url || "");
  const title = normalizeWhitespace(decodeHtmlEntities(hit.title || ""));
  const description = normalizeWhitespace(
    decodeHtmlEntities(hit.meta_description || textFromHtml(hit.highlight || ""))
  );
  const contentType = normalizeWhitespace(hit.custom_fields?.content_type || "");
  const datePublished = hit.custom_fields?.custom_date || "";
  const highlightText = textFromHtml(hit.highlight || "");

  return {
    source: inferSourceKind(url),
    sourceId: String(hit.id || ""),
    url,
    slug: slugFromUrl(url),
    language: inferLanguageFromCategories(categories) || inferLanguageFromUrl(url),
    title,
    description,
    contentType,
    datePublished,
    dateModified: hit.ts || "",
    imageUrl: hit.images?.main || "",
    highlight: highlightText,
    categories,
    raw: hit
  };
}

function buildDedupeKey(item) {
  const source = item.source || "";
  const contentType = normalizeContentType(item.contentType);
  const customTitle = normalizeWhitespace(item.raw?.custom_fields?.customTitle || "");

  return [
    source,
    contentType,
    customTitle.toLowerCase() || normalizeWhitespace(item.title).toLowerCase()
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
  const matchTerms = Array.isArray(options.matchTerms)
    ? options.matchTerms.map(term => normalizeWhitespace(term).toLowerCase()).filter(Boolean)
    : [];
  const haystack = [
    item.title,
    item.description,
    item.highlight,
    item.raw?.meta_description,
    item.raw?.custom_fields?.customTitle
  ]
    .map(value => textFromHtml(value).toLowerCase())
    .join("\n");

  if (languages.length && !languages.includes(item.language)) {
    return false;
  }

  if (contentTypes.length && !contentTypes.includes(normalizeContentType(item.contentType))) {
    return false;
  }

  if (matchTerms.length && !matchTerms.some(term => haystack.includes(term))) {
    return false;
  }

  return true;
}

async function fetchTextWithCache(cacheKey, url, headers = {}) {
  const forceRefresh = parseBoolean(process.env.UEF_FORCE_REFRESH);

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

    console.warn(`[uefnews] Lookup failed for ${url}: ${error.message}`);
    return null;
  }
}

async function fetchJsonWithCache(cacheKey, url) {
  const forceRefresh = parseBoolean(process.env.UEF_FORCE_REFRESH);

  try {
    return await remember(
      cacheKey,
      async () => {
        const response = await fetch(url, {
          headers: {
            Accept: "application/json"
          }
        });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status} ${response.statusText}`);
        }

        return response.json();
      },
      { forceRefresh }
    );
  } catch (error) {
    const stale = await readCache(cacheKey, { ttlSeconds: 0 });
    if (stale) return stale;

    console.warn(`[uefnews] JSON lookup failed for ${url}: ${error.message}`);
    return null;
  }
}

function buildAddSearchUrl(query, options = {}) {
  const page = Number.isFinite(Number(options.page)) && Number(options.page) > 0 ? Number(options.page) : 1;
  const hits =
    Number.isFinite(Number(options.hits)) && Number(options.hits) > 0 ? Number(options.hits) : 20;
  const params = new URLSearchParams({
    term: String(query || ""),
    page: String(page),
    hits: String(hits),
    sort: "relevance",
    order: "desc"
  });

  return `https://${UEF_ADDSEARCH_API_HOST}/v1/search/${UEF_ADDSEARCH_SITEKEY}?${params.toString()}`;
}

async function searchAddSearch(query, options = {}) {
  const url = buildAddSearchUrl(query, options);
  return fetchJsonWithCache(`uef:addsearch:${query}:${options.page || 1}:${options.hits || 20}`, url);
}

function normalizeFetchedPage(url, html) {
  const canonicalUrl = extractCanonicalUrl(html) || url;
  const source = inferSourceKind(canonicalUrl);
  const title =
    extractMetaContent(html, "og:title").replace(/\s+\|\s+(Itä-Suomen yliopisto|University of Eastern Finland)$/i, "") ||
    extractMetaContent(html, "title");
  const description =
    extractMetaContent(html, "description") || extractMetaContent(html, "og:description");
  const imageUrl = extractMetaContent(html, "og:image");
  const contentHtml =
    source === "uefconnect" ? extractUefConnectContentHtml(html) : extractUefArticleContentHtml(html);

  return {
    source,
    sourceId: canonicalUrl,
    url: canonicalUrl,
    slug: slugFromUrl(canonicalUrl),
    language: inferLanguageFromUrl(canonicalUrl),
    title: normalizeWhitespace(title),
    description: normalizeWhitespace(description),
    contentType:
      source === "uefconnect"
        ? "Tutkimusryhmät ja projektit"
        : extractMetaContent(html, "addsearch-custom-field"),
    datePublished: findFirstDatePublished(html),
    dateModified: findFirstDateModified(html),
    imageUrl,
    contentHtml,
    contentText: textFromHtml(contentHtml),
    raw: {
      html
    }
  };
}

async function fetchPage(url) {
  const html = await fetchTextWithCache(`uef:page:${url}`, url, UEF_HTML_HEADERS);
  if (!html) return null;

  return normalizeFetchedPage(url, html);
}

async function searchUefContent(query, options = {}) {
  const perPage =
    Number.isFinite(Number(options.perPage)) && Number(options.perPage) > 0
      ? Number(options.perPage)
      : 20;
  const maxPages =
    Number.isFinite(Number(options.maxPages)) && Number(options.maxPages) > 0
      ? Number(options.maxPages)
      : 2;
  const rawItems = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const payload = await searchAddSearch(query, { page, hits: perPage });
    const hits = Array.isArray(payload?.hits) ? payload.hits : [];
    if (!hits.length) break;

    for (const hit of hits) {
      rawItems.push(normalizeSearchHit(hit));
    }

    if (hits.length < perPage) break;
  }

  const filtered = rawItems.filter(item => itemMatchesFilters(item, options));
  return sortItemsByDate(dedupeItems(filtered, options.preferredLanguages || ["fi", "en"]));
}

async function discoverPagesByQuery(query, options = {}) {
  const items = await searchUefContent(query, options);
  const pages = (
    await Promise.all(
      items.map(async item => {
        const page = await fetchPage(item.url);
        return page ? { item, page } : null;
      })
    )
  ).filter(Boolean);
  const matchTerms = Array.isArray(options.matchTerms)
    ? options.matchTerms.map(term => normalizeWhitespace(term).toLowerCase()).filter(Boolean)
    : [];

  const filtered = pages.filter(({ item, page }) => {
    if (!matchTerms.length) return true;

    const haystack = [
      page.title,
      page.description,
      page.contentText,
      item.title,
      item.description,
      item.highlight
    ]
      .map(value => String(value || "").toLowerCase())
      .join("\n");

    return matchTerms.some(term => haystack.includes(term));
  }).map(({ page }) => page);

  return sortItemsByDate(filtered);
}

async function uefNewsDataSource() {
  return [];
}

module.exports = uefNewsDataSource;
module.exports.fetchPage = fetchPage;
module.exports.searchUefContent = searchUefContent;
module.exports.discoverPagesByQuery = discoverPagesByQuery;
