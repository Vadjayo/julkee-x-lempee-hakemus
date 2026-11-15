/**
 * Kaappaa projektien esikatselut oikeilta sivuilta.
 *
 *   npm run capture            kaikki kohteet
 *   npm run capture -- pahkala vain kohteet, joiden tunnus sisältää sanan
 *
 * Tulokset:
 *   src/assets/captures/<tunnus>-desktop.jpg   koko sivu, leveys 1440 px
 *   src/assets/captures/<tunnus>-mobile.jpg    koko sivu, leveys 390 px
 *   public/video/<tunnus>.webm ja .mp4         ruutunauhoitus (vain sovellukset)
 *
 * Skripti pysähtyy virheeseen, jos sivu ei aukea tai kaappaus näyttää tyhjältä.
 * Rikkinäistä esikatselua ei tallenneta hiljaa.
 */
import { chromium, type Browser, type Page } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

type Segment = { from: number; to: number };

type Target = {
  slug: string;
  url: string;
  /**
   * Sovelluksen käyttö nauhoitusta varten. Jos puuttuu, videota ei tehdä.
   * Palauttaa videoon otettavat jaksot sekunteina sivun latauksen jälkeen.
   * Näin palvelimen odottelu voidaan leikata pois.
   */
  record?: (page: Page, now: () => number) => Promise<Segment[]>;
};

const TARGETS: Target[] = [
  { slug: 'govuokatti', url: 'https://govuokatti.fi/' },
  { slug: 'piecengo', url: 'https://piecengo.fi/' },
  { slug: 'pahkalaranch', url: 'https://pahkalaranch.fi/fi' },
  { slug: 'pekkapudas', url: 'https://www.pekkapudas.fi/' },
  { slug: 'reskontratutka', url: 'https://reskontratutka.vercel.app/', record: recordReskontratutka },
];

const IMG_DIR = 'src/assets/captures';
const VIDEO_DIR = 'public/video';
const TMP_DIR = '.capture-tmp';
// Pituusraja pitää esikatselukuvat kevyinä: ensimmäinen lataus saa olla enintään 300 kt.
const MAX_DESKTOP_HEIGHT = 3800;
const MAX_MOBILE_HEIGHT = 3000;
const MAX_VIDEO_SECONDS = 10;
const MAX_VIDEO_BYTES = 1.5 * 1024 * 1024;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Vierittää sivun läpi, jotta laiskasti ladattavat kuvat ja ilmestymisanimaatiot ehtivät valmiiksi. */
async function settle(page: Page): Promise<number> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = 600;
  for (let y = 0; y <= height; y += step) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await sleep(180);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(800);
  return page.evaluate(() => document.documentElement.scrollHeight);
}

/** Sulkee evästeilmoituksen, jos sellainen on. */
async function dismissBanners(page: Page): Promise<void> {
  const button = page
    .getByRole('button', { name: /^(hyväksy|hyväksyn|accept|selvä|ok|vain välttämättömät|salli)/i })
    .first();
  if (await button.isVisible().catch(() => false)) {
    await button.click().catch(() => {});
    await sleep(400);
  }
}

