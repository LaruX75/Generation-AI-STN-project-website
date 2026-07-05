/* Kaikkien kuuden Generation AI -sovelluksen data.
 * Rakenne: { fi: [...], en: [...], sv: [...] }
 * Templates käyttävät: sovellukset[lang]
 *
 * Kentät per sovellus:
 *   id          – slug-tunniste
 *   title       – sovelluksen nimi
 *   type        – tyyppilappu (gen-ai-tool-card-type)
 *   status      – "active" | "beta" | "coming"
 *   desc        – täysi kuvaus (materiaalit-sivu)
 *   teacherDesc – opettajalle-sivun kompakti kuvaus
 *   tags        – näyttötagit (luokka-aste, teema)
 *   käsitetagit – hankkeen käsitesanaston termit (fi täytetty; TODO: en/sv)
 *   ryhmäkoko   – "n/a" toistaiseksi; EI näytetä korteissa kun "n/a"
 *   gradeRange  – luokka-aste (K–12 kaikille, toistaiseksi)
 *   image       – kuvaURL (null = coming)
 *   imageAlt    – kuvan alt-teksti
 *   appUrl      – sovelluksen URL
 *   aboutUrl    – gen-ai.fi kuvaussivu
 *   privacyUrl  – tietosuojaseloste
 *   githubUrl   – GitHub (null jos ei saatavilla)
 *   license     – lisenssi (null jos coming)
 *   lessons     – oppituntilinkit [{ text, url }]
 *   featured    – nostetaan opettajalle-sivulle (boolean)
 */

