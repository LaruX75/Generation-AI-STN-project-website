const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const dir = './content/posts';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.njk'));

const mediaKw = ['Hanke mediassa', 'Media', 'Haastattelu'];
const tapKw = ['Tapahtuma', 'Konferenssit ja seminaarit', 'Webinaari', 'Työpaja'];

const overlap = [];
const unmatched = [];
const summary = { Mediassa: 0, Tapahtumat: 0, Toiminta: 0, Tutkimus: 0 };

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const { data } = matter(content);
  const allCats = [
    data.mainCategory,
    ...(data.subCategories || []),
    ...(data.extraCategories || [])
  ].filter(Boolean);

  const isMedia = allCats.some(c => mediaKw.includes(c));
  const isTap = allCats.some(c => tapKw.includes(c));
  const isToiminta = data.mainCategory === 'Hankkeen toiminta';
  const isTutkimus = data.mainCategory === 'Tutkimus';

  if (isMedia && isTap) {
    overlap.push(f + '\n    cats: ' + allCats.join(', '));
  }

  if (isToiminta) summary.Toiminta++;
  else if (isTutkimus) summary.Tutkimus++;
  else if (isTap) summary.Tapahtumat++;
  else if (isMedia) summary.Mediassa++;
  else unmatched.push(f + ' | mainCat: ' + data.mainCategory + ' | cats: ' + allCats.join(', '));
});

console.log('\n=== YHTEENVETO ===');
Object.entries(summary).forEach(([k, v]) => console.log(' ', k + ':', v));
console.log('\n=== PÄÄLLEKKÄISET (sekä media että tapahtumat) ===', overlap.length);
overlap.forEach(x => console.log(' ', x));
console.log('\n=== EI TUNNISTETTU ===', unmatched.length);
unmatched.forEach(x => console.log(' ', x));
