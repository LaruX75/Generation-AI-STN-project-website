const baseNavigation = require("./navigation.json");
const buildTranslations = require("./translations.js");

const LABEL_OVERRIDES = {
  /* ── Top-level nav items ─────────────────────────────────────────────── */
  "Etusivu":                { fi: "Etusivu",              en: "Home",                    sv: "Startsida" },
  "Ajankohtaista":          { fi: "Ajankohtaista",        en: "Current affairs",          sv: "Aktuellt" },
  "Materiaalit":            { fi: "Materiaalit",          en: "Materials",               sv: "Material" },
  "Hankkeesta":             { fi: "Hankkeesta",           en: "About the project",       sv: "Om projektet" },
  "Toiminta":               { fi: "Toiminta",             en: "What we do",              sv: "Verksamhet" },
  "Konsortio":              { fi: "Konsortio",            en: "Consortium",              sv: "Konsortium" },
  "Ole yhteydessä":         { fi: "Ole yhteydessä",       en: "Get in touch",            sv: "Kontakta oss" },
  "Opettajalle":            { fi: "Opettajalle",          en: "For teachers",            sv: "För lärare" },
  "Yleistajuiset julkaisut":{ fi: "Yleistajuiset julkaisut", en: "Popular publications", sv: "Populärvetenskapliga publikationer" },
  "Tutkijalle":             { fi: "Tutkijalle",           en: "Research",                sv: "Forskning" },
  "Yleisölle":              { fi: "Yleisölle",            en: "For everyone",            sv: "För allmänheten" },
  "Toiminta sisältö":       { fi: "Toiminta",             en: "What we do",              sv: "Verksamhet" },

  /* ── Megamenu column headings ────────────────────────────────────────── */
  "Sovellukset":            { fi: "Sovellukset",          en: "Applications",            sv: "Verktyg" },
  "Julkaisut & tutkimus":   { fi: "Julkaisut & tutkimus", en: "Publications & research", sv: "Publikationer & forskning" },
  "Hanke":                  { fi: "Hanke",                en: "Project",                 sv: "Projektet" },
  "Resurssit":              { fi: "Resurssit",            en: "Resources",               sv: "Resurser" },
  "Seuraa":                 { fi: "Seuraa",               en: "Follow",                  sv: "Följ" },
  "Kategoriat":             { fi: "Kategoriat",           en: "Categories",              sv: "Kategorier" },
  "Tilaa":                  { fi: "Tilaa",                en: "Subscribe",               sv: "Prenumerera" },
  "Yhteys":                 { fi: "Yhteys",               en: "Contact",                 sv: "Kontakt" },

  /* ── App names ───────────────────────────────────────────────────────── */
  "Opetettava kone":        { fi: "Opetettava kone",      en: "Teachable Machine",       sv: "Undervisbar maskin" },
  "Somekone":               { fi: "Somekone",             en: "Social Media Machine",    sv: "Sociala medier-maskin" },
  "Pieni kielikone":        { fi: "Pieni kielikone",      en: "Small Language Machine",  sv: "Liten språkmaskin" },
  "Hajoava kone":           { fi: "Hajoava kone",         en: "Breakable Machine",       sv: "Söndermaskin" },
  "Profilointipeli":        { fi: "Profilointipeli",      en: "Profiling Game",          sv: "Profileringsspel" },
  "Manipulointipeli":       { fi: "Manipulointipeli",     en: "Manipulation Game",       sv: "Manipuleringsspel" },

  /* ── Hash-linked items (won't be auto-translated via URL lookup) ─────── */
  "Tieteelliset julkaisut": { fi: "Tieteelliset julkaisut", en: "Scientific publications", sv: "Vetenskapliga publikationer" },
  "Ajankohtaista — tutkimus": { fi: "Ajankohtaista — tutkimus", en: "Current affairs — research", sv: "Aktuellt — forskning" },
  "Tapahtumat":             { fi: "Tapahtumat",           en: "Events",                  sv: "Evenemang" },
  "Toiminta":               { fi: "Toiminta",              en: "Project activities",      sv: "Projektaktiviteter" },
  "Tutkimus":               { fi: "Tutkimus",             en: "Research",                sv: "Forskning" },
  "Uutiskirje":             { fi: "Uutiskirje",           en: "Newsletter",              sv: "Nyhetsbrev" },
  "RSS-syöte":              { fi: "RSS-syöte",            en: "RSS feed",                sv: "RSS-flöde" },

  /* ── External / misc items ───────────────────────────────────────────── */
  "50 myyttiä tekoälystä (PDF)": { fi: "50 myyttiä tekoälystä (PDF)", en: "50 myths about AI (PDF)", sv: "50 myter om AI (PDF)" },
  "Sovellukset gen-ai.fi:ssä":   { fi: "Sovellukset gen-ai.fi:ssä",   en: "Applications at gen-ai.fi", sv: "Verktyg på gen-ai.fi" },
  "SHIELD-ohjelma":              { fi: "SHIELD-ohjelma",               en: "SHIELD programme",         sv: "SHIELD-programmet" },
  "Opas: tietosuoja & sovellukset": { fi: "Opas: tietosuoja & sovellukset", en: "Guide: privacy & apps", sv: "Guide: integritet & appar" }
};

