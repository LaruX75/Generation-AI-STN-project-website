const { searchHeurekaContent } = require("./heurekanews");

module.exports = async function heurekaGenerationAiDataSource() {
  return searchHeurekaContent("tekoaly", {
    languages: ["fi", "en", "sv"],
    matchTerms: [
      "tekoaly",
      "tekoäly",
      "artificial intelligence",
      "generation ai",
      "me myself ai",
      "opetettava kone",
      "somekone"
    ],
    limit: 24
  });
};
