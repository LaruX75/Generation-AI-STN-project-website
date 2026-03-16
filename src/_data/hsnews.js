const { remember } = require("./_apiCache");

const HS_NEWS_SITEMAP_URL = "https://www.hs.fi/rss/custom/news-sitemap.xml";
const DEFAULT_LIMIT = 20;

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

function inferTypeFromUrl(url) {
  if (String(url || "").includes("/video/")) return "video";
  return "article";
}

function buildSourceId(url) {
  const match = String(url || "").match(/art-(\d+)\.html/);
  return match ? match[1] : "";
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/xml,text/xml,text/html",
      "User-Agent": "GenAI7-Eleventy-Build/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`);
  }

  return response.text();
}

async function getHsNewsSitemapItems() {
  const forceRefresh = parseBoolean(process.env.HS_NEWS_FORCE_REFRESH);

  return remember(
    "hs:news-sitemap:v1",
    async () => {
      const xml = await fetchText(HS_NEWS_SITEMAP_URL);
      const items = [];
      const pattern =
        /<url><loc>([^<]+)<\/loc><news:news>[\s\S]*?<news:title>([\s\S]*?)<\/news:title><news:publication_date>([^<]+)<\/news:publication_date>(?:<news:keywords>([\s\S]*?)<\/news:keywords>)?[\s\S]*?<\/news:news>[\s\S]*?<\/url>/g;

      let match;
      while ((match = pattern.exec(xml))) {
        const url = normalizeWhitespace(match[1]);
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
          type: inferTypeFromUrl(url),
          keywords
        });
      }

      return items;
    },
    { forceRefresh }
  );
}

function matchesTerms(item, terms = []) {
  const haystack = [item.title, item.url, ...(item.keywords || [])].join("\n").toLowerCase();
  const normalizedTerms = terms
    .map(term => normalizeWhitespace(term).toLowerCase())
    .filter(Boolean);

  if (!normalizedTerms.length) return true;
  return normalizedTerms.some(term => haystack.includes(term));
}

async function searchHsNews(query, options = {}) {
  const normalizedQuery = normalizeWhitespace(query);
  const limit = Number(options.limit) > 0 ? Number(options.limit) : DEFAULT_LIMIT;
  const matchTerms = Array.isArray(options.matchTerms) ? options.matchTerms : [normalizedQuery];
  const items = await getHsNewsSitemapItems();

  const filtered = items
    .filter(item => matchesTerms(item, matchTerms))
    .sort((left, right) => {
      const leftTime = Date.parse(left.datePublished || "") || 0;
      const rightTime = Date.parse(right.datePublished || "") || 0;
      return rightTime - leftTime;
    })
    .slice(0, limit);

  return {
    query: normalizedQuery,
    total: filtered.length,
    items: filtered
  };
}

module.exports = {
  getHsNewsSitemapItems,
  searchHsNews
};
