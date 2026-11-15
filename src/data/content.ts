import type { ImageMetadata } from 'astro';
import govuokattiDesktop from '../assets/captures/govuokatti-desktop.jpg';
import govuokattiMobile from '../assets/captures/govuokatti-mobile.jpg';
import piecengoDesktop from '../assets/captures/piecengo-desktop.jpg';
import piecengoMobile from '../assets/captures/piecengo-mobile.jpg';
import pahkalaDesktop from '../assets/captures/pahkalaranch-desktop.jpg';
import pahkalaMobile from '../assets/captures/pahkalaranch-mobile.jpg';
import pekkaDesktop from '../assets/captures/pekkapudas-desktop.jpg';
import pekkaMobile from '../assets/captures/pekkapudas-mobile.jpg';
import reskontraDesktop from '../assets/captures/reskontratutka-desktop.jpg';
import reskontraMobile from '../assets/captures/reskontratutka-mobile.jpg';

export type Project = {
  slug: string;
  type: string;
  name: string;
  description: string;
  /** Lisätieto, jos kortissa on jotain yhteisestä roolista poikkeavaa. Yhteinen rooli kerrotaan osion ingressissä. */
  note?: string;
  tech: string[];
  /** Julkinen osoite. Jos puuttuu, kortti ei ole linkki. */
  url?: string;
  /** Selainkehyksen osoiterivillä näkyvä teksti. */
  host?: string;
  preview:
    | { kind: 'site'; desktop: ImageMetadata; mobile: ImageMetadata; video?: string }
    | { kind: 'ilona' }
    | { kind: 'telegram' };
};

export const PROJECTS: Project[] = [
  {
    slug: 'govuokatti',
    type: 'Asiakassivusto',
    name: 'Go Vuokatti',
    description:
      'Sotkamolaisen aktiviteettikeskuksen sivustouudistus. Vanha sivusto oli WordPressissä. Nyt omistaja rakentaa uudet sivut itse Sanityllä. Työn alla on tekoälychatbotti, joka vastaa asiakkaille yrityksen omalla tiedolla.',
    tech: ['Next.js', 'Sanity', 'RAG', 'pgvector'],
    url: 'https://govuokatti.fi',
    host: 'govuokatti.fi',
    preview: { kind: 'site', desktop: govuokattiDesktop, mobile: govuokattiMobile },
  },
  {
    slug: 'piecengo',
    type: 'Asiakassivusto',
    name: "Piece'n GO",
    description:
      'Vuokattilaisen pizzabuffetin sivusto. Syntyi samassa uudistuksessa Go Vuokatin kanssa, ja omistaja päivittää hinnat ja sisällöt itse Sanityllä.',
    tech: ['Next.js', 'Sanity'],
    url: 'https://piecengo.fi',
    host: 'piecengo.fi',
    preview: { kind: 'site', desktop: piecengoDesktop, mobile: piecengoMobile },
  },
  {
    slug: 'pahkalaranch',
    type: 'Asiakassivusto',
    name: 'Pahkalaranch',
    description:
      'Muoniolaisen huskytilan varaussivusto. Safarin voi varata suoraan sivun omasta kalenterista.',
    note: 'Rakensin myös varauskalenterin itse.',
    tech: ['Next.js', 'Oma varauskalenteri', 'Tekninen SEO', 'Vercel'],
    url: 'https://pahkalaranch.fi',
    host: 'pahkalaranch.fi',
    preview: { kind: 'site', desktop: pahkalaDesktop, mobile: pahkalaMobile },
  },
  {
    slug: 'pekkapudas',
    type: 'Asiakassivusto',
    name: 'pekkapudas.fi',
    description:
      'Kokkolalaisen kirjailijan ja muusikon Pekka Pudaksen kotisivu. Kirjat, näytelmät, musiikki ja radio-ohjelmat löytyvät yhdestä paikasta.',
    tech: ['Next.js'],
    url: 'https://pekkapudas.fi',
    host: 'pekkapudas.fi',
    preview: { kind: 'site', desktop: pekkaDesktop, mobile: pekkaMobile },
  },
  {
    slug: 'ilona',
    type: 'Oma SaaS',
    name: 'Ilona',
    description:
      'Suomenkielinen tekoälypuhelinvastaaja yrityksille. Vastaa soittajalle yrityksen omilla tiedoilla, kerää liidit ja lähettää omistajalle yhteenvedon tekstiviestinä. Maksava pilottiasiakas, yli 1700 automaattista testiä ja tietoturva-auditointi. Käytössä Go Vuokatilla.',
    note: 'Oma tuote ideasta tuotantoon. Julkista käyttöliittymää ei ole, joten kuva on havainnekuva.',
    tech: ['Claude', 'ElevenLabs', 'Telnyx', 'Supabase', 'Railway'],
    preview: { kind: 'ilona' },
  },
  {
    slug: 'tyonhakuagentti',
    type: 'Agentti',
    name: 'Työnhakuagentti',
    description:
      'Etsii työpaikkailmoitukset, pisteyttää niiden sopivuuden ja lähettää tulokset Telegramiin. Esikatselussa on ote aidosta viestistä.',
    note: 'Rakensin omaan käyttöön.',
    tech: ['Claude', 'Tavily', 'Telegram'],
    preview: { kind: 'telegram' },
  },
  {
    slug: 'reskontratutka',
    type: 'Demo',
    name: 'Reskontratutka',
    description:
      'Yritysanalyysi PRH:n avoimesta datasta. Tekoälyn vastaukset validoidaan Zod-skeemalla, jotta luvut eivät ole keksittyjä.',
    note: 'Nauhoitus on oikeasta hausta.',
    tech: ['PRH:n avoin data', 'Zod', 'Vercel'],
    url: 'https://reskontratutka.vercel.app',
    host: 'reskontratutka.vercel.app',
    preview: { kind: 'site', desktop: reskontraDesktop, mobile: reskontraMobile, video: 'reskontratutka' },
  },
];

