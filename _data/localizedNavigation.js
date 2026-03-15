const baseNavigation = require("./navigation.json");
const buildTranslations = require("./translations.js");

const LABEL_OVERRIDES = {
  "Etusivu": { fi: "Etusivu", en: "Home", sv: "Startsida" },
  "Ajankohtaista": { fi: "Ajankohtaista", en: "Current affairs", sv: "Aktuellt" },
  "Materiaalit": { fi: "Materiaalit", en: "Materials", sv: "Material" },
  "Toiminta": { fi: "Toiminta", en: "What we do", sv: "Verksamhet" },
  "Konsortio": { fi: "Konsortio", en: "Consortium", sv: "Konsortium" },
  "Ole yhteydessä": { fi: "Ole yhteydessä", en: "Get in touch", sv: "Kontakta oss" },
  "Opettajalle": { fi: "Opettajalle", en: "For teachers", sv: "För lärare" },
  "Yleistajuiset julkaisut": { fi: "Yleistajuiset julkaisut", en: "Popular publications", sv: "Populärvetenskapliga publikationer" },
  "Tutkijalle": { fi: "Tutkijalle", en: "Research", sv: "Forskning" },
  "Yleisölle": { fi: "Yleisölle", en: "For everyone", sv: "För allmänheten" },
  "Toiminta sisältö": { fi: "Toiminta", en: "What we do", sv: "Verksamhet" }
};

const URL_OVERRIDES = {
  "/": { fi: "/", en: "/en/home/", sv: "/sv/startsida/" },
  "/ajankohtaista/": { fi: "/ajankohtaista/", en: "/en/current-affairs/", sv: "/sv/aktuellt/" },
  "/materiaalit/": { fi: "/materiaalit/", en: "/en/materials/", sv: "/sv/material/" },
  "/hankkeen-toiminta/": { fi: "/hankkeen-toiminta/", en: "/en/what-we-do/", sv: "/sv/verksamhet/" },
  "/konsortio/": { fi: "/konsortio/", en: "/en/consortium/", sv: "/sv/konsortium/" },
  "/ollaan-yhteydessa/": { fi: "/ollaan-yhteydessa/", en: "/en/get-in-touch/", sv: "/sv/kontakta-oss/" },
  "/opettajalle/": { fi: "/opettajalle/", en: "/en/for-teachers/", sv: "/sv/for-larare/" },
  "/generation-ai-hankkeessa-tehtava-tutkimus/": { fi: "/generation-ai-hankkeessa-tehtava-tutkimus/", en: "/en/research/", sv: "/sv/forskning/" },
  "/tietoa-tekoalysta-kenelle-tahansa/": { fi: "/tietoa-tekoalysta-kenelle-tahansa/", en: "/en/generation-ai-project-in-the-media/", sv: "/sv/generation-ai-projektet-i-media/" },
  "/materiaalit/#tab-julkaisut": { fi: "/materiaalit/#tab-julkaisut", en: "/en/materials/#tab-julkaisut", sv: "/sv/material/#tab-julkaisut" }
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
  if (!isInternalUrl(url)) return url;

  const directOverride = URL_OVERRIDES[url];
  if (directOverride && directOverride[locale]) {
    return directOverride[locale];
  }

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

  const { path } = splitHash(url);
  const localizedTarget = translations.byUrl[path] && translations.byUrl[path][locale];
  if (localizedTarget && localizedTarget.title) {
    return localizedTarget.title;
  }

  return originalLabel;
}

function localizeItem(item, locale, translations) {
  return {
    ...item,
    title: getLocalizedLabel(item.title, item.url, locale, translations),
    url: getLocalizedUrl(item.url, locale, translations),
    children: (item.children || []).map(child => localizeItem(child, locale, translations)),
    megamenuColumns: (item.megamenuColumns || []).map(column => ({
      ...column,
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
