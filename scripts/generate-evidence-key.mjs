import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { dirname, resolve } from 'node:path';

const privatePath = resolve('private/evidence-private-key.pem');
const publicPath = resolve('evidence/public-key.pem');

if (existsSync(privatePath) || existsSync(publicPath)) {
  throw new Error('Chiave già presente: generazione interrotta per non sovrascriverla.');
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 3072,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

mkdirSync(dirname(privatePath), { recursive: true });
mkdirSync(dirname(publicPath), { recursive: true });
writeFileSync(privatePath, privateKey, { encoding: 'utf8', mode: 0o600 });
writeFileSync(publicPath, publicKey, 'utf8');
console.log('Coppia di chiavi creata. Conserva una copia sicura di private/evidence-private-key.pem.');
