const { discoverArticlesByQuery } = require("./helsinkinews");

module.exports = async function helsinkiNewsTeemuRoosDataSource() {
  return discoverArticlesByQuery("Teemu Roos", {
    languages: ["fi", "en"],
    categories: ["Uutiset", "News"],
    matchTerms: ["Teemu Roos"],
    personLinks: ["teemu-roos-9031464"],
    personIds: ["9031464"],
    perPage: 20,
    maxPages: 2
  });
};
