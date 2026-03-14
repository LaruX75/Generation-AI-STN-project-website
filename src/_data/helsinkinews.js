const fs = require("node:fs");
const path = require("node:path");
const { readCache, remember } = require("./_apiCache");

const HELSINKI_NEWS_HEADERS = {
  Accept: "text/html,application/xhtml+xml"
};
const CLUDO_CUSTOMER_ID = 2594;
const CLUDO_SITE_KEY_SUFFIX = "SearchKey";
const CLUDO_ENGINE_BY_LANGUAGE = {
  fi: 14065,
  en: 14064,
  sv: 14066
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
    .replace(/&eacute;/g, "e")
    .replace(/&uuml;/g, "u")
    .replace(/&ouml;/g, "o")
    .replace(/&auml;/g, "a")
    .replace(/&Ouml;/g, "O")
    .replace(/&Auml;/g, "A")
    .replace(/&Uuml;/g, "U");
}

function textFromHtml(value) {
  const withLinkText = String(value || "").replace(
    /<ds-link[^>]*ds-text="([^"]+)"[^>]*>([\s\S]*?)<\/ds-link>/g,
    (_, text) => decodeHtmlEntities(text)
  );

  return normalizeWhitespace(decodeHtmlEntities(stripTags(withLinkText)));
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
  return CLUDO_ENGINE_BY_LANGUAGE[normalized] ? normalized : "";
}

function loadConfigFile() {
  const explicitPath = process.env.HELSINKI_NEWS_CONFIG_PATH;
  const candidatePaths = [
    explicitPath,
    path.join(process.cwd(), "helsinkinews.config.json"),
    path.join(process.cwd(), "src", "_data", "helsinkinews.config.json")
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    if (!fs.existsSync(candidatePath)) continue;
    return JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  }

  return null;
}

function loadConfiguredUrls() {
  const envSingle = process.env.HELSINKI_NEWS_URL;
  const envMultiple = process.env.HELSINKI_NEWS_URLS;

  if (envMultiple) {
    return envMultiple
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
  }

  if (envSingle) {
    return [envSingle.trim()].filter(Boolean);
  }

  const fileConfig = loadConfigFile();
  if (!fileConfig) return [];

  const source = fileConfig.urls || fileConfig.articles || fileConfig;
  return (Array.isArray(source) ? source : [source])
    .map(item => (typeof item === "string" ? item.trim() : String(item?.url || "").trim()))
    .filter(Boolean);
}

function parseJsonLdBlocks(html) {
  const matches = String(html || "").matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  );
  const blocks = [];

  for (const match of matches) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return blocks;
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function hasNewsArticleType(value) {
  return asArray(value).includes("NewsArticle");
}

function findNewsArticleJsonLd(html) {
  for (const block of parseJsonLdBlocks(html)) {
    if (hasNewsArticleType(block?.["@type"])) return block;

    const graph = Array.isArray(block?.["@graph"]) ? block["@graph"] : [];
    const found = graph.find(entry => hasNewsArticleType(entry?.["@type"]));
    if (found) return found;
  }

  return null;
}

function extractMetaContent(html, name) {
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]+content=["']([\\s\\S]*?)["'][^>]*>`,
    "i"
  );
  const match = String(html || "").match(pattern);
  return match ? decodeHtmlEntities(match[1]) : "";
}

function extractCanonicalUrl(html) {
  const match = String(html || "").match(/<link rel="canonical" href="([^"]+)"/i);
  return match ? match[1] : "";
}

function extractNewsItemId(html) {
  const metaId = extractMetaContent(html, "NewsItemId");
  if (metaId) return metaId;

  const match = String(html || "").match(/"currentPath":"node\/(\d+)"/);
  return match ? match[1] : "";
}

function extractMainContentHtml(html) {
  const match = String(html || "").match(
    /<div class="news-article__content__main-content">([\s\S]*?)<aside class="news-article__sidebar"/
  );

  if (!match) return "";

  return match[1]
    .replace(/<hy-paragraph-text[^>]*>/g, "")
    .replace(/<\/hy-paragraph-text>/g, "")
    .replace(/<hy-main-content-wrapper>[\s\S]*$/g, "")
    .replace(/<hy-box[\s\S]*$/g, "")
    .replace(
      /<ds-link([^>]*)ds-href="([^"]+)"([^>]*)ds-text="([^"]+)"([^>]*)><\/ds-link>/g,
      (_, beforeHref, href, afterHref, text) =>
        `<a href="${href}"${beforeHref}${afterHref}>${decodeHtmlEntities(text)}</a>`
    )
    .trim();
}

