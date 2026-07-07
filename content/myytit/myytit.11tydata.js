module.exports = {
  layout: "layouts/myytti.njk",
  sourceType: "myytit",
  lang: "fi",
  draft: true,
  eleventyComputed: {
    title: data => data.otsikko,
    seoTitle: data =>
      data.kysymys
        ? `${data.kysymys} – 50 myyttiä tekoälystä`
        : `${data.otsikko} – 50 myyttiä tekoälystä`,
    permalink: data => (data.draft ? false : `/myytit/${data.page.fileSlug}/`),
    eleventyExcludeFromCollections: data => Boolean(data.draft)
  }
};
