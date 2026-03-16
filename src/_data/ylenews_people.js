const { loadConfiguredPeople, searchYleNewsForPeople } = require("./ylenews");

module.exports = async function yleNewsPeopleDataSource() {
  const people = loadConfiguredPeople();
  if (!people.length) return [];

  return searchYleNewsForPeople(people, {
    type: "article",
    language: "fi",
    uiLanguage: "fi",
    limit: 10,
    maxPages: 1
  });
};
