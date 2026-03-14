const { readCache, remember } = require("./_apiCache");

const CODESCHOOL_SITE_URL = "https://www.codeschool.fi";
const CODESCHOOL_SITEMAP_URL = `${CODESCHOOL_SITE_URL}/sitemap.xml`;
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

function slugFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, "");
    return pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    return "";
  }
}

function absoluteUrl(url) {
  if (!url) return "";

  try {
    return new URL(url, CODESCHOOL_SITE_URL).toString();
  } catch {
    return "";
  }
}

function normalizeTag(value) {
  return normalizeWhitespace(decodeHtmlEntities(value)).toLowerCase();
}

function itemMatchesTerms(item, options = {}) {
  const matchTerms = Array.isArray(options.matchTerms)
    ? options.matchTerms.map(term => normalizeWhitespace(term).toLowerCase()).filter(Boolean)
    : [];

  if (!matchTerms.length) return true;

  const haystack = [
    item.title,
    item.description,
    item.excerpt,
    item.contentText,
    ...(Array.isArray(item.tags) ? item.tags : []),
    ...(Array.isArray(item.categories) ? item.categories : [])
  ]
    .map(value => String(value || "").toLowerCase())
    .join("\n");

  return matchTerms.some(term => haystack.includes(term));
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
  const forceRefresh = parseBoolean(process.env.CODESCHOOL_FORCE_REFRESH);

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

    console.warn(`[codeschoolnews] Lookup failed for ${url}: ${error.message}`);
    return null;
  }
}

async function fetchJsonWithCache(cacheKey, url) {
  const forceRefresh = parseBoolean(process.env.CODESCHOOL_FORCE_REFRESH);

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

    console.warn(`[codeschoolnews] JSON lookup failed for ${url}: ${error.message}`);
    return null;
  }
}

async function fetchSitemapUrls() {
  const xml = await fetchTextWithCache(`codeschool:sitemap:${CODESCHOOL_SITEMAP_URL}`, CODESCHOOL_SITEMAP_URL, HTML_HEADERS);
  if (!xml) return [];

  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map(match => absoluteUrl(decodeHtmlEntities(match[1])))
    .filter(Boolean);
}

function buildJsonPrettyUrl(url) {
  const parsed = new URL(absoluteUrl(url) || CODESCHOOL_SITE_URL);
  parsed.searchParams.set("format", "json-pretty");
  return parsed.toString();
}

function normalizeSquarespaceItem(item = {}, source = {}) {
  const url = absoluteUrl(item.fullUrl || item.url || source.url);
  const title = normalizeWhitespace(decodeHtmlEntities(item.title || source.title || ""));
  const description = textFromHtml(item.excerpt || source.description || "");
  const contentHtml = String(item.body || "");

  return {
    source: "codeschool-blog",
    sourceId: String(item.id || url || ""),
    url,
    slug: slugFromUrl(url),
    title,
    description,
    excerpt: description,
    contentHtml,
    contentText: textFromHtml(contentHtml),
    datePublished: item.publishOn ? new Date(item.publishOn).toISOString() : "",
    dateModified: item.updatedOn ? new Date(item.updatedOn).toISOString() : "",
    author: normalizeWhitespace(
      [item.author?.firstName, item.author?.lastName].filter(Boolean).join(" ") ||
        item.author?.displayName ||
        ""
    ),
    tags: Array.isArray(item.tags) ? item.tags.map(tag => normalizeWhitespace(tag)).filter(Boolean) : [],
    categories: Array.isArray(item.categories)
      ? item.categories.map(category => normalizeWhitespace(category)).filter(Boolean)
      : [],
    imageUrl: absoluteUrl(item.assetUrl || source.imageUrl),
    raw: item
  };
}

async function fetchSquarespacePage(url) {
  const jsonUrl = buildJsonPrettyUrl(url);
  const payload = await fetchJsonWithCache(`codeschool:page:${url}`, jsonUrl);
  if (!payload) return null;

  if (payload.item) {
    return normalizeSquarespaceItem(payload.item, {
      url,
      title: payload.item?.title,
      description: payload.item?.excerpt
    });
  }

  return {
    source: "codeschool-page",
    sourceId: absoluteUrl(url),
    url: absoluteUrl(url),
    slug: slugFromUrl(url),
    title: normalizeWhitespace(payload.collection?.title || ""),
    description: "",
    excerpt: "",
    contentHtml: "",
    contentText: "",
    datePublished: "",
    dateModified: "",
    author: "",
    tags: Array.isArray(payload.collection?.tags) ? payload.collection.tags : [],
    categories: Array.isArray(payload.collection?.categories) ? payload.collection.categories : [],
    imageUrl: "",
    raw: payload
  };
}

async function fetchTaggedContent(tag) {
  const tagUrl = `${CODESCHOOL_SITE_URL}/blog/tag/${encodeURIComponent(String(tag || "").trim()).replace(/%20/g, "+")}`;
  const payload = await fetchJsonWithCache(`codeschool:tag:${tag}`, buildJsonPrettyUrl(tagUrl));
  if (!payload) return [];

  const items = Array.isArray(payload.items) ? payload.items : [];
  return items.map(item => normalizeSquarespaceItem(item));
}

async function discoverPagesByQuery(query, options = {}) {
  const urls = await fetchSitemapUrls();
  const blogUrls = urls.filter(url => url.includes("/blog/") && !url.includes("/blog/tag/"));
  const maxItems =
    Number.isFinite(Number(options.maxItems)) && Number(options.maxItems) > 0
      ? Number(options.maxItems)
      : blogUrls.length;
  const candidates = blogUrls.slice(0, maxItems);
  const pages = await Promise.all(candidates.map(fetchSquarespacePage));

  return sortItemsByDate(
    dedupeItems(
      pages.filter(Boolean).filter(item => itemMatchesTerms(item, { matchTerms: [query, ...(options.matchTerms || [])] }))
    )
  );
}

async function searchTaggedContent(tag, options = {}) {
  const items = await fetchTaggedContent(tag);
  return sortItemsByDate(
    dedupeItems(items.filter(item => itemMatchesTerms(item, options)))
  );
}

async function codeschoolNewsDataSource() {
  return [];
}

module.exports = codeschoolNewsDataSource;
module.exports.fetchSquarespacePage = fetchSquarespacePage;
module.exports.fetchTaggedContent = fetchTaggedContent;
module.exports.searchTaggedContent = searchTaggedContent;
module.exports.discoverPagesByQuery = discoverPagesByQuery;
