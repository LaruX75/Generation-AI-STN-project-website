const fs = require("node:fs");
const path = require("node:path");
const { readCache, remember } = require("./_apiCache");

const OPENALEX_API_BASE = process.env.OPENALEX_API_BASE || "https://api.openalex.org";
const CROSSREF_API_BASE = process.env.CROSSREF_API_BASE || "https://api.crossref.org";
const DBLP_API_BASE = process.env.DBLP_API_BASE || "https://dblp.org/search";
const DEFAULT_LIMIT_PER_PERSON = 3;
const REQUEST_TIMEOUT_MS = 20_000;
const OPENALEX_API_KEY = String(process.env.OPENALEX_API_KEY || "").trim();
const OPENALEX_MAILTO = String(
  process.env.OPENALEX_MAILTO || process.env.CROSSREF_MAILTO || ""
).trim();
const ALLOW_UNAUTHENTICATED_OPENALEX = parseBoolean(
  process.env.OPENALEX_ALLOW_UNAUTHENTICATED
);
const SCHOLARLY_PUBLICATIONS_ENABLE_NETWORK = parseBoolean(
  process.env.SCHOLARLY_PUBLICATIONS_ENABLE_NETWORK
);
const SCHOLARLY_PUBLICATIONS_FORCE_REFRESH = parseBoolean(
  process.env.SCHOLARLY_PUBLICATIONS_FORCE_REFRESH
);

let hasWarnedAboutOpenAlexKey = false;

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&hellip;/g, "...");
}

function textFromHtml(value) {
  return normalizeWhitespace(decodeHtmlEntities(stripTags(value)));
}

function normalizeName(value) {
  return normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-.,]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function pickYear(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toIsoDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = normalizeWhitespace(value);
    if (normalized) return normalized;
  }

  return "";
}

function normalizePersonConfig(entry) {
  if (!entry) return null;

  if (typeof entry === "string") {
    const name = normalizeWhitespace(entry);
    if (!name) return null;
    return {
      name,
      lookupName: name,
      limit: DEFAULT_LIMIT_PER_PERSON
    };
  }

  if (typeof entry !== "object") return null;

  const name = normalizeWhitespace(entry.name || entry.personName || "");
  const orcid = normalizeWhitespace(entry.orcid || entry.id || "");
  const openAlexId = normalizeWhitespace(entry.openAlexId || entry.openalex || "");
  const dblpAuthorToken = normalizeWhitespace(
    entry.dblpAuthorToken || entry.dblpToken || ""
  );

  if (!name && !orcid && !openAlexId && !dblpAuthorToken) return null;

  return {
    ...entry,
    name: name || orcid || openAlexId || dblpAuthorToken,
    lookupName: name || entry.lookupName || orcid || openAlexId || dblpAuthorToken,
    orcid,
    openAlexId,
    dblpAuthorToken,
    organization: normalizeWhitespace(entry.organization || ""),
    limit:
      Number.isFinite(Number(entry.limit)) && Number(entry.limit) > 0
        ? Number(entry.limit)
        : DEFAULT_LIMIT_PER_PERSON
  };
}

