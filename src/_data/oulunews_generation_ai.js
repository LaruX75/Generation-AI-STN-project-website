const { discoverPagesByQuery } = require("./oulunews");

module.exports = async function ouluNewsGenerationAiDataSource() {
  return discoverPagesByQuery('"Generation AI"', {
    languages: ["fi"],
    preferredLanguages: ["fi", "en"],
    contentTypes: ["uutinen", "news", "tapahtuma", "event"],
    matchTerms: ["Generation AI"],
    maxPages: 1
  });
};