const URL_OVERRIDES = {
  /* ── Internal pages ──────────────────────────────────────────────────── */
  "/":                              { fi: "/",                        en: "/en/",                       sv: "/sv/" },
  "/ajankohtaista/":               { fi: "/ajankohtaista/",          en: "/en/current-affairs/",       sv: "/sv/aktuellt/" },
  "/materiaalit/":                  { fi: "/materiaalit/",            en: "/en/materials/",             sv: "/sv/material/" },
  "/hankkeen-toiminta/":            { fi: "/hankkeen-toiminta/",      en: "/en/activities/",            sv: "/sv/verksamhet/" },
  "/konsortio/":                    { fi: "/konsortio/",              en: "/en/consortium/",            sv: "/sv/konsortium/" },
  "/ollaan-yhteydessa/":            { fi: "/ollaan-yhteydessa/",      en: "/en/get-in-touch/",          sv: "/sv/kontakta-oss/" },
  "/opettajalle/":                  { fi: "/opettajalle/",            en: "/en/for-teachers/",          sv: "/sv/for-larare/" },
  "/tutkijalle/":                   { fi: "/tutkijalle/",             en: "/en/research/",              sv: "/sv/forskning/" },
  "/yleisolle/":                    { fi: "/yleisolle/",              en: "/en/for-everyone/",                     sv: "/sv/for-allmanheten/" },
  "/materiaalit/#tab-julkaisut":    { fi: "/materiaalit/#tab-julkaisut", en: "/en/materials/#tab-julkaisut", sv: "/sv/material/#tab-julkaisut" },
  "/en/activities/":                { fi: "/hankkeen-toiminta/",      en: "/en/activities/",            sv: "/sv/verksamhet/" },
  "/en/what-we-do/":                { fi: "/hankkeen-toiminta/",      en: "/en/activities/",            sv: "/sv/verksamhet/" },

  /* ── External gen-ai.fi tool pages ──────────────────────────────────── */
  "https://www.gen-ai.fi/fi/tools/tm":               { fi: "https://www.gen-ai.fi/fi/tools/tm",               en: "https://www.gen-ai.fi/en/tools/tm",               sv: "https://www.gen-ai.fi/sv/tools/tm" },
  "https://www.gen-ai.fi/fi/tools/somekone":          { fi: "https://www.gen-ai.fi/fi/tools/somekone",          en: "https://www.gen-ai.fi/en/tools/somekone",          sv: "https://www.gen-ai.fi/sv/tools/somekone" },
  "https://www.gen-ai.fi/fi/tools/lm":               { fi: "https://www.gen-ai.fi/fi/tools/lm",               en: "https://www.gen-ai.fi/en/tools/lm",               sv: "https://www.gen-ai.fi/sv/tools/lm" },
  "https://www.gen-ai.fi/fi/tools/bm":               { fi: "https://www.gen-ai.fi/fi/tools/bm",               en: "https://www.gen-ai.fi/en/tools/bm",               sv: "https://www.gen-ai.fi/sv/tools/bm" },
  "https://www.gen-ai.fi/fi/tools/profiling-game":   { fi: "https://www.gen-ai.fi/fi/tools/profiling-game",   en: "https://www.gen-ai.fi/en/tools/profiling-game",   sv: "https://www.gen-ai.fi/sv/tools/profiling-game" },
  "https://www.gen-ai.fi/fi/tools/manipulation-game":{ fi: "https://www.gen-ai.fi/fi/tools/manipulation-game",en: "https://www.gen-ai.fi/en/tools/manipulation-game", sv: "https://www.gen-ai.fi/sv/tools/manipulation-game" },
  "https://www.gen-ai.fi/fi":                        { fi: "https://www.gen-ai.fi/fi",                        en: "https://www.gen-ai.fi/en",                        sv: "https://www.gen-ai.fi/sv" }
};

