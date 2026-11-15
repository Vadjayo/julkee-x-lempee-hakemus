/**
 * Ajaa Lighthousen mobiiliasetuksilla tuotanto-osoitetta vasten ja kirjoittaa
 * pisteet tiedostoon src/data/lighthouse.json. Sivu näyttää luvut seuraavassa buildissa.
 *
 *   npm run lighthouse                      astro.config.mjs:n site-osoite
 *   npm run lighthouse -- https://osoite    muu osoite
 *
 * Ajoja on kolme, ja tulokseksi otetaan mediaani. Skripti epäonnistuu, jos
 * suorituskyky on alle 95 tai saavutettavuus tai parhaat käytännöt alle 100.
 */
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const fromConfig = readFileSync('astro.config.mjs', 'utf8').match(/site:\s*'([^']+)'/)?.[1];
const url = process.argv[2] ?? fromConfig;
if (!url) throw new Error('Anna osoite parametrina tai aseta site tiedostoon astro.config.mjs.');

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'] as const;
const LIMITS: Record<string, number> = { performance: 95, accessibility: 100, 'best-practices': 100 };
const RUNS = 3;

const runs: Record<string, number>[] = [];
const failedAudits = new Set<string>();
for (let i = 0; i < RUNS; i++) {
  const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
  try {
    const result = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: [...CATEGORIES] });
    if (!result) throw new Error('Lighthouse ei palauttanut tulosta.');
    const scores: Record<string, number> = {};
    for (const id of CATEGORIES) {
      const category = result.lhr.categories[id]!;
      scores[id] = Math.round((category.score ?? 0) * 100);
      // Kirjaa, mitkä tarkistukset veivät pisteitä (pois lukien noindex, joka on tarkoituksellinen).
      for (const ref of category.auditRefs) {
        const audit = result.lhr.audits[ref.id]!;
        if (ref.weight > 0 && audit.score !== null && audit.score < 0.9) failedAudits.add(`${id}: ${audit.id} (${audit.displayValue ?? audit.score})`);
      }
    }
    runs.push(scores);
    console.log(`Ajo ${i + 1}: ${CATEGORIES.map((id) => `${id} ${scores[id]}`).join(', ')}`);
  } finally {
    chrome.kill();
  }
}

const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
const scores = Object.fromEntries(CATEGORIES.map((id) => [id, median(runs.map((run) => run[id]!))]));
writeFileSync('src/data/lighthouse.json', JSON.stringify({ url, date: new Date().toISOString(), device: 'mobile', runs: RUNS, scores }, null, 2) + '\n');
console.log(`\nMediaani: ${JSON.stringify(scores)}\nKirjoitettu src/data/lighthouse.json`);
if (failedAudits.size) console.log(`Pisteitä veivät:\n  ${[...failedAudits].join('\n  ')}`);

const below = Object.entries(LIMITS).filter(([id, limit]) => scores[id]! < limit);
if (below.length) {
  console.error(`Raja alittui: ${below.map(([id, limit]) => `${id} ${scores[id]} < ${limit}`).join(', ')}`);
  process.exit(1);
}
