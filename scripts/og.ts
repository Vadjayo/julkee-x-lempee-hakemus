/**
 * Tekee linkin esikatselukuvan (1200 x 630) tiedostoon public/og.png.
 * Kuva näkyy, kun sivun linkki jaetaan esimerkiksi Slackissa, Teamsissa tai WhatsAppissa.
 *
 *   npm run og
 */
import { chromium } from 'playwright';

const html = `<!doctype html><html lang="fi"><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #000; color: #f4f1ea; padding: 84px 88px; display: flex; flex-direction: column; justify-content: center;
    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; }
  .kicker { display: flex; align-items: center; gap: 18px; font: 24px ui-monospace, 'SF Mono', Menlo, Consolas, monospace; letter-spacing: 0.08em; text-transform: uppercase; color: #a09c92; }
  .kicker i { width: 22px; height: 22px; border-radius: 50%; background: #ff2b2b; }
  .kicker b { color: #ff2b2b; font-weight: 400; }
  h1 { margin-top: 36px; font-size: 92px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.04; }
  p { margin-top: 40px; font-size: 32px; color: #a09c92; }
  p strong { color: #f4f1ea; font-weight: 600; }
</style><body>
  <div class="kicker"><i></i><span><b>Hakemus</b> / Oman median asiantuntija</span></div>
  <h1>WordPress on räjäytetty<br>Tilalle tuli Sampo</h1>
  <p><strong>Sampo Rahja</strong> hakee Julkee x Lempeelle</p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.screenshot({ path: 'public/og.png', type: 'png' });
await browser.close();
console.log('Kirjoitettu public/og.png');
