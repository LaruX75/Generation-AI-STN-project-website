const fs = require("node:fs");
const path = require("node:path");
const { readCache, remember } = require("./_apiCache");

const ENDPOINT =
  process.env.RESEARCHFI_ENDPOINT ||
  "https://researchfi-api-production.2.rahtiapp.fi/portalapi/person/_search";

const REQUEST_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  Origin: "https://research.fi",
  Referer: "https://research.fi/"
};

const DEFAULT_LIMIT_PER_PERSON = 3;
const UEFCONNECT_HEADERS = {
  Accept: "text/html,application/xhtml+xml"
};
const HELSINKI_PORTAL_HEADERS = {
  Accept: "text/html,application/xhtml+xml"
};
const ORCID_HEADERS = {
  Accept: "application/json"
};

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function normalizePersonConfig(entry) {
  if (!entry) return null;

  if (typeof entry === "string") {
    const value = entry.trim();
    if (!value) return null;
    return value.includes("-") ? { orcid: value } : { name: value };
  }

  if (typeof entry !== "object") return null;

  const orcid = String(entry.orcid || entry.id || "").trim();
  const name = String(entry.name || entry.personName || "").trim();
  if (!orcid && !name) return null;

  return {
    ...entry,
    orcid,
    name,
    limit:
      Number.isFinite(Number(entry.limit)) && Number(entry.limit) > 0
        ? Number(entry.limit)
        : undefined
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
  const explicitPath = process.env.RESEARCHFI_CONFIG_PATH;
  const candidatePaths = [
    explicitPath,
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
  const envSingle = process.env.RESEARCHFI_ORCID;
  const envMultiple = process.env.RESEARCHFI_ORCIDS;

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

  const source = fileConfig.people || fileConfig.orcids || fileConfig.researchfi || fileConfig;
  return asArray(source).map(normalizePersonConfig).filter(Boolean);
}

function buildRequestBody(orcid) {
  return {
    query: {
      match_phrase: {
        id: orcid
      }
    },
    size: 1
  };
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
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
    .replace(/&hellip;/g, "...")
    .replace(/&eacute;/g, "e")
    .replace(/&uuml;/g, "u")
    .replace(/&ouml;/g, "o")
    .replace(/&auml;/g, "a")
    .replace(/&Ouml;/g, "O")
    .replace(/&Auml;/g, "A")
    .replace(/&Uuml;/g, "U");
}

function textFromHtml(value) {
  return normalizeWhitespace(decodeHtmlEntities(stripTags(value)));
}

function decodeJsonString(value) {
  if (typeof value !== "string") return "";

  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return normalizeWhitespace(value);
  }
}

function extractJsonStringValue(source, pattern) {
  const match = String(source || "").match(pattern);
  if (!match) return "";
  return normalizeWhitespace(decodeJsonString(match[1]));
}

function extractLastJsonStringValue(source, pattern) {
  const matches = String(source || "").matchAll(pattern);
  let lastValue = "";

  for (const match of matches) {
    lastValue = normalizeWhitespace(decodeJsonString(match[1]));
  }

  return lastValue;
}

function extractJsonNumberValue(source, pattern) {
  const match = String(source || "").match(pattern);
  if (!match) return null;

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function buildNameVariants(name) {
  const cleaned = String(name || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return [];

  if (cleaned.includes(",")) {
    return [cleaned, cleaned.replace(/,/g, "")];
  }

  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length < 2) return [cleaned];

  const firstNames = parts.slice(0, -1).join(" ");
  const lastName = parts[parts.length - 1];

  return Array.from(new Set([cleaned, `${lastName} ${firstNames}`]));
}

function buildNameRequestBody(name) {
  const variants = buildNameVariants(name);
  const should = [];

  for (const variant of variants) {
    should.push({ match_phrase: { "personal.names.fullName.keyword": variant } });
    should.push({ match_phrase: { "personal.names.fullName": variant } });
  }

  const stripped = String(name || "").replace(/,/g, " ").trim();
  const parts = stripped.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const firstNames = parts.slice(0, -1).join(" ");
    const lastName = parts[parts.length - 1];

    should.push({
      bool: {
        must: [
          { match_phrase: { "personal.names.lastName": lastName } },
          { match_phrase: { "personal.names.firstNames": firstNames } }
        ]
      }
    });
  }

  return {
    query: {
      bool: {
        should,
        minimum_should_match: 1
      }
    },
    size: 1
  };
}

function pickPrimaryName(personSource = {}) {
  const names = personSource.personal?.names || [];
  const primary =
    names.find(name => name?.itemMeta?.primaryValue) ||
    names[0] ||
    {};

  return (
    primary.fullName ||
    [primary.firstNames, primary.lastName].filter(Boolean).join(" ").trim() ||
    personSource.id ||
    ""
  );
}

function pickPlace(publication = {}) {
  return (
    publication.journalName ||
    publication.conferenceName ||
    publication.parentPublicationName ||
    ""
  );
}

function parseUefconnectMeta(metaText) {
  const normalized = normalizeWhitespace(metaText);
  const match = normalized.match(/^(.*?),\s(20\d{2}|19\d{2}),\s(.*)$/);

  if (!match) {
    return {
      authors: normalized,
      year: null,
      place: ""
    };
  }

  return {
    authors: normalizeWhitespace(match[1]),
    year: Number(match[2]),
    place: normalizeWhitespace(match[3]).replace(/\.$/, "")
  };
}

function parseUefconnectPublications(html, personConfig = {}) {
  const listMatch = html.match(
    /<section id="publications"[\s\S]*?<ul class="publication-list single-profile-publ-list">([\s\S]*?)<\/ul>/
  );

  if (!listMatch) return [];

  const publications = [];
  const itemPattern =
    /<li class="publication-list-item single-profile-publ-list-item(?: hidden-item)?">[\s\S]*?<a href="([^"]+)" class="publication-list-item__link">[\s\S]*?<h3 class="publication-list-item__item-name">([\s\S]*?)<\/h3>[\s\S]*?<span class="publication-list-item__item-writers">([\s\S]*?)<\/span>[\s\S]*?<span class="publication-list-item__item-journal">([\s\S]*?)<\/span>[\s\S]*?<\/li>/g;

  let match;
  while ((match = itemPattern.exec(listMatch[1])) !== null) {
    const meta = parseUefconnectMeta(match[3]);
    publications.push({
      personId: personConfig.url || personConfig.name || "",
      personName: personConfig.name || "",
      lookupName: personConfig.name || "",
      publicationId: match[1],
      title: textFromHtml(match[2]),
      year: meta.year,
      authors: meta.authors,
      place: meta.place,
      doi: "",
      typeCode: normalizeWhitespace(match[4]),
      openAccess: null,
      link: match[1],
      source: "uefconnect",
      raw: {
        href: match[1],
        writers: normalizeWhitespace(match[3]),
        journal: normalizeWhitespace(match[4])
      }
    });
  }

  return publications;
}

