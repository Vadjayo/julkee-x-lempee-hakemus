import { test, expect, type Page } from '@playwright/test';
import { gzipSync } from 'node:zlib';

/** Avaa sivun niin, että intro on jo nähty. Introa testataan erikseen. */
async function open(page: Page): Promise<void> {
  await page.addInitScript(() => sessionStorage.setItem('intro-seen', '1'));
  await page.goto('/');
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

async function scrollThrough(page: Page): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 400) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(60);
  }
}

test.describe('intro', () => {
  test('purku ehtii näkyä, päättyy itsestään ja näkyy vain kerran istunnossa', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#intro')).toBeVisible();
    await expect(page.locator('#intro')).toContainText('Just another WordPress site');
    await expect(page.locator('#intro')).toContainText('14 lisäosaa odottaa päivitystä');
    // Dynamiitti putoaa ruutuun ennen räjähdystä.
    await expect.poll(() => page.locator('#intro-tnt').evaluate((el) => getComputedStyle(el).opacity), { timeout: 3000 }).toBe('1');
    await expect(page.locator('#intro-pct')).toHaveText('Purettu 100 %', { timeout: 6000 });
    await expect(page.locator('html')).toHaveClass(/intro-done/, { timeout: 8000 });
    // Selaimen oma kello: millisekunnit sivun avaamisesta siihen, kun intro on poissa.
    const elapsed = Number(await page.locator('html').getAttribute('data-intro-ms'));
    expect(elapsed).toBeGreaterThan(4000);
    expect(elapsed).toBeLessThanOrEqual(5500);
    await expect(page.locator('#intro')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.reload();
    await expect(page.locator('#intro')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Ohita purku avaa sivun heti', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ohita purku' }).click();
    await expect(page.locator('html')).toHaveClass(/intro-done/, { timeout: 1000 });
    await expect(page.locator('#intro')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Katso työt' })).toBeVisible();
  });
});

test('punainen piste sammuu ja näyttää viestin', async ({ page }) => {
  await open(page);
  const dot = page.locator('#dot');
  await expect(page.locator('#dot-msg')).toBeEmpty();
  await dot.click();
  await expect(page.locator('#dot-msg')).toHaveText('Ärsyttikö? Piste sammui, hakemus jatkuu.');
  await expect(dot).toBeDisabled();
});

test.describe('rakennustyökalu', () => {
  test('palat voi lyödä paikalleen yksi kerrallaan, ja valmis nappi vie yhteystietoihin', async ({ page }) => {
    await open(page);
    const hit = page.locator('#build-btn');
    await hit.scrollIntoViewIfNeeded();
    await expect(page.locator('#stage .slot.next')).toHaveCount(1);
    for (let i = 1; i <= 6; i++) {
      await hit.click();
      await expect(page.locator('#stage .slot.placed')).toHaveCount(i);
    }
    await expect(page.locator('#build-pct')).toHaveText('Rakennettu 100 %');
    await expect(page.locator('#build-msg')).toHaveText(/^Valmis \d+,\d sekunnissa\. Lisäosia nolla\.$/);
    await expect(page.locator('#build-wp')).toHaveText(/^WordPress päivittää yhä lisäosaa \d+\/47$/);
    await expect(page.locator('#stage a')).toHaveAttribute('href', '#yhteys');
    await expect(page.locator('#stage a')).toBeVisible();

    await expect(hit).toHaveText('Pura ja aloita alusta');
    await hit.click();
    await expect(page.locator('#stage .slot.placed')).toHaveCount(0);
    await expect(page.locator('#build-pct')).toHaveText('Rakennettu 0 %');
  });

  test('koko sivun voi rakentaa yhdellä painalluksella, ja lavaa voi napauttaa', async ({ page }) => {
    await open(page);
    await page.locator('#stage').scrollIntoViewIfNeeded();
    await page.locator('#stage').click();
    await expect(page.locator('#stage .slot.placed')).toHaveCount(1);
    await page.locator('#build-auto').click();
    await expect(page.locator('#build-msg')).toHaveText(/^Valmis \d+,\d sekunnissa\. Lisäosia nolla\.$/, { timeout: 6000 });
    await expect(page.locator('#stage .slot.placed')).toHaveCount(6);
  });
});

