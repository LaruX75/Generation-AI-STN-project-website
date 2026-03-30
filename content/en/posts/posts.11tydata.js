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
    }
  }
};