module.exports = {

  /* ── Suomi ───────────────────────────────────────────────────────────── */
  fi: [
    {
      id: "tm",
      title: "Opetettava kone",
      type: "Koneoppiminen",
      status: "active",
      desc: "Tee omia mobiiliappeja koneoppimisen avulla. Oppilas opettaa konetta tunnistamaan kuvia omasta datasta – ilman ohjelmointia.",
      teacherDesc: "Oppilas kouluttaa oman tekoälymallin kuvien, äänen tai asennon avulla. Havainnollistaa koneoppimisen perusidean konkreettisesti.",
      tags: ["Koneoppiminen", "K–12"],
      käsitetagit: ["data", "algoritmi", "koneoppiminen", "opetusdata", "tekoälymalli", "luokittelija", "kuratointi", "vinouma", "hauraus"],
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/tm_screenshot_collage_1b4dfa5288.png",
      imageAlt: "Opetettava kone -sovelluksen näyttökuva",
      appUrl: "https://tm.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/fi/tools/tm",
      privacyUrl: "https://tm.gen-ai.fi/about",
      githubUrl: "https://github.com/knicos/genai-tm",
      license: "MIT",
      lessons: [
        { text: "📚 Tee oma mobiiliappi · 6 oppituntia", url: "https://www.gen-ai.fi/fi/materials/classifier-unit" }
      ],
      featured: true
    },
    {
      id: "somekone",
      title: "Somekone",
      type: "Suosittelualgoritmi",
      status: "active",
      desc: "Miten some suosittelee? Somesimulaattori luokkahuoneita varten. Oppilaat näkevät, miten profilointi muokkaa somevirtaa.",
      teacherDesc: "Sosiaalisen median simulaattori, joka näyttää kuinka algoritmit muokkaavat sitä, mitä näemme – suosittelu, kupla, manipulointi.",
      tags: ["Somealgoritmi", "Medialukutaito", "K–12"],
      käsitetagit: ["data", "algoritmi", "koneoppiminen", "profiili", "suosittelija", "engagement", "vinouma"],
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/somekone_screenshot_collage_17da94877f.png",
      imageAlt: "Somekone-sovelluksen näyttökuva",
      appUrl: "https://somekone.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/fi/tools/somekone",
      privacyUrl: "https://somekone.gen-ai.fi/about",
      githubUrl: "https://github.com/knicos/genai-somekone",
      license: "MIT",
      lessons: [
        { text: "📚 Somekone oppitunnit · 5 oppituntia", url: "https://www.gen-ai.fi/fi/materials/somekone-unit" }
      ],
      featured: true
    },
    {
      id: "lm",
      title: "Pieni kielikone",
      type: "Generatiivinen tekoäly",
      status: "beta",
      desc: "Kouluta oma pieni kielimalli selaimessa. Havainnollistaa, miten kielimallit ennustavat seuraavaa sanaa – ei ohjelmointitaitoja tarvita.",
      teacherDesc: "Tutustuu kielimallien toimintaan: miten tekoäly ennustaa seuraavan sanan ja miksi se toisinaan erehtyy.",
      tags: ["Kielimalli", "Generatiivinen AI", "K–12"],
      käsitetagit: ["koneoppiminen", "opetusdata", "tekoälymalli", "isot kielimallit", "generatiivinen tekoäly", "hauraus"],
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/llm_screenshot_collage_82a45dfa6f.png",
      imageAlt: "Pieni kielikone -sovelluksen näyttökuva",
      appUrl: "https://lm.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/fi/tools/lm",
      privacyUrl: "https://lm.gen-ai.fi/about",
      githubUrl: "https://github.com/knicos/genai-lm",
      license: "MIT",
      lessons: [],
      featured: false
    },
    {
      id: "bm",
      title: "Hajoava kone",
      type: "AI-turvallisuus",
      status: "active",
      desc: "Kilpaile luokkakavereiden kanssa siitä, kuka onnistuu huijaamaan tekoälyä. Opettaa AI-järjestelmien haavoittuvuuksista ja rajoituksista.",
      teacherDesc: "Havainnollistaa tekoälyn haavoittuvuuksia: pieni muutos syötteessä voi johtaa täysin väärään lopputulokseen.",
      tags: ["Adversariaaliset esimerkit", "AI-turvallisuus", "K–12"],
      käsitetagit: ["vinouma", "hauraus"],
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/breakable_machine_screenshot_1a3e444fbf.png",
      imageAlt: "Hajoava kone -sovelluksen näyttökuva",
      appUrl: "https://spoof.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/fi/tools/bm",
      privacyUrl: "https://spoof.gen-ai.fi/about",
      githubUrl: null,
      license: "MIT",
      lessons: [],
      featured: true
    },
    {
      id: "profiling",
      title: "Profilointipeli",
      type: "Tietosuoja & data",
      status: "beta",
      desc: "Opi miten digitaalisista jäljistä rakennetaan profiileja. Pelillinen luokkahuonekokemus yksityisyydestä ja datankeruusta.",
      teacherDesc: "Pelillinen kokemus siitä, miten dataa kerätään ja käytetään käyttäjäprofiilien luomiseen verkossa.",
      tags: ["Yksityisyys", "Data", "K–12"],
      käsitetagit: ["data", "profiili", "suosittelija"],
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/profilinggame_screenshot_collage_a58510867f.png",
      imageAlt: "Profilointipeli-sovelluksen näyttökuva",
      appUrl: "https://classroom.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/fi/tools/profiling-game",
      privacyUrl: "https://classroom.gen-ai.fi/about",
      githubUrl: "https://github.com/knicos/genai-profiling",
      license: "MIT",
      lessons: [
        { text: "📚 Sisältyy Somekone oppitunteihin", url: "https://www.gen-ai.fi/fi/materials/somekone-unit" }
      ],
      featured: false
    },
    {
      id: "manipulation",
      title: "Manipulointipeli",
      type: "Vaikuttamisalgoritmi",
      status: "coming",
      desc: "Onnistutko somevirtaa muokkaamalla muuttamaan ihmisten käytöstä? Ole itse some-alusta ja opi algoritmeista tekijän näkökulmasta.",
      teacherDesc: "Tutkii, miten algoritminen ympäristö voi vaikuttaa mielipiteisiin ja käyttäytymiseen – kriittisen medialukutaidon pohjaksi.",
      tags: ["Somealgoritmi", "K–12"],
      käsitetagit: [],
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: null,
      imageAlt: null,
      appUrl: null,
      aboutUrl: null,
      privacyUrl: null,
      githubUrl: null,
      license: null,
      lessons: [],
      featured: false
    }
  ],

  /* ── English ─────────────────────────────────────────────────────────── */
  en: [
    {
      id: "tm",
      title: "Teachable Machine",
      type: "Machine Learning",
      status: "active",
      desc: "Build your own mobile app using machine learning. Students teach the machine to recognise images from their own data – no coding required.",
      teacherDesc: "Students train their own AI model using images, sound or pose. Demonstrates the core idea of machine learning in a concrete, hands-on way.",
      tags: ["Machine Learning", "K–12"],
      käsitetagit: [], // TODO: translate Finnish concept vocabulary
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/tm_screenshot_collage_1b4dfa5288.png",
      imageAlt: "Teachable Machine app screenshot",
      appUrl: "https://tm.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/en/tools/tm",
      privacyUrl: "https://tm.gen-ai.fi/about",
      githubUrl: "https://github.com/knicos/genai-tm",
      license: "MIT",
      lessons: [
        { text: "📚 Build your own mobile app · 6 lessons", url: "https://www.gen-ai.fi/en/materials/classifier-unit" }
      ],
      featured: true
    },
    {
      id: "somekone",
      title: "Social Media Machine",
      type: "Recommendation Algorithm",
      status: "active",
      desc: "How does social media recommend content? A social media simulator for classrooms. Students see how profiling shapes the social feed.",
      teacherDesc: "A social media simulator that shows how algorithms shape what we see – recommendations, filter bubbles, manipulation.",
      tags: ["Social Algorithm", "Media Literacy", "K–12"],
      käsitetagit: [], // TODO: translate Finnish concept vocabulary
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/somekone_screenshot_collage_17da94877f.png",
      imageAlt: "Social Media Machine app screenshot",
      appUrl: "https://somekone.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/en/tools/somekone",
      privacyUrl: "https://somekone.gen-ai.fi/about",
      githubUrl: "https://github.com/knicos/genai-somekone",
      license: "MIT",
      lessons: [
        { text: "📚 Social Media Machine lessons · 5 lessons", url: "https://www.gen-ai.fi/en/materials/somekone-unit" }
      ],
      featured: true
    },
    {
      id: "lm",
      title: "Small Language Machine",
      type: "Generative AI",
      status: "beta",
      desc: "Train your own small language model in the browser. Demonstrates how language models predict the next word – no coding skills needed.",
      teacherDesc: "Explores how language models work: how AI predicts the next word and why it sometimes gets it wrong.",
      tags: ["Language Model", "Generative AI", "K–12"],
      käsitetagit: [], // TODO: translate Finnish concept vocabulary
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/llm_screenshot_collage_82a45dfa6f.png",
      imageAlt: "Small Language Machine app screenshot",
      appUrl: "https://lm.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/en/tools/lm",
      privacyUrl: "https://lm.gen-ai.fi/about",
      githubUrl: "https://github.com/knicos/genai-lm",
      license: "MIT",
      lessons: [],
      featured: false
    },
    {
      id: "bm",
      title: "Breakable Machine",
      type: "AI Safety",
      status: "beta",
      desc: "Compete with classmates to see who can fool the AI. Teaches about the vulnerabilities and limitations of AI systems.",
      teacherDesc: "Illustrates AI vulnerabilities: a small change in input can lead to a completely wrong outcome.",
      tags: ["Adversarial Examples", "AI Safety", "K–12"],
      käsitetagit: [], // TODO: translate Finnish concept vocabulary
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/breakable_machine_screenshot_1a3e444fbf.png",
      imageAlt: "Breakable Machine app screenshot",
      appUrl: "https://spoof.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/en/tools/bm",
      privacyUrl: "https://spoof.gen-ai.fi/about",
      githubUrl: null,
      license: "MIT",
      lessons: [],
      featured: true
    },
    {
      id: "profiling",
      title: "Profiling Game",
      type: "Privacy & Data",
      status: "beta",
      desc: "Learn how digital traces are used to build profiles. A game-based classroom experience of privacy and data collection.",
      teacherDesc: "A game-based experience of how data is collected and used to create user profiles online.",
      tags: ["Privacy", "Data", "K–12"],
      käsitetagit: [], // TODO: translate Finnish concept vocabulary
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/profilinggame_screenshot_collage_a58510867f.png",
      imageAlt: "Profiling Game app screenshot",
      appUrl: "https://classroom.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/en/tools/profiling-game",
      privacyUrl: "https://classroom.gen-ai.fi/about",
      githubUrl: "https://github.com/knicos/genai-profiling",
      license: "MIT",
      lessons: [
        { text: "📚 Included in Social Media Machine lessons", url: "https://www.gen-ai.fi/en/materials/somekone-unit" }
      ],
      featured: false
    },
    {
      id: "manipulation",
      title: "Manipulation Game",
      type: "Influence Algorithm",
      status: "coming",
      desc: "Can you change people's behaviour by shaping the social feed? Be the platform and learn about algorithms from the creator's perspective.",
      teacherDesc: "Explores how an algorithmic environment can influence opinions and behaviour – a foundation for critical media literacy.",
      tags: ["Social Algorithm", "K–12"],
      käsitetagit: [],
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: null,
      imageAlt: null,
      appUrl: null,
      aboutUrl: null,
      privacyUrl: null,
      githubUrl: null,
      license: null,
      lessons: [],
      featured: false
    }
  ],

  /* ── Svenska ─────────────────────────────────────────────────────────── */
  sv: [
    {
      id: "tm",
      title: "Undervisbar maskin",
      type: "Maskininlärning",
      status: "active",
      desc: "Bygg egna mobilappar med maskininlärning. Eleven lär maskinen att känna igen bilder från egna data – utan programmering.",
      teacherDesc: "Eleverna tränar en egen AI-modell med bilder, ljud eller rörelser. Illustrerar grundidén bakom maskininlärning på ett konkret sätt.",
      tags: ["Maskininlärning", "K–12"],
      käsitetagit: [], // TODO: translate Finnish concept vocabulary
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/tm_screenshot_collage_1b4dfa5288.png",
      imageAlt: "Skärmdump av appen Undervisbar maskin",
      appUrl: "https://tm.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/sv/tools/tm",
      privacyUrl: "https://tm.gen-ai.fi/about",
      githubUrl: "https://github.com/knicos/genai-tm",
      license: "MIT",
      lessons: [
        { text: "📚 Bygg din egen mobilapp · 6 lektioner", url: "https://www.gen-ai.fi/sv/materials/classifier-unit" }
      ],
      featured: true
    },
    {
      id: "somekone",
      title: "Sociala medier-maskin",
      type: "Rekommendationsalgoritm",
      status: "active",
      desc: "Hur rekommenderar sociala medier innehåll? En simulator för klassrum. Eleverna ser hur profilering formar flödet.",
      teacherDesc: "En simulator för sociala medier som visar hur algoritmer formar vad vi ser – rekommendationer, filterbubblor, manipulation.",
      tags: ["Sociala algoritmer", "Medieläskunnighet", "K–12"],
      käsitetagit: [], // TODO: translate Finnish concept vocabulary
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/somekone_screenshot_collage_17da94877f.png",
      imageAlt: "Skärmdump av appen Sociala medier-maskin",
      appUrl: "https://somekone.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/sv/tools/somekone",
      privacyUrl: "https://somekone.gen-ai.fi/about",
      githubUrl: "https://github.com/knicos/genai-somekone",
      license: "MIT",
      lessons: [
        { text: "📚 Sociala medier-maskinens lektioner · 5 lektioner", url: "https://www.gen-ai.fi/sv/materials/somekone-unit" }
      ],
      featured: true
    },
    {
      id: "lm",
      title: "Liten språkmaskin",
      type: "Generativ AI",
      status: "beta",
      desc: "Träna en egen liten språkmodell i webbläsaren. Visar hur språkmodeller förutsäger nästa ord – inga programmeringskunskaper behövs.",
      teacherDesc: "Utforskar hur språkmodeller fungerar: hur AI förutsäger nästa ord och varför det ibland har fel.",
      tags: ["Språkmodell", "Generativ AI", "K–12"],
      käsitetagit: [], // TODO: translate Finnish concept vocabulary
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/llm_screenshot_collage_82a45dfa6f.png",
      imageAlt: "Skärmdump av appen Liten språkmaskin",
      appUrl: "https://lm.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/sv/tools/lm",
      privacyUrl: "https://lm.gen-ai.fi/about",
      githubUrl: "https://github.com/knicos/genai-lm",
      license: "MIT",
      lessons: [],
      featured: false
    },
    {
      id: "bm",
      title: "Söndermaskin",
      type: "AI-säkerhet",
      status: "beta",
      desc: "Tävla med klasskompisar om vem som lyckas lura AI:n. Lär ut om AI-systems sårbarheter och begränsningar.",
      teacherDesc: "Illustrerar AI:s sårbarheter: en liten förändring i indata kan leda till ett helt felaktigt resultat.",
      tags: ["Adversariella exempel", "AI-säkerhet", "K–12"],
      käsitetagit: [], // TODO: translate Finnish concept vocabulary
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/breakable_machine_screenshot_1a3e444fbf.png",
      imageAlt: "Skärmdump av appen Söndermaskin",
      appUrl: "https://spoof.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/sv/tools/bm",
      privacyUrl: "https://spoof.gen-ai.fi/about",
      githubUrl: null,
      license: "MIT",
      lessons: [],
      featured: true
    },
    {
      id: "profiling",
      title: "Profileringsspel",
      type: "Integritet & data",
      status: "beta",
      desc: "Lär dig hur digitala spår används för att bygga profiler. En spelbaserad klassrumsupplevelse om integritet och datainsamling.",
      teacherDesc: "En spelbaserad upplevelse av hur data samlas in och används för att skapa användarprofiler online.",
      tags: ["Integritet", "Data", "K–12"],
      käsitetagit: [], // TODO: translate Finnish concept vocabulary
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: "https://strapi.gen-ai.fi/uploads/profilinggame_screenshot_collage_a58510867f.png",
      imageAlt: "Skärmdump av appen Profileringsspel",
      appUrl: "https://classroom.gen-ai.fi",
      aboutUrl: "https://www.gen-ai.fi/sv/tools/profiling-game",
      privacyUrl: "https://classroom.gen-ai.fi/about",
      githubUrl: "https://github.com/knicos/genai-profiling",
      license: "MIT",
      lessons: [
        { text: "📚 Ingår i Sociala medier-maskinens lektioner", url: "https://www.gen-ai.fi/sv/materials/somekone-unit" }
      ],
      featured: false
    },
    {
      id: "manipulation",
      title: "Manipuleringsspel",
      type: "Påverkansalgoritm",
      status: "coming",
      desc: "Kan du förändra människors beteende genom att forma flödet? Var plattformen och lär dig om algoritmer ur skaparens perspektiv.",
      teacherDesc: "Utforskar hur en algoritmisk miljö kan påverka åsikter och beteende – som grund för kritisk medieläskunnighet.",
      tags: ["Sociala algoritmer", "K–12"],
      käsitetagit: [],
      ryhmäkoko: "n/a",
      gradeRange: "K–12",
      image: null,
      imageAlt: null,
      appUrl: null,
      aboutUrl: null,
      privacyUrl: null,
      githubUrl: null,
      license: null,
      lessons: [],
      featured: false
    }
  ]
};
