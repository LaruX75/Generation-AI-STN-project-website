const fs = require("fs");

function makeExcerpt(inputPath) {
  try {
    const raw = fs.readFileSync(inputPath, "utf8");
    const body = raw.replace(/^---[\s\S]*?---\s*/, "");
    const text = body
      .replace(/\{[%{][\s\S]*?[%}]\}/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/#{1,6}\s/g, "")
      .replace(/[*_`\[\]()#>|]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const sentences = text.match(/[^.!?]{5,}[.!?]+/g) || [];
    return sentences.slice(0, 3).join(" ").trim() || text.slice(0, 250);
  } catch {
    return "";
  }
}

module.exports = class CategoriesData {
  data() {
    return {
      permalink: "/admin/categories-data.json",
      eleventyExcludeFromCollections: true,
      layout: false
    };
  }

  render({ collections }) {
    const posts = (collections.all || [])
      .filter(p => p.inputPath && p.inputPath.includes("content/posts"))
      .map(p => ({
        path: p.inputPath.replace(/^\.\//, ""),
        url: p.url || "",
        title: p.data.title || "",
        date: p.data.date ? String(p.data.date).slice(0, 10) : "",
        mainCategory: p.data.mainCategory || null,
        subCategories: p.data.subCategories || [],
        extraCategories: p.data.extraCategories || [],
        tags: p.data.tags || [],
        excerpt: makeExcerpt(p.inputPath)
      }));
    return JSON.stringify(posts, null, 2);
  }
};