function parseHelsinkiPortalOrcid(html) {
  const match = String(html || "").match(/https:\/\/orcid\.org\/(\d{4}-\d{4}-\d{4}-[\dX]{4})/i);
  return match ? match[1].toUpperCase() : "";
}

function detectSourceFromConfig(personConfig = {}) {
  if (personConfig.source) return personConfig.source;

  const url = String(personConfig.url || "");
  if (url.includes("uefconnect.uef.fi")) return "uefconnect";
  if (url.includes("researchportal.helsinki.fi")) return "helsinki";

  return "researchfi";
}

function pickHelsinkiPlace(blockHtml) {
  const journalMatch = blockHtml.match(
    /<span class="journal">[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<\/span>/
  );
  if (journalMatch) return textFromHtml(journalMatch[1]).replace(/\.$/, "");

  const emphasisMatch = blockHtml.match(/<em>([\s\S]*?)<\/em>/);
  if (emphasisMatch) return textFromHtml(emphasisMatch[1]).replace(/\.$/, "");

  const publisherMatch = blockHtml.match(/<a rel="Publisher"[\s\S]*?<span>([\s\S]*?)<\/span>/);
  if (publisherMatch) return textFromHtml(publisherMatch[1]).replace(/\.$/, "");

  return "";
}

function parseHelsinkiPortalPublications(html, personConfig = {}) {
  const sectionMatch = html.match(
    /<div class="relation-list relation-list-publications">([\s\S]*?)<\/ul>/
  );

  if (!sectionMatch) return [];

  const items = sectionMatch[1].split(/<li class="list-result-item">/).slice(1);
  const publications = [];

  for (const itemHtml of items) {
    const blockMatch = itemHtml.match(
      /(<div class="rendering rendering_researchoutput[\s\S]*?<p class="type">[\s\S]*?<\/p><\/div>)/
    );
    if (!blockMatch) continue;

    const blockHtml = blockMatch[1];
    const titleMatch = blockHtml.match(
      /<h3 class="title">[\s\S]*?<a [^>]*href="([^"]+)"[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<\/a><\/h3>/
    );
    const dateMatch = blockHtml.match(/<span class="date">([\s\S]*?)<\/span>/);
    if (!titleMatch || !dateMatch) continue;

    const authorsSplit = blockHtml.split(/<span class="date">/)[0] || "";
    const authorsHtml = authorsSplit.replace(/^[\s\S]*?<\/h3>/, "");
    const yearMatch = textFromHtml(dateMatch[1]).match(/(19|20)\d{2}/);

    publications.push({
      personId: personConfig.url || personConfig.name || "",
      personName: personConfig.name || "",
      lookupName: personConfig.name || "",
      publicationId: titleMatch[1],
      title: textFromHtml(titleMatch[2]),
      year: yearMatch ? Number(yearMatch[0]) : null,
      authors: textFromHtml(authorsHtml).replace(/,\s*$/, ""),
      place: pickHelsinkiPlace(blockHtml),
      doi: "",
      typeCode: "",
      openAccess: /<div class="open-access">/i.test(itemHtml),
      link: titleMatch[1],
      source: "helsinki",
      raw: {
        href: titleMatch[1],
        html: blockHtml
      }
    });
  }

  return publications;
}