test.describe('esikatselut', () => {
  test('vieritys käynnistyy näkyvissä, nopeutuu hiirellä ja pysähtyy poistuessa', async ({ page }) => {
    await open(page);
    const preview = page.locator('#tyo-govuokatti [data-preview]');
    await expect(preview).toHaveAttribute('data-state', 'paused');
    await preview.scrollIntoViewIfNeeded();
    await expect(preview).toHaveAttribute('data-state', 'running');

    const img = preview.locator('.browser img');
    const offset = () => img.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
    await page.locator('#tyo-govuokatti').hover();
    await expect(preview).toHaveAttribute('data-speed', '4');
    await expect.poll(offset, { timeout: 6000 }).toBeLessThan(-5);

    // Mobiilikehys vierii samassa tahdissa: sama kesto ja sama vaihe.
    const timings = await preview.evaluate((el) =>
      [...el.querySelectorAll('img')].map((i) => i.getAnimations()[0]?.effect?.getTiming().duration),
    );
    expect(timings[0]).toBeGreaterThan(0);
    expect(timings[0]).toBe(timings[1]);

    await page.locator('#yhteys').scrollIntoViewIfNeeded();
    await expect(preview).toHaveAttribute('data-state', 'paused');
  });

  test('nauhoitus latautuu ja käynnistyy vasta näkyvissä ja pysähtyy poistuessa', async ({ page }) => {
    await open(page);
    const video = page.locator('#tyo-reskontratutka video');
    await expect(video).toHaveAttribute('preload', 'none');
    expect(await video.evaluate((el: HTMLVideoElement) => el.muted && el.loop && el.paused && el.networkState !== 2)).toBe(true);
    await video.scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => !el.paused && el.currentTime > 0), { timeout: 8000 }).toBe(true);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
  });

  test('agentin viesti ilmestyy rivi kerrallaan ja Ilona on merkitty havainnekuvaksi', async ({ page }) => {
    await open(page);
    const telegram = page.locator('#tyo-tyonhakuagentti .tg');
    await telegram.scrollIntoViewIfNeeded();
    await expect(telegram).toHaveClass(/playing/);
    await expect(telegram.locator('.tl').last()).toHaveCSS('opacity', '1', { timeout: 8000 });
    await expect(page.locator('#tyo-ilona')).toContainText('Havainnekuva');
  });
});

test('yhteystietolinkit osoittavat oikeisiin paikkoihin', async ({ page }) => {
  await open(page);
  const contact = page.locator('#yhteys');
  await expect(contact.locator('a[href^="tel:"]')).toHaveAttribute('href', /^tel:\+358\d{9}$/);
  await expect(contact.locator('a[href^="mailto:"]')).toHaveAttribute('href', /^mailto:[^@\s]+@[^@\s]+\.[a-z]+$/);
  await expect(contact.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', /^https:\/\/www\.linkedin\.com\/in\//);
  await expect(page.locator('footer a')).toHaveAttribute('href', /^https:\/\/github\.com\//);
  await expect(page.locator('footer')).toContainText('Yhtään WordPress-sivua ei vahingoitettu tämän hakemuksen teossa.');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('ei introa, ei vieritystä eikä videoita, sisältö näkyy heti', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#intro')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await scrollThrough(page);
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
    expect(running).toBe(0);
    const video = page.locator('#tyo-reskontratutka video');
    await expect(video).toBeHidden();
    expect(await video.evaluate((el: HTMLVideoElement) => el.paused && el.currentTime === 0)).toBe(true);
    await expect(page.locator('#tyo-reskontratutka .browser img')).toBeVisible();
    for (const el of await page.locator('.rv').all()) await expect(el).toHaveCSS('opacity', '1');
    await expect(page.locator('#tyo-tyonhakuagentti .tl').first()).toHaveCSS('opacity', '1');
  });
});

test.describe('ilman JavaScriptiä', () => {
  test.use({ javaScriptEnabled: false });

  test('kaikki sisältö näkyy', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#intro')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nämä ovat jo tuotannossa' })).toBeVisible();
    await expect(page.locator('#yhteys a[href^="tel:"]')).toBeVisible();
    await expect(page.locator('#tyo-tyonhakuagentti .tl').first()).toHaveCSS('opacity', '1');
  });
});

