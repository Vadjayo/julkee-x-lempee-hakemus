/**
 * Tarkistaa, että kaikki valmiin sivun ulkoiset linkit vastaavat 200.
 * Linkit avataan oikealla selaimella, koska osa palveluista torjuu pelkät HTTP-kutsut.
 *
 *   npm run build && npm run check:links
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const links = [...new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((match) => match[1]!))].filter(
  (url) => !url.startsWith(new URL(html.match(/rel="canonical" href="([^"]+)"/)?.[1] ?? 'https://invalid.invalid').origin),
);

const browser = await chromium.launch();
const context = await browser.newContext({ locale: 'fi-FI' });
let failed = 0;
for (const url of links) {
  let status: number | string;
  try {
    const response = await context.request.get(url, { timeout: 30_000, maxRedirects: 5 });
    status = response.status();
    if (status !== 200) {
      // Toinen yritys oikeana sivulatauksena.
      const page = await context.newPage();
      status = (await page.goto(url, { timeout: 30_000, waitUntil: 'domcontentloaded' }))?.status() ?? 'ei vastausta';
      await page.close();
    }
  } catch (error) {
    status = (error as Error).message.split('\n')[0]!;
  }
  if (status !== 200) failed++;
  console.log(`${status === 200 ? 'OK  ' : 'VIRHE'} ${status}  ${url}`);
}
await browser.close();
console.log(`${links.length - failed}/${links.length} linkkiä vastasi 200.`);
process.exit(failed ? 1 : 0);
