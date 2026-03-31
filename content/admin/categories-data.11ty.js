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
        title: p.data.title || "",
        mainCategory: p.data.mainCategory || null,
        subCategories: p.data.subCategories || [],
        extraCategories: p.data.extraCategories || [],
        tags: p.data.tags || []
      }));
    return JSON.stringify(posts, null, 2);
  }
};
