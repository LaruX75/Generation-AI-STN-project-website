const records = require("./stakeholderActivities.data.json");

// Vocabulary-based Finnish diacritic restoration.
// The source JSON (STN registry) uses ASCII-only encoding: ä→a, ö→o.
// We restore the most common domain-specific words here at transform time.
// Patterns are matched case-insensitively; leading capital is preserved.
// Ambiguous cases left unrestored: vaarien (vaara=danger vs väärä=wrong),
//   niissa/niita/silla/tassa (pronoun suffixes with broad false-positive risk).
const DIACRITIC_MAP = [
  // Longer patterns first to prevent a shorter substring from firing first
  ["taydennyskoulutus", "täydennyskoulutus"],
  // Core domain vocabulary
  ["tekoaly",   "tekoäly"],
  ["ihmisaly",  "ihmisäly"],
  ["tukialy",   "tukiäly"],
  ["ymparisto", "ympäristö"],
  ["ymmarrys",  "ymmärrys"],
  ["nakokulma", "näkökulma"],
  ["kasittely", "käsittely"],
  ["kasityo",   "käsityö"],
  ["kasitys",   "käsitys"],
  ["kehittam",  "kehittäm"],
  ["tyopaja",   "työpaja"],
  ["tyoelama",  "työelämä"],
  ["tyokaver",  "työkaver"],
  ["tyokalu",   "työkalu"],
  ["tyovaen",   "työväen"],
  ["lahtoinen", "lähtöinen"],
  ["lahteena",  "lähteenä"],
  ["ryhma",     "ryhmä"],
  ["alykast",   "älykäst"],
  ["pyorea",    "pyöreä"],
  ["poyta",     "pöytä"],
  ["vaarien",   "väärien"],
  ["eivat",     "eivät"],
  ["nakyy",     "näkyy"],
  ["nakyva",    "näkyvä"],
  ["tehda",     "tehdä"],
  ["kayt",      "käyt"],
  ["paiva",     "päivä"],
  ["mita",      "mitä"],
  ["tyon",      "työn"],
  // Geographic prefixes (case-insensitive; leading capital preserved by replacer)
  ["ita-",      "itä-"],
  ["etela-",    "etelä-"],
];

function restoreDiacritics(text) {
  if (!text) return text;
  let s = text;
  for (const [pattern, replacement] of DIACRITIC_MAP) {
    const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    s = s.replace(re, match => {
      const startsUpper = match.length > 0 && match[0] >= "A" && match[0] <= "Z";
      return startsUpper ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
    });
  }
  return s;
}

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
      stakeholder: restoreDiacritics(stakeholder),
      title:       restoreDiacritics(title),
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