async function screenshot(browser: Browser, target: Target, kind: 'desktop' | 'mobile'): Promise<void> {
  const desktop = kind === 'desktop';
  const context = await browser.newContext({
    viewport: desktop ? { width: 1440, height: 900 } : { width: 390, height: 844 },
    deviceScaleFactor: desktop ? 1 : 2,
    isMobile: !desktop,
    hasTouch: !desktop,
    locale: 'fi-FI',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const response = await page.goto(target.url, { waitUntil: 'networkidle', timeout: 45_000 });
  if (!response || response.status() !== 200) {
    throw new Error(`${target.slug}: sivu vastasi ${response?.status() ?? 'ei mitään'}`);
  }
  await dismissBanners(page);
  const fullHeight = await settle(page);
  const viewport = page.viewportSize()!;
  if (fullHeight < viewport.height) {
    throw new Error(`${target.slug}: sivu on vain ${fullHeight} px korkea, jokin on rikki`);
  }
  const height = Math.min(fullHeight, desktop ? MAX_DESKTOP_HEIGHT : MAX_MOBILE_HEIGHT);
  const file = join(IMG_DIR, `${target.slug}-${kind}.jpg`);
  await page.screenshot({
    path: file,
    type: 'jpeg',
    quality: 88,
    fullPage: true,
    clip: { x: 0, y: 0, width: viewport.width, height },
  });
  await context.close();

  // Lähes tyhjä kuva pakkautuu hyvin pieneksi. Se on merkki rikkinäisestä sivusta.
  const bytesPerPixelRow = statSync(file).size / height;
  if (bytesPerPixelRow < 12) {
    throw new Error(`${target.slug}: ${kind}-kaappaus näyttää tyhjältä (${statSync(file).size} tavua)`);
  }
  console.log(`  ${file}  ${viewport.width}x${height}  ${(statSync(file).size / 1024).toFixed(0)} kt`);
}

async function recordReskontratutka(page: Page, now: () => number): Promise<Segment[]> {
  // Jakso 1: syötä Y-tunnus ja käynnistä skannaus.
  const first = { from: now(), to: 0 };
  const input = page.getByRole('textbox').first();
  await input.click();
  await input.pressSequentially('0112038-9', { delay: 120 });
  await sleep(500);
  await page.getByRole('button', { name: /skannaa/i }).first().click();
  await sleep(1300);
  first.to = now();

  // Odota, että skannaus valmistuu. Odotus leikataan videosta pois.
  await page.getByRole('button', { name: /^skannaa$/i }).first().waitFor({ state: 'visible', timeout: 90_000 });
  await sleep(300);

  // Jakso 2: tulos, rivin avaus ja vieritys.
  const second = { from: now() - 0.3, to: 0 };
  await sleep(1500);
  const row = page.getByText('0112038-9').last();
  if (await row.isVisible().catch(() => false)) await row.click().catch(() => {});
  await sleep(1600);
  await page.mouse.wheel(0, 360);
  await sleep(2200);
  second.to = now();
  return [first, second];
}

async function record(browser: Browser, target: Target): Promise<void> {
  if (!target.record) return;
  rmSync(TMP_DIR, { recursive: true, force: true });
  const size = { width: 1280, height: 800 };
  const context = await browser.newContext({
    viewport: size,
    locale: 'fi-FI',
    recordVideo: { dir: TMP_DIR, size },
  });
  const page = await context.newPage();
  const started = Date.now();
  await page.goto(target.url, { waitUntil: 'networkidle', timeout: 45_000 });
  await dismissBanners(page);
  const lead = (Date.now() - started) / 1000;
  const now = () => (Date.now() - started) / 1000;
  const segments = await target.record(page, now);
  await context.close();
  void lead;

  const raw = readdirSync(TMP_DIR).find((f) => f.endsWith('.webm'));
  if (!raw) throw new Error(`${target.slug}: nauhoitusta ei syntynyt`);
  const input = join(TMP_DIR, raw);
  // Pidä vain valitut jaksot ja rajaa kokonaiskesto.
  const select = segments.map((x) => `between(t,${x.from.toFixed(2)},${x.to.toFixed(2)})`).join('+');
  const filter = `fps=24,select='${select}',setpts=N/24/TB,scale=960:-2`;
  const common = ['-y', '-loglevel', 'error', '-i', input, '-t', String(MAX_VIDEO_SECONDS), '-an', '-vf', filter];
  const webm = join(VIDEO_DIR, `${target.slug}.webm`);
  const mp4 = join(VIDEO_DIR, `${target.slug}.mp4`);
  execFileSync('ffmpeg', [...common, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', webm]);
  execFileSync('ffmpeg', [...common, '-c:v', 'libx264', '-crf', '30', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
  rmSync(TMP_DIR, { recursive: true, force: true });

  for (const file of [webm, mp4]) {
    const bytes = statSync(file).size;
    if (bytes > MAX_VIDEO_BYTES) throw new Error(`${file} on ${(bytes / 1024 / 1024).toFixed(2)} Mt, raja on 1,5 Mt`);
    console.log(`  ${file}  ${(bytes / 1024).toFixed(0)} kt`);
  }
}

const filter = process.argv[2];
const targets = TARGETS.filter((t) => !filter || t.slug.includes(filter));
if (targets.length === 0) {
  console.error(`Ei kohdetta tunnuksella "${filter}". Vaihtoehdot: ${TARGETS.map((t) => t.slug).join(', ')}`);
  process.exit(1);
}

mkdirSync(IMG_DIR, { recursive: true });
mkdirSync(VIDEO_DIR, { recursive: true });
const browser = await chromium.launch();
try {
  for (const target of targets) {
    console.log(target.url);
    await screenshot(browser, target, 'desktop');
    await screenshot(browser, target, 'mobile');
    await record(browser, target);
  }
} catch (error) {
  console.error(`\nKAAPPAUS KESKEYTYI: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
