const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

const pad = value => String(value).padStart(2, "0");

const formatDate = (value, format = "d.m.Y") => {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const replacements = {
    d: pad(date.getDate()),
    m: pad(date.getMonth() + 1),
    Y: String(date.getFullYear()),
    H: pad(date.getHours()),
    i: pad(date.getMinutes()),
    s: pad(date.getSeconds())
  };
  return String(format).replace(/[dmYHis]/g, token => replacements[token] || token);
};

const normalizePersonName = value =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[-.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");

const resolveLocale = (lang, url) => {
  if (lang === "en" || lang === "sv" || lang === "fi") return lang;
  const normalizedUrl = String(url || "");
  if (normalizedUrl.startsWith("/en/")) return "en";
  if (normalizedUrl.startsWith("/sv/")) return "sv";
  return "fi";
};

const stripHtml = value =>
  String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#[0-9]+;/g, " ")
    .replace(/&[a-z]+;/gi, " ");

const collapseWhitespace = value => String(value || "").replace(/\s+/g, " ").trim();

const normalizeMetaText = value => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return "";
  const text = collapseWhitespace(stripHtml(String(value)));
  if (!text || text === "[object Object]") return "";
  return text;
};

const truncateMetaText = (value, limit = 170) => {
  const text = collapseWhitespace(value);
  const max = Number(limit);
  if (!Number.isFinite(max) || max <= 0 || text.length <= max) return text;
  const slice = text.slice(0, max + 1);
  const breakAt = slice.lastIndexOf(" ");
  const truncated = breakAt > Math.floor(max * 0.6) ? slice.slice(0, breakAt) : slice.slice(0, max);
  return `${truncated.trim()}...`;
};

const deriveMetaDescription = (content, limit = 170) => {
  const source = String(content || "");
  const paragraphs = source.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
  for (const paragraph of paragraphs) {
    const candidate = normalizeMetaText(paragraph);
    if (candidate) return truncateMetaText(candidate, limit);
  }
  const fallback = normalizeMetaText(source);
  return fallback ? truncateMetaText(fallback, limit) : "";
};

const normalizeSiteMediaUrl = value => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(
    /^https?:\/\/(?:www\.)?generation-ai-stn\.fi\/wp-content\//i,
    "/media/wp-content/"
  );
};

const resolveSiteMediaUrl = value => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = normalizeSiteMediaUrl(raw);
  if (!normalized.startsWith("/media/")) return normalized;
  const relativePath = normalized.replace(/^\//, "");
  return existsSync(path.join(process.cwd(), relativePath)) ? normalized : "";
};

const initials = value =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "into", "your", "their", "have", "will", "about",
  "että", "joka", "johon", "tämä", "nämä", "sitä", "sekä", "myös", "kanssa", "voidaan", "tehdä", "ovat",
  "och", "det", "som", "den", "att", "för", "med", "har", "kan", "från", "till", "också", "vara"
]);

const tokenize = (value, limit = 60) => {
  const tokens = stripHtml(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9äöå]+/gi, " ")
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
  return Array.from(new Set(tokens)).slice(0, limit);
};

const getArrayValues = value => Array.isArray(value) ? value.filter(Boolean).map(String) : [];

const buildComparableSeed = seed => ({
  lang: seed?.lang,
  sourceType: String(seed?.sourceType || ""),
  title: String(seed?.title || ""),
  excerpt: String(seed?.excerpt || ""),
  tags: getArrayValues(seed?.tags),
  categories: getArrayValues(seed?.categories),
  knowledgeBase: getArrayValues(seed?.knowledgeBase),
  docCategory: getArrayValues(seed?.docCategory),
  tokens: tokenize([
    seed?.title,
    seed?.excerpt,
    getArrayValues(seed?.tags).join(" "),
    getArrayValues(seed?.categories).join(" "),
    getArrayValues(seed?.knowledgeBase).join(" "),
    getArrayValues(seed?.docCategory).join(" "),
    seed?.content
  ].join(" "), 90)
});

const allowedLayouts = new Set([
  "layouts/post.njk",
  "layouts/page.njk",
  "layouts/doc.njk",
  "layouts/publication.njk"
]);

const intersectionSize = (a, b) => {
  const bSet = new Set(b);
  return a.reduce((count, item) => count + (bSet.has(item) ? 1 : 0), 0);
};

