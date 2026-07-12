/**
 * __tests__/routes/oauth-authCallback.test.js
 *
 * Suite para GET /expapi/oauth2/:provider/auth/callback
 *
 * Trata 3 intents: login, register, link
 * Valida state (HMAC-signed), chama Discord API, cria/autentica conta
 */

'use strict';

const request = require('supertest');
const crypto = require('crypto');
const {
    JWT_SECRET, makeJwt, cookieAuth, makeAccount,
    mockLogger, mockDashboardAccountService, mockAxios,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockAxios();

// Mock do oauthProviders — singleton para que mocks setup no teste sejam
// vistos pela rota quando ela chamar getProvider novamente
// Variável prefixada com 'mock' para satisfazer restrição de escopo do Jest
const mockDiscordProvider = {
    name: 'discord',
    getAuthorizationUrl: jest.fn((state) => `https://discord.com/oauth2/authorize?state=${state}`),
    exchangeCode: jest.fn(),
    getProfile: jest.fn(),
};
jest.mock('../../src/oauthProviders', () => ({
    getProvider: jest.fn((name) => {
        if (name !== 'discord') {
            const err = new Error('Unknown provider');
            err.code = 'UNKNOWN_PROVIDER';
            throw err;
        }
        return mockDiscordProvider;
    }),
}));

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const { getProvider } = require('../../src/oauthProviders');
const axios = require('axios');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.OAUTH_STATE_SECRET = 'test-oauth-state-secret';
    process.env.DISCORD_CLIENT_ID = 'test-client-id';
    process.env.DISCORD_CLIENT_SECRET = 'test-client-secret';
    process.env.DISCORD_AUTH_REDIRECT_URI = 'https://example.com/callback';
});

afterEach(() => jest.clearAllMocks());

// Helper para assinar state como o authStart faz
function signState(payload) {
    const base = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const hmac = crypto.createHmac('sha256', process.env.OAUTH_STATE_SECRET).update(base).digest('base64url');
    return `${base}.${hmac}`;
}

const VALID_ORIGIN = 'https://luminasink.me';
const VALID_CODE = 'discord-auth-code-123';

