const { searchYleNews } = require("./ylenews");

module.exports = async function yleNewsGenerationAiDataSource() {
  const result = await searchYleNews("tekoäly", {
    personName: "tekoäly",
    type: "article",
    language: "fi",
    uiLanguage: "fi",
    limit: 20,
    maxPages: 2,
    matchTerms: ["tekoäly", "tekoaly", "artificial intelligence", "AI"]
  });

  return result.items;
};