/* ── Megamenu sidebar description texts ────────────────────────────────── */
const DESCRIPTION_OVERRIDES = {
  "Opettajalle": {
    fi: "Ilmaiset tekoälytyökalut ja oppimateriaalit suoraan luokkahuoneeseen. Ei ohjelmointitaitoja tarvita.",
    en: "Free AI applications and learning materials straight to the classroom. No coding skills needed.",
    sv: "Gratis AI-applikationer och lärmaterial direkt till klassrummet. Inga programmeringskunskaper krävs."
  },
  "Tutkijalle": {
    fi: "Tieteelliset julkaisut, tutkimusagenda ja hankkeen kansainvälinen verkosto.",
    en: "Scientific publications, research agenda and the project's international network.",
    sv: "Vetenskapliga publikationer, forskningsagenda och projektets internationella nätverk."
  },
  "Yleisölle": {
    fi: "Tekoäly tutuksi: ilmainen kirja, sovellukset ja hankkeen uutiset.",
    en: "Get to know AI: free book, applications and project news.",
    sv: "Lär känna AI: gratis bok, applikationer och projektnyheter."
  },
  "Ajankohtaista": {
    fi: "Hankkeen uusimmat uutiset mediasta, tapahtumat, hankkeen toiminta ja tutkimustulokset.",
    en: "The project's latest news from media, events, project activities and research results.",
    sv: "Projektets senaste nyheter från media, evenemang, projektverksamhet och forskningsresultat."
  },
  "Hankkeesta": {
    fi: "Generation AI on STN:n SHIELD-ohjelman rahoittama monitieteinen tutkimushanke.",
    en: "Generation AI is a multidisciplinary research project funded by the Academy of Finland's STN SHIELD programme.",
    sv: "Generation AI är ett tvärvetenskapligt forskningsprojekt finansierat av Finlands Akademis STN SHIELD-program."
  }
};

function splitHash(url = "") {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) {
    return { path: url, hash: "" };
  }

  return {
    path: url.slice(0, hashIndex),
    hash: url.slice(hashIndex)
  };
}

function isInternalUrl(url = "") {
  return url.startsWith("/");
}

function getLocalizedUrl(url, locale, translations) {
  // Check URL_OVERRIDES first — handles both internal and external URLs
  const directOverride = URL_OVERRIDES[url];
  if (directOverride && directOverride[locale]) {
    return directOverride[locale];
  }

  if (!isInternalUrl(url)) return url;

  const { path, hash } = splitHash(url);
  const pathOverride = URL_OVERRIDES[path];
  if (pathOverride && pathOverride[locale]) {
    return `${pathOverride[locale]}${hash}`;
  }
  const localizedTarget = translations.byUrl[path] && translations.byUrl[path][locale];
  if (!localizedTarget || !localizedTarget.url) {
    return url;
  }

  return `${localizedTarget.url}${hash}`;
}

function getLocalizedLabel(originalLabel, url, locale, translations) {
  const override = LABEL_OVERRIDES[originalLabel];
  if (override && override[locale]) {
    return override[locale];
  }

  if (!isInternalUrl(url)) return originalLabel;

  const { path, hash } = splitHash(url);
  // Hash links point to a page section — keep the original label, not the page title
  if (hash) return originalLabel;

  const localizedTarget = translations.byUrl[path] && translations.byUrl[path][locale];
  if (localizedTarget && localizedTarget.title) {
    return localizedTarget.title;
  }

  return originalLabel;
}

function localizeItem(item, locale, translations) {
  const descOverride = DESCRIPTION_OVERRIDES[item.title];
  return {
    ...item,
    title: getLocalizedLabel(item.title, item.url, locale, translations),
    url: getLocalizedUrl(item.url, locale, translations),
    description: descOverride ? (descOverride[locale] || item.description) : item.description,
    children: (item.children || []).map(child => localizeItem(child, locale, translations)),
    megamenuColumns: (item.megamenuColumns || []).map(column => ({
      ...column,
      heading: column.heading ? (LABEL_OVERRIDES[column.heading] ? (LABEL_OVERRIDES[column.heading][locale] || column.heading) : column.heading) : column.heading,
      items: (column.items || []).map(sub => ({
        ...sub,
        label: getLocalizedLabel(sub.label, sub.url, locale, translations),
        url: getLocalizedUrl(sub.url, locale, translations)
      }))
    }))
  };
}

module.exports = function() {
  const translations = buildTranslations();
  const locales = ["fi", "en", "sv"];

  return Object.fromEntries(
    locales.map(locale => [
      locale,
      baseNavigation.map(menu => ({
        ...menu,
        title: getLocalizedLabel(menu.title, "", locale, translations),
        items: (menu.items || []).map(item => localizeItem(item, locale, translations))
      }))
    ])
  );
};