const relatedCandidateCache = new Map();

const getComparableForItem = item => {
  const cacheKey = `${item?.url || ""}::${item?.data?.updated || item?.data?.date || ""}`;
  if (relatedCandidateCache.has(cacheKey)) return relatedCandidateCache.get(cacheKey);
  const comparable = buildComparableSeed({
    lang: item?.data?.lang,
    sourceType: item?.data?.sourceType,
    title: item?.data?.title,
    excerpt: item?.data?.excerpt,
    tags: item?.data?.tags,
    categories: item?.data?.categories,
    knowledgeBase: item?.data?.["knowledge-base"],
    docCategory: item?.data?.["doc-category"],
    content: item?.templateContent || ""
  });
  relatedCandidateCache.set(cacheKey, comparable);
  return comparable;
};

module.exports = function registerFilters(eleventyConfig) {
  eleventyConfig.addFilter("publicationsForPerson", (items, personName) => {
    const target = normalizePersonName(personName);
    return (items || []).filter(item => normalizePersonName(item.lookupName || item.personName) === target);
  });

  eleventyConfig.addFilter("localizedItems", (items, lang, url) => {
    const locale = resolveLocale(lang, url);
    const list = Array.isArray(items) ? items : [];
    return list.filter(item => resolveLocale(item?.data?.lang, item?.url) === locale);
  });

  eleventyConfig.addFilter("limitItems", (items, count) => {
    const list = Array.isArray(items) ? items : [];
    const limit = Number(count);
    if (!Number.isFinite(limit) || limit <= 0) return list;
    return list.slice(0, limit);
  });

  eleventyConfig.addFilter("mergeConferencesAndPubs", (collectionItems, pubItems, limit) => {
    const confCards = (Array.isArray(collectionItems) ? collectionItems : []).map(item => {
      const rawDate = item?.date instanceof Date ? item.date : new Date(item?.date);
      const timestamp = Number.isNaN(rawDate.getTime()) ? 0 : rawDate.getTime();
      return { cardType: "conference", item, timestamp };
    });
    const pubCards = (Array.isArray(pubItems) ? pubItems : []).map(pub => {
      const year = Number(pub?.year || 0);
      const timestamp = year ? new Date(year, 11, 31).getTime() : 0;
      return { cardType: "publication", item: pub, timestamp };
    });
    const merged = [...confCards, ...pubCards].sort((a, b) => b.timestamp - a.timestamp);
    const n = Number(limit);
    return Number.isFinite(n) && n > 0 ? merged.slice(0, n) : merged;
  });

  eleventyConfig.addFilter("mergeChronologicalCards", (posts, stakeholderRows) => {
    const postCards = (Array.isArray(posts) ? posts : []).map(post => {
      const rawDate = post?.date instanceof Date ? post.date : new Date(post?.date);
      const timestamp = Number.isNaN(rawDate.getTime()) ? Number.NEGATIVE_INFINITY : rawDate.getTime();
      return { cardType: "post", post, sortTimestamp: timestamp, sortLabel: String(post?.data?.title || "") };
    });
    const stakeholderCards = (Array.isArray(stakeholderRows) ? stakeholderRows : []).map(row => {
      const isoDate = String(row?.sortDate || "").trim();
      const timestamp = isoDate ? Date.parse(`${isoDate}T00:00:00Z`) : Number.NEGATIVE_INFINITY;
      return {
        cardType: "stakeholder", row,
        sortTimestamp: Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp,
        sortLabel: String(row?.title || row?.stakeholder || "")
      };
    });
    return [...postCards, ...stakeholderCards].sort((a, b) => {
      if (a.sortTimestamp !== b.sortTimestamp) return b.sortTimestamp - a.sortTimestamp;
      return a.sortLabel.localeCompare(b.sortLabel, "fi");
    });
  });

  eleventyConfig.addFilter("date", formatDate);
  eleventyConfig.addFilter("isHttpUrl", value => /^https?:\/\//i.test(String(value || "").trim()));
  eleventyConfig.addFilter("jsonLd", value => JSON.stringify(value, null, 2));
  eleventyConfig.addFilter("urlencode", value => encodeURIComponent(String(value || "")));
  eleventyConfig.addFilter("normalizeSiteMediaUrl", normalizeSiteMediaUrl);
  eleventyConfig.addFilter("resolveSiteMediaUrl", resolveSiteMediaUrl);
  eleventyConfig.addFilter("initials", initials);

  eleventyConfig.addFilter("metaDescription", (candidates, content, limit) => {
    const list = Array.isArray(candidates) ? candidates : [candidates];
    for (const candidate of list) {
      const normalized = normalizeMetaText(candidate);
      if (normalized) return truncateMetaText(normalized, limit);
    }
    return deriveMetaDescription(content, limit);
  });

  eleventyConfig.addFilter("relatedPosts", (collection, currentUrl, currentTags, limit) => {
    limit = limit || 3;
    if (!currentTags || !currentTags.length) return [];
    const currentTagsLower = currentTags.map(t => String(t).toLowerCase());
    return (collection || [])
      .filter(p => p.url !== currentUrl &&
        (p.data.tags || []).some(t => currentTagsLower.includes(String(t).toLowerCase())))
      .sort((a, b) => {
        const score = p => (p.data.tags || []).filter(t => currentTagsLower.includes(String(t).toLowerCase())).length;
        return score(b) - score(a);
      })
      .slice(0, limit);
  });

  eleventyConfig.addFilter("relatedContent", (collection, currentUrl, seed, limit) => {
    const maxItems = Number(limit) > 0 ? Number(limit) : 3;
    const comparableSeed = buildComparableSeed(seed || {});
    const locale = resolveLocale(comparableSeed.lang, currentUrl);

    const scored = (collection || [])
      .filter(item => {
        if (!item || item.url === currentUrl || !item.data) return false;
        if (!allowedLayouts.has(String(item.data.layout || ""))) return false;
        if (item.data.eleventyExcludeFromCollections || item.data.noindex) return false;
        if (resolveLocale(item.data.lang, item.url) !== locale) return false;
        return true;
      })
      .map(item => {
        const candidateSeed = getComparableForItem(item);
        const sharedTags = intersectionSize(comparableSeed.tags.map(t => t.toLowerCase()), candidateSeed.tags.map(t => t.toLowerCase()));
        const sharedCategories = intersectionSize(comparableSeed.categories.map(t => t.toLowerCase()), candidateSeed.categories.map(t => t.toLowerCase()));
        const sharedKnowledgeBase = intersectionSize(comparableSeed.knowledgeBase.map(t => t.toLowerCase()), candidateSeed.knowledgeBase.map(t => t.toLowerCase()));
        const sharedDocCategory = intersectionSize(comparableSeed.docCategory.map(t => t.toLowerCase()), candidateSeed.docCategory.map(t => t.toLowerCase()));
        const sharedTokens = intersectionSize(comparableSeed.tokens, candidateSeed.tokens);

        let score = 0;
        score += sharedTags * 8;
        score += sharedCategories * 6;
        score += sharedKnowledgeBase * 10;
        score += sharedDocCategory * 7;
        score += Math.min(sharedTokens, 12);
        if (candidateSeed.sourceType && candidateSeed.sourceType === comparableSeed.sourceType) score += 2;

        const rawDate = item?.date instanceof Date ? item.date : new Date(item?.date || item?.data?.date || 0);
        const timestamp = Number.isNaN(rawDate.getTime()) ? 0 : rawDate.getTime();
        return { item, score, timestamp };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score !== a.score ? b.score - a.score : b.timestamp - a.timestamp)
      .slice(0, maxItems)
      .map(entry => entry.item);

    if (scored.length) return scored;

    return (collection || [])
      .filter(item => {
        if (!item || item.url === currentUrl || !item.data) return false;
        if (!allowedLayouts.has(String(item.data.layout || ""))) return false;
        if (item.data.eleventyExcludeFromCollections || item.data.noindex) return false;
        return resolveLocale(item.data.lang, item.url) === locale;
      })
      .sort((a, b) => {
        const aDate = a?.date instanceof Date ? a.date.getTime() : new Date(a?.date || a?.data?.date || 0).getTime();
        const bDate = b?.date instanceof Date ? b.date.getTime() : new Date(b?.date || b?.data?.date || 0).getTime();
        return (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate);
      })
      .slice(0, maxItems);
  });

  eleventyConfig.addFilter("rssDate", value => {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
  });

  eleventyConfig.addShortcode("inlineCss", (filePath) => {
    try {
      return readFileSync(path.join(process.cwd(), filePath), "utf8");
    } catch {
      return "";
    }
  });
};