for (const width of [375, 768, 1440]) {
  test.describe(`leveys ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('ei vaakavieritystä, ei päällekkäisiä elementtejä, ei konsolivirheitä', async ({ page }) => {
      const errors = collectErrors(page);
      await open(page);
      await scrollThrough(page);
      await page.waitForTimeout(800);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);

      // Sisarukset eivät saa mennä päällekkäin: osiot, kortit, osaamisalueet, putken vaiheet ja napit.
      const overlaps = await page.evaluate(() => {
        const groups = ['main > section', '.grid > li', '.small-grid > li', '.areas > article', '.pipe-step', '.row', '.chips > a', '.cta > a', '.hood > div'];
        const found: string[] = [];
        for (const selector of groups) {
          const boxes = [...document.querySelectorAll(selector)].map((el) => el.getBoundingClientRect());
          for (let i = 0; i < boxes.length; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i]!, b = boxes[j]!;
              const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (x > 1 && y > 1) found.push(`${selector} ${i}/${j}`);
            }
          }
        }
        // Mikään teksti ei saa ylittää oman säiliönsä reunaa.
        for (const el of document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, p, dd, dt, td, th, li, a.btn')) {
          if (el.closest('#intro, .visually-hidden')) continue;
          const r = el.getBoundingClientRect();
          if (r.width && (r.right > innerWidth + 1 || r.left < -1)) found.push(`ulkona: ${el.textContent?.slice(0, 30)}`);
        }
        return found;
      });
      expect(overlaps).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}

for (const device of [
  { name: 'työpöytä', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: 'puhelin, tiheä näyttö', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true },
]) {
  test.describe(`ensimmäinen lataus: ${device.name}`, () => {
    test.use({ viewport: device.viewport, deviceScaleFactor: device.deviceScaleFactor, isMobile: device.isMobile ?? false });

    test('alle 300 kt ilman videoita, eikä evästeitä aseteta', async ({ page, context }) => {
      let bytes = 0;
      const videos: string[] = [];
      page.on('response', async (response) => {
        if (/\.(webm|mp4)/.test(response.url())) videos.push(response.url());
        const body = await response.body().catch(() => null);
        if (!body) return;
        // body() palauttaa puretun sisällön. Tekstitiedostot lasketaan gzip-pakattuina,
        // koska niin ne siirtyvät tuotannossa. Kuvat ovat jo valmiiksi pakattuja.
        const isText = /html|javascript|css|json|svg/.test(response.headers()['content-type'] ?? '');
        bytes += isText ? gzipSync(body).length : body.length;
      });
      await page.goto('/', { waitUntil: 'load' });
      await page.waitForTimeout(1000);
      expect(videos).toEqual([]);
      expect(bytes / 1024).toBeLessThan(300);
      expect(await context.cookies()).toEqual([]);
    });
  });
}

test('rakenne kestää tarkastelun: yksi h1, noindex, kelvollinen JSON-LD, otsikkotasot järjestyksessä', async ({ page }) => {
  await open(page);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fi');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  const person = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(person['@type']).toBe('Person');
  expect(person.name).toBe('Sampo Rahja');
  expect(person.telephone).toMatch(/^\+358\d+$/);

  const levels = await page.evaluate(() =>
    [...document.querySelectorAll('h1, h2, h3, h4')].map((h) => Number(h.tagName[1])),
  );
  for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
  for (const section of await page.locator('main > section').all()) {
    await expect(section).toHaveAttribute('aria-labelledby', /.+/);
  }
  for (const img of await page.locator('img').all()) {
    await expect(img).toHaveAttribute('alt', /.+/);
    await expect(img).toHaveAttribute('loading', 'lazy');
  }
});

test('selaimessa mitatut luvut täyttyvät', async ({ page }) => {
  await open(page);
  await expect(page.locator('#metrics')).toHaveAttribute('data-measured', 'true');
  await expect(page.locator('#m-size')).toHaveText(/^\d+,\d$/);
  await expect(page.locator('#m-req')).toHaveText(/^\d+$/);
  await expect(page.locator('#m-dom')).toHaveText(/^\d+$/);
  await expect(page.locator('#m-cookie')).toHaveText('0');
});