function extractMentionedPeople(html) {
  const source = String(html || "");
  const personIds = Array.from(
    new Set(Array.from(source.matchAll(/data-person-id="(\d+)"/g)).map(match => match[1]))
  );
  const personLinks = Array.from(
    new Set(
      Array.from(
        source.matchAll(
          /https:\/\/www\.helsinki\.fi\/(?:fi\/tutustu-meihin\/ihmiset\/henkilohaku|en\/about-us\/people\/people-finder|sv\/om-oss\/personer\/personsokning)\/([a-z0-9-]+-\d+)/gi
        )
      ).map(match => match[1].toLowerCase())
    )
  );

  return { personIds, personLinks };
}

function extractCludoField(document, fieldName) {
  return document?.Fields?.[fieldName]?.Value || "";
}

function normalizeCludoResult(document = {}) {
  const category = normalizeWhitespace(
    extractCludoField(document, "Category") || extractCludoField(document, "CategorySAYT")
  );
  const title = normalizeWhitespace(extractCludoField(document, "Title"));
  const url = extractCludoField(document, "Url");
  const description = normalizeWhitespace(extractCludoField(document, "Description"));

  return {
    category,
    title,
    url,
    description,
    raw: document
  };
}

function buildCludoAuthorizationKey(customerId, engineId) {
  return Buffer.from(`${customerId}:${engineId}:${CLUDO_SITE_KEY_SUFFIX}`).toString("base64");
}

function buildCludoSearchUrl(language) {
  const normalizedLanguage = normalizeLanguage(language) || "fi";
  const engineId = CLUDO_ENGINE_BY_LANGUAGE[normalizedLanguage];
  return `https://api.cludo.com/api/v3/${CLUDO_CUSTOMER_ID}/${engineId}/search`;
}

function isNewsCategory(category) {
  const normalized = normalizeWhitespace(category).toLowerCase();
  return normalized === "uutiset" || normalized === "news";
}

function sortArticlesByPublishedDate(articles) {
  return [...articles].sort((left, right) => {
    const leftTime = Date.parse(left.datePublished || "") || 0;
    const rightTime = Date.parse(right.datePublished || "") || 0;

    if (rightTime !== leftTime) return rightTime - leftTime;
    return String(left.title || "").localeCompare(String(right.title || ""), "fi");
  });
}

function dedupeArticlesBySource(articles, preferredLanguages = ["fi", "en", "sv"]) {
  const languageRank = new Map(preferredLanguages.map((language, index) => [language, index]));
  const byKey = new Map();

  for (const article of articles) {
    const key = article.sourceId || article.url || article.slug;
    if (!key) continue;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, article);
      continue;
    }

    const existingRank = languageRank.get(existing.language) ?? Number.MAX_SAFE_INTEGER;
    const nextRank = languageRank.get(article.language) ?? Number.MAX_SAFE_INTEGER;

    if (nextRank < existingRank) {
      byKey.set(key, article);
    }
  }

  return Array.from(byKey.values());
}

function articleMatchesFilters(article, options = {}) {
  const haystack = [
    article.title,
    article.headline,
    article.description,
    article.contentText
  ]
    .map(value => String(value || "").toLowerCase())
    .join("\n");
  const matchTerms = Array.isArray(options.matchTerms)
    ? options.matchTerms.map(item => String(item || "").trim().toLowerCase()).filter(Boolean)
    : [];
  const personLinks = Array.isArray(options.personLinks)
    ? options.personLinks.map(item => String(item || "").trim().toLowerCase()).filter(Boolean)
    : [];
  const personIds = Array.isArray(options.personIds)
    ? options.personIds.map(item => String(item || "").trim()).filter(Boolean)
    : [];

  const checks = [];

  if (matchTerms.length) {
    checks.push(matchTerms.some(term => haystack.includes(term)));
  }

  if (personLinks.length) {
    checks.push(personLinks.some(link => (article.mentionedPeople?.personLinks || []).includes(link)));
  }

  if (personIds.length) {
    checks.push(personIds.some(id => (article.mentionedPeople?.personIds || []).includes(id)));
  }

  return checks.length ? checks.some(Boolean) : true;
}

