const { existsSync } = require("node:fs");
const path = require("node:path");
const Image = require("@11ty/eleventy-img");
const pluginNavigation = require("@11ty/eleventy-navigation");
const pluginPublicationToc = require("./_plugins/publication-toc.js");

module.exports = function(eleventyConfig) {
  const pad = value => String(value).padStart(2, "0");
  const formatDate = (value, format = "d.m.Y") => {
    if (value === null || value === undefined || value === "") return "";

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

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
      .replace(/[\u0300-\u036f]/g, "")
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
  const STOP_WORDS = new Set([
    "the", "and", "for", "with", "this", "that", "from", "into", "your", "their", "have", "will", "about",
    "että", "joka", "johon", "tämä", "nämä", "sitä", "sekä", "myös", "kanssa", "voidaan", "tehdä", "ovat",
    "och", "det", "som", "den", "att", "för", "med", "har", "kan", "från", "till", "också", "vara"
  ]);
  const tokenize = (value, limit = 60) => {
    const tokens = stripHtml(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\u00e4\u00f6\u00e5]+/gi, " ")
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
    if (relatedCandidateCache.has(cacheKey)) {
      return relatedCandidateCache.get(cacheKey);
    }

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

  eleventyConfig.setWatchThrottleWaitTime(200);
  // Allow .well-known directory (dot-prefixed dirs are ignored by default)
  eleventyConfig.watchIgnores.delete("**/.well-known/**");

  if (existsSync("media")) eleventyConfig.addPassthroughCopy({ "media": "media" });
  if (existsSync("styles")) eleventyConfig.addPassthroughCopy({ "styles": "styles" });
  if (existsSync("assets")) eleventyConfig.addPassthroughCopy({ "assets": "assets" });
  if (existsSync("scripts")) eleventyConfig.addPassthroughCopy({ "scripts": "scripts" });
  eleventyConfig.addPassthroughCopy({ "node_modules/vanilla-cookieconsent/dist/cookieconsent.css": "styles/cookieconsent.css" });
  eleventyConfig.addPassthroughCopy({ "node_modules/vanilla-cookieconsent/dist/cookieconsent.umd.js": "scripts/cookieconsent.umd.js" });
  eleventyConfig.addPassthroughCopy({ "node_modules/gridjs/dist/gridjs.umd.js": "scripts/gridjs.umd.js" });
  eleventyConfig.addPassthroughCopy({ "node_modules/gridjs/dist/theme/mermaid.min.css": "styles/gridjs-mermaid.css" });
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(pluginPublicationToc);

  async function renderHeroImage(src) {
    if (!src) {
      return "";
    }

    const originalSrc = String(src);
    const isRemote = /^https?:\/\//i.test(String(src));
    const input = isRemote
      ? originalSrc
      : path.join(process.cwd(), originalSrc.replace(/^\//, ""));

    const metadata = await Image(input, {
      widths: [768, 1280, 1920],
      formats: ["webp", "jpeg"],
      outputDir: path.join(process.cwd(), "_site", "img", "hero"),
      urlPath: "/img/hero/",
      sharpOptions: {
        jpeg: { quality: 82, mozjpeg: true },
        webp: { quality: 78 },
      },
      filenameFormat: function(id, src, width, format) {
        const name = path.basename(src, path.extname(src)).toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return `${name}-${width}w.${format}`;
      },
    });

    if (!metadata || typeof metadata !== "object" || !Object.keys(metadata).length) {
      return `<img class="hero-bg-image" src="${originalSrc}" alt="" decoding="async" fetchpriority="high">`;
    }

    return Image.generateHTML(metadata, {
      alt: "",
      src: originalSrc,
      sizes: "100vw",
      loading: "eager",
      decoding: "async",
      fetchpriority: "high",
      class: "hero-bg-image",
    });
  }

  eleventyConfig.addNunjucksAsyncShortcode("heroImage", renderHeroImage);

  const byDate = (a, b) => b.date - a.date;

  eleventyConfig.addCollection("posts", col =>
    col.getAll().filter(p => p.data.sourceType === "posts").sort(byDate)
  );
  eleventyConfig.addCollection("ajankohtaista", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && (p.data.categories || []).includes("Ajankohtaista")).sort(byDate)
  );
  eleventyConfig.addCollection("media", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && (p.data.categories || []).some(c => [
      // fi
      "GenAI hankkeen henkilöstö mediassa", "Media", "Haastattelu",
      // en
      "GenAI project staff in the media", "GenAI Project Staff in Media", "GenAI project staff in media",
      "GenAI Project Staff in the Media", "Interview", "interview",
      // sv
      "GenAI-projektets personal i media", "GenAI-projektets medarbetare i media", "Intervju"
    ].includes(c))).sort(byDate)
  );
  eleventyConfig.addCollection("tapahtumat", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && (p.data.categories || []).some(c => [
      // fi
      "GenAI hankkeen henkilöstö tapahtumissa", "Konferenssit ja seminaarit", "Webinaari", "Työpaja",
      // en
      "GenAI project staff at events", "GenAI Project Staff at Events", "GenAI project staff events",
      "Conferences and seminars", "Conferences and Seminars", "Webinar", "Workshop",
      // sv
      "GenAI-projektets personal vid evenemang", "GenAI-projektets personal på evenemang",
      "GenAI-projektpersonalens evenemang", "Konferenser och seminarier", "Webbinarium"
    ].includes(c))).sort(byDate)
  );
  eleventyConfig.addCollection("hankkeen-toiminta", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && (p.data.categories || []).some(c => [
      // fi
      "Hankkeen toiminta",
      // en
      "Project activities", "Project Activities",
      // sv
      "Projektaktiviteter", "Projektverksamhet"
    ].includes(c))).sort(byDate)
  );
  eleventyConfig.addCollection("tutkimus", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && (p.data.categories || []).some(c => [
      // fi
      "Tutkimus",
      // en
      "Research",
      // sv
      "Forskning"
    ].includes(c))).sort(byDate)
  );

  eleventyConfig.addCollection("docs", col =>
    col.getAll().filter(p => p.data.sourceType === "docs").sort((a, b) => (a.data.menuOrder || 0) - (b.data.menuOrder || 0))
  );
  eleventyConfig.addCollection("docs_by_kb", col => {
    const items = col.getAll().filter(p => p.data.sourceType === "docs");
    const grouped = {};
    for (const item of items) {
      const kb = (item.data["knowledge-base"] || ["uncategorized"])[0];
      (grouped[kb] = grouped[kb] || []).push(item);
    }
    return grouped;
  });

  eleventyConfig.addCollection("posts_sv", col =>
    col.getAll().filter(p => p.data.lang === "sv" && p.data.sourceType === "posts").sort(byDate)
  );
  eleventyConfig.addCollection("pages_sv", col =>
    col.getAll().filter(p => p.data.lang === "sv" && p.data.sourceType === "pages").sort(byDate)
  );
  eleventyConfig.addCollection("posts_en", col =>
    col.getAll().filter(p => p.data.lang === "en" && p.data.sourceType === "posts").sort(byDate)
  );
  eleventyConfig.addCollection("pages_en", col =>
    col.getAll().filter(p => p.data.lang === "en" && p.data.sourceType === "pages").sort(byDate)
  );
  eleventyConfig.addCollection("posts_fi", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && p.data.lang !== "en" && p.data.lang !== "sv").sort(byDate)
  );

  eleventyConfig.addFilter("publicationsForPerson", (items, personName) => {
    const target = normalizePersonName(personName);
    return (items || []).filter(item => {
      return normalizePersonName(item.lookupName || item.personName) === target;
    });
  });
  eleventyConfig.addFilter("localizedItems", (items, lang, url) => {
    const locale = resolveLocale(lang, url);
    const list = Array.isArray(items) ? items : [];
    const localized = list.filter(item => {
      return resolveLocale(item?.data?.lang, item?.url) === locale;
    });
    return localized.length ? localized : list;
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
      return {
        cardType: "post",
        post,
        sortTimestamp: timestamp,
        sortLabel: String(post?.data?.title || "")
      };
    });

    const stakeholderCards = (Array.isArray(stakeholderRows) ? stakeholderRows : []).map(row => {
      const isoDate = String(row?.sortDate || "").trim();
      const timestamp = isoDate ? Date.parse(`${isoDate}T00:00:00Z`) : Number.NEGATIVE_INFINITY;
      return {
        cardType: "stakeholder",
        row,
        sortTimestamp: Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp,
        sortLabel: String(row?.title || row?.stakeholder || "")
      };
    });

    return [...postCards, ...stakeholderCards].sort((a, b) => {
      if (a.sortTimestamp !== b.sortTimestamp) {
        return b.sortTimestamp - a.sortTimestamp;
      }
      return a.sortLabel.localeCompare(b.sortLabel, "fi");
    });
  });
  eleventyConfig.addFilter("date", formatDate);
  eleventyConfig.addFilter("isHttpUrl", value => /^https?:\/\//i.test(String(value || "").trim()));
  eleventyConfig.addFilter("urlencode", value => encodeURIComponent(String(value || "")));
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
        if (candidateSeed.sourceType && candidateSeed.sourceType === comparableSeed.sourceType) {
          score += 2;
        }

        const rawDate = item?.date instanceof Date ? item.date : new Date(item?.date || item?.data?.date || 0);
        const timestamp = Number.isNaN(rawDate.getTime()) ? 0 : rawDate.getTime();

        return { item, score, timestamp };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.timestamp - a.timestamp;
      })
      .slice(0, maxItems)
      .map(entry => entry.item);

    if (scored.length) {
      return scored;
    }

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

  // Prefix all root-relative paths in output HTML for GitHub Pages project site.
  // Remove this transform when switching to a custom domain served from /.
  const REPO_PREFIX = "";
  eleventyConfig.addTransform("repoPathPrefix", function(content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    return content
      .replace(/(href=")\/(?!\/)/g,    `$1${REPO_PREFIX}/`)
      .replace(/(src=")\/(?!\/)/g,     `$1${REPO_PREFIX}/`)
      .replace(/(action=")\/(?!\/)/g,  `$1${REPO_PREFIX}/`)
      .replace(/(content=")\/(?!\/)/g, `$1${REPO_PREFIX}/`)
      .replace(/(url=)\/(?!\/)/g,      `$1${REPO_PREFIX}/`);
  });

  return {
    dir: { input: "content", includes: "../_includes", data: "../_data", output: "_site" },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