function parseOuluCrisPublicationPage(html, pageUrl, personConfig = {}) {
  const source = String(html || "").replace(/\\"/g, '"');
  const title = extractJsonStringValue(
    source,
    /"titleOfPublication":\{"titleOfPublication":"((?:\\.|[^"])*)"/
  );
  if (!title) return null;

  const authors = extractJsonStringValue(
    source,
    /"authorsOfThePublication":\{"authors":"((?:\\.|[^"])*)"/
  );
  const year =
    extractJsonNumberValue(source, /"yearOfPublication":(\d{4})/) ||
    extractJsonNumberValue(source, /"bibliographicalPublicationYear":(\d{4})/);
  const doi = extractLastJsonStringValue(source, /"doi":"((?:\\.|[^"])*)"/g);
  const journalName = extractJsonStringValue(
    source,
    /"journalSerie":\{"id":"[^"]+","name":"((?:\\.|[^"])*)"/
  );
  const hostTitle = extractJsonStringValue(source, /"titleOfHostPublication":"((?:\\.|[^"])*)"/);
  const conferenceName = extractJsonStringValue(
    source,
    /"conference":\{"id":"[^"]+","name":"((?:\\.|[^"])*)"/
  );
  const publisherName = extractJsonStringValue(
    source,
    /"publisher":\{"id":"[^"]+","name":"((?:\\.|[^"])*)"/
  );
  const place = journalName || hostTitle || conferenceName || publisherName;

  return {
    personId: personConfig.name || pageUrl || "",
    personName: personConfig.name || "",
    lookupName: personConfig.name || "",
    publicationId: pageUrl || title,
    title,
    year,
    authors,
    place,
    doi,
    typeCode: "",
    openAccess: null,
    link: pageUrl,
    source: "oulucris",
    raw: {
      pageUrl,
      title,
      authors,
      year,
      place,
      doi
    }
  };
}

function summarizeOrcidDate(date = {}) {
  const year = Number(date.year?.value || 0) || null;
  const month = Number(date.month?.value || 0) || null;
  const day = Number(date.day?.value || 0) || null;

  return { year, month, day };
}

function scoreOrcidSummary(summary = {}) {
  const date = summarizeOrcidDate(summary["publication-date"]);

  return [
    date.year ? 1000 : 0,
    date.month ? 100 : 0,
    date.day ? 10 : 0,
    summary["journal-title"]?.value ? 5 : 0,
    summary.url?.value ? 2 : 0,
    summary.source?.["source-name"]?.value === "University of Helsinki" ? 1 : 0
  ].reduce((total, value) => total + value, 0);
}

function pickBestOrcidSummary(group = {}) {
  const summaries = Array.isArray(group["work-summary"]) ? group["work-summary"] : [];
  if (!summaries.length) return null;

  return [...summaries].sort((left, right) => scoreOrcidSummary(right) - scoreOrcidSummary(left))[0];
}

function extractOrcidDoi(entity = {}) {
  const ids = entity["external-ids"]?.["external-id"] || [];
  const doi = ids.find(item => item["external-id-type"] === "doi");
  return doi?.["external-id-value"] || "";
}

function extractOrcidAuthors(detail = {}) {
  const contributors = detail.contributors?.contributor || [];
  const names = contributors
    .map(item => normalizeWhitespace(item["credit-name"]?.value || ""))
    .filter(Boolean);

  if (names.length) return names.join("; ");

  const citation = detail.citation?.["citation-value"] || "";
  const authorMatch = citation.match(/author\s*=\s*["{]([^"}]+)["}]/i);
  if (!authorMatch) return "";

  return normalizeWhitespace(authorMatch[1].replace(/\s+and\s+/gi, "; "));
}

function normalizeOrcidPublication(summary = {}, detail = {}, personConfig = {}, orcid = "") {
  const date = summarizeOrcidDate(summary["publication-date"] || detail["publication-date"]);
  const title =
    detail.title?.title?.value ||
    summary.title?.title?.value ||
    "";
  const link = detail.url?.value || summary.url?.value || "";
  const doi = extractOrcidDoi(detail) || extractOrcidDoi(summary);
  const place =
    detail["journal-title"]?.value ||
    summary["journal-title"]?.value ||
    "";

  return {
    personId: orcid || personConfig.url || personConfig.name || "",
    personName: personConfig.name || "",
    lookupName: personConfig.name || "",
    publicationId: String(detail["put-code"] || summary["put-code"] || link || title),
    title: normalizeWhitespace(title),
    year: date.year,
    authors: extractOrcidAuthors(detail),
    place: normalizeWhitespace(place).replace(/\.$/, ""),
    doi,
    typeCode: detail.type || summary.type || "",
    openAccess: null,
    link,
    source: "orcid",
    raw: {
      orcid,
      summary,
      detail
    }
  };
}

function normalizePublication(publication, personSource, personConfig = {}) {
  return {
    personId: personSource.id || "",
    personName: pickPrimaryName(personSource),
    lookupName: personConfig.name || pickPrimaryName(personSource),
    publicationId: publication.publicationId || "",
    title: publication.publicationName || "",
    year: publication.publicationYear || null,
    authors: publication.authorsText || "",
    place: pickPlace(publication),
    doi: publication.doi || "",
    typeCode: publication.publicationTypeCode || "",
    openAccess: publication.openAccess ?? null,
    raw: publication
  };
}

function dedupePublications(publications) {
  const seen = new Set();

  return publications.filter(publication => {
    const key = [
      publication.personId,
      publication.publicationId,
      publication.year,
      publication.title
    ]
      .map(value => String(value || "").trim().toLowerCase())
      .join("::");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortPublications(publications) {
  return [...publications].sort((left, right) => {
    const yearDiff = (right.year || 0) - (left.year || 0);
    if (yearDiff !== 0) return yearDiff;

    return String(left.title || "").localeCompare(String(right.title || ""), "fi");
  });
}

async function fetchPersonRecord(orcid) {
  const cacheKey = `person:orcid:${orcid}`;
  const forceRefresh = parseBoolean(process.env.RESEARCHFI_FORCE_REFRESH);

  try {
    return await remember(
      cacheKey,
      async () => {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: REQUEST_HEADERS,
          body: JSON.stringify(buildRequestBody(orcid))
        });

        if (!response.ok) {
          throw new Error(`Research.fi request failed with ${response.status} ${response.statusText}`);
        }

        return response.json();
      },
      { forceRefresh }
    );
  } catch (error) {
    const stale = await readCache(cacheKey, { ttlSeconds: 0 });
    if (stale) return stale;

    console.warn(`[researchfi] ORCID lookup failed for ${orcid}: ${error.message}`);
    return null;
  }
}

async function fetchPersonRecordByName(name) {
  const cacheKey = `person:name:${name}`;
  const forceRefresh = parseBoolean(process.env.RESEARCHFI_FORCE_REFRESH);

  try {
    return await remember(
      cacheKey,
      async () => {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: REQUEST_HEADERS,
          body: JSON.stringify(buildNameRequestBody(name))
        });

        if (!response.ok) {
          throw new Error(`Research.fi request failed with ${response.status} ${response.statusText}`);
        }

        return response.json();
      },
      { forceRefresh }
    );
  } catch (error) {
    const stale = await readCache(cacheKey, { ttlSeconds: 0 });
    if (stale) return stale;

    console.warn(`[researchfi] Name lookup failed for ${name}: ${error.message}`);
    return null;
  }
}

async function fetchTextWithCache(cacheKey, url, headers = {}) {
  const forceRefresh = parseBoolean(process.env.RESEARCHFI_FORCE_REFRESH);

  try {
    return await remember(
      cacheKey,
      async () => {
        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status} ${response.statusText}`);
        }

        return response.text();
      },
      { forceRefresh }
    );
  } catch (error) {
    const stale = await readCache(cacheKey, { ttlSeconds: 0 });
    if (stale) return stale;

    console.warn(`[researchfi] Text lookup failed for ${url}: ${error.message}`);
    return null;
  }
}

async function fetchJsonWithCache(cacheKey, url, headers = {}) {
  const forceRefresh = parseBoolean(process.env.RESEARCHFI_FORCE_REFRESH);

  try {
    return await remember(
      cacheKey,
      async () => {
        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status} ${response.statusText}`);
        }

        return response.json();
      },
      { forceRefresh }
    );
  } catch (error) {
    const stale = await readCache(cacheKey, { ttlSeconds: 0 });
    if (stale) return stale;

    console.warn(`[researchfi] JSON lookup failed for ${url}: ${error.message}`);
    return null;
  }
}

async function fetchOrcidWorks(orcid) {
  return fetchJsonWithCache(
    `orcid:works:${orcid}`,
    `https://pub.orcid.org/v3.0/${orcid}/works`,
    ORCID_HEADERS
  );
}

async function fetchOrcidWorkDetail(orcid, putCode) {
  return fetchJsonWithCache(
    `orcid:work:${orcid}:${putCode}`,
    `https://pub.orcid.org/v3.0/${orcid}/work/${putCode}`,
    ORCID_HEADERS
  );
}

async function fetchOrcidPublications(orcid, personConfig = {}, limit = DEFAULT_LIMIT_PER_PERSON) {
  const worksPayload = await fetchOrcidWorks(orcid);
  const groups = Array.isArray(worksPayload?.group) ? worksPayload.group : [];

  const summaries = groups
    .map(pickBestOrcidSummary)
    .filter(Boolean)
    .sort((left, right) => {
      const leftDate = summarizeOrcidDate(left["publication-date"]);
      const rightDate = summarizeOrcidDate(right["publication-date"]);

      if ((rightDate.year || 0) !== (leftDate.year || 0)) {
        return (rightDate.year || 0) - (leftDate.year || 0);
      }

      if ((rightDate.month || 0) !== (leftDate.month || 0)) {
        return (rightDate.month || 0) - (leftDate.month || 0);
      }

      if ((rightDate.day || 0) !== (leftDate.day || 0)) {
        return (rightDate.day || 0) - (leftDate.day || 0);
      }

      return String(left.title?.title?.value || "").localeCompare(
        String(right.title?.title?.value || ""),
        "fi"
      );
    });

  const topSummaries = limit > 0 ? summaries.slice(0, limit) : summaries;
  const details = await Promise.all(
    topSummaries.map(summary => fetchOrcidWorkDetail(orcid, summary["put-code"]))
  );

  return topSummaries.map((summary, index) =>
    normalizeOrcidPublication(summary, details[index] || {}, personConfig, orcid)
  );
}

async function fetchPublicationsForPerson(personConfig) {
  const source = detectSourceFromConfig(personConfig);
  const limit =
    personConfig.limit ||
    (Number.isFinite(Number(process.env.RESEARCHFI_LIMIT_PER_PERSON))
      ? Number(process.env.RESEARCHFI_LIMIT_PER_PERSON)
      : DEFAULT_LIMIT_PER_PERSON);

  if (source === "orcid" && personConfig.orcid) {
    return fetchOrcidPublications(personConfig.orcid, personConfig, limit);
  }

  if (source === "publicationPages" && Array.isArray(personConfig.pages)) {
    const htmlPages = await Promise.all(
      personConfig.pages.map(pageUrl =>
        fetchTextWithCache(`publication-page:${pageUrl}`, pageUrl, HELSINKI_PORTAL_HEADERS)
      )
    );

    const publications = htmlPages
      .map((html, index) =>
        html ? parseOuluCrisPublicationPage(html, personConfig.pages[index], personConfig) : null
      )
      .filter(Boolean);

    const normalized = dedupePublications(sortPublications(publications));
    return limit > 0 ? normalized.slice(0, limit) : normalized;
  }

  if (source === "uefconnect" && personConfig.url) {
    const html = await fetchTextWithCache(
      `uefconnect:${personConfig.url}`,
      personConfig.url,
      UEFCONNECT_HEADERS
    );

    if (!html) return [];

    const publications = parseUefconnectPublications(html, personConfig);

    return limit > 0 ? publications.slice(0, limit) : publications;
  }

  if (source === "helsinki" && personConfig.url) {
    const html = await fetchTextWithCache(
      `helsinki:${personConfig.url}`,
      personConfig.url,
      HELSINKI_PORTAL_HEADERS
    );

    if (!html) return [];

    const orcid = parseHelsinkiPortalOrcid(html);
    if (orcid) {
      const publications = await fetchOrcidPublications(orcid, personConfig, limit);
      if (publications.length) return publications;
    }

    const publications = parseHelsinkiPortalPublications(html, personConfig);

    return limit > 0 ? publications.slice(0, limit) : publications;
  }

  let payload = null;

  if (personConfig.orcid) {
    payload = await fetchPersonRecord(personConfig.orcid);
  }

  let hit = payload?.hits?.hits?.[0];

  if (!hit?._source && personConfig.name) {
    payload = await fetchPersonRecordByName(personConfig.name);
    hit = payload?.hits?.hits?.[0];
  }

  if (!hit?._source) {
    return [];
  }

  const personSource = hit._source;
  const allPublications = personSource.activity?.publications || [];
  const normalized = dedupePublications(
    sortPublications(
      allPublications.map(publication => normalizePublication(publication, personSource, personConfig))
    )
  );

  return limit > 0 ? normalized.slice(0, limit) : normalized;
}

module.exports = async function researchfiDataSource() {
  const people = loadConfiguredPeople();

  if (!people.length) {
    console.warn(
      "[researchfi] No people configured. Set RESEARCHFI_ORCID / RESEARCHFI_ORCIDS or add researchfi.config.json."
    );
    return [];
  }

  const publicationsByPerson = await Promise.all(
    people.map(personConfig => fetchPublicationsForPerson(personConfig))
  );

  return publicationsByPerson.flat();
};
