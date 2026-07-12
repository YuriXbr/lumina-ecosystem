/**
 * __tests__/routes/expapi-v1-discordInfo.test.js
 *
 * Suite para GET /expapi/v1/discordinfo
 * Requer JWT + Discord OAuth vinculado
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, makeAccount,
    mockLogger, mockDashboardAccountService, mockAxios,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockAxios();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const axios = require('axios');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.DISCORD_CLIENT_ID = 'test-client-id';
    process.env.DISCORD_CLIENT_SECRET = 'test-client-secret';
    process.env.DISCORD_AUTH_REDIRECT_URI = 'https://example.com/callback';
});

afterEach(() => jest.clearAllMocks());

describe('GET /expapi/v1/discordinfo', () => {
    const URL = '/expapi/v1/discordinfo';
    const authHeader = () => bearerAuth(makeJwt());

    // ─── 200 Sucesso ──────────────────────────────────────────────────────
    it('200 retorna informações do Discord do usuário', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        axios.get.mockResolvedValueOnce({
            data: {
                id: '123456789',
                username: 'discorduser',
                global_name: 'Discord User',
                avatar: 'abc123',
                banner: 'banner123',
                accent_color: 0xFF3636,
            },
        });

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.id).toBe('123456789');
        expect(res.body.username).toBe('discorduser');
        expect(res.body.globalName).toBe('Discord User');
        expect(res.body.avatar).toBe('abc123');
        expect(res.body.banner).toBe('banner123');
        expect(res.body.accentColor).toBe(0xFF3636);
    });

    // ─── 401 Sem auth ─────────────────────────────────────────────────────
    it('401 sem Authorization', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(401);
    });

    it('401 ACCOUNT_NOT_FOUND', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(401);
    });

    // ─── 400 Discord não vinculado ────────────────────────────────────────
    it('400 DISCORD_NOT_LINKED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ discordOauth2Token: '' })
        );
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('DISCORD_NOT_LINKED');
    });

    // ─── 429 Discord rate limited ─────────────────────────────────────────
    it('429 DISCORD_RATE_LIMITED quando Discord retorna 429', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const err = new Error('rate limited');
        err.response = { status: 429, headers: { 'retry-after': '5' } };
        axios.get.mockRejectedValueOnce(err);

        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(429);
        expect(res.body.code).toBe('DISCORD_RATE_LIMITED');
    });

    // ─── Refresh token ────────────────────────────────────────────────────
    it('200 faz refresh quando token expirado (após correção do bug)', async () => {
        // CORREÇÃO #1: a rota agora usa `let account` em vez de `const account`,
        // permitindo reatribuição após refresh do token OAuth2 do Discord.
        const account = makeAccount({
            discordOauth2Token: 'expired',
            discordOauth2TokenExpiresAt: new Date(Date.now() - 1000),
            discordOauth2RefreshToken: 'valid-refresh',
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(account);

        axios.post.mockResolvedValue({
            data: {
                access_token: 'new-token',
                refresh_token: 'new-refresh',
                expires_in: 3600,
                token_type: 'Bearer',
                scope: 'identify email messages.read',
            },
        });
        DashboardAccountService.update.mockResolvedValue({
            ...account,
            discordOauth2Token: 'new-token',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });

        axios.get.mockResolvedValue({
            data: { id: '123', username: 'user', global_name: 'User', avatar: 'av', banner: null, accent_color: 0 },
        });

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(axios.post).toHaveBeenCalled();
    });

    it('429 quando refresh token é rate limited pelo Discord', async () => {
        const account = makeAccount({
            discordOauth2Token: 'expired',
            discordOauth2TokenExpiresAt: new Date(Date.now() - 1000),
            discordOauth2RefreshToken: 'valid-refresh',
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const err = new Error('rate limited');
        err.response = { status: 429, headers: { 'retry-after': '3' } };
        axios.post.mockRejectedValueOnce(err);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(429);
        expect(res.body.code).toBe('DISCORD_RATE_LIMITED');
    });

    it('500 quando refresh falha (sem ser 429)', async () => {
        const account = makeAccount({
            discordOauth2Token: 'expired',
            discordOauth2TokenExpiresAt: new Date(Date.now() - 1000),
            discordOauth2RefreshToken: 'invalid',
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        axios.post.mockRejectedValueOnce(new Error('invalid_grant'));

        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
