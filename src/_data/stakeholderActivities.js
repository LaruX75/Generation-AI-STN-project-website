const records = require("./stakeholderActivities.data.json");

function pad(value) {
  return String(value).padStart(2, "0");
}

function parseDateParts(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const range = text.match(/^(\d{1,2})(?:\.-?|-) *(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (range) {
    const [, day, , month, year] = range;
    return { day, month, year };
  }

  const dotted = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotted) {
    const [, day, month, year] = dotted;
    return { day, month, year };
  }

  const compact = text.match(/^(\d{1,2})\.(\d{1,2})(20\d{2})$/);
  if (compact) {
    const [, day, month, year] = compact;
    return { day, month, year };
  }

  return null;
}

function parseSortableDate(value) {
  const parsed = parseDateParts(value);
  if (parsed) {
    return `${parsed.year}-${pad(parsed.month)}-${pad(parsed.day)}`;
  }

  const text = String(value || "").trim();
  const yearOnly = text.match(/(20\d{2})/);
  return yearOnly ? `${yearOnly[1]}-01-01` : "";
}

function parseDisplayDate(value) {
  const parsed = parseDateParts(value);
  if (parsed) {
    return `${pad(parsed.day)}.${pad(parsed.month)}.${parsed.year}`;
  }

  return String(value || "").trim();
}

function classifyActivity(stakeholder, title) {
  const haystack = `${stakeholder} ${title}`.toLowerCase();
  const researchKeywords = [
    "conference",
    "konferenssi",
    "symposium",
    "poster",
    "keynote",
    "research workshop",
    "work-in-progress",
    "doctoral seminar",
    "public lecture",
    "interdisciplinary legal studies",
    "critical legal conference",
    "iticse",
    "wipsce",
    "eapril",
    "icsle",
    "icasse",
    "eden 2024 research workshop",
    "raspberry pi computing education research seminars",
    "computational thinking",
    "kc 2023",
    "mydata conference",
    "upcerg",
    "mit media lab",
    "devtech lab",
    "lunds university",
    "ubc",
    "vrije universiteit",
    "createai",
    "cambridge",
    "national academy of science",
    "academy of science",
    "koli calling",
    "journal release",
    "research seminar",
    "robertson lecture",
    "creating knowledge",
    "network seminar keynote",
    "workshop on ct and ai",
    "faculty, lund university"
  ];

  return researchKeywords.some(keyword => haystack.includes(keyword)) ? "research" : "project";
}

module.exports = function stakeholderActivitiesData() {
  const items = records.map(({ stakeholder, title, participants, date, consortium }) => {
    const category = classifyActivity(stakeholder, title);
    return {
      stakeholder,
      title,
      participants,
      date,
      displayDate: parseDisplayDate(date),
      consortium,
      category,
      sortDate: parseSortableDate(date)
    };
  });

  const projectItems = items
    .filter(item => item.category === "project")
    .sort((a, b) => String(b.sortDate).localeCompare(String(a.sortDate)));
  const researchItems = items
    .filter(item => item.category === "research")
    .sort((a, b) => String(b.sortDate).localeCompare(String(a.sortDate)));

  return {
    items,
    projectItems,
    researchItems
  };
};
