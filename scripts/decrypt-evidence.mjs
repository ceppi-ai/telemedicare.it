import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { decryptEvidence } from './evidence-crypto.mjs';

const input = process.argv[2];
if (!input) throw new Error('Indica il percorso di un file .evidence.json.');

const envelopePath = resolve(input);
const privateKeyPath = resolve('private/evidence-private-key.pem');
if (!existsSync(privateKeyPath)) throw new Error('Chiave privata non trovata in private/evidence-private-key.pem.');

const envelope = JSON.parse(readFileSync(envelopePath, 'utf8'));
const payload = decryptEvidence(envelope, readFileSync(privateKeyPath, 'utf8'));
const outputPath = resolve('private/decrypted', basename(envelopePath).replace(/\.evidence\.json$/i, '.json'));
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Prova decifrata in ${outputPath}`);
