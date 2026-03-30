const records = require("./scientificPublications.data.json");

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function ensureSentence(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return "";
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function buildLink(record) {
  if (record.url) return record.url;
  if (record.doi) return `https://doi.org/${record.doi}`;
  return "";
}

function buildLinkLabel(record) {
  if (record.doi) return "DOI";
  if (record.isbn) return "ISBN";
  if (/learntechlib\.org/i.test(record.url || "")) return "LearnTechLib";
  if (/helda\.helsinki\.fi/i.test(record.url || "")) return "Helda";
  if (/faktabaari\.fi/i.test(record.url || "")) return "Faktabaari";
  if (record.url) return "Lähde";
  return "";
}

function buildYearLabel(record) {
  if (record.year) return String(record.year);
  if (record.status === "Submitted") return "submitted";
  if (record.status === "In press") return "in press";
  return "";
}

function buildCitation(record) {
  const segments = [];
  const authors = normalizeWhitespace(record.authorsText);
  const yearLabel = buildYearLabel(record);

  if (authors && yearLabel) {
    segments.push(`${authors} (${yearLabel}).`);
  } else if (authors) {
    segments.push(ensureSentence(authors));
  }

  if (record.title) {
    segments.push(ensureSentence(record.title));
  }

  if (record.venue) {
    segments.push(ensureSentence(record.venue));
  }

  if (record.notes) {
    segments.push(ensureSentence(record.notes));
  }

  return normalizeWhitespace(segments.join(" "));
}

function buildSearchText(record) {
  return normalizeWhitespace([
    record.code,
    record.authorsText,
    record.title,
    record.venue,
    record.notes,
    record.doi,
    record.url
  ].join(" "));
}

function sortItems(items) {
  return [...items].sort((left, right) => {
    const leftKey = normalizeWhitespace(`${left.authorsText} ${left.title}`).toLowerCase();
    const rightKey = normalizeWhitespace(`${right.authorsText} ${right.title}`).toLowerCase();
    return leftKey.localeCompare(rightKey, "fi");
  });
}

function sortTableItems(items) {
  return [...items].sort((left, right) => {
    const leftYear = Number(left.year || 0);
    const rightYear = Number(right.year || 0);
    if (leftYear !== rightYear) {
      return rightYear - leftYear;
    }

    const statusOrder = { Published: 0, "In press": 1, Submitted: 2 };
    const leftStatus = statusOrder[left.status] ?? 9;
    const rightStatus = statusOrder[right.status] ?? 9;
    if (leftStatus !== rightStatus) {
      return leftStatus - rightStatus;
    }

    const leftKey = normalizeWhitespace(`${left.authorsText} ${left.title}`).toLowerCase();
    const rightKey = normalizeWhitespace(`${right.authorsText} ${right.title}`).toLowerCase();
    return leftKey.localeCompare(rightKey, "fi");
  });
}

module.exports = function scientificPublicationsData() {
  const items = records.map((record, index) => {
    const link = buildLink(record);

    const authorsText = normalizeWhitespace(record.authorsText);
    const authors = authorsText
      ? authorsText.split(/;\s*|\s*&\s*/).map(a => a.trim()).filter(Boolean)
      : [];

    return {
      ...record,
      id: normalizeWhitespace(record.id) || `publication-${index + 1}`,
      code: normalizeWhitespace(record.code),
      authorsText,
      authors,
      title: normalizeWhitespace(record.title),
      venue: normalizeWhitespace(record.venue),
      notes: normalizeWhitespace(record.notes),
      status: normalizeWhitespace(record.status) || "Published",
      link,
      linkLabel: buildLinkLabel(record),
      citation: buildCitation(record),
      searchText: buildSearchText(record)
    };
  });

  const groups = [];
  const published = items.filter(item => item.status === "Published");
  const years = [...new Set(published.map(item => item.year).filter(Boolean))].sort((a, b) => b - a);

  for (const year of years) {
    groups.push({
      id: `year-${year}`,
      label: String(year),
      items: sortItems(published.filter(item => item.year === year))
    });
  }

  const upcoming = items.filter(item => item.status !== "Published");
  if (upcoming.length) {
    groups.push({
      id: "upcoming",
      label: "Submitted / in press",
      items: sortItems(upcoming)
    });
  }

  return {
    items,
    tableItems: sortTableItems(items),
    groups,
    source: "scientificPublications.data.json",
    total: items.length,
    years: [...new Set(items.map(item => item.year).filter(Boolean))].sort((a, b) => b - a)
  };
};
