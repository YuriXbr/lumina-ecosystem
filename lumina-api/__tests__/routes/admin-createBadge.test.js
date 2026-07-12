/**
 * __tests__/routes/admin-createBadge.test.js
 *
 * Suite para POST /expapi/v1/admin/badges
 * Cria badge — apenas admin+ (level 7+)
 *
 * Cobertura:
 *   - 201 sucesso
 *   - 401 sem auth
 *   - 403 INSUFFICIENT_PERMISSION (user/moderator)
 *   - 403 ACCOUNT_SUSPENDED (banned/blocked)
 *   - 400 INVALID_CODE / MISSING_NAME / INVALID_RARITY / INVALID_ACCESS_LEVEL
 *   - 409 BADGE_CODE_EXISTS
 *   - 500 erro interno
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf,
    makeAccount, makeAdminAccount, makeBadge,
    mockLogger, mockDashboardAccountService, mockBadgeService,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockBadgeService();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const BadgeService = require('../../src/database/services/BadgeService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

describe('POST /expapi/v1/admin/badges', () => {
    const URL = '/expapi/v1/admin/badges';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const validBody = {
        code: 'NEWBADGE',
        name: 'New Badge',
        description: 'A new badge',
        rarity: 'epic',
    };

    // ─── 201 Sucesso ──────────────────────────────────────────────────────
    it('201 cria badge com sucesso (admin)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        BadgeService.getByCode.mockResolvedValueOnce(null);
        BadgeService.createBadge.mockResolvedValueOnce(makeBadge({ code: 'NEWBADGE' }));

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send(validBody);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('message');
        expect(res.body.badge.code).toBe('NEWBADGE');
    });

    it('201 cria badge com headadmin', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'headadmin' })
        );
        BadgeService.getByCode.mockResolvedValueOnce(null);
        BadgeService.createBadge.mockResolvedValueOnce(makeBadge());

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send(validBody);

        expect(res.status).toBe(201);
    });

    it('201 cria badge com developer/owner', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'owner' })
        );
        BadgeService.getByCode.mockResolvedValueOnce(null);
        BadgeService.createBadge.mockResolvedValueOnce(makeBadge());

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send(validBody);

        expect(res.status).toBe(201);
    });

    // ─── 401 Sem auth ─────────────────────────────────────────────────────
    it('401 sem Authorization', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send(validBody);
        expect(res.status).toBe(401);
    });

    // ─── 403 Permissão insuficiente ───────────────────────────────────────
    it('403 INSUFFICIENT_PERMISSION para user', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'user' })
        );

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send(validBody);

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('INSUFFICIENT_PERMISSION');
    });

    it('403 INSUFFICIENT_PERMISSION para moderator (level 6)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'moderator' })
        );

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send(validBody);

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('INSUFFICIENT_PERMISSION');
    });

    it('403 INSUFFICIENT_PERMISSION para support (level 5)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'support' })
        );

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send(validBody);

        expect(res.status).toBe(403);
    });

    // ─── 403 Conta suspensa ───────────────────────────────────────────────
    it('403 ACCOUNT_SUSPENDED quando admin está banido', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ banned: true })
        );

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send(validBody);

        expect(res.status).toBe(403);
        expect(['ACCOUNT_BANNED', 'ACCOUNT_BLOCKED', 'ACCOUNT_SUSPENDED']).toContain(res.body.code);
    });

    it('403 ACCOUNT_SUSPENDED quando admin está bloqueado', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ blocked: true })
        );

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send(validBody);

        expect(res.status).toBe(403);
        expect(['ACCOUNT_BANNED', 'ACCOUNT_BLOCKED', 'ACCOUNT_SUSPENDED']).toContain(res.body.code);
    });

    // ─── 400 Validações ───────────────────────────────────────────────────
    it('400 INVALID_CODE quando código tem < 3 chars', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send({ ...validBody, code: 'AB' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_CODE');
    });

    it('400 MISSING_NAME sem name', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send({ code: 'TEST', rarity: 'common' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_NAME');
    });

    it('400 INVALID_RARITY para raridade fora da whitelist', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send({ ...validBody, rarity: 'godlike' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_RARITY');
    });

    it('400 INVALID_ACCESS_LEVEL para minAccessLevel inválido', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send({ ...validBody, minAccessLevel: 'superuser' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_ACCESS_LEVEL');
    });

    // ─── 409 Conflito ─────────────────────────────────────────────────────
    it('409 BADGE_CODE_EXISTS quando código já existe', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ code: 'NEWBADGE' }));

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send(validBody);

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('BADGE_CODE_EXISTS');
    });

    // ─── Normalização ─────────────────────────────────────────────────────
    it('código é normalizado para UPPERCASE antes de checar duplicidade', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        BadgeService.getByCode.mockResolvedValueOnce(null);
        BadgeService.createBadge.mockResolvedValueOnce(makeBadge({ code: 'NEWBADGE' }));

        await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send({ ...validBody, code: 'newbadge' }); // lowercase

        expect(BadgeService.getByCode).toHaveBeenCalledWith('NEWBADGE');
    });

    // ─── 500 Erro ─────────────────────────────────────────────────────────
    it('500 erro ao criar badge', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        BadgeService.getByCode.mockResolvedValueOnce(null);
        BadgeService.createBadge.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers))
            .send(validBody);

        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
