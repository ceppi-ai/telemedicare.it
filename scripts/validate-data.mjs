import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/offers.json', 'utf8'));
const required = ['id', 'provider', 'service', 'price', 'priceBand', 'needs', 'features', 'url', 'sourceUrl', 'criteria'];
const criteria = ['priceBefore', 'familySupport', 'humanSupport', 'multiAccess', 'postVisit', 'usageLimits'];
const officialHosts = {
  miodottore: new Set(['miodottore.it', 'www.miodottore.it']),
  santagostino: new Set(['santagostino.it', 'www.santagostino.it']),
  doctorium: new Set(['doctorium.it', 'www.doctorium.it']),
  doctolib: new Set(['doctolib.it', 'www.doctolib.it', 'info.doctolib.it'])
};
const forbiddenReviewFields = ['review', 'reviewStars', 'reviewCount', 'reviewSource'];

if (data.schemaVersion !== 2 || data.criteriaVersion !== '1.0' || !Array.isArray(data.offers) || data.offers.length === 0) {
  throw new Error('data/offers.json non rispetta lo schema previsto');
}

const ids = new Set();
for (const offer of data.offers) {
  for (const field of required) {
    if (offer[field] === undefined || offer[field] === null || offer[field] === '') {
      throw new Error(`Campo obbligatorio mancante: ${offer.id ?? 'offerta senza id'}.${field}`);
    }
  }
  if (ids.has(offer.id)) throw new Error(`ID duplicato: ${offer.id}`);
  ids.add(offer.id);
  for (const field of forbiddenReviewFields) {
    if (field in offer) throw new Error(`Campo recensioni non consentito: ${offer.id}.${field}`);
  }
  for (const field of ['url', 'sourceUrl']) new URL(offer[field]);
  for (const criterion of criteria) {
    const evidence = offer.criteria[criterion];
    if (!evidence || typeof evidence.met !== 'boolean' || typeof evidence.note !== 'string' || evidence.note.length < 10) {
      throw new Error(`Criterio non valido: ${offer.id}.criteria.${criterion}`);
    }
    if (evidence.met) {
      if (!evidence.source) throw new Error(`Fonte mancante: ${offer.id}.criteria.${criterion}`);
      const source = new URL(evidence.source);
      if (source.protocol !== 'https:') throw new Error(`La fonte deve usare HTTPS: ${offer.id}.criteria.${criterion}`);
      if (!officialHosts[offer.id]?.has(source.hostname)) {
        throw new Error(`Fonte non ufficiale per ${offer.id}.criteria.${criterion}: ${source.hostname}`);
      }
    } else if (evidence.source !== null) {
      throw new Error(`Un criterio non documentato non deve avere una fonte: ${offer.id}.criteria.${criterion}`);
    }
  }
}

console.log(`Dati validi: ${data.offers.length} offerte.`);

