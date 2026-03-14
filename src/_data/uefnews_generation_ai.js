const { discoverPagesByQuery } = require("./uefnews");

module.exports = async function uefNewsGenerationAiDataSource() {
  return discoverPagesByQuery('"Generation AI"', {
    languages: ["fi", "en"],
    preferredLanguages: ["fi", "en"],
    contentTypes: ["Uutiset ja tapahtumat", "News and events"],
    matchTerms: ["Generation AI"],
    perPage: 20,
    maxPages: 2
  });
};
