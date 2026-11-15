/**
 * Sivun yhteystiedot ja osoitteet.
 *
 * Puhelin ja sähköposti tulevat ympäristömuuttujista (.env tai Vercelin asetukset),
 * koska repo on julkinen. Jos jompikumpi puuttuu, build pysähtyy tähän.
 */
function required(name: string): string {
  const value = (process.env[name] ?? import.meta.env[name] ?? '').trim();
  if (!value) {
    throw new Error(`Yhteystieto puuttuu: aseta ${name} tiedostoon .env tai Vercelin ympäristömuuttujiin.`);
  }
  return value;
}

const phone = required('CONTACT_PHONE');
const email = required('CONTACT_EMAIL');

export const CONFIG = {
  name: 'Sampo Rahja',
  phone,
  phoneHref: `tel:${phone.replace(/[^\d+]/g, '')}`,
  email,
  emailHref: `mailto:${email}`,
  linkedin: 'https://www.linkedin.com/in/sampo-rahja-b5822426a/',
  credly: 'https://www.credly.com/users/sampo-rahja',
  repo: 'https://github.com/Vadjayo/julkee-x-lempee-hakemus',
  jobAd: 'https://julkeexlempee.fi/tuhoa-wordpress',
  /** Ensimmäinen agentti valmistui huhtikuussa 2026. Kokemuslaskuri lähtee tästä. */
  agentStart: { year: 2026, month: 4 },
  requiredMonths: 60,
} as const;
