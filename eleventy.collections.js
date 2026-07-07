const byDate = (a, b) => b.date - a.date;

module.exports = function registerCollections(eleventyConfig) {
  eleventyConfig.addCollection("posts", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && !p.data.hidden).sort(byDate)
  );

  eleventyConfig.addCollection("ajankohtaista", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && !p.data.hidden && (p.data.categories || []).includes("Ajankohtaista")).sort(byDate)
  );

  eleventyConfig.addCollection("media", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && !p.data.hidden && (p.data.categories || []).some(c => [
      "Mediassa", "Media",
      "In the media", "GenAI project staff in the media",
      "I media", "GenAI-projektets medarbetare i media"
    ].includes(c))).sort(byDate)
  );

  eleventyConfig.addCollection("tapahtumat", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && !p.data.hidden && (p.data.categories || []).some(c => [
      "Tapahtumat", "Toiminta",
      "Events", "Project activities",
      "Evenemang", "Projektaktiviteter"
    ].includes(c))).sort(byDate)
  );

  eleventyConfig.addCollection("hankkeen-toiminta", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && !p.data.hidden && (p.data.categories || []).some(c => [
      "Toiminta",
      "Project activities",
      "Projektaktiviteter"
    ].includes(c))).sort(byDate)
  );

  eleventyConfig.addCollection("tutkimus", col =>
    col.getAll().filter(p => p.data.sourceType === "posts" && !p.data.hidden && (p.data.categories || []).some(c => [
      "Tutkimus",
      "Research",
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

  eleventyConfig.addCollection("myytit", col =>
    col.getAll()
      .filter(p => p.data.sourceType === "myytit")
      .sort((a, b) => (a.data.numero || 0) - (b.data.numero || 0))
  );
};
