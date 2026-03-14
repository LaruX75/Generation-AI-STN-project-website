const { searchUefContent } = require("./uefnews");

module.exports = async function uefGenerationAiDataSource() {
  return searchUefContent('"Generation AI"', {
    languages: ["fi", "en"],
    preferredLanguages: ["fi", "en"],
    contentTypes: [
      "Uutiset ja tapahtumat",
      "News and events",
      "Tutkimusryhmät ja projektit",
      "Research groups and projects",
      "Ihmiset",
      "People"
    ],
    matchTerms: ["Generation AI"],
    perPage: 20,
    maxPages: 2
  });
};
