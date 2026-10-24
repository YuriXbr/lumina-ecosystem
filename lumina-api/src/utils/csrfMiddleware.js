'use strict';
const crypto = require('crypto');
const COOKIE_NAME = 'csrf_token';
const HEADER_NAME = 'x-csrf-token';
function safeEqual(a, b) {
  const left = Buffer.from(String(a || '')), right = Buffer.from(String(b || ''));
  return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
}
function signature(nonce, session) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(`csrf:${nonce}:${session || ''}`).digest('base64url');
}
function generateCsrfToken(session = '') {
  const nonce = crypto.randomBytes(32).toString('base64url');
  return `${nonce}.${signature(nonce, session)}`;
}
function valid(token, session) {
  if (typeof token !== 'string' || token.length > 200) return false;
  const [nonce, mac, extra] = token.split('.');
  return !extra && !!nonce && safeEqual(mac, signature(nonce, session));
}
function ensureCsrfToken(req, res, next) {
  let token = req.cookies?.[COOKIE_NAME];
  if (!valid(token, req.cookies?.lumina_token)) {
    token = generateCsrfToken(req.cookies?.lumina_token);
    res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 3600000, path: '/' });
  }
  req.csrfToken = () => token;
  res.setHeader('Cache-Control', 'no-store');
  if (next) next();
}
function csrfProtection(req, res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method?.toUpperCase())) return ensureCsrfToken(req, res, next);
  const cookie = req.cookies?.[COOKIE_NAME], header = req.headers?.[HEADER_NAME];
  const origin = req.headers?.origin;
  if ((origin && !require('../config/allowedOrigins').isAllowedOrigin(origin)) || !safeEqual(cookie, header) || !valid(cookie, req.cookies?.lumina_token)) return next(Object.assign(new Error('Token CSRF inválido.'), { code: 'EBADCSRFTOKEN' }));
  next();
}
module.exports = { csrfProtection, generateCsrfToken, ensureCsrfToken, COOKIE_NAME, HEADER_NAME };
