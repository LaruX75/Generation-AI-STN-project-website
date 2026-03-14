const { readCache, remember } = require("./_apiCache");

const CODESCHOOL_COURSES_SITE_URL = "https://courses.codeschool.fi";
const PAGE_SITEMAP_URL = `${CODESCHOOL_COURSES_SITE_URL}/page-sitemap.xml`;
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

function absoluteUrl(url) {
  if (!url) return "";

  try {
    return new URL(url, CODESCHOOL_COURSES_SITE_URL).toString();
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

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
}

function textFromHtml(value) {
  return normalizeWhitespace(decodeHtmlEntities(stripTags(value)));
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
  return match ? absoluteUrl(match[1]) : "";
}

function extractCourseBodyHtml(html) {
  const sections = Array.from(
    String(html || "").matchAll(
      /<div class="learnworlds-main-text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
    )
  )
    .map(match => match[1])
    .filter(Boolean);

  return sections.join("\n");
}

function extractPrice(html) {
  const amount = extractMetaContent(html, "product:price:amount");
  const currency = extractMetaContent(html, "product:price:currency");
  return normalizeWhitespace([currency, amount].filter(Boolean).join(" "));
}

function itemMatchesTerms(item, options = {}) {
  const matchTerms = Array.isArray(options.matchTerms)
    ? options.matchTerms.map(term => normalizeWhitespace(term).toLowerCase()).filter(Boolean)
    : [];

  if (!matchTerms.length) return true;

  const haystack = [
    item.title,
    item.description,
    item.keywords
  ]
    .map(value => String(value || "").toLowerCase())
    .join("\n");

  return matchTerms.some(term => haystack.includes(term));
}

function sortItems(items) {
  return [...items].sort((left, right) =>
    String(left.title || "").localeCompare(String(right.title || ""), "fi")
  );
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

    console.warn(`[codeschoolcourses] Lookup failed for ${url}: ${error.message}`);
    return null;
  }
}

async function fetchPageSitemapUrls() {
  const xml = await fetchTextWithCache(`codeschoolcourses:sitemap:${PAGE_SITEMAP_URL}`, PAGE_SITEMAP_URL, HTML_HEADERS);
  if (!xml) return [];

  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map(match => absoluteUrl(decodeHtmlEntities(match[1])))
    .filter(url => url.includes("/course/") || url.includes("/program/"));
}

async function fetchCoursePage(url) {
  const html = await fetchTextWithCache(`codeschoolcourses:page:${url}`, url, HTML_HEADERS);
  if (!html) return null;

  const canonicalUrl = extractCanonicalUrl(html) || absoluteUrl(url);
  const title = extractMetaContent(html, "og:title") || extractMetaContent(html, "twitter:title");
  const description =
    extractMetaContent(html, "description") || extractMetaContent(html, "og:description");
  const imageUrl = extractMetaContent(html, "og:image");
  const keywords = extractMetaContent(html, "keywords");
  const contentHtml = extractCourseBodyHtml(html);

  return {
    source: "codeschool-courses",
    sourceId: canonicalUrl,
    url: canonicalUrl,
    slug: slugFromUrl(canonicalUrl),
    title: normalizeWhitespace(title),
    description: normalizeWhitespace(description),
    keywords: normalizeWhitespace(keywords),
    imageUrl: absoluteUrl(imageUrl),
    price: extractPrice(html),
    contentHtml,
    contentText: textFromHtml(contentHtml),
    raw: {
      html
    }
  };
}

async function discoverCoursePages(options = {}) {
  const urls = await fetchPageSitemapUrls();
  const pages = await Promise.all(urls.map(fetchCoursePage));
  return sortItems(pages.filter(Boolean).filter(item => itemMatchesTerms(item, options)));
}

async function codeschoolCoursesDataSource() {
  return [];
}

module.exports = codeschoolCoursesDataSource;
module.exports.fetchCoursePage = fetchCoursePage;
module.exports.discoverCoursePages = discoverCoursePages;