function tryParseStructuredValue(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadConfigFile() {
  const explicitPath = process.env.SCHOLARLY_PUBLICATIONS_CONFIG_PATH;
  const candidatePaths = [
    explicitPath,
    path.join(process.cwd(), "scholarlyPublications.config.json"),
    path.join(process.cwd(), "src", "_data", "scholarlyPublications.config.json"),
    path.join(process.cwd(), "researchfi.config.json"),
    path.join(process.cwd(), "src", "_data", "researchfi.config.json")
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    if (!fs.existsSync(candidatePath)) continue;
    const raw = fs.readFileSync(candidatePath, "utf8");
    return JSON.parse(raw);
  }

  return null;
}

function loadConfiguredPeople() {
  const envSingle = process.env.SCHOLARLY_PUBLICATIONS_PERSON;
  const envMultiple = process.env.SCHOLARLY_PUBLICATIONS_PEOPLE;

  if (envMultiple) {
    const structured = tryParseStructuredValue(envMultiple);
    const source = structured || envMultiple.split(",").map(item => item.trim());
    return asArray(source).map(normalizePersonConfig).filter(Boolean);
  }

  if (envSingle) {
    return [normalizePersonConfig(envSingle)].filter(Boolean);
  }

  const fileConfig = loadConfigFile();
  if (!fileConfig) return [];

  const source =
    fileConfig.people ||
    fileConfig.scholarlyPublications ||
    fileConfig.publications ||
    fileConfig.researchfi ||
    fileConfig;

  return asArray(source).map(normalizePersonConfig).filter(Boolean);
}

function buildUrl(base, pathname, params = {}) {
  const url = new URL(pathname, base);

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function fetchJson(url, { headers = {} } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function rememberScholarly(key, factory) {
  if (SCHOLARLY_PUBLICATIONS_FORCE_REFRESH) {
    return remember(key, factory, { forceRefresh: true });
  }

  if (!SCHOLARLY_PUBLICATIONS_ENABLE_NETWORK) {
    const fresh = await readCache(key);
    if (fresh !== null) return fresh;

    const stale = await readCache(key, { ttlSeconds: 0 });
    if (stale !== null) return stale;

    return null;
  }

  return remember(key, factory, { forceRefresh: false });
}

function canUseOpenAlexNetwork() {
  if (!SCHOLARLY_PUBLICATIONS_ENABLE_NETWORK && !SCHOLARLY_PUBLICATIONS_FORCE_REFRESH) {
    return false;
  }

  if (OPENALEX_API_KEY) return true;
  if (ALLOW_UNAUTHENTICATED_OPENALEX) return true;

  if (!hasWarnedAboutOpenAlexKey) {
    hasWarnedAboutOpenAlexKey = true;
    console.warn(
      "[scholarlyPublications] OPENALEX_API_KEY puuttuu, joten OpenAlex-verkkohaku ohitetaan ellei dataa ole välimuistissa. Crossref- ja DBLP-fallbackit jäävät käyttöön."
    );
  }

  return false;
}

function buildOpenAlexUrl(pathname, params = {}) {
  const finalParams = { ...params };

  if (OPENALEX_API_KEY) {
    finalParams.api_key = OPENALEX_API_KEY;
  }

  if (OPENALEX_MAILTO) {
    finalParams.mailto = OPENALEX_MAILTO;
  }

  return buildUrl(OPENALEX_API_BASE, pathname, finalParams);
}

function buildCrossrefHeaders() {
  return OPENALEX_MAILTO
    ? { "User-Agent": `GenAI7/1.0 (${OPENALEX_MAILTO})` }
    : {};
}

function normalizeDoi(value) {
  return normalizeWhitespace(value)
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .toLowerCase();
}

function buildPublicationKey(publication = {}) {
  const doi = normalizeDoi(publication.doi);
  if (doi) return `doi:${doi}`;

  return [
    "title",
    normalizeName(publication.title),
    publication.year || "",
    normalizeName(publication.lookupName || publication.personName || "")
  ].join(":");
}

function mergePublications(primary, secondary) {
  const base = { ...(secondary || {}), ...(primary || {}) };

  base.title = firstNonEmpty(primary?.title, secondary?.title);
  base.authors = firstNonEmpty(primary?.authors, secondary?.authors);
  base.place = firstNonEmpty(primary?.place, secondary?.place);
  base.doi = firstNonEmpty(primary?.doi, secondary?.doi);
  base.link = firstNonEmpty(primary?.link, secondary?.link);
  base.source = firstNonEmpty(primary?.source, secondary?.source);
  base.sourceLabel = firstNonEmpty(primary?.sourceLabel, secondary?.sourceLabel);
  base.typeCode = firstNonEmpty(primary?.typeCode, secondary?.typeCode);
  base.personName = firstNonEmpty(primary?.personName, secondary?.personName);
  base.lookupName = firstNonEmpty(primary?.lookupName, secondary?.lookupName);
  base.publicationId = firstNonEmpty(primary?.publicationId, secondary?.publicationId);
  base.datePublished = firstNonEmpty(primary?.datePublished, secondary?.datePublished);
  base.year =
    pickYear(primary?.year) ||
    pickYear(secondary?.year) ||
    pickYear(primary?.datePublished?.slice?.(0, 4)) ||
    pickYear(secondary?.datePublished?.slice?.(0, 4));

  if (primary?.openAccess !== null && primary?.openAccess !== undefined) {
    base.openAccess = primary.openAccess;
  } else if (secondary?.openAccess !== null && secondary?.openAccess !== undefined) {
    base.openAccess = secondary.openAccess;
  } else {
    base.openAccess = null;
  }

  return base;
}

function sortPublications(items) {
  return [...items].sort((left, right) => {
    const leftDate = Date.parse(left.datePublished || "") || 0;
    const rightDate = Date.parse(right.datePublished || "") || 0;
    if (rightDate !== leftDate) return rightDate - leftDate;

    const leftYear = pickYear(left.year) || 0;
    const rightYear = pickYear(right.year) || 0;
    if (rightYear !== leftYear) return rightYear - leftYear;

    return String(left.title || "").localeCompare(String(right.title || ""));
  });
}

function parseOpenAlexAuthors(authorships) {
  return asArray(authorships)
    .map(item => normalizeWhitespace(item?.author?.display_name))
    .filter(Boolean)
    .join(", ");
}

function parseOpenAlexPlace(work = {}) {
  return firstNonEmpty(
    work?.primary_location?.source?.display_name,
    work?.best_oa_location?.source?.display_name,
    work?.biblio?.volume ? `Vol. ${work.biblio.volume}` : ""
  );
}

function normalizeOpenAlexId(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (/^A\d+$/i.test(normalized)) return `https://openalex.org/${normalized}`;
  return normalized;
}

function scoreOpenAlexAuthor(candidate, person) {
  let score = 0;

  if (normalizeName(candidate.display_name) === normalizeName(person.name)) score += 100;
  if (person.orcid && normalizeWhitespace(candidate.orcid).includes(person.orcid)) score += 80;

  const institutionName = normalizeWhitespace(candidate?.last_known_institution?.display_name);
  if (person.organization && institutionName) {
    if (normalizeName(institutionName).includes(normalizeName(person.organization))) score += 25;
  }

  score += Math.min(Number(candidate.works_count || 0), 50) / 50;

  return score;
}

async function resolveOpenAlexAuthor(person) {
  if (person.openAlexId) {
    return {
      id: normalizeOpenAlexId(person.openAlexId),
      display_name: person.name,
      orcid: person.orcid ? `https://orcid.org/${person.orcid}` : ""
    };
  }

  if (person.orcid) {
    return {
      id: "",
      display_name: person.name,
      orcid: `https://orcid.org/${person.orcid}`
    };
  }

  if (!person.name || !canUseOpenAlexNetwork()) return null;

  const url = buildOpenAlexUrl("/authors", {
    search: person.name,
    "per-page": 10,
    select: "id,display_name,orcid,last_known_institution,works_count"
  });

  const payload = await remember(
    `scholarly-publications:openalex:author-search:${person.name}:${person.organization || ""}`,
    () => fetchJson(url),
    {
      forceRefresh: SCHOLARLY_PUBLICATIONS_FORCE_REFRESH
    }
  );

  const candidates = asArray(payload?.results);
  if (!candidates.length) return null;

  return candidates
    .slice()
    .sort((left, right) => scoreOpenAlexAuthor(right, person) - scoreOpenAlexAuthor(left, person))[0];
}

async function fetchOpenAlexPublications(person) {
  if (!canUseOpenAlexNetwork()) return [];

  const author = await resolveOpenAlexAuthor(person);
  if (!author) return [];

  let authorFilter = "";
  if (author.id) {
    authorFilter = `author.id:${author.id}`;
  } else if (person.orcid) {
    authorFilter = `author.orcid:https://orcid.org/${person.orcid}`;
  }

  if (!authorFilter) return [];

  const url = buildOpenAlexUrl("/works", {
    filter: authorFilter,
    "per-page": Math.max(person.limit * 4, 10),
    select:
      "id,doi,display_name,publication_year,publication_date,type,primary_location,best_oa_location,authorships,open_access,biblio"
  });

  const payload = await rememberScholarly(
    `scholarly-publications:openalex:works:${person.name}:${person.orcid || author.id}`,
    () => fetchJson(url)
  );
  if (!payload) return [];

  return sortPublications(
    asArray(payload?.results).map(work => ({
      personId: author.id || "",
      personName: person.name,
      lookupName: person.lookupName,
      publicationId: work.id || "",
      title: firstNonEmpty(work.display_name),
      year: pickYear(work.publication_year),
      datePublished: toIsoDate(work.publication_date),
      authors: parseOpenAlexAuthors(work.authorships),
      place: parseOpenAlexPlace(work),
      doi: normalizeDoi(work.doi),
      typeCode: normalizeWhitespace(work.type),
      openAccess:
        typeof work?.open_access?.is_oa === "boolean" ? work.open_access.is_oa : null,
      link: firstNonEmpty(work.doi ? `https://doi.org/${normalizeDoi(work.doi)}` : "", work.id),
      source: "openalex",
      sourceLabel: "OpenAlex",
      raw: work
    }))
  ).slice(0, person.limit * 2);
}

function parseCrossrefAuthors(authors) {
  return asArray(authors)
    .map(author =>
      firstNonEmpty(
        [author?.given, author?.family].filter(Boolean).join(" "),
        author?.name
      )
    )
    .filter(Boolean)
    .join(", ");
}

function parseCrossrefYear(message) {
  const parts =
    message?.issued?.["date-parts"] ||
    message?.published?.["date-parts"] ||
    message?.["published-print"]?.["date-parts"] ||
    message?.["published-online"]?.["date-parts"] ||
    message?.created?.["date-parts"] ||
    [];

  const first = asArray(parts)[0];
  return pickYear(asArray(first)[0]);
}

function parseCrossrefDate(message) {
  return firstNonEmpty(
    message?.created?.["date-time"],
    message?.deposited?.["date-time"],
    message?.indexed?.["date-time"]
  );
}

async function fetchCrossrefPublications(person) {
  if (!person.orcid) return [];

  const url = buildUrl(CROSSREF_API_BASE, "/works", {
    filter: `orcid:${person.orcid}`,
    rows: Math.max(person.limit * 4, 10),
    select: "DOI,title,author,container-title,issued,created,type,abstract,URL"
  });

  const payload = await rememberScholarly(
    `scholarly-publications:crossref:works:${person.name}:${person.orcid}`,
    () => fetchJson(url, { headers: buildCrossrefHeaders() })
  );
  if (!payload) return [];

  return sortPublications(
    asArray(payload?.message?.items).map(item => ({
      personId: person.orcid ? `https://orcid.org/${person.orcid}` : "",
      personName: person.name,
      lookupName: person.lookupName,
      publicationId: normalizeDoi(item.DOI),
      title: firstNonEmpty(asArray(item.title)[0]),
      year: parseCrossrefYear(item),
      datePublished: parseCrossrefDate(item),
      authors: parseCrossrefAuthors(item.author),
      place: firstNonEmpty(asArray(item["container-title"])[0]),
      doi: normalizeDoi(item.DOI),
      typeCode: normalizeWhitespace(item.type),
      openAccess: null,
      link: firstNonEmpty(item.URL, item.DOI ? `https://doi.org/${normalizeDoi(item.DOI)}` : ""),
      source: "crossref",
      sourceLabel: "Crossref",
      abstract: textFromHtml(item.abstract),
      raw: item
    }))
  ).slice(0, person.limit * 2);
}

function buildDblpAuthorToken(person) {
  if (person.dblpAuthorToken) return person.dblpAuthorToken;

  return normalizeWhitespace(person.name)
    .replace(/,/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .join("_");
}

function parseDblpAuthors(authorField) {
  if (!authorField) return "";

  if (typeof authorField === "string") return normalizeWhitespace(authorField);

  return asArray(authorField)
    .map(item => normalizeWhitespace(item?.text || item))
    .filter(Boolean)
    .join(", ");
}

function parseDblpHits(payload) {
  const hitField = payload?.result?.hits?.hit;
  if (!hitField) return [];
  return Array.isArray(hitField) ? hitField : [hitField];
}

async function fetchDblpPublications(person) {
  if (!person.name) return [];

  const authorToken = buildDblpAuthorToken(person);
  if (!authorToken) return [];

  const url = buildUrl(DBLP_API_BASE, "/publ/api", {
    q: `author:${authorToken}:`,
    format: "json",
    h: Math.max(person.limit * 5, 10)
  });

  const payload = await rememberScholarly(
    `scholarly-publications:dblp:works:${person.name}:${authorToken}`,
    () => fetchJson(url)
  );
  if (!payload) return [];

  return sortPublications(
    parseDblpHits(payload)
      .map(hit => hit.info || {})
      .map(info => ({
        personId: `dblp:${authorToken}`,
        personName: person.name,
        lookupName: person.lookupName,
        publicationId: firstNonEmpty(info.key, info.url),
        title: firstNonEmpty(info.title),
        year: pickYear(info.year),
        datePublished: info.year ? `${info.year}-01-01T00:00:00.000Z` : "",
        authors: parseDblpAuthors(info.authors?.author),
        place: firstNonEmpty(info.venue),
        doi: normalizeDoi(info.doi),
        typeCode: firstNonEmpty(info.type),
        openAccess: null,
        link: firstNonEmpty(info.url, info.ee, info.doi ? `https://doi.org/${normalizeDoi(info.doi)}` : ""),
        source: "dblp",
        sourceLabel: "DBLP",
        raw: info
      }))
      .filter(item => {
        if (!item.authors) return true;
        return normalizeName(item.authors).includes(normalizeName(person.name));
      })
  ).slice(0, person.limit * 2);
}

async function enrichWithCrossref(publication) {
  const doi = normalizeDoi(publication.doi);
  if (!doi) return publication;

  const url = buildUrl(CROSSREF_API_BASE, `/works/${encodeURIComponent(doi)}`);

  try {
    const payload = await rememberScholarly(
      `scholarly-publications:crossref:doi:${doi}`,
      () => fetchJson(url, { headers: buildCrossrefHeaders() })
    );
    if (!payload) return publication;

    const message = payload?.message;
    if (!message) return publication;

    return mergePublications(publication, {
      title: firstNonEmpty(asArray(message.title)[0]),
      authors: parseCrossrefAuthors(message.author),
      place: firstNonEmpty(asArray(message["container-title"])[0]),
      year: parseCrossrefYear(message),
      datePublished: parseCrossrefDate(message),
      typeCode: normalizeWhitespace(message.type),
      link: firstNonEmpty(
        message.URL,
        publication.link,
        doi ? `https://doi.org/${doi}` : ""
      ),
      doi,
      abstract: textFromHtml(message.abstract),
      raw: publication.raw
    });
  } catch {
    return publication;
  }
}

function deduplicatePublications(items) {
  const merged = new Map();

  for (const item of items) {
    const key = buildPublicationKey(item);
    const existing = merged.get(key);
    merged.set(key, existing ? mergePublications(existing, item) : item);
  }

  return sortPublications(Array.from(merged.values()));
}

async function fetchPersonPublications(person) {
  const [openAlexItems, crossrefItems, dblpItems] = await Promise.all([
    fetchOpenAlexPublications(person),
    fetchCrossrefPublications(person),
    fetchDblpPublications(person)
  ]);

  const merged = deduplicatePublications([
    ...openAlexItems,
    ...crossrefItems,
    ...dblpItems
  ]);

  const enriched = await Promise.all(
    merged.slice(0, Math.max(person.limit * 2, 6)).map(enrichWithCrossref)
  );

  return deduplicatePublications(enriched)
    .slice(0, person.limit)
    .map(item => ({
      ...item,
      personName: person.name,
      lookupName: person.lookupName || person.name
    }));
}

module.exports = async function scholarlyPublicationsData() {
  const people = loadConfiguredPeople();
  if (!people.length) return [];

  const results = await Promise.all(
    people.map(person =>
      fetchPersonPublications(person).catch(error => {
        console.warn(
          `[scholarlyPublications] Julkaisujen haku epäonnistui henkilölle ${person.name}: ${error.message}`
        );
        return [];
      })
    )
  );

  return sortPublications(results.flat());
};
