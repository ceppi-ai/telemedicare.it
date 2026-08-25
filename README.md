# Telemedicare.it

Comparatore editoriale statico di servizi di telemedicina. Il sito è pubblicato su Aruba, mentre i dati confermati delle offerte sono letti da un file JSON pubblico su GitHub.

## Architettura

- Aruba ospita HTML, CSS, JavaScript e `config.js`.
- GitHub ospita `data/offers.json`, che il sito legge a ogni apertura.
- GitHub Actions controlla le fonti ogni lunedì alle 09:00, ora italiana.
- Se non cambia nulla, registra automaticamente la data del controllo.
- Se cambia una fonte, apre una pull request e richiede la revisione al gestore.
- Alla prima acquisizione e quando una fonte cambia, salva una copia cifrata nell'archivio probatorio versionato.
- Il gestore riceve la notifica GitHub, controlla il riepilogo e preme **Merge pull request**.
- Dopo il merge il sito legge automaticamente il JSON aggiornato; non è necessario accedere ad Aruba.

GitHub non riceve credenziali Aruba, password email o token personali. Il workflow usa soltanto il `GITHUB_TOKEN` temporaneo e limitato al repository.

Le copie integrali delle fonti sono cifrate con la chiave pubblica presente nel repository. La chiave privata rimane esclusivamente in `private/evidence-private-key.pem`, cartella esclusa da Git e da Aruba. Vedi `evidence/README.md`.

## Avvio locale

Il sito non richiede dipendenze o compilazione:

```powershell
python -m http.server 4173
```

Poi aprire `http://localhost:4173`.

Finché `config.js` contiene `INSERISCI_USERNAME_GITHUB`, la preview locale legge `data/offers.json` e mostra chiaramente che GitHub non è ancora attivo. Dopo la configurazione, se il feed remoto non è raggiungibile il sito non espone una copia potenzialmente obsoleta.

## Comandi di controllo

Richiede Node.js 20 o successivo:

```powershell
npm run validate
npm run monitor
```

## Configurazione iniziale

Seguire [GITHUB_SETUP.md](GITHUB_SETUP.md). Dopo avere creato il repository, modificare una sola volta `githubOwner` in `config.js` e pubblicare su Aruba i file statici indicati nella guida.

## Limiti intenzionali

Il monitor aggiorna automaticamente solo prezzi riconoscibili con una regola specifica. Qualunque modifica delle fonti viene segnalata in una pull request; criteri documentali, descrizioni e condizioni editoriali richiedono conferma umana. Il sito non raccoglie né pubblica rating o recensioni di piattaforme esterne.
