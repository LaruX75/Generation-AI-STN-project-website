const { searchHsNews } = require("./hsnews");

module.exports = async function hsGenerationAiDataSource() {
  const result = await searchHsNews("tekoäly", {
    limit: 20,
    matchTerms: ["tekoäly", "tekoaly", "generation ai", "artificial intelligence"]
  });

  return result.items;
};
