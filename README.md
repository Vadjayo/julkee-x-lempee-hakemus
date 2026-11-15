# Hakemus Julkee x Lempeelle

Sampo Rahjan hakemus Julkee x Lempeen oman median asiantuntijaksi. Hakemus on yhden sivun verkkosivu.

Tuotanto: https://julkee-x-lempee-hakemus.vercel.app

## Mitä tehtiin

- Yksi staattinen sivu Astrolla ja TypeScriptillä. Ei UI-kehystä eikä animaatiokirjastoa: liike on CSS:ää, Web Animations APIa ja IntersectionObserveria.
- Intro, jossa oletusteemaisen WordPress-sivun näköinen näkymä räjäytetään dynamiitilla oikean sivun tieltä. Näkyy kerran istunnossa.
- Työt-osio (neljä asiakassivustoa, oma SaaS, agentti ja demo), jonka esikatselut on kaapattu oikeilta sivuilta: selainkehys ja puhelinkehys vierivät samassa tahdissa, ja Reskontratutkasta on ruutunauhoitus oikeasta hausta.
- Ilonan kortissa on havainnekuva, koska tuotteella ei ole julkista käyttöliittymää. Työnhakuagentin kortissa on ote aidosta Telegram-viestistä.
- Itse rakennettava rakennustyökalu ja selaimessa mitatut luvut. Lighthouse-pisteet luetaan tiedostosta, jonka skripti kirjoittaa tuotanto-osoitteesta. Yhtään lukua ei ole kirjoitettu käsin.
- Ei evästeitä, ei seurantaa, ei ulkoisia fontteja. Sivulla on `noindex`, koska siinä on puhelinnumero.
- Semanttinen HTML ja `Person`-tyyppinen JSON-LD.
- Sisältö näkyy ilman JavaScriptiä, ja `prefers-reduced-motion` poistaa intron, vierityksen ja videot.

## Rakenne

| Polku | Sisältö |
|---|---|
| `src/config.ts` | Yhteystiedot ja osoitteet. Build pysähtyy, jos puhelin tai sähköposti puuttuu. |
| `src/data/content.ts` | Kaikki projektit ja listojen tekstit |
| `src/components/` | Yksi komponentti per osio |
| `src/scripts/main.ts` | Kaikki selainlogiikka |
| `scripts/capture.ts` | Esikatselujen kaappaus Playwrightilla |
| `scripts/lighthouse.ts` | Lighthouse-ajo ja pisteiden tallennus |
| `scripts/check-text.ts`, `scripts/check-links.ts` | Kieli- ja linkkitarkistukset |
| `tests/site.spec.ts` | Playwright-testit |

## Näin ajat

Tarvitset Node.js-version 22.23.4 tai uudemman.

```sh
npm install
npx playwright install chromium
cp .env.example .env     # täytä puhelin ja sähköposti
npm run dev              # kehityspalvelin, http://localhost:4321
npm run build            # tyyppitarkistus ja tuotantobuild kansioon dist/
npm run preview          # tuotantobuildin esikatselu
```

Yhteystiedot luetaan ympäristömuuttujista `CONTACT_PHONE` ja `CONTACT_EMAIL`, koska repo on julkinen. Vercelissä ne on asetettu projektin asetuksiin.

Julkaisu: push haaraan `main` julkaisee tuotantoon Vercelin GitHub-liitoksen kautta.

## Näin päivität esikatselut

```sh
npm run capture                  # kaikki kohteet
npm run capture -- pahkala       # vain yksi kohde
```

Skripti avaa jokaisen julkisen projektin, vierittää sivun läpi ja tallentaa koko sivun kuvan leveyksillä 1440 ja 390 px kansioon `src/assets/captures/`. Reskontratutkasta se nauhoittaa oikean haun, leikkaa palvelimen odotuksen pois ja pakkaa videon WebM- ja MP4-muotoon kansioon `public/video/` (tarvitsee `ffmpeg`-komennon). Astro tekee kuvista AVIF- ja WebP-versiot buildissa.

Skripti pysähtyy virheeseen, jos sivu ei vastaa 200, kuva näyttää tyhjältä tai video ylittää 1,5 Mt. Katso uudet kuvat silti itse läpi ennen committia. Uusi kohde lisätään skriptin `TARGETS`-listaan ja tiedostoon `src/data/content.ts`.

## Testit

```sh
npm run build
npm test                                             # paikallista buildia vasten
BASE_URL=https://julkee-x-lempee-hakemus.vercel.app npm test   # tuotantoa vasten
npm run check:text
npm run check:links
npm run lighthouse                                   # kirjoittaa src/data/lighthouse.json
```

### Tulokset 15.11.2026

| Tarkistus | Tulos |
|---|---|
| Playwright, paikallinen build | 18/18 läpi |
| Playwright, tuotanto-osoite | 18/18 läpi |
| Leveydet 375, 768 ja 1440 px | Ei vaakavieritystä, ei päällekkäisiä elementtejä, ei konsolivirheitä. Kuvakaappaukset katsottu läpi. |
| Lighthouse, mobiili, tuotanto, kolme ajoa | Suorituskyky 100, saavutettavuus 100, parhaat käytännöt 100 |
| Lighthouse, hakukoneet | 69. Ainoa pisteitä vievä tarkistus on `is-crawlable`, eli tarkoituksellinen `noindex`. |
| Ensimmäinen lataus ilman videoita | Raja 300 kt. Puhelin (390 px, tiheys 3) 218 kt, tabletti (768 px, tiheys 2) 228 kt, työpöytä (1440 px) 177 kt, tiheällä näytöllä 263 kt. Luvuissa ovat mukana laiskasti ladattavat esikatselukuvat, jotka selain hakee ennakkoon. |
| Ajatusviivat ja otsikoiden välimerkit | Ei löytynyt |
| Ulkoiset linkit | 7/8 vastasi 200. LinkedIn vastasi 999, ks. alla. |
| `astro check` | 0 virhettä, 0 varoitusta |

Playwright kattaa nämä: intro ja ohitus, punainen piste, rakennustyökalu, esikatselujen käynnistyminen ja pysähtyminen, videon laiska lataus, yhteystietolinkit, reduced motion, sivu ilman JavaScriptiä, sivun rakenne ja selaimessa mitatut luvut.

### Mitä ei ole todennettu

- Sivua ei ole avattu fyysisellä puhelimella. Mobiili on testattu Playwrightin ja Lighthousen emulaatiolla.
- LinkedIn torjuu automaattiset pyynnöt (vastaus 999), joten sen linkki pitää tarkistaa käsin selaimessa.
