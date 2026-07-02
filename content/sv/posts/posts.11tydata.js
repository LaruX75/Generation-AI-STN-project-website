module.exports = {
  eleventyComputed: {
    categories: data => {
      if (data.mainCategory !== undefined || data.subCategories !== undefined || data.extraCategories !== undefined) {
        const result = [];
        if (data.mainCategory) result.push(data.mainCategory);
        for (const sub of (data.subCategories || [])) result.push(sub);
        for (const extra of (data.extraCategories || [])) result.push(extra);
        return result;
      }
      return data.categories || [];
    },
    permalink: data => {
      if (data.permalink) return data.permalink;
      const slug = (data.page.fileSlug || "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
      return slug ? `/sv/nyheter-fran/${slug}/` : undefined;
    }
  }
};
