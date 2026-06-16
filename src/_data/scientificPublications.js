const records = require("./scientificPublications.data.json");

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugifySegment(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureSentence(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return "";
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function stripTrailingPunctuation(value) {
  return normalizeWhitespace(value).replace(/[.,;:!?]+$/g, "");
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

function buildBibtexType(record = {}) {
  const code = normalizeWhitespace(record.code).toUpperCase();
  if (code.startsWith("A4") || code.startsWith("POSTER")) return "inproceedings";
  if (code.startsWith("A3")) return "incollection";
  if (code.startsWith("B") || code.startsWith("E")) return "book";
  return "article";
}

function buildBibtexKey(record = {}, authors = []) {
  const firstAuthor = authors[0] || record.authorsText || "publication";
  const authorToken = slugifySegment(firstAuthor.split(",")[0] || firstAuthor) || "publication";
  const yearToken = String(record.year || "nodate");
  const titleToken = slugifySegment(record.title || "").split("-").filter(Boolean).slice(0, 4).join("");
  return `${authorToken}${yearToken}${titleToken || "item"}`;
}

function buildBibtex(record = {}, authors = [], link = "") {
  const type = buildBibtexType(record);
  const fields = [
    ["author", authors.length ? authors.join(" and ") : normalizeWhitespace(record.authorsText)],
    ["title", normalizeWhitespace(record.title)],
    ["year", record.year ? String(record.year) : ""]
  ];
  const venue = normalizeWhitespace(record.venue);
  if (venue) {
    if (type === "inproceedings" || type === "incollection") {
      fields.push(["booktitle", venue]);
    } else if (type === "book") {
      fields.push(["publisher", venue]);
    } else {
      fields.push(["journal", venue]);
    }
  }
  if (normalizeWhitespace(record.doi)) fields.push(["doi", normalizeWhitespace(record.doi)]);
  if (link) fields.push(["url", link]);
  if (normalizeWhitespace(record.notes)) fields.push(["note", normalizeWhitespace(record.notes)]);

  const body = fields
    .filter(([, value]) => value)
    .map(([key, value]) => `  ${key} = {${value}}`)
    .join(",\n");

  return `@${type}{${buildBibtexKey(record, authors)},\n${body}\n}`;
}

function joinCitationParts(parts, separator = " ") {
  return parts.filter(Boolean).map(part => normalizeWhitespace(part)).join(separator).trim();
}

function buildApaCitation(record = {}, link = "") {
  const authors = stripTrailingPunctuation(record.authorsText);
  const year = record.year ? `(${record.year}).` : "";
  const title = ensureSentence(record.title);
  const venue = ensureSentence(record.venue);
  const notes = ensureSentence(record.notes);
  return joinCitationParts([authors, year, title, venue, notes, link]);
}

function buildMlaCitation(record = {}, link = "") {
  const authors = stripTrailingPunctuation(record.authorsText);
  const title = record.title ? `"${stripTrailingPunctuation(record.title)}."` : "";
  const venue = stripTrailingPunctuation(record.venue);
  const year = record.year ? String(record.year) : "";
  const notes = ensureSentence(record.notes);
  return joinCitationParts([
    authors ? `${authors}.` : "",
    title,
    joinCitationParts([venue, year], ",") + (venue || year ? "." : ""),
    notes,
    link ? `${link}.` : ""
  ]);
}

function buildChicagoCitation(record = {}, link = "") {
  const authors = stripTrailingPunctuation(record.authorsText);
  const year = record.year ? `${record.year}.` : "";
  const title = record.title ? `"${stripTrailingPunctuation(record.title)}."` : "";
  const venue = ensureSentence(record.venue);
  const notes = ensureSentence(record.notes);
  return joinCitationParts([authors ? `${authors}.` : "", year, title, venue, notes, link ? `${link}.` : ""]);
}

function buildCitationFormats(record = {}, authors = [], link = "") {
  return {
    bibtex: buildBibtex(record, authors, link),
    apa: buildApaCitation(record, link),
    mla: buildMlaCitation(record, link),
    chicago: buildChicagoCitation(record, link)
  };
}

function buildCitationFileName(record = {}, format = "citation") {
  const yearToken = record.year ? String(record.year) : "nodate";
  const titleToken = slugifySegment(record.title || "");
  return `${yearToken}-${titleToken || "publication"}-${format}`;
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
      citationFormats: buildCitationFormats(record, authors, link),
      citationFileName: buildCitationFileName(record),
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
