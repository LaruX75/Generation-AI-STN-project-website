const { existsSync } = require("node:fs");
const pluginNavigation = require("@11ty/eleventy-navigation");

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

  const byDate = (a, b) => b.date - a.date;

  eleventyConfig.addCollection("posts", col =>
    col.getAll().filter(p => p.data.sourceType === "posts").sort(byDate)
  );
  eleventyConfig.addCollection("ajankohtaista", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && (p.data.categories || []).includes("Ajankohtaista")).sort(byDate)
  );
  eleventyConfig.addCollection("media", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && (p.data.categories || []).some(c => ["GenAI hankkeen henkilöstö mediassa", "Media", "Haastattelu"].includes(c))).sort(byDate)
  );
  eleventyConfig.addCollection("tapahtumat", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && (p.data.categories || []).some(c => ["GenAI hankkeen henkilöstö tapahtumissa", "Konferenssit ja seminaarit", "Webinaari", "Työpaja"].includes(c))).sort(byDate)
  );
  eleventyConfig.addCollection("hankkeen-toiminta", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && (p.data.categories || []).includes("Hankkeen toiminta")).sort(byDate)
  );
  eleventyConfig.addCollection("tutkimus", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && (p.data.categories || []).includes("Tutkimus")).sort(byDate)
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
  eleventyConfig.addFilter("date", formatDate);
  eleventyConfig.addFilter("isHttpUrl", value => /^https?:\/\//i.test(String(value || "").trim()));
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
