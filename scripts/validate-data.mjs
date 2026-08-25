import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/offers.json', 'utf8'));
const sources = JSON.parse(readFileSync('data/sources.json', 'utf8'));
const census = JSON.parse(readFileSync('data/census.json', 'utf8'));
const required = ['id', 'provider', 'service', 'price', 'priceBand', 'needs', 'features', 'url', 'sourceUrl', 'criteria'];
const criteria = ['priceBefore', 'familySupport', 'humanSupport', 'multiAccess', 'postVisit', 'usageLimits'];
const officialHosts = {
  miodottore: new Set(['miodottore.it', 'www.miodottore.it']),
  santagostino: new Set(['santagostino.it', 'www.santagostino.it']),
  doctorium: new Set(['doctorium.it', 'www.doctorium.it']),
  doctolib: new Set(['doctolib.it', 'www.doctolib.it', 'info.doctolib.it']),
  idoctors: new Set(['idoctors.it', 'www.idoctors.it']),
  paginemediche: new Set(['paginemediche.it', 'www.paginemediche.it', 'visitami.paginemediche.it', 'supporto.paginemediche.it']),
  topdoctors: new Set(['topdoctors.it', 'www.topdoctors.it']),
  livedoctor: new Set(['livedoctor.it', 'www.livedoctor.it']),
  humanitas: new Set(['humanitas.it', 'www.humanitas.it']),
  cdidigital: new Set(['cdi-digital.it', 'www.cdi-digital.it']),
  govisit: new Set(['go-visit.it', 'www.go-visit.it']),
  healthpoint: new Set(['healthpointitalia.com', 'www.healthpointitalia.com']),
  miagenda: new Set(['miagenda.it', 'www.miagenda.it']),
  saluteinsieme: new Set(['saluteinsieme.it', 'www.saluteinsieme.it'])
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

if (census.schemaVersion !== 1 || census.scopeVersion !== '1.0' || census.exhaustive !== false) {
  throw new Error('data/census.json non rispetta lo schema o deve dichiarare exhaustive=false');
}

const includedIds = new Set(census.included.map(entry => entry.offerId));
if (includedIds.size !== census.included.length) throw new Error('ID duplicato nel censimento');
for (const id of ids) {
  if (!includedIds.has(id)) throw new Error(`Offerta non presente nel censimento pubblico: ${id}`);
}
for (const id of includedIds) {
  if (!ids.has(id)) throw new Error(`Servizio censito senza offerta pubblica: ${id}`);
}

const sourceIds = new Set();
const monitoredOfferIds = new Set();
for (const source of sources) {
  if (sourceIds.has(source.id)) throw new Error(`Fonte duplicata: ${source.id}`);
  sourceIds.add(source.id);
  if (!ids.has(source.offerId)) throw new Error(`Fonte associata a offerta inesistente: ${source.id}`);
  const url = new URL(source.url);
  if (url.protocol !== 'https:') throw new Error(`La fonte monitorata deve usare HTTPS: ${source.id}`);
  if (!officialHosts[source.offerId]?.has(url.hostname)) {
    throw new Error(`Dominio non ufficiale nella fonte monitorata ${source.id}: ${url.hostname}`);
  }
  monitoredOfferIds.add(source.offerId);
}
for (const id of ids) {
  if (!monitoredOfferIds.has(id)) throw new Error(`Offerta senza fonte monitorata: ${id}`);
}

console.log(`Dati validi: ${data.offers.length} offerte.`);

