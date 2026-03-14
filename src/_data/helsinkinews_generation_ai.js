const { discoverArticlesByQuery } = require("./helsinkinews");

module.exports = async function helsinkiNewsGenerationAiDataSource() {
  return discoverArticlesByQuery('"Generation AI"', {
    languages: ["fi"],
    categories: ["Uutiset", "News"],
    matchTerms: ["Generation AI"],
    perPage: 20,
    maxPages: 2
  });
};
