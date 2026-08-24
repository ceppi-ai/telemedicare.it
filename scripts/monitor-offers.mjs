import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const offersPath = resolve('data/offers.json');
const sourcesPath = resolve('data/sources.json');
const statePath = resolve('data/monitoring-state.json');
const reportPath = resolve('monitor-report.md');

const data = JSON.parse(readFileSync(offersPath, 'utf8'));
const sources = JSON.parse(readFileSync(sourcesPath, 'utf8'));
const state = JSON.parse(readFileSync(statePath, 'utf8'));
const now = new Date();
const nowIso = now.toISOString();
const nextCheck = new Date(now);
nextCheck.setUTCDate(nextCheck.getUTCDate() + 7);

const results = [];
const fieldChanges = [];

function normalize(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/\b(?:nonce|data-reactroot|data-hydration)[^=]*=(['"])[\s\S]*?\1/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(text) {
  const entities = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"',
    euro: '€', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”'
  };
  return text
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match);
}

function visibleText(html) {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
}

function normalizePrice(raw) {
  const match = raw?.match(/([0-9]+(?:[.,][0-9]{1,2})?)/);
  if (!match) return null;
  const numeric = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const display = Number.isInteger(numeric)
    ? `${numeric} €`
    : `${numeric.toFixed(2).replace('.', ',')} €`;
  return { numeric, display };
}

function priceBand(numeric) {
  if (numeric <= 50) return 'low';
  if (numeric <= 80) return 'mid';
  return 'high';
}

function reviewedDate(date) {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome'
  }).format(date).replace('.', '');
}

function recordChange(offer, field, nextValue, source) {
  const previous = offer[field];
  if (previous === nextValue) return false;
  offer[field] = nextValue;
  fieldChanges.push({ provider: offer.provider, field, previous, next: nextValue, source: source.url });
  return true;
}

for (const source of sources) {
  const previousState = state.sources[source.id] ?? {};
  try {
    const response = await fetch(source.url, {
      redirect: 'follow',
      headers: {
        'accept-language': 'it-IT,it;q=0.9,en;q=0.5',
        'user-agent': 'Telemedicare offer monitor/1.0 (+https://telemedicare.it)'
      },
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const text = visibleText(html);
    const hash = createHash('sha256').update(normalize(html)).digest('hex');
    const firstCheck = !previousState.hash;
    const changed = Boolean(previousState.hash && previousState.hash !== hash);
    const offer = data.offers.find(item => item.id === source.offerId);
    const detected = [];

    if (!offer) throw new Error(`offerta ${source.offerId} non presente in data/offers.json`);

    if (source.pricePattern) {
      const priceMatch = text.match(new RegExp(source.pricePattern, 'iu'));
      const price = normalizePrice(priceMatch?.[1]);
      if (price) {
        detected.push(`prezzo ${price.display}`);
        recordChange(offer, 'price', price.display, source);
        recordChange(offer, 'priceBand', priceBand(price.numeric), source);
      }
    }

    if (changed) offer.reviewed = reviewedDate(now);
    results.push({ ...source, status: 'ok', changed, firstCheck, detected });
    state.sources[source.id] = { hash, checkedAt: nowIso, status: 'ok' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ ...source, status: 'error', changed: false, firstCheck: false, error: message, detected: [] });
    state.sources[source.id] = { ...previousState, checkedAt: nowIso, status: 'error', error: message };
  }
}

state.lastRun = nowIso;
data.checkedAt = nowIso;
data.nextCheck = nextCheck.toISOString();

writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
writeFileSync(offersPath, `${JSON.stringify(data, null, 2)}\n`);

const changedSources = results.filter(result => result.changed);
const failedSources = results.filter(result => result.status === 'error');
const firstRun = results.filter(result => result.firstCheck);
const needsReview = changedSources.length > 0 || failedSources.length > 0 || fieldChanges.length > 0;

const report = [
  '# Controllo settimanale offerte Telemedicare',
  '',
  `Esecuzione: ${reviewedDate(now)} (${nowIso})`,
  '',
  needsReview
    ? 'Sono state rilevate variazioni o anomalie. Controlla le righe qui sotto e, se i dati proposti sono corretti, premi **Merge pull request**.'
    : firstRun.length > 0
      ? 'Prima esecuzione: è stata registrata la situazione iniziale. Non è richiesta approvazione.'
      : 'Nessuna variazione rilevata. Non è richiesta approvazione.',
  '',
  '## Fonti controllate',
  '',
  ...results.map(result => {
    const status = result.status === 'error'
      ? `ERRORE: ${result.error}`
      : result.firstCheck
        ? 'situazione iniziale registrata'
        : result.changed
          ? 'PAGINA MODIFICATA'
          : 'nessuna variazione';
    const detected = result.detected.length ? ` — rilevato: ${result.detected.join('; ')}` : '';
    return `- [${result.provider}](${result.url}) — ${status}${detected}`;
  }),
  '',
  '## Modifiche proposte ai dati pubblici',
  '',
  ...(fieldChanges.length
    ? fieldChanges.map(change => `- **${change.provider} · ${change.field}**: \`${change.previous}\` → \`${change.next}\` ([fonte](${change.source}))`)
    : ['- Nessuna modifica strutturata estratta automaticamente. La pull request registra comunque la variazione della fonte per la verifica editoriale.']),
  '',
  '> Il monitor propone automaticamente solo prezzi riconosciuti da regole specifiche. I sei criteri documentali, le descrizioni e le condizioni editoriali richiedono sempre conferma umana.'
].join('\n');

writeFileSync(reportPath, `${report}\n`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `needs_review=${needsReview}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `has_failures=${failedSources.length > 0}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `changed_sources=${changedSources.length}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `field_changes=${fieldChanges.length}\n`);
}

console.log(report);

