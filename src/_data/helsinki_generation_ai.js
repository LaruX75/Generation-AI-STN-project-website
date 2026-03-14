const { searchCludoContent } = require("./helsinkinews");

module.exports = async function helsinkiGenerationAiDataSource() {
  return searchCludoContent('"Generation AI"', {
    languages: ["fi"],
    categories: ["Uutiset", "News", "Ihmiset", "People", "Sisältösivut", "Content pages"],
    matchTerms: ["Generation AI"],
    perPage: 20,
    maxPages: 2
  });
};
