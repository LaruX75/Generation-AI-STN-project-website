const { searchOuluContent } = require("./oulunews");

module.exports = async function ouluGenerationAiDataSource() {
  return searchOuluContent('"Generation AI"', {
    languages: ["fi"],
    preferredLanguages: ["fi", "en"],
    matchTerms: ["Generation AI"],
    maxPages: 1
  });
};
