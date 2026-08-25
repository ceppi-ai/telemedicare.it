import { readFileSync, writeFileSync } from 'node:fs';

const census = JSON.parse(readFileSync('data/census.json', 'utf8'));
const month = new Intl.DateTimeFormat('it-IT', {
  month: 'long', year: 'numeric', timeZone: 'Europe/Rome'
}).format(new Date());

const searchLinks = census.discoveryQueries.map(query => {
  const google = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const bing = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  return `- **${query}** — [Google](${google}) · [Bing](${bing})`;
});

const providers = census.included
  .map(entry => `- [x] ${entry.provider} — già incluso`)
  .join('\n');

const report = `# Ricerca mensile nuovi servizi di telemedicina — ${month}

Questa attività serve a individuare nuovi operatori; non modifica automaticamente il sito. Valuta ogni candidato con i requisiti pubblicati in \`inclusione.html\` e usa soltanto fonti ufficiali per l'ammissione.

## Perimetro

${census.definition}

La selezione non è un censimento esaustivo del mercato.

## Ricerche da aprire

${searchLinks.join('\n')}

## Servizi già inclusi

${providers}

## Checklist per ogni nuovo candidato

- [ ] disponibile al pubblico italiano;
- [ ] prestazione sanitaria a distanza, non solo software o contenuti;
- [ ] percorso concreto di richiesta o prenotazione per il paziente;
- [ ] almeno una fonte ufficiale pubblica e monitorabile;
- [ ] offerta generale o multispecialistica;
- [ ] servizio attivo al momento della verifica;
- [ ] assenza di pagamento richiesto per essere valutato o incluso.

## Chiusura del controllo

- [ ] annota ricerche e risultato in \`data/discovery-log.json\`;
- [ ] aggiorna \`data/census.json\` anche se non trovi nuovi servizi;
- [ ] se ammetti un servizio, aggiungilo a \`data/offers.json\` e \`data/sources.json\` con fonti ufficiali;
- [ ] chiudi questa issue indicando: nuovi ammessi, non ammessi e motivazione oggettiva.

Le aziende possono candidarsi gratuitamente scrivendo a segnalazioni@telemedicare.it; la candidatura non garantisce l'inclusione né influenza il punteggio.
`;

writeFileSync('discovery-report.md', report, 'utf8');
console.log(report);

