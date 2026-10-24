'use strict';
const crypto = require('crypto');
const DatabaseService = require('../database/services/DataBaseService');
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const { encryptSecret, decryptSecret } = require('./secretEncryption');
const revocations = new DatabaseService('revokedsessions', {
  tokenHash: { type: String, required: true }, expiresAt: { type: Date, required: true },
});
const transactions = new DatabaseService('oauthtransactions', {
  nonceHash: { type: String, required: true }, expiresAt: { type: Date, required: true },
});
const exchanges = new DatabaseService('oauthexchanges', {
  codeHash: { type: String, required: true }, token: { type: String, required: true },
  origin: { type: String, required: true }, browserHash: { type: String, required: true }, expiresAt: { type: Date, required: true },
});
async function revokeToken(token, expiresAt) {
  if (token) await revocations.update({ tokenHash: hash(token) }, { $set: { expiresAt } }, { upsert: true });
}
async function isRevoked(token) { return !!await revocations.exists({ tokenHash: hash(token), expiresAt: { $gt: new Date() } }); }
async function createTransaction(nonce) { await transactions.create({ nonceHash: hash(nonce), expiresAt: new Date(Date.now() + 600000) }); }
async function consumeTransaction(nonce) {
  await transactions.connect();
  return !!await transactions.model.findOneAndDelete({ nonceHash: hash(nonce), expiresAt: { $gt: new Date() } });
}
async function createExchange(token, origin, browserKey) {
  const code = crypto.randomBytes(32).toString('base64url');
  // Tokens never enter a redirect URI; the secret remains server-side for at most 60s.
  await exchanges.create({ codeHash: hash(code), token: encryptSecret(token), origin, browserHash: hash(browserKey), expiresAt: new Date(Date.now() + 60000) });
  return code;
}
async function consumeExchange(code, origin, browserKey) {
  await exchanges.connect();
  const exchange = await exchanges.model.findOneAndDelete({ codeHash: hash(code), origin, browserHash: hash(browserKey), expiresAt: { $gt: new Date() } });
  if (exchange) exchange.token = decryptSecret(exchange.token);
  return exchange;
}
module.exports = { hash, revokeToken, isRevoked, createTransaction, consumeTransaction, createExchange, consumeExchange };
