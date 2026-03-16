const entries = require("./institutionalVisibility.data.json");

function compareByDateDesc(left, right) {
  const leftTime = Date.parse(left.sortDate || left.dateLabel || "") || 0;
  const rightTime = Date.parse(right.sortDate || right.dateLabel || "") || 0;

  if (rightTime !== leftTime) return rightTime - leftTime;
  return String(left.title || "").localeCompare(String(right.title || ""), "fi");
}

function formatTypeLabel(type, lang = "fi") {
  const labels = {
    fi: {
      news: "Uutinen",
      press_release: "Tiedote",
      project_page: "Projektisivu"
    },
    en: {
      news: "News",
      press_release: "Press release",
      project_page: "Project page"
    },
    sv: {
      news: "Nyhet",
      press_release: "Pressmeddelande",
      project_page: "Projektsida"
    }
  };

  return labels[lang]?.[type] || labels.fi[type] || type;
}

module.exports = function institutionalVisibilityData() {
  const items = [...entries]
    .map(item => ({
      ...item,
      people: Array.isArray(item.people) ? item.people : [],
      typeLabelFi: formatTypeLabel(item.type, "fi"),
      typeLabelEn: formatTypeLabel(item.type, "en"),
      typeLabelSv: formatTypeLabel(item.type, "sv")
    }))
    .sort(compareByDateDesc);

  const people = Array.from(new Set(items.flatMap(item => item.people))).sort((a, b) =>
    a.localeCompare(b, "fi")
  );

  return {
    items,
    people
  };
};
