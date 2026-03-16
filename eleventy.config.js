const { existsSync } = require("node:fs");
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

  if (existsSync("media")) eleventyConfig.addPassthroughCopy({ "media": "media" });
  if (existsSync("styles")) eleventyConfig.addPassthroughCopy({ "styles": "styles" });
  if (existsSync("assets")) eleventyConfig.addPassthroughCopy({ "assets": "assets" });
  if (existsSync("scripts")) eleventyConfig.addPassthroughCopy({ "scripts": "scripts" });
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(pluginPublicationToc);

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
  eleventyConfig.addFilter("rssDate", value => {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
  });

  return {
    dir: { input: "content", includes: "../_includes", data: "../_data", output: "_site" },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
