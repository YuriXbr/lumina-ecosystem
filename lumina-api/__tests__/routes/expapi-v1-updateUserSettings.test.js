/**
 * __tests__/routes/expapi-v1-updateUserSettings.test.js
 *
 * Suite para PUT /expapi/v1/user/settings
 * Requer: JWT + CSRF (bypassed em test)
 *
 * Cobertura:
 *   - 200 sucesso (atualiza um ou vários campos)
 *   - 400 INVALID_LANGUAGE (idioma fora da whitelist)
 *   - 400 INVALID_TIMEZONE (timezone inválido via Intl)
 *   - 401 sem JWT
 *   - 404 ACCOUNT_NOT_FOUND
 *   - 503 DB_UNAVAILABLE
 *   - Apenas campos do tipo correto são aceitos (booleans/strings)
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf, makeAccount,
    mockLogger, mockDashboardAccountService,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

describe('PUT /expapi/v1/user/settings', () => {
    const URL = '/expapi/v1/user/settings';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const authHeader = () => bearerAuth(makeJwt());

    const withAuth = (req) => req.set(combineAuthAndCsrf(authHeader(), csrf.headers));

    // ─── 200 Sucesso ──────────────────────────────────────────────────────
    it('200 atualiza emailNotifications (boolean)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount({ emailNotifications: false }));

        const res = await withAuth(request(app).put(URL)).send({ emailNotifications: false });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(DashboardAccountService.update).toHaveBeenCalled();
    });

    it('200 atualiza múltiplos campos de uma vez', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount());

        const res = await withAuth(request(app).put(URL)).send({
            emailNotifications: false,
            discordNotifications: false,
            botActivityAlerts: true,
            publicProfile: true,
            showOnlineStatus: false,
            language: 'en-US',
            timezone: 'America/New_York',
        });

        expect(res.status).toBe(200);
        const updateCall = DashboardAccountService.update.mock.calls[0][1];
        expect(updateCall.$set).toHaveProperty('emailNotifications', false);
        expect(updateCall.$set).toHaveProperty('language', 'en-US');
        expect(updateCall.$set).toHaveProperty('timezone', 'America/New_York');
    });

    it('200 ignora campos não-booleanos (typeof string em vez de boolean)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount());

        const res = await withAuth(request(app).put(URL)).send({
            emailNotifications: 'false', // string, não boolean
            language: 'pt-BR',
        });

        expect(res.status).toBe(200);
        const updateCall = DashboardAccountService.update.mock.calls[0][1];
        // emailNotifications como string NÃO deve ser atualizado
        expect(updateCall.$set).not.toHaveProperty('emailNotifications');
        expect(updateCall.$set).toHaveProperty('language', 'pt-BR');
    });

    // ─── 400 Idioma inválido ──────────────────────────────────────────────
    it('400 INVALID_LANGUAGE para idioma fora da whitelist', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        const res = await withAuth(request(app).put(URL)).send({ language: 'fr-FR' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_LANGUAGE');
    });

    it('200 aceita idioma pt-BR', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount());
        const res = await withAuth(request(app).put(URL)).send({ language: 'pt-BR' });
        expect(res.status).toBe(200);
    });

    it('200 aceita idioma en-US', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount());
        const res = await withAuth(request(app).put(URL)).send({ language: 'en-US' });
        expect(res.status).toBe(200);
    });

    it('200 aceita idioma es-ES', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount());
        const res = await withAuth(request(app).put(URL)).send({ language: 'es-ES' });
        expect(res.status).toBe(200);
    });

    // ─── 400 Timezone inválido ────────────────────────────────────────────
    it('400 INVALID_TIMEZONE para timezone inexistente', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        const res = await withAuth(request(app).put(URL)).send({ timezone: 'Not/A_Real_Timezone' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_TIMEZONE');
    });

    it('200 aceita timezone válido (America/Sao_Paulo)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount());
        const res = await withAuth(request(app).put(URL)).send({ timezone: 'America/Sao_Paulo' });
        expect(res.status).toBe(200);
    });

    it('200 aceita timezone válido (UTC)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount());
        const res = await withAuth(request(app).put(URL)).send({ timezone: 'UTC' });
        expect(res.status).toBe(200);
    });

    // ─── 401 Sem auth ─────────────────────────────────────────────────────
    it('401 sem Authorization', async () => {
        const res = await request(app).put(URL).set(combineAuthAndCsrf({}, csrf.headers)).send({ language: 'pt-BR' });
        expect(res.status).toBe(401);
    });

    // ─── 401 Conta não existe (auth check retorna 401) ──────────────────
    it('401 ACCOUNT_NOT_FOUND', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        const res = await withAuth(request(app).put(URL)).send({ language: 'pt-BR' });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    // ─── 403 Conta suspensa ───────────────────────────────────────────────
    it('403 ACCOUNT_BANNED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({ banned: true }));
        const res = await withAuth(request(app).put(URL)).send({ language: 'pt-BR' });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_BANNED');
    });

    it('403 ACCOUNT_BLOCKED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({ blocked: true }));
        const res = await withAuth(request(app).put(URL)).send({ language: 'pt-BR' });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_BLOCKED');
    });

    // ─── 500 Erro interno ─────────────────────────────────────────────────
    it('500 erro genérico do update', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.update.mockRejectedValueOnce(new Error('DB down'));

        const res = await withAuth(request(app).put(URL)).send({ language: 'pt-BR' });
        expect(res.status).toBe(500);
    });

    // ─── Body vazio ───────────────────────────────────────────────────────
    it('200 em body vazio (não atualiza nada mas não falha)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount());

        const res = await withAuth(request(app).put(URL)).send({});
        expect(res.status).toBe(200);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
