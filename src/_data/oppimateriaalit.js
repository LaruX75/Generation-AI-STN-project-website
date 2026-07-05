/* Generation AI -oppimateriaalit ja opetuskokonaisuudet.
 * Rakenne: taulukko — filtteröidään lang-kentän perusteella.
 * type: "opas" | "oppituntikokonaisuus"
 * lang: kieliversiot joilla kortti näytetään, esim. ["fi"] tai ["fi","en","sv"]
 * Templates käyttävät: {% for unit in oppimateriaalit %}{% if lang in unit.lang %}
 */

module.exports = [

  /* ── Taustamateriaalit / oppaat ──────────────────────────────────────── */
  {
    id: "basics",
    type: "opas",
    lang: ["fi"],
    title: {
      fi: "Mikä tekoäly? — Perusteet opettajalle",
    },
    typeLabel: {
      fi: "Opas",
    },
    desc: {
      fi: "Opettajan taustamateriaali tekoälyn perusteista: mitä tekoäly on ja missä sitä arjessa kohtaa (luokittelijat, suosittelijat, profilointi, generatiivinen tekoäly), tekoälyopetuksen CEDE-malli sekä keskeisten käsitteiden sanasto, joka linkittää käsitteet Generation AI -sovelluksiin.",
    },
    duration: null,
    appTags: {
      fi: [],
    },
    url: {
      fi: "https://gen-ai.fi/fi/materials/basics",
    },
    linkLabel: {
      fi: "Avaa oppimateriaali ↗",
    },
  },

  /* ── Opetuskokonaisuudet ─────────────────────────────────────────────── */
  {
    id: "classifier-unit",
    type: "oppituntikokonaisuus",
    lang: ["fi", "en", "sv"],
    title: {
      fi: "Tee oma mobiiliappi",
      en: "Build Your Own Mobile App",
      sv: "Bygg din egen mobilapp",
    },
    typeLabel: {
      fi: "Opetuskokonaisuus",
      en: "Teaching Unit",
      sv: "Undervisningsenhet",
    },
    desc: {
      fi: "Valmis 6 oppitunnin kokonaisuus Opetettava kone -sovellukselle. Oppilaat rakentavat oman koneoppimiseen perustuvan mobiiliapplikaation — ilman ohjelmointia.",
      en: "A complete 6-lesson unit for the Teachable Machine app. Students build their own machine learning-based mobile application — no coding required.",
      sv: "En komplett enhet med 6 lektioner för appen Undervisbar maskin. Eleverna bygger en egen mobilapplikation baserad på maskininlärning — utan programmering.",
    },
    duration: 6,
    durationLabel: {
      fi: "oppituntia",
      en: "lessons",
      sv: "lektioner",
    },
    appTags: {
      fi: ["Opetettava kone"],
      en: ["Teachable Machine"],
      sv: ["Undervisbar maskin"],
    },
    url: {
      fi: "https://www.gen-ai.fi/fi/materials/classifier-unit",
      en: "https://www.gen-ai.fi/en/materials/classifier-unit",
      sv: "https://www.gen-ai.fi/sv/materials/classifier-unit",
    },
    linkLabel: {
      fi: "Avaa oppimateriaali ↗",
      en: "Open learning material ↗",
      sv: "Öppna läromedel ↗",
    },
  },

  {
    id: "somekone-unit",
    type: "oppituntikokonaisuus",
    lang: ["fi", "en", "sv"],
    title: {
      fi: "Somekone oppitunnit",
      en: "Social Media Machine Lessons",
      sv: "Sociala medier-maskinens lektioner",
    },
    typeLabel: {
      fi: "Opetuskokonaisuus",
      en: "Teaching Unit",
      sv: "Undervisningsenhet",
    },
    desc: {
      fi: "Valmis 5 oppitunnin kokonaisuus Somekone- ja Profilointipeli-sovelluksille. Oppilaat tutkivat somealgoritmin toimintaa ja tietosuojakysymyksiä.",
      en: "A complete 5-lesson unit for the Social Media Machine and Profiling Game apps. Students explore how social algorithms work and privacy issues.",
      sv: "En komplett enhet med 5 lektioner för apparna Sociala medier-maskin och Profileringsspel. Eleverna utforskar hur sociala algoritmer fungerar och integritetsfrågor.",
    },
    duration: 5,
    durationLabel: {
      fi: "oppituntia",
      en: "lessons",
      sv: "lektioner",
    },
    appTags: {
      fi: ["Somekone", "Profilointipeli"],
      en: ["Social Media Machine", "Profiling Game"],
      sv: ["Sociala medier-maskin", "Profileringsspel"],
    },
    url: {
      fi: "https://www.gen-ai.fi/fi/materials/somekone-unit",
      en: "https://www.gen-ai.fi/en/materials/somekone-unit",
      sv: "https://www.gen-ai.fi/sv/materials/somekone-unit",
    },
    linkLabel: {
      fi: "Avaa oppimateriaali ↗",
      en: "Open learning material ↗",
      sv: "Öppna läromedel ↗",
    },
  },

];