/** Ote Työnhakuagentin aidosta Telegram-viestistä 20.10.2026. Kaksi viimeistä perustelua on jätetty pois. */
export const JOB_AGENT_MESSAGE: { text: string; kind?: 'title' | 'meta' | 'score' }[] = [
  { text: '1. Agentic Software Developer, Witted', kind: 'title' },
  { text: 'Helsinki | julkaistu 20.10. (18h sitten)', kind: 'meta' },
  {
    text: 'Täydellinen osuma: rooli hakee nimenomaan agenttisohjelmistokehittäjää, employment tai freelance. Witted on konsulttiverkosto, jossa hakijan itseopittu AI-rakentaminen ja käytännön agenttikokemus (Hermes, Ilona) painavat enemmän kuin tutkinto.',
  },
  { text: 'Sopivuus: 9/10', kind: 'score' },
  { text: '2. AI Operations Specialist, Truster / Clevry Finland', kind: 'title' },
  { text: 'Helsinki | julkaistu 20.10.', kind: 'meta' },
  { text: 'Sopivuus: 8/10', kind: 'score' },
  { text: '3. AI Engineer, Zoner / Academic Work', kind: 'title' },
  { text: 'Vantaa | julkaistu 20.10.', kind: 'meta' },
  { text: 'Sopivuus: 8/10', kind: 'score' },
];

export const SMALL_WORKS = [
  {
    type: 'Agentti',
    name: 'Hermes',
    description: 'Henkilökohtainen avustaja Telegramissa.',
    tech: ['Google Calendar MCP', 'Tavily', 'Firecrawl', 'Railway'],
  },
  {
    type: 'Automaatio',
    name: 'Uutistutka',
    description: 'Tekoälyuutisten seuranta n8n:llä.',
    tech: ['n8n'],
  },
  {
    type: 'Oma tuote',
    name: 'FutisPlanner',
    description:
      'Harjoitusten suunnittelutyökalu jalkapallovalmentajille. Tein sen, koska Palloliiton oma työkalu oli vanhentunut ja valmennan itse junioreita.',
    tech: ['React', 'Supabase', 'Konva.js', 'Claude API'],
    url: 'https://futisplanner.vercel.app',
  },
];

export type Level = 'daily' | 'shipped' | 'learning';

export const LEVELS: Record<Level, string> = {
  daily: 'Teen päivittäin',
  shipped: 'Olen vienyt tuotantoon',
  learning: 'Opettelen parhaillaan',
};

