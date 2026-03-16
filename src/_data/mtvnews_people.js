const { loadConfiguredPeople, searchMtvNewsForPeople } = require("./mtvnews");

module.exports = async function mtvNewsPeopleDataSource() {
  const people = loadConfiguredPeople();
  if (!people.length) return [];

  return searchMtvNewsForPeople(people, {
    limit: 10
  });
};
