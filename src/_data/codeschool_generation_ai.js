const { searchTaggedContent } = require("./codeschoolnews");

module.exports = async function codeschoolGenerationAiDataSource() {
  return searchTaggedContent("Generation AI", {
    matchTerms: ["Generation AI"]
  });
};
