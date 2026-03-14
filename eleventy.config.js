const { existsSync } = require("node:fs");

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

  if (existsSync("media")) eleventyConfig.addPassthroughCopy({ "media": "media" });
  if (existsSync("styles")) eleventyConfig.addPassthroughCopy({ "styles": "styles" });
  if (existsSync("assets")) eleventyConfig.addPassthroughCopy({ "assets": "assets" });

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

  eleventyConfig.addCollection("posts_sv", col =>
    col.getAll().filter(p => p.data.lang === "sv" && p.data.sourceType === "posts").sort(byDate)
  );
  eleventyConfig.addCollection("pages_sv", col =>
    col.getAll().filter(p => p.data.lang === "sv" && p.data.sourceType === "pages").sort(byDate)
  );

  eleventyConfig.addFilter("publicationsForPerson", (items, personName) => {
    const target = normalizePersonName(personName);
    return (items || []).filter(item => {
      return normalizePersonName(item.lookupName || item.personName) === target;
    });
  });
  eleventyConfig.addFilter("date", formatDate);
  eleventyConfig.addFilter("isHttpUrl", value => /^https?:\/\//i.test(String(value || "").trim()));

  return {
    dir: { input: "content", includes: "../_includes", data: "../_data", output: "_site" },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