export const SKILLS: { area: string; items: { level: Level; text: string }[] }[] = [
  {
    area: 'Verkkosivut ja landing paget',
    items: [
      { level: 'daily', text: 'Claude Code, GitHub, Vercel' },
      { level: 'shipped', text: 'React, Next.js, Sanity, Supabase' },
      { level: 'learning', text: 'Astro. Tämä sivu on ensimmäinen Astro-työni.' },
    ],
  },
  {
    area: 'Hakukoneet ja tekoälyhaut',
    items: [
      { level: 'shipped', text: 'Tekninen SEO: canonical-, meta- ja rakennevirheiden löytäminen ja korjaaminen' },
      { level: 'shipped', text: 'Search Console, sivukartat ja schema-merkinnät' },
      { level: 'shipped', text: 'Kielimallien tapa lukea sivuja, RAG' },
    ],
  },
  {
    area: 'Markkinointijärjestelmät',
    items: [
      { level: 'shipped', text: 'Lomakkeet, varaukset, webhookit ja n8n-automaatiot' },
      { level: 'shipped', text: 'Telegram- ja kalenteri-integraatiot' },
      { level: 'learning', text: 'CRM-järjestelmät. Analytiikasta olen käyttänyt Google Analyticsia ja Vercel Analyticsia.' },
    ],
  },
  {
    area: 'Tekoäly työkaluna',
    items: [
      { level: 'daily', text: 'Claude API, agentit ja MCP' },
      { level: 'daily', text: 'Promptien ja työkalukutsujen suunnittelu, automaattitestit' },
      { level: 'learning', text: 'Sertifikaatit Claude Certified Architect - Foundations ja Claude Certified Architect - Professional. Suoritus on kesken.' },
    ],
  },
];

export const CERTIFICATES = [
  'Claude Certified Associate - Foundations',
  'Claude Certified Developer - Foundations',
];

export const PIPELINE = [
  { name: 'Tarve', text: 'Selvitän, mitä sivun pitää saada aikaan ja kenelle.' },
  { name: 'Claude Code', text: 'Kirjoitan tehtävänannon. Claude toteuttaa, minä luen ja korjaan.' },
  { name: 'GitHub', text: 'Jokainen muutos on oma commitinsa, joten historiasta näkee, mitä tehtiin ja miksi.' },
  { name: 'Vercel-esikatselu', text: 'Jokainen haara saa oman esikatseluosoitteen, josta muutoksen voi katsoa ennen julkaisua.' },
  { name: 'Julkaisu', text: 'Julkaisu on yksi komento. Perjantainakin.' },
  { name: 'Mittaus', text: 'Ajan testit ja Lighthousen ja korjaan, mitä ne löytävät.' },
];

export const MATCH = [
  {
    want: 'Tekijä, joka saa asiat valmiiksi',
    have: 'Neljä asiakassivustoa ja kaksi omaa tuotetta tuotannossa vuoden sisään.',
  },
  {
    want: 'Uteliaisuus uusiin työkaluihin',
    have: 'Rakennan agentteja vapaa-ajalla, koska haluan tietää, mihin ne pystyvät. Yksi niistä etsii minulle töitä.',
  },
  { want: 'Käyttäjälähtöisyys', have: 'FutisPlanner syntyi, koska olin itse turhautunut käyttäjä.' },
  { want: 'Oma-aloitteisuus', have: 'Kukaan ei tilannut Ilonaa. Nyt sillä on maksava asiakas.' },
  {
    want: 'Neuvonantajan ote',
    have: 'Myyntityö opetti kuuntelemaan. Jos asiakas tarvitsee muuta kuin pyytää, sanon sen.',
  },
  { want: 'Selkeä suomi', have: 'Luitte tänne asti.' },
];

export const PRACTICAL = [
  'Asun Oulussa. Muutto Helsinkiin onnistuu, ja pari toimistopäivää viikossa sopii.',
  'Valmistun ohjelmistokehittäjäksi maaliskuussa 2027.',
  'Tausta: B2C-puhelinmyynti ja rakennusala ennen alanvaihtoa.',
];
