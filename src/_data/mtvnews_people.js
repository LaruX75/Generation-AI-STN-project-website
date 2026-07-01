const { loadConfiguredPeople, searchMtvNewsForPeople } = require("./mtvnews");

module.exports = async function mtvNewsPeopleDataSource() {
  const people = loadConfiguredPeople();
  if (!people.length) return [];

  try {
    return await searchMtvNewsForPeople(people, { limit: 10 });
  } catch (e) {
    console.warn(`[mtvnews_people] MTV-uutishaku epäonnistui: ${e.message}`);
    return [];
  }
};
