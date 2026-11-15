/**
 * Kielitarkistus: lähdekoodissa ei saa olla ajatusviivoja (U+2014, U+2013),
 * eikä yksikään otsikko saa päättyä pisteeseen tai huutomerkkiin.
 *
 *   npm run build && npm run check:text
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const DASHES = /[\u2013\u2014]/;
const AUTHENTIC = 'src/data/agent-message.ts';
const TEXT_FILE = /\.(astro|ts|mjs|js|json|css|md|html|svg|txt|example)$|^\.gitignore$/;

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  // Agentin aito viesti näytetään muokkaamattomana, joten sen ajatusviivat sallitaan.
  .filter((file) => TEXT_FILE.test(file) && file !== 'package-lock.json' && file !== AUTHENTIC && existsSync(file));

const problems: string[] = [];
for (const file of files) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      if (DASHES.test(line)) problems.push(`${file}:${index + 1} ajatusviiva: ${line.trim().slice(0, 80)}`);
    });
}

const built = 'dist/index.html';
if (!existsSync(built)) {
  console.error('dist/index.html puuttuu. Aja ensin npm run build.');
  process.exit(1);
}
const html = readFileSync(built, 'utf8');
// Sama poikkeus valmiissa sivussa: agentin viestikupla jätetään tarkistuksen ulkopuolelle.
const ownText = html.replace(/<div class="msg"[\s\S]*?<\/div>/, '');
if (DASHES.test(ownText)) problems.push(`${built}: ajatusviiva valmiissa sivussa`);
const headings = [...html.matchAll(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/g)].map((match) =>
  match[2]!.replace(/<span class="visually-hidden[^>]*>[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace('↗', '').trim(),
);
for (const heading of headings) {
  if (/[.!]$/.test(heading) && !/\.fi$/.test(heading)) problems.push(`otsikko päättyy välimerkkiin: "${heading}"`);
}

console.log(`Tarkistettu ${files.length} tiedostoa ja ${headings.length} otsikkoa.`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Ei ajatusviivoja, ei pisteeseen tai huutomerkkiin päättyviä otsikoita.');
