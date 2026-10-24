'use strict';
const crypto = require('crypto');
function key() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY is required');
  return crypto.createHash('sha256').update(raw).digest();
}
function encryptSecret(value) {
  if (!value || value.startsWith('v1.')) return value;
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), nonce);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
function decryptSecret(value) {
  if (!value || !value.startsWith('v1.')) return value; // Legacy reads; migrate explicitly.
  const parts = value.split('.');
  if (parts.length !== 4) throw new Error('Invalid encrypted credential');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(parts[1], 'base64url'));
  decipher.setAuthTag(Buffer.from(parts[2], 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
}
module.exports = { encryptSecret, decryptSecret };
