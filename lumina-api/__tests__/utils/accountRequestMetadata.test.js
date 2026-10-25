'use strict';
const { accountRequestMetadata, requestMetadata } = require('../../src/utils/accountRequestMetadata');
const original = process.env.VERCEL;
afterEach(() => { if (original === undefined) delete process.env.VERCEL; else process.env.VERCEL = original; });
const request = (headers = {}) => ({ headers, ip: '203.0.113.10', socket: { remoteAddress: '127.0.0.1' } });

test('accepts Cloudflare metadata only behind a network peer verified by Vercel', () => {
  process.env.VERCEL = '1';
  const req = request({ 'x-vercel-forwarded-for': '172.67.156.54', 'cf-connecting-ip': '203.0.113.20', 'cf-ipcountry': 'BR', 'cf-region-code': 'SP', 'cf-ipcity': 'S%C3%A3o%20Paulo', 'cf-iplatitude': '-23.5', 'cf-iplongitude': '-46.6' });
  const metadata = accountRequestMetadata(req, 'registration');
  expect(metadata).toMatchObject({ registrationIp: '203.0.113.20', registrationCountry: 'BR', registrationRegion: 'SP', registrationCity: 'São Paulo', registrationLocation: 'São Paulo, SP, BR', registrationLocationSource: 'cloudflare' });
  expect(JSON.stringify(metadata)).not.toMatch(/latitude|longitude|-23\.5|-46\.6/);
});

test('direct requests cannot spoof Cloudflare through cf-ray or untrusted forwarded headers', () => {
  delete process.env.VERCEL;
  const req = request({ 'cf-ipcountry': 'BR', 'cf-ipcity': 'Spoofed', 'cf-ray': 'arbitrary', 'cf-connecting-ip': '198.51.100.1', 'x-vercel-forwarded-for': '172.67.156.54', 'x-forwarded-for': '172.67.156.54' });
  expect(requestMetadata(req)).toMatchObject({ ip: '203.0.113.10', location: '', source: 'unavailable' });
});

test('direct Vercel origin ignores forged Cloudflare and Vercel geolocation values', () => {
  process.env.VERCEL = '1';
  const req = request({ 'x-vercel-forwarded-for': '198.51.100.10', 'cf-connecting-ip': '203.0.113.1', 'cf-ipcountry': 'BR', 'cf-ipcity': 'Spoofed', 'x-vercel-ip-city': 'Ignored' });
  expect(requestMetadata(req)).toMatchObject({ ip: '203.0.113.10', location: '', source: 'unavailable' });
});

test.each(['2606:4700::1234', '::ffff:104.21.42.47'])('supports Cloudflare IPv6 and mapped IPv4 peers: %s', peer => {
  delete process.env.VERCEL;
  const req = request({ 'cf-ipcountry': 'PT', 'cf-ipcity': 'Lisboa' });
  req.socket.remoteAddress = peer;
  expect(requestMetadata(req)).toMatchObject({ country: 'PT', city: 'Lisboa', source: 'cloudflare' });
});

test.each(['bad%encoding', '<script>', 'A'.repeat(401), 'City%0D%0AInjected'])('invalid place data is unavailable without throwing: %s', city => {
  process.env.VERCEL = '1';
  const req = request({ 'x-vercel-forwarded-for': '172.67.156.54', 'cf-ipcountry': 'XX', 'cf-ipcity': city });
  expect(requestMetadata(req)).toMatchObject({ location: '', city: '', country: '', source: 'unavailable' });
});

test('last-login fields do not overwrite original registration fields; arrays are ignored', () => {
  process.env.VERCEL = '1';
  const metadata = accountRequestMetadata(request({ 'x-vercel-forwarded-for': ['172.67.156.54'], 'cf-ipcountry': 'BR' }), 'lastLogin');
  expect(metadata.lastLoginLocationSource).toBe('unavailable');
  expect(Object.keys(metadata).every(key => key.startsWith('lastLogin'))).toBe(true);
  expect(() => accountRequestMetadata(request(), 'unvalidated')).toThrow();
});
