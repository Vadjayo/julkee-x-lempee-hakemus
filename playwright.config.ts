import { defineConfig } from '@playwright/test';

/** Testit ajetaan oletuksena tuotantobuildia vasten. BASE_URL vaihtaa kohteen, esim. tuotanto-osoitteeseen. */
const baseURL = process.env.BASE_URL ?? 'http://localhost:4321';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  // Testiselain piirtää WebGL-intron ohjelmallisesti. Liian moni rinnakkainen intro venyttää ajoituksia.
  workers: 2,
  reporter: [['list']],
  use: { baseURL, locale: 'fi-FI' },
  // Oletuksena Chromium. Kaikki selaimet: npm run test:browsers
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run preview -- --port 4321', url: baseURL, reuseExistingServer: true, timeout: 60_000 },
});