describe('GET /expapi/oauth2/:provider/auth/callback', () => {
    it('400 quando state é inválido (sem ponto)', async () => {
        const res = await request(app).get('/expapi/oauth2/discord/auth/callback?code=abc&state=invalidstate');

        expect(res.status).toBe(400);
    });

    it('400 quando state é expirado (> 10 minutos)', async () => {
        const state = signState({
            origin: VALID_ORIGIN,
            issuedAt: Date.now() - 11 * 60 * 1000, // 11 min atrás
            intent: 'login',
        });

        const res = await request(app).get(`/expapi/oauth2/discord/auth/callback?code=abc&state=${state}`);

        expect(res.status).toBe(400);
    });

    it('400 quando origin no state não é permitida', async () => {
        const state = signState({
            origin: 'https://evil.com',
            issuedAt: Date.now(),
            intent: 'login',
        });

        const res = await request(app).get(`/expapi/oauth2/discord/auth/callback?code=abc&state=${state}`);

        expect(res.status).toBe(400);
    });

    it('404 quando provider não é suportado', async () => {
        const res = await request(app).get('/expapi/oauth2/google/auth/callback?code=abc&state=x.y');
        expect(res.status).toBe(404);
    });

    it('302 redirect para /login?oauthError=missing_code quando code ausente', async () => {
        const state = signState({
            origin: VALID_ORIGIN,
            issuedAt: Date.now(),
            intent: 'login',
        });

        const res = await request(app).get(`/expapi/oauth2/discord/auth/callback?state=${state}`);

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/\/login\?oauthError=/);
    });

    it('302 redirect quando Discord retorna error na query', async () => {
        const state = signState({
            origin: VALID_ORIGIN,
            issuedAt: Date.now(),
            intent: 'login',
        });

        const res = await request(app).get(`/expapi/oauth2/discord/auth/callback?error=access_denied&state=${state}`);

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/oauthError=access_denied/);
    });

    // ─── LOGIN flow ───────────────────────────────────────────────────────
    it('302 redirect com token JWT em hash quando login é bem-sucedido', async () => {
        const state = signState({
            origin: VALID_ORIGIN,
            issuedAt: Date.now(),
            intent: 'login',
        });

        const provider = mockDiscordProvider;
        provider.exchangeCode.mockResolvedValueOnce({
            accessToken: 'access-tok',
            refreshToken: 'refresh-tok',
            expiresIn: 3600,
            scope: 'identify email guilds',
            tokenType: 'Bearer',
        });
        provider.getProfile.mockResolvedValueOnce({
            providerId: '123456789012345678',
            email: 'user@example.com',
            emailVerified: true,
            username: 'discorduser',
        });

        DashboardAccountService.getDashboardAccountByProviderId.mockResolvedValueOnce(makeAccount({
            discordOauth2Id: '123456789012345678',
        }));
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount());

        const res = await request(app).get(`/expapi/oauth2/discord/auth/callback?code=${VALID_CODE}&state=${state}`);

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/\/oauth\/complete#/);
        expect(res.headers.location).toMatch(/token=/);
        expect(res.headers.location).toMatch(/isNewAccount=false/);
    });

    it('302 redirect para /login?oauthError=account_banned quando conta banida', async () => {
        const state = signState({
            origin: VALID_ORIGIN,
            issuedAt: Date.now(),
            intent: 'login',
        });

        const provider = mockDiscordProvider;
        provider.exchangeCode.mockResolvedValueOnce({
            accessToken: 'tok', refreshToken: 'r', expiresIn: 3600, scope: 'identify', tokenType: 'Bearer',
        });
        provider.getProfile.mockResolvedValueOnce({
            providerId: '123', email: 'b@x.com', emailVerified: true, username: 'banned',
        });

        DashboardAccountService.getDashboardAccountByProviderId.mockResolvedValueOnce(
            makeAccount({ banned: true })
        );

        const res = await request(app).get(`/expapi/oauth2/discord/auth/callback?code=${VALID_CODE}&state=${state}`);

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/oauthError=account_banned/);
    });

    // ─── REGISTER flow ────────────────────────────────────────────────────
    it('302 redirect com isNewAccount=true quando register cria conta nova', async () => {
        const state = signState({
            origin: VALID_ORIGIN,
            issuedAt: Date.now(),
            intent: 'register',
        });

        const provider = mockDiscordProvider;
        provider.exchangeCode.mockResolvedValueOnce({
            accessToken: 'tok', refreshToken: 'r', expiresIn: 3600, scope: 'identify email', tokenType: 'Bearer',
        });
        provider.getProfile.mockResolvedValueOnce({
            providerId: '999', email: 'new@example.com', emailVerified: true, username: 'newuser',
        });

        // Conta não existe por providerId
        DashboardAccountService.getDashboardAccountByProviderId.mockResolvedValueOnce(null);
        // Conta não existe por email
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        // Cria conta
        DashboardAccountService.createOAuthAccount.mockResolvedValueOnce(makeAccount({
            email: 'new@example.com',
            discordOauth2Id: '999',
        }));
        DashboardAccountService.isUsernameAvailable.mockResolvedValue(true);
        DashboardAccountService.update.mockResolvedValue(makeAccount());

        const res = await request(app).get(`/expapi/oauth2/discord/auth/callback?code=${VALID_CODE}&state=${state}`);

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/isNewAccount=true/);
    });

    it('302 redirect para /register?oauthError=email_exists quando email já existe', async () => {
        const state = signState({
            origin: VALID_ORIGIN,
            issuedAt: Date.now(),
            intent: 'register',
        });

        const provider = mockDiscordProvider;
        provider.exchangeCode.mockResolvedValueOnce({
            accessToken: 'tok', refreshToken: 'r', expiresIn: 3600, scope: 'identify email', tokenType: 'Bearer',
        });
        provider.getProfile.mockResolvedValueOnce({
            providerId: '999', email: 'existing@example.com', emailVerified: true, username: 'x',
        });

        DashboardAccountService.getDashboardAccountByProviderId.mockResolvedValueOnce(null);
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());

        const res = await request(app).get(`/expapi/oauth2/discord/auth/callback?code=${VALID_CODE}&state=${state}`);

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/oauthError=email_exists/);
    });

    // ─── LINK flow ────────────────────────────────────────────────────────
    it('302 redirect para oauthError=link_no_account quando intent=link mas state não tem linkAccountId', async () => {
        const state = signState({
            origin: VALID_ORIGIN,
            issuedAt: Date.now(),
            intent: 'link',
            // sem linkAccountId
        });

        // A rota chama exchangeCode e getProfile ANTES de checar o intent
        mockDiscordProvider.exchangeCode.mockResolvedValueOnce({
            accessToken: 'tok', refreshToken: 'r', expiresIn: 3600, scope: 'identify', tokenType: 'Bearer',
        });
        mockDiscordProvider.getProfile.mockResolvedValueOnce({
            providerId: '123', email: 'x@x.com', emailVerified: true, username: 'x',
        });

        const res = await request(app).get(`/expapi/oauth2/discord/auth/callback?code=${VALID_CODE}&state=${state}`);

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/oauthError=link_no_account/);
    });

    it('302 redirect para oauthError=link_no_account quando intent=link mas cookie não bate com state', async () => {
        const state = signState({
            origin: VALID_ORIGIN,
            issuedAt: Date.now(),
            intent: 'link',
            linkAccountId: 'acc-state-1',
        });

        // Cookie com accountId diferente
        const token = makeJwt({ accountId: 'acc-cookie-2' });

        // A rota chama exchangeCode e getProfile ANTES de checar o intent
        mockDiscordProvider.exchangeCode.mockResolvedValueOnce({
            accessToken: 'tok', refreshToken: 'r', expiresIn: 3600, scope: 'identify', tokenType: 'Bearer',
        });
        mockDiscordProvider.getProfile.mockResolvedValueOnce({
            providerId: '123', email: 'x@x.com', emailVerified: true, username: 'x',
        });

        const res = await request(app)
            .get(`/expapi/oauth2/discord/auth/callback?code=${VALID_CODE}&state=${state}`)
            .set('Cookie', `lumina_token=${token}`);

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/oauthError=link_no_account/);
    });

    it('500/302 erro quando provider.exchangeCode falha', async () => {
        const state = signState({
            origin: VALID_ORIGIN,
            issuedAt: Date.now(),
            intent: 'login',
        });

        const provider = mockDiscordProvider;
        provider.exchangeCode.mockRejectedValueOnce(new Error('Discord API down'));

        const res = await request(app).get(`/expapi/oauth2/discord/auth/callback?code=bad&state=${state}`);

        // Erro no callback redireciona para /login?oauthError=server_error
        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/oauthError=server_error/);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
