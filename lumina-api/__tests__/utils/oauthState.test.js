/**
 * __tests__/utils/oauthState.test.js
 *
 * Suite para src/oauthProviders/state.js
 *
 * Testa:
 *   - signState: assina payload com HMAC-SHA256
 *   - verifyState: valida HMAC, retorna payload ou null
 *   - isAllowedOrigin: reexporta de allowedOrigins
 *   - State expira após 10 minutos (verificado no callback, não aqui)
 *   - Tamper detection: alterar qualquer byte do state invalida
 */

'use strict';

const crypto = require('crypto');
const { signState, verifyState, isAllowedOrigin, ALLOWED_ORIGINS } = require('../../src/oauthProviders/state');

beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.OAUTH_STATE_SECRET = 'test-oauth-state-secret-key-2026';
});

// ─── ALLOWED_ORIGINS ───────────────────────────────────────────────────────
describe('ALLOWED_ORIGINS', () => {
    it('inclui https://luminasink.me', () => {
        expect(ALLOWED_ORIGINS).toContain('https://luminasink.me');
    });

    it('inclui http://localhost:3000 (dev)', () => {
        expect(ALLOWED_ORIGINS).toContain('http://localhost:3000');
    });

    it('inclui http://localhost:5173 (dev)', () => {
        expect(ALLOWED_ORIGINS).toContain('http://localhost:5173');
    });
});

// ─── isAllowedOrigin ───────────────────────────────────────────────────────
describe('isAllowedOrigin', () => {
    it('true para https://luminasink.me', () => {
        expect(isAllowedOrigin('https://luminasink.me')).toBe(true);
    });

    it('true para http://localhost:3000', () => {
        expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    });

    it('false para https://evil.com', () => {
        expect(isAllowedOrigin('https://evil.com')).toBe(false);
    });

    it('false para string vazia', () => {
        expect(isAllowedOrigin('')).toBe(false);
    });

    it('false para null', () => {
        expect(isAllowedOrigin(null)).toBe(false);
    });

    it('false para undefined', () => {
        expect(isAllowedOrigin(undefined)).toBe(false);
    });

    it('aceita preview Vercel em NODE_ENV != production', () => {
        const previewUrl = 'https://my-branch-yurixbrs-projects.vercel.app';
        expect(isAllowedOrigin(previewUrl)).toBe(true);
    });

    it('rejeita origin malformada', () => {
        expect(isAllowedOrigin('not-a-url')).toBe(false);
    });
});

// ─── signState / verifyState ───────────────────────────────────────────────
describe('signState / verifyState roundtrip', () => {
    it('assina e verifica payload com sucesso', () => {
        const payload = {
            origin: 'https://luminasink.me',
            issuedAt: Date.now(),
            intent: 'login',
        };

        const signed = signState(payload);
        expect(typeof signed).toBe('string');
        expect(signed).toContain('.');

        const verified = verifyState(signed);
        expect(verified).toEqual(payload);
    });

    it('preserva linkAccountId quando presente', () => {
        const payload = {
            origin: 'https://luminasink.me',
            issuedAt: Date.now(),
            intent: 'link',
            linkAccountId: 'acc-123',
        };

        const signed = signState(payload);
        const verified = verifyState(signed);
        expect(verified.linkAccountId).toBe('acc-123');
    });

    it('state tem formato base64url.hmac', () => {
        const signed = signState({ test: true, issuedAt: 123 });
        const [base, hmac] = signed.split('.');
        expect(base).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(hmac).toMatch(/^[A-Za-z0-9_-]+$/);
    });
});

// ─── Tamper detection ──────────────────────────────────────────────────────
describe('Tamper detection', () => {
    it('retorna null quando state é vazio', () => {
        expect(verifyState('')).toBeNull();
    });

    it('retorna null quando state é null', () => {
        expect(verifyState(null)).toBeNull();
    });

    it('retorna null quando state não tem ponto', () => {
        expect(verifyState('no-dot-here')).toBeNull();
    });

    it('retorna null quando HMAC é alterado', () => {
        const payload = { origin: 'https://luminasink.me', issuedAt: Date.now() };
        const signed = signState(payload);
        const [base, hmac] = signed.split('.');

        // Alterar HMAC
        const tampered = `${base}.aaaaaaa`;
        expect(verifyState(tampered)).toBeNull();
    });

    it('retorna null quando payload é alterado (HMAC não bate)', () => {
        const payload = { origin: 'https://luminasink.me', issuedAt: Date.now() };
        const signed = signState(payload);
        const [base, hmac] = signed.split('.');

        // Alterar base (payload)
        const tampered = `aaaa.${hmac}`;
        expect(verifyState(tampered)).toBeNull();
    });

    it('retorna null quando assinado com secret errado', () => {
        const payload = { origin: 'https://luminasink.me', issuedAt: Date.now() };

        // Assinar com secret errado
        const wrongBase = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const wrongHmac = crypto.createHmac('sha256', 'wrong-secret').update(wrongBase).digest('base64url');
        const wrongSigned = `${wrongBase}.${wrongHmac}`;

        expect(verifyState(wrongSigned)).toBeNull();
    });

    it('retorna null quando base64 é inválido', () => {
        const fakeSigned = '!!!not-base64!!.fake-hmac';
        expect(verifyState(fakeSigned)).toBeNull();
    });

    it('retorna null quando JSON no payload é inválido', () => {
        // Base64url de "not-json" = "bm90LWpzb24"
        const badBase = Buffer.from('not-json').toString('base64url');
        const hmac = crypto.createHmac('sha256', process.env.OAUTH_STATE_SECRET).update(badBase).digest('base64url');
        const badSigned = `${badBase}.${hmac}`;

        expect(verifyState(badSigned)).toBeNull();
    });
});

// ─── Comparação timing-safe ────────────────────────────────────────────────
describe('Timing-safe comparison', () => {
    it('retorna null quando HMAC tem tamanho diferente', () => {
        const payload = { origin: 'https://luminasink.me', issuedAt: Date.now() };
        const signed = signState(payload);
        const [base] = signed.split('.');

        // HMAC com tamanho diferente
        const shortHmac = 'abc';
        const tampered = `${base}.${shortHmac}`;

        expect(verifyState(tampered)).toBeNull();
    });
});
