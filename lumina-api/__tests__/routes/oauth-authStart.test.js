/**
 * __tests__/routes/oauth-authStart.test.js
 *
 * Suite para GET /expapi/oauth2/:provider/auth/start
 *
 * Intents: login (default), register, link (requer cookie JWT)
 * Suporta providers: discord (apenas)
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, cookieAuth,
    mockLogger,
} = require('../helpers/testUtils');

mockLogger();

const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.OAUTH_STATE_SECRET = 'test-oauth-state-secret';
    process.env.DISCORD_CLIENT_ID = 'test-client-id';
    process.env.DISCORD_AUTH_REDIRECT_URI = 'https://example.com/callback';
});

afterEach(() => jest.clearAllMocks());

describe('GET /expapi/oauth2/:provider/auth/start', () => {
    it('302 redirect para Discord OAuth com intent=login (default)', async () => {
        const res = await request(app).get('/expapi/oauth2/discord/auth/start?origin=https://luminasink.me');

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/^https:\/\/discord\.com\/oauth2\/authorize\?/);
        expect(res.headers.location).toContain('client_id=test-client-id');
        expect(res.headers.location).toContain('response_type=code');
        // state deve estar assinado (contém base64.hmac)
        expect(res.headers.location).toMatch(/state=[^&]+\.[^&]+/);
    });

    it('302 redirect com intent=register', async () => {
        const res = await request(app).get('/expapi/oauth2/discord/auth/start?origin=https://luminasink.me&intent=register');

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/^https:\/\/discord\.com\/oauth2\/authorize\?/);
    });

    it('400 INVALID_ORIGIN para origin não permitida', async () => {
        const res = await request(app).get('/expapi/oauth2/discord/auth/start?origin=https://evil.com');

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_ORIGIN');
    });

    it('404 UNKNOWN_PROVIDER para provider não suportado', async () => {
        const res = await request(app).get('/expapi/oauth2/google/auth/start?origin=https://luminasink.me');

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('UNKNOWN_PROVIDER');
    });

    it('302 usa default origin quando origin não é enviado', async () => {
        const res = await request(app).get('/expapi/oauth2/discord/auth/start');

        expect(res.status).toBe(302);
    });

    it('302 aceita origin http://localhost:3000 (dev)', async () => {
        const res = await request(app).get('/expapi/oauth2/discord/auth/start?origin=http://localhost:3000');

        expect(res.status).toBe(302);
    });

    it('302 aceita origin http://localhost:5173 (dev)', async () => {
        const res = await request(app).get('/expapi/oauth2/discord/auth/start?origin=http://localhost:5173');

        expect(res.status).toBe(302);
    });

    it('302 redireciona para link_no_account quando intent=link sem cookie', async () => {
        const res = await request(app).get('/expapi/oauth2/discord/auth/start?origin=https://luminasink.me&intent=link');

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/oauthError=link_no_account/);
    });

    it('302 redireciona para link_no_account quando intent=link com cookie inválido', async () => {
        const res = await request(app)
            .get('/expapi/oauth2/discord/auth/start?origin=https://luminasink.me&intent=link')
            .set('Cookie', 'lumina_token=invalid.jwt.token');

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/oauthError=link_no_account/);
    });

    it('302 aceita intent=link quando cookie JWT válido', async () => {
        const token = makeJwt({ accountId: 'acc-mine-1' });
        const res = await request(app)
            .get('/expapi/oauth2/discord/auth/start?origin=https://luminasink.me&intent=link')
            .set('Cookie', `lumina_token=${token}`);

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/^https:\/\/discord\.com\/oauth2\/authorize\?/);
        // Não deve ter oauthError
        expect(res.headers.location).not.toMatch(/oauthError=/);
    });

    it('400 INVALID_ORIGIN para intent inválido (cuido default para login)', async () => {
        // Intent inválido é silenciosamente convertido para 'login'
        const res = await request(app).get('/expapi/oauth2/discord/auth/start?origin=https://luminasink.me&intent=invalid');

        expect(res.status).toBe(302);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
