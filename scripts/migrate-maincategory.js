/**
 * Migrate Finnish posts: set mainCategory to one of
 * Mediassa | Tapahtumat | Toiminta | Tutkimus
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const dir = path.resolve('./content/posts');

const mediaKw = [
  'Hanke mediassa', 'Media', 'Haastattelu'
];
const tapKw = [
  'Tapahtuma',
  'Konferenssit ja seminaarit', 'Webinaari', 'Työpaja'
];

// Manual overrides for the 13 unmatched + 2 overlapping posts
const manual = {
  '2020-08-17-tekoaly-helpottaa-ja-tehostaa-tyontekoa-mutta-ei-korvaa-ihmista.md': 'Mediassa',
  '2023-01-19-tekoalyn-roolin-kasvaessa-yhteiskunnassa-lasten-ja-nuorten-osaamista-tulee-kehittaa-jo-esi-ja-perusopetuksessa.njk': 'Toiminta',
  '2023-02-07-yle-podcast-kohistu-chat-gpt-on-tehokas-arvauskone-jonka-uskotaan-mullistavan-asiantuntijatyon.md': 'Mediassa',
  '2023-05-22-susanna-lindroos-hovinheimo-tekoalyasetuksen-uusia-vaiheita-parlamentin-nakemykset-laajentavat-saantelya.md': 'Mediassa',
  '2023-09-01-otava-opisto-miten-kone-oppii-genai-tyokalu-mukana-opiston-tulevaisuuspaivassa-1-9-2023.md': 'Tapahtumat',
  '2023-09-07-perhetapahtuma-tuo-heurekaan-tekoalya-ja-robotteja-ennakko-osaamista-ei-tarvita-avoimella-mielella-parjaa-hyvin.md': 'Tapahtumat',
  '2023-09-12-lasten-oikeuksia-ei-ole-otettu-riittavasti-huomioon-eun-tekoalyasetuksessa.md': 'Tutkimus',
  '2023-11-05-tekoalykuulumiset-11a-2023-genai-opetettava-kone-on-viimeistelya-vaille-valmis-ja-oppimateriaalit-ovat-tyon-alla.md': 'Toiminta',
  '2023-11-20-lasten-oikeudet-toteutuvat-vaihtelevasti-internetissa.md': 'Tutkimus',
  '2023-12-16-hs-mielipide-tekoaly-haastaa-jo-nyt-opettajia-ja-oppilaita.md': 'Mediassa',
  '2024-04-02-susanna-lindroos-hovinheimo-minkalainen-tekoalyasetuksesta-tuli-perustuslakiblogi.md': 'Mediassa',
  '2024-04-25-waie-monthly-ai-expert-webinar-series.njk': 'Tapahtumat',
  '2024-07-03-icalt2024-paras-julkaisu-a-no-code-ai-education-tool-for-learning-ai-in-k-12-by-making-machine-learning-driven-apps.njk': 'Tutkimus',
  '2024-10-03-julkaisu-datafikoituva-peruskoulu-tasapainoilua-lapsen-henkilotietojen-suojan-ja-opetuksen-tavoitteiden-valilla.njk': 'Tutkimus',
  '2025-05-27-lasten-ja-nuorten-tekoalylukutaitoa-edistava-generation-ai-hanke-on-voittanut-vuoden-2025-kansallisen-vuoden-avoin-oppimateriaali-palkinnon.njk': 'Toiminta',
};

const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.njk'));
const results = [];

files.forEach(f => {
  const filepath = path.join(dir, f);
  const raw = fs.readFileSync(filepath, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data;

  // Determine new mainCategory
  let newCat;
  if (manual[f]) {
    newCat = manual[f];
  } else if (data.mainCategory === 'Hankkeen toiminta') {
    newCat = 'Toiminta';
  } else if (data.mainCategory === 'Tutkimus') {
    newCat = 'Tutkimus';
  } else {
    const allCats = [
      data.mainCategory,
      ...(data.subCategories || []),
      ...(data.extraCategories || [])
    ].filter(Boolean);
    if (allCats.some(c => tapKw.includes(c))) newCat = 'Tapahtumat';
    else if (allCats.some(c => mediaKw.includes(c))) newCat = 'Mediassa';
  }

  if (!newCat) {
    results.push({ f, status: 'SKIPPED', old: data.mainCategory });
    return;
  }

  if (data.mainCategory === newCat) {
    results.push({ f, status: 'unchanged', old: data.mainCategory });
    return;
  }

  // Update mainCategory in frontmatter
  parsed.data.mainCategory = newCat;

  // Rebuild file: gray-matter stringify preserves existing format
  const updated = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(filepath, updated);
  results.push({ f, status: 'updated', old: data.mainCategory, new: newCat });
});

// Print summary
const updated = results.filter(r => r.status === 'updated');
const skipped = results.filter(r => r.status === 'SKIPPED');
const unchanged = results.filter(r => r.status === 'unchanged');

console.log('\nUpdated:', updated.length);
updated.forEach(r => console.log(' ', r.f.padEnd(80), r.old, '->', r.new));
console.log('\nUnchanged:', unchanged.length);
console.log('Skipped:', skipped.length);
skipped.forEach(r => console.log(' ', r.f, '| mainCat:', r.old));
