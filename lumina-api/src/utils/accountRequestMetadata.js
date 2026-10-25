'use strict';
const { isIP, BlockList } = require('node:net');
const networks = require('../config/cloudflareNetworks.json');
const cloudflare = new BlockList();
for (const family of ['ipv4', 'ipv6']) for (const range of networks[family]) {
    const [address, prefix] = range.split('/');
    cloudflare.addSubnet(address, Number(prefix), family);
}
function header(req, name) {
    const value = req.headers?.[name];
    return typeof value === 'string' ? value : '';
}
function ip(value) {
    if (typeof value !== 'string') return '';
    const normalized = value.startsWith('::ffff:') ? value.slice(7) : value;
    return isIP(normalized) ? normalized : '';
}
function trustedCloudflare(req) {
    // Vercel overwrites these headers with the network peer. An arbitrary cf-ray
    // or cf-ipcountry header is never enough to authenticate an incoming proxy.
    const peer = process.env.VERCEL
        ? ip(header(req, 'x-vercel-forwarded-for') || header(req, 'x-real-ip'))
        : ip(req.socket?.remoteAddress);
    const family = isIP(peer);
    return !!family && cloudflare.check(peer, family === 4 ? 'ipv4' : 'ipv6');
}
function place(value, maxLength = 100) {
    if (!value || value.length > 400) return '';
    let decoded;
    try { decoded = decodeURIComponent(value); } catch { return ''; }
    if (decoded.length > maxLength || !/^[\p{L}\p{M}\p{N} .,'’()\-]+$/u.test(decoded)) return '';
    return decoded.trim();
}
function requestMetadata(req) {
    const trusted = trustedCloudflare(req);
    const countryHeader = trusted ? header(req, 'cf-ipcountry') : '';
    const country = /^[A-Z]{2}$/.test(countryHeader) && countryHeader !== 'XX' ? countryHeader : '';
    const city = trusted ? place(header(req, 'cf-ipcity')) : '';
    const region = trusted ? place(header(req, 'cf-region-code'), 32) || place(header(req, 'cf-region'), 100) : '';
    const location = [city, region, country].filter(Boolean).join(', ');
    return {
        ip: (trusted && ip(header(req, 'cf-connecting-ip'))) || ip(req.ip) || ip(req.socket?.remoteAddress),
        userAgent: header(req, 'user-agent').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 512),
        location, country, city, region,
        source: location ? 'cloudflare' : 'unavailable',
    };
}
function accountRequestMetadata(req, prefix) {
    if (!['registration', 'lastLogin'].includes(prefix)) throw new Error('Invalid account metadata prefix');
    const value = requestMetadata(req);
    return {
        [`${prefix}Ip`]: value.ip,
        [`${prefix}UserAgent`]: value.userAgent,
        [`${prefix}Location`]: value.location,
        [`${prefix}Country`]: value.country,
        [`${prefix}City`]: value.city,
        [`${prefix}Region`]: value.region,
        [`${prefix}LocationSource`]: value.source,
    };
}
module.exports = { accountRequestMetadata, requestMetadata };
