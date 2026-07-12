/**
 * __tests__/routes/expapi-v1-userIdentity.test.js
 *
 * Suite para PUT /expapi/v1/user/identity
 * Atualiza username (cooldown 30d) e/ou displayName (cooldown 24h)
 *
 * Cobertura:
 *   - 200 sucesso atualizando username
 *   - 200 sucesso atualizando displayName
 *   - 200 sucesso atualizando ambos
 *   - 400 NO_FIELDS (body vazio)
 *   - 400 INVALID_USERNAME (sintaxe/blacklist)
 *   - 400 INVALID_DISPLAY_NAME
 *   - 409 USERNAME_TAKEN
 *   - 429 USERNAME_COOLDOWN (mudou há < 30 dias)
 *   - 429 DISPLAY_NAME_COOLDOWN (mudou há < 24h)
 *   - 401 sem auth
 *   - 403 conta suspensa
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

describe('PUT /expapi/v1/user/identity', () => {
    const URL = '/expapi/v1/user/identity';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const authHeader = () => bearerAuth(makeJwt());
    const withAuth = (req) => req.set(combineAuthAndCsrf(authHeader(), csrf.headers));

    // ─── 200 Sucesso ──────────────────────────────────────────────────────
    it('200 atualiza username', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount({ username: 'newname' }));

        const res = await withAuth(request(app).put(URL)).send({ username: 'newname' });

        expect(res.status).toBe(200);
        expect(res.body.account).toHaveProperty('username', 'newname');
    });

    it('200 atualiza displayName', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount({ displayName: 'New Display' }));

        const res = await withAuth(request(app).put(URL)).send({ displayName: 'New Display' });

        expect(res.status).toBe(200);
        expect(res.body.account).toHaveProperty('displayName', 'New Display');
    });

    it('200 atualiza ambos username + displayName', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount({
            username: 'newname',
            displayName: 'New Display',
        }));

        const res = await withAuth(request(app).put(URL)).send({
            username: 'newname',
            displayName: 'New Display',
        });

        expect(res.status).toBe(200);
        expect(res.body.account.username).toBe('newname');
        expect(res.body.account.displayName).toBe('New Display');
    });

    // ─── 400 No fields ────────────────────────────────────────────────────
    it('400 NO_FIELDS quando body é vazio', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());

        const res = await withAuth(request(app).put(URL)).send({});

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('NO_FIELDS');
    });

    // ─── 400 Username inválido ────────────────────────────────────────────
    it('400 INVALID_USERNAME para username curto', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());

        const res = await withAuth(request(app).put(URL)).send({ username: 'abc' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_USERNAME');
    });

    it('400 INVALID_USERNAME para username blacklisted', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());

        const res = await withAuth(request(app).put(URL)).send({ username: 'admin' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_USERNAME');
    });

    // ─── 400 Display name inválido ────────────────────────────────────────
    it('400 INVALID_DISPLAY_NAME para displayName vazio', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());

        const res = await withAuth(request(app).put(URL)).send({ displayName: '   ' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_DISPLAY_NAME');
    });

    it('400 INVALID_DISPLAY_NAME para displayName com > 32 chars', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());

        const res = await withAuth(request(app).put(URL)).send({
            displayName: 'x'.repeat(33),
        });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_DISPLAY_NAME');
    });

    // ─── 409 Username já em uso ───────────────────────────────────────────
    it('409 USERNAME_TAKEN', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(false);

        const res = await withAuth(request(app).put(URL)).send({ username: 'taken' });

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('USERNAME_TAKEN');
    });

    // ─── 429 Cooldowns ────────────────────────────────────────────────────
    it('429 USERNAME_COOLDOWN quando mudou há menos de 30 dias', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({
            username: 'oldname',
            usernameChangedAt: new Date(), // agora
        }));

        const res = await withAuth(request(app).put(URL)).send({ username: 'newname' });

        expect(res.status).toBe(429);
        expect(res.body.code).toBe('USERNAME_COOLDOWN');
        expect(res.body).toHaveProperty('nextChangeAt');
        expect(res.body).toHaveProperty('msRemaining');
    });

    it('429 DISPLAY_NAME_COOLDOWN quando mudou há menos de 24h', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({
            displayName: 'Old',
            displayNameChangedAt: new Date(),
        }));

        const res = await withAuth(request(app).put(URL)).send({ displayName: 'New Display' });

        expect(res.status).toBe(429);
        expect(res.body.code).toBe('DISPLAY_NAME_COOLDOWN');
    });

    it('200 permite mudar username pela 1ª vez (sem usernameChangedAt)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({
            username: null,
            usernameChangedAt: null,
        }));
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        DashboardAccountService.update.mockResolvedValueOnce(makeAccount({ username: 'first' }));

        const res = await withAuth(request(app).put(URL)).send({ username: 'first' });

        expect(res.status).toBe(200);
    });

    // ─── 401 Sem auth ─────────────────────────────────────────────────────
    it('401 sem Authorization', async () => {
        const res = await request(app).put(URL).set(combineAuthAndCsrf({}, csrf.headers)).send({ username: 'newname' });
        expect(res.status).toBe(401);
    });

    // ─── 403 Conta suspensa ───────────────────────────────────────────────
    it('403 ACCOUNT_BANNED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({ banned: true }));
        const res = await withAuth(request(app).put(URL)).send({ username: 'newname' });
        expect(res.status).toBe(403);
    });

    // ─── 500 Erro interno ─────────────────────────────────────────────────
    it('500 erro genérico no update', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        DashboardAccountService.update.mockRejectedValueOnce(new Error('DB down'));

        const res = await withAuth(request(app).put(URL)).send({ username: 'newname' });
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