function normalizeArticle(articleJsonLd = {}, html, url) {
  const canonicalUrl = extractCanonicalUrl(html) || articleJsonLd.mainEntityOfPage || url;
  const contentHtml = extractMainContentHtml(html);
  const contentText = textFromHtml(contentHtml);
  const mentionedPeople = extractMentionedPeople(html);
  const about = asArray(articleJsonLd.about)
    .map(item => normalizeWhitespace(item?.name || ""))
    .filter(Boolean);
  const author = articleJsonLd.author?.name || "";
  const imageUrl =
    articleJsonLd.image?.url ||
    (typeof articleJsonLd.image === "string" ? articleJsonLd.image : "") ||
    extractMetaContent(html, "og:image");
  const title =
    articleJsonLd.headline ||
    articleJsonLd.name ||
    extractMetaContent(html, "og:title").replace(/\s+\|\s+Helsingin yliopisto$/, "");

  return {
    source: "helsinki-news",
    sourceId: extractNewsItemId(html) || String(articleJsonLd["@id"] || ""),
    url: canonicalUrl,
    slug: slugFromUrl(canonicalUrl || url),
    language: canonicalUrl.includes("/fi/") ? "fi" : canonicalUrl.includes("/en/") ? "en" : "",
    title: normalizeWhitespace(title),
    headline: normalizeWhitespace(articleJsonLd.headline || title),
    description: normalizeWhitespace(
      articleJsonLd.description || extractMetaContent(html, "description")
    ),
    datePublished: articleJsonLd.datePublished || "",
    dateModified: articleJsonLd.dateModified || "",
    author: normalizeWhitespace(author),
    imageUrl,
    topics: about,
    mentionedPeople,
    contentHtml,
    contentText,
    raw: {
      jsonLd: articleJsonLd
    }
  };
}

async function fetchTextWithCache(cacheKey, url, headers = {}) {
  const forceRefresh = parseBoolean(process.env.HELSINKI_NEWS_FORCE_REFRESH);

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

    console.warn(`[helsinkinews] Lookup failed for ${url}: ${error.message}`);
    return null;
  }
}

