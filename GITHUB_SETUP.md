# Configurazione GitHub e pubblicazione

Questa procedura si esegue una sola volta. In seguito le offerte confermate si aggiornano senza accedere ad Aruba.

## 1. Creare l'account e il repository

1. Apri [github.com](https://github.com/) e crea un account, oppure accedi.
2. In alto a destra premi **+** e poi **New repository**.
3. Come nome inserisci `telemedicare.it`.
4. Seleziona **Public**. È necessario perché il sito Aruba deve poter leggere il JSON senza password. Il codice del sito sarebbe comunque visibile dal browser.
5. Non selezionare “Add a README”, `.gitignore` o licenza: questi file sono già pronti.
6. Premi **Create repository**.

## 2. Pubblicare il progetto con GitHub Desktop

È il metodo più semplice se non usi abitualmente Git da terminale.

1. Installa e apri [GitHub Desktop](https://desktop.github.com/), quindi accedi al tuo account.
2. Scegli **File → Add local repository**.
3. Seleziona `C:\Users\infop\Documents\telemedicare.it`.
4. Nel campo “Summary” scrivi `Prima versione con aggiornamento automatico` e premi **Commit to main**.
5. Premi **Publish repository** oppure **Push origin** e scegli il repository `telemedicare.it` appena creato.

In alternativa, da terminale nella cartella del progetto:

```powershell
git branch -M main
git add .
git commit -m "Prima versione con aggiornamento automatico"
git remote add origin https://github.com/TUO-USERNAME/telemedicare.it.git
git push -u origin main
```

Sostituisci `TUO-USERNAME` con il nome mostrato nel tuo profilo GitHub.

## 3. Abilitare la creazione delle richieste di conferma

Nel repository GitHub:

1. Apri **Settings → Actions → General**.
2. Scorri fino a **Workflow permissions**.
3. Seleziona **Read and write permissions**.
4. Attiva **Allow GitHub Actions to create and approve pull requests**.
5. Premi **Save**.

Il workflow non approva né unisce da solo le richieste: l'opzione consente tecnicamente di crearle. La conferma finale resta al gestore.

## 4. Indicare chi deve ricevere l'email

1. Apri **Settings → Secrets and variables → Actions → Variables**.
2. Premi **New repository variable**.
3. Nome: `REVIEWER_LOGIN`.
4. Valore: il tuo nome utente GitHub.

Non è un segreto e non è una password. Serve solo ad assegnarti la pull request e chiederti la revisione.

Controlla inoltre in **profilo GitHub → Settings → Notifications** che le notifiche email per “Pull requests” e “Review requested” siano attive. Non servono credenziali SMTP o Aruba.

## 5. Collegare il sito Aruba al JSON GitHub

Apri `config.js` e sostituisci:

```js
githubOwner: 'INSERISCI_USERNAME_GITHUB'
```

con il tuo nome utente, per esempio:

```js
githubOwner: 'mario-rossi'
```

Salva il file. In GitHub Desktop crea un secondo commit, per esempio `Configura sorgente dati GitHub`, e premi **Push origin**.

Carica una sola volta nella cartella principale dell'Hosting Windows Aruba:

- `index.html`
- `metodologia.html`
- `criteri.html`
- `privacy.html`
- `cookie.html`
- `note-legali.html`
- `styles.css`
- `script.js`
- `config.js`

Le cartelle `.github` e `scripts` rimangono su GitHub e non devono essere caricate su Aruba. La cartella `data` serve alla preview locale; online il sito legge il file pubblico direttamente da GitHub.

## 6. Provare subito il controllo

1. Nel repository apri la scheda **Actions**.
2. Seleziona **Controllo settimanale offerte**.
3. Premi **Run workflow → Run workflow**.

La prima esecuzione registra le impronte iniziali. Se i dati estratti differiscono da quelli pubblicati, GitHub apre subito una pull request; altrimenti aggiorna soltanto la data dell'ultimo controllo.

## Cosa accade ogni lunedì

1. Alle 09:00, ora italiana, GitHub controlla le fonti configurate in `data/sources.json`.
2. Se non ci sono variazioni, aggiorna in autonomia data e prossimo controllo. Non occorre fare nulla.
3. Se rileva una variazione o un errore, apre/aggiorna la pull request **“Offerte: variazioni da verificare”**.
4. GitHub ti invia una notifica email con il collegamento alla pull request.
5. Apri il collegamento, leggi “Files changed” e il riepilogo delle fonti.
6. Se è corretto, premi **Merge pull request** e poi **Confirm merge**.
7. Il sito Aruba leggerà il file confermato dal ramo `main` alla visita successiva.

Se la proposta non è corretta, non fare merge: chiudi la pull request oppure modifica i dati direttamente su GitHub prima di unirla.

## Sicurezza e continuità

- GitHub non conosce password o accessi Aruba.
- Il sito legge solamente un JSON pubblico; non può scrivere su GitHub.
- Il workflow può modificare esclusivamente il proprio repository.
- Se GitHub non è temporaneamente raggiungibile, il sito mostra i dati locali di sicurezza incorporati in `script.js`.
- Nessun dato sanitario o dato dei visitatori passa attraverso GitHub.

