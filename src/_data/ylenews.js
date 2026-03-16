const fs = require("node:fs");
const path = require("node:path");
const { remember } = require("./_apiCache");

const YLE_SEARCH_PAGE_URL = "https://haku.yle.fi/";
const YLE_SEARCH_PAGE_DEFAULTS = {
  appId: "hakuylefi_v2_prod",
  appKey: "4c1422b466ee676e03c4ba9866c0921f",
  searchApiUrl: "https://yle-fi-search.api.yle.fi"
};
const DEFAULT_LIMIT = 10;
const DEFAULT_MAX_PAGES = 1;

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

function buildQueryString(params) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });

  return query.toString();
}

function loadConfigFile() {
  const explicitPath = process.env.YLE_NEWS_CONFIG_PATH;
  const candidatePaths = [
    explicitPath,
    path.join(process.cwd(), "ylenews.config.json"),
    path.join(process.cwd(), "src", "_data", "ylenews.config.json")
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    if (!fs.existsSync(candidatePath)) continue;
    return JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  }

  return null;
}

function loadConfiguredPeople() {
  const envMultiple = process.env.YLE_NEWS_PEOPLE;
  const envSingle = process.env.YLE_NEWS_PERSON;

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
    .filter(item => item && normalizeWhitespace(item.name || item.query));
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/json",
      "User-Agent": "GenAI7-Eleventy-Build/1.0",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`);
  }

  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "GenAI7-Eleventy-Build/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`);
  }

  return response.json();
}

function parseConfigFromSearchPage(html) {
  const match = String(html || "").match(/window\.CONFIG_FROM_SERVER\s*=\s*(\{[\s\S]*?\})<\/script>/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function getYleSearchClientConfig() {
  const forceRefresh = parseBoolean(process.env.YLE_NEWS_FORCE_REFRESH);

  return remember(
    "yle:search-client-config:v1",
    async () => {
      const html = await fetchText(YLE_SEARCH_PAGE_URL);
      const parsed = parseConfigFromSearchPage(html) || {};

      return {
        appId: parsed.appId || YLE_SEARCH_PAGE_DEFAULTS.appId,
        appKey: parsed.appKey || YLE_SEARCH_PAGE_DEFAULTS.appKey,
        searchApiUrl: parsed.searchApiUrl || YLE_SEARCH_PAGE_DEFAULTS.searchApiUrl
      };
    },
    { forceRefresh }
  );
}

function buildSearchUrl(clientConfig, params) {
  return `${clientConfig.searchApiUrl}/v1/search?${buildQueryString(params)}`;
}

function normalizeResult(item = {}, context = {}) {
  const services = Array.isArray(item.services) ? item.services : [];
  const authors = Array.isArray(item.author) ? item.author : [];
  const fullUrl = item?.url?.full || item?.url?.short || "";

  return {
    personName: context.personName || context.query || "",
    query: context.query || "",
    sourceId: item.id || "",
    datePublished: item.datePublished || "",
    title: normalizeWhitespace(decodeHtmlEntities(item.headline || "")),
    type: normalizeWhitespace(item.type || ""),
    url: fullUrl,
    lead: normalizeWhitespace(decodeHtmlEntities(item.lead || "")),
    authors,
    service: services[0] || "",
    services,
    imageId: item?.image?.id || "",
    language: context.language || "",
    uiLanguage: context.uiLanguage || ""
  };
}

function matchesTerms(item, terms = []) {
  const haystack = [
    item.title,
    item.lead,
    item.authors.join(" ")
  ]
    .join("\n")
    .toLowerCase();

  const normalizedTerms = terms
    .map(term => normalizeWhitespace(term).toLowerCase())
    .filter(Boolean);

  if (!normalizedTerms.length) return true;
  return normalizedTerms.some(term => haystack.includes(term));
}

async function searchYleNews(query, options = {}) {
  const normalizedQuery = normalizeWhitespace(query);
  if (!normalizedQuery) return { query: "", personName: "", total: 0, items: [] };

  const clientConfig = await getYleSearchClientConfig();
  const forceRefresh = parseBoolean(process.env.YLE_NEWS_FORCE_REFRESH);
  const type = options.type || "article";
  const language = options.language || "fi";
  const uiLanguage = options.uiLanguage || language;
  const limit = Number(options.limit) > 0 ? Number(options.limit) : DEFAULT_LIMIT;
  const maxPages = Number(options.maxPages) > 0 ? Number(options.maxPages) : DEFAULT_MAX_PAGES;
  const personName = normalizeWhitespace(options.personName || normalizedQuery);
  const matchTerms = Array.isArray(options.matchTerms) ? options.matchTerms : [personName];

  const items = [];
  let total = 0;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const offset = pageIndex * limit;
    const params = {
      app_id: clientConfig.appId,
      app_key: clientConfig.appKey,
      query: normalizedQuery,
      type,
      language,
      uiLanguage,
      limit,
      offset
    };

    if (options.service) params.service = options.service;
    if (options.time) params.time = options.time;
    if (options.timeFrom) params.timeFrom = options.timeFrom;
    if (options.timeTo) params.timeTo = options.timeTo;
    if (options.author) params.author = options.author;

    const cacheKey = `yle:search:${buildQueryString(params)}`;
    const payload = await remember(
      cacheKey,
      async () => fetchJson(buildSearchUrl(clientConfig, params)),
      { forceRefresh }
    );

    total = Number(payload?.meta?.count) || total;
    const pageItems = Array.isArray(payload?.data) ? payload.data : [];
    const normalizedItems = pageItems
      .map(item =>
        normalizeResult(item, {
          personName,
          query: normalizedQuery,
          language,
          uiLanguage
        })
      )
      .filter(item => item.url && matchesTerms(item, matchTerms));

    items.push(...normalizedItems);

    if (!pageItems.length || offset + limit >= total) break;
  }

  const deduped = Array.from(new Map(items.map(item => [item.url, item])).values()).sort((left, right) => {
    const leftTime = Date.parse(left.datePublished || "") || 0;
    const rightTime = Date.parse(right.datePublished || "") || 0;
    return rightTime - leftTime;
  });

  return {
    query: normalizedQuery,
    personName,
    total,
    items: deduped
  };
}

async function searchYleNewsForPeople(people = [], options = {}) {
  const results = [];

  for (const person of people) {
    const query = normalizeWhitespace(person.query || person.name);
    if (!query) continue;

    const result = await searchYleNews(query, {
      ...options,
      ...person,
      personName: normalizeWhitespace(person.name || query)
    });

    results.push(result);
  }

  return results;
}

module.exports = {
  getYleSearchClientConfig,
  loadConfiguredPeople,
  searchYleNews,
  searchYleNewsForPeople
};
