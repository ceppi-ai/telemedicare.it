# Archivio probatorio delle fonti

Questo archivio conserva una prova tecnica delle pagine ufficiali usate per i criteri e i prezzi pubblicati da Telemedicare.it.

## Struttura

- `ledger.json` è il registro pubblico, versionato da GitHub, con URL, data, hash e percorso di ogni acquisizione.
- `archive/AAAA/MM/GG/` contiene copie cifrate delle pagine soltanto alla prima acquisizione e quando cambia l'impronta della fonte.
- `public-key.pem` consente al controllo automatico di cifrare nuove prove, ma non di leggerle.
- la chiave privata è conservata solo sul computer del gestore in `private/evidence-private-key.pem`, esclusa da Git e dai file da caricare su Aruba.

Ogni busta cifrata contiene HTML ricevuto, testo visibile, URL finale, intestazioni tecniche essenziali, data UTC e impronte SHA-256. Il contenuto di terzi non è pubblicamente leggibile. Il commit GitHub documenta che la busta e i relativi hash esistevano non oltre la data del commit.

## Recupero di una prova

Dal computer che conserva la chiave privata:

```powershell
node scripts/decrypt-evidence.mjs evidence/archive/AAAA/MM/GG/NOME-FILE.evidence.json
```

Il documento decifrato viene scritto in `private/decrypted/`. Non pubblicarlo: contiene una copia tecnica di una pagina di terzi e va usato soltanto per verifica, contestazione o tutela di diritti.

## Limiti

L'archivio fornisce evidenza tecnica e cronologica, ma non equivale a una marcatura temporale qualificata o a un accertamento notarile. Per una controversia concreta il materiale deve essere valutato da un professionista.