async function fetchJsonWithCache(cacheKey, url, options = {}) {
  const forceRefresh = parseBoolean(process.env.HELSINKI_NEWS_FORCE_REFRESH);
  const method = options.method || "GET";
  const headers = options.headers || {};
  const body = options.body;

  try {
    return await remember(
      cacheKey,
      async () => {
        const response = await fetch(url, { method, headers, body });

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

    console.warn(`[helsinkinews] JSON lookup failed for ${url}: ${error.message}`);
    return null;
  }
}

async function searchCludo(query, options = {}) {
  const language = normalizeLanguage(options.language) || "fi";
  const page = Number.isFinite(Number(options.page)) && Number(options.page) > 0 ? Number(options.page) : 1;
  const perPage =
    Number.isFinite(Number(options.perPage)) && Number(options.perPage) > 0
      ? Number(options.perPage)
      : 20;

  const body = {
    query,
    page,
    perPage,
    ResponseType: "Json"
  };
  const url = buildCludoSearchUrl(language);
  const engineId = CLUDO_ENGINE_BY_LANGUAGE[language];
  const headers = {
    Authorization: `SiteKey ${buildCludoAuthorizationKey(CLUDO_CUSTOMER_ID, engineId)}`,
    "Content-Type": "application/json;charset=UTF-8",
    Accept: "application/json"
  };

  return fetchJsonWithCache(`helsinki-news:cludo:${language}:${query}:${page}:${perPage}`, url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

async function fetchArticle(url) {
  const html = await fetchTextWithCache(`helsinki-news:${url}`, url, HELSINKI_NEWS_HEADERS);
  if (!html) return null;

  const articleJsonLd = findNewsArticleJsonLd(html);
  if (!articleJsonLd) {
    console.warn(`[helsinkinews] No NewsArticle JSON-LD found for ${url}`);
    return null;
  }

  return normalizeArticle(articleJsonLd, html, url);
}

async function discoverArticlesByQuery(query, options = {}) {
  const languages = Array.isArray(options.languages) && options.languages.length
    ? options.languages.map(normalizeLanguage).filter(Boolean)
    : ["fi", "en"];
  const categories = Array.isArray(options.categories) && options.categories.length
    ? options.categories.map(item => normalizeWhitespace(item).toLowerCase())
    : [];
  const perPage =
    Number.isFinite(Number(options.perPage)) && Number(options.perPage) > 0
      ? Number(options.perPage)
      : 20;
  const maxPages =
    Number.isFinite(Number(options.maxPages)) && Number(options.maxPages) > 0
      ? Number(options.maxPages)
      : 3;

  const discoveredUrls = [];

  for (const language of languages) {
    for (let page = 1; page <= maxPages; page += 1) {
      const payload = await searchCludo(query, { language, page, perPage });
      const documents = Array.isArray(payload?.TypedDocuments) ? payload.TypedDocuments : [];
      if (!documents.length) break;

      for (const document of documents) {
        const normalizedResult = normalizeCludoResult(document);
        const category = normalizedResult.category.toLowerCase();
        const url = normalizedResult.url;
        if (!url) continue;

        if (categories.length ? categories.includes(category) : isNewsCategory(category)) {
          discoveredUrls.push(url);
        }
      }

      if (documents.length < perPage) break;
    }
  }

  const uniqueUrls = Array.from(new Set(discoveredUrls));
  const articles = (await Promise.all(uniqueUrls.map(fetchArticle))).filter(Boolean);
  const filteredArticles = articles.filter(article => articleMatchesFilters(article, options));

  return sortArticlesByPublishedDate(dedupeArticlesBySource(filteredArticles, languages));
}

async function searchCludoContent(query, options = {}) {
  const languages = Array.isArray(options.languages) && options.languages.length
    ? options.languages.map(normalizeLanguage).filter(Boolean)
    : ["fi"];
  const categories = Array.isArray(options.categories) && options.categories.length
    ? options.categories.map(item => normalizeWhitespace(item).toLowerCase())
    : [];
  const perPage =
    Number.isFinite(Number(options.perPage)) && Number(options.perPage) > 0
      ? Number(options.perPage)
      : 20;
  const maxPages =
    Number.isFinite(Number(options.maxPages)) && Number(options.maxPages) > 0
      ? Number(options.maxPages)
      : 2;
  const matchTerms = Array.isArray(options.matchTerms)
    ? options.matchTerms.map(item => String(item || "").trim().toLowerCase()).filter(Boolean)
    : [];

  const results = [];

  for (const language of languages) {
    for (let page = 1; page <= maxPages; page += 1) {
      const payload = await searchCludo(query, { language, page, perPage });
      const documents = Array.isArray(payload?.TypedDocuments) ? payload.TypedDocuments : [];
      if (!documents.length) break;

      for (const document of documents) {
        const item = normalizeCludoResult(document);
        if (!item.url) continue;

        const haystack = [item.title, item.description].join("\n").toLowerCase();
        const categoryOk = categories.length ? categories.includes(item.category.toLowerCase()) : true;
        const termOk = matchTerms.length ? matchTerms.some(term => haystack.includes(term)) : true;

        if (categoryOk && termOk) {
          results.push({
            language,
            category: item.category,
            title: item.title,
            url: item.url,
            description: item.description,
            raw: item.raw
          });
        }
      }

      if (documents.length < perPage) break;
    }
  }

  const seen = new Set();
  return results.filter(item => {
    const key = `${item.language}::${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function helsinkiNewsDataSource() {
  const urls = loadConfiguredUrls();
  if (!urls.length) return [];

  const articles = await Promise.all(urls.map(fetchArticle));
  return articles.filter(Boolean);
}

module.exports = helsinkiNewsDataSource;
module.exports.fetchArticle = fetchArticle;
module.exports.discoverArticlesByQuery = discoverArticlesByQuery;
module.exports.searchCludoContent = searchCludoContent;
