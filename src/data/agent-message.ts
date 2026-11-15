/**
 * Työnhakuagentin aito Telegram-viesti 20.10.2026 sanasta sanaan.
 *
 * Tekstiä ei ole muokattu: myös agentin käyttämät ajatusviivat ovat tallella, vaikka
 * sivun omissa teksteissä niitä ei käytetä (scripts/check-text.ts ohittaa tämän tiedoston).
 * Ainoa muutos on, että yritysten nimet on korvattu merkinnällä [yritys]. Sivulla sen
 * kohdalla näkyy musta palkki. Nimiä ei ole tässä tiedostossa lainkaan.
 */
export const REDACTED = '[yritys]';

export const JOB_AGENT_MESSAGE: { text: string; kind?: 'title' | 'meta' | 'score' }[] = [
  { text: '1. Agentic Software Developer — [yritys]', kind: 'title' },
  { text: 'Helsinki | julkaistu 20.10. (18h sitten)', kind: 'meta' },
  {
    text: 'Täydellinen osuma: rooli hakee nimenomaan agenttisohjelmistokehittäjää, employment tai freelance. [yritys] on konsulttiverkosto, jossa hakijan itseopittu AI-rakentaminen ja käytännön agenttikokemus (Hermes, Ilona) painavat enemmän kuin tutkinto.',
  },
  { text: 'Sopivuus: 9/10', kind: 'score' },
  { text: '2. AI Operations Specialist — [yritys] / [yritys]', kind: 'title' },
  { text: 'Helsinki | julkaistu 20.10.', kind: 'meta' },
  {
    text: 'Kokoaikainen, vakituinen paikka Helsingin keskustassa. AI-operaatiorooli käytännön tekemisellä — sopii hakijalle, jolla on tuotantoon viety AI-järjestelmäkokemus ilman vaatimusta pitkästä CV:stä. Tason pitäisi sopia junior/medior-alanvaihtajalle.',
  },
  { text: 'Sopivuus: 8/10', kind: 'score' },
  { text: '3. AI Engineer — [yritys] / [yritys]', kind: 'title' },
  { text: 'Vantaa | julkaistu 20.10.', kind: 'meta' },
  {
    text: 'Rooli sisältää tekoälyratkaisujen kehitystä, koulutusta ja johdon sparrausta — ei vaadi vuosikymmenten kokemusta, vaan "asenne ja ajantasainen AI-työkalujen hallinta ratkaisevat". Joustava tuntimäärä (3–4 pv/vko tai kokoaikainen). Hakijan käytännön portfolio sopii tähän hyvin.',
  },
  { text: 'Sopivuus: 8/10', kind: 'score' },
];
