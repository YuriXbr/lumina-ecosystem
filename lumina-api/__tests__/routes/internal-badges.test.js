/**
 * __tests__/routes/internal-badges.test.js
 *
 * Suite para rotas internas de badges:
 *   POST /expapi/internal/createbadge (bot cria badge via Discord ID do admin)
 *   POST /expapi/internal/redeembadge (bot resgata badge via Discord ID do user)
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, INTERNAL_KEY, internalKey, makeAccount, makeAdminAccount, makeBadge,
    mockLogger, mockDashboardAccountService, mockBadgeService, mockUserBadgeService,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockBadgeService();
mockUserBadgeService();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const BadgeService = require('../../src/database/services/BadgeService');
const UserBadgeService = require('../../src/database/services/UserBadgeService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
});

afterEach(() => jest.clearAllMocks());

// ─── POST /expapi/internal/createbadge ─────────────────────────────────────
describe('POST /expapi/internal/createbadge', () => {
    const URL = '/expapi/internal/createbadge';

    const validBody = {
        discordUserId: '123456789012345678',
        code: 'BOTBADGE',
        name: 'Bot Badge',
        rarity: 'epic',
    };

    it('201 cria badge via bot quando Discord ID é admin', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(makeAdminAccount({ discordOauth2Id: '123456789012345678' }));
        BadgeService.getByCode.mockResolvedValueOnce(null);
        BadgeService.createBadge.mockResolvedValueOnce(makeBadge({ code: 'BOTBADGE' }));

        const res = await request(app).post(URL).set(internalKey()).send(validBody);

        expect(res.status).toBe(201);
        expect(res.body.badge.code).toBe('BOTBADGE');
    });

    it('400 MISSING_PARAMS sem discordUserId', async () => {
        const res = await request(app).post(URL).set(internalKey())
            .send({ code: 'X', name: 'Y' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 INVALID_CODE para código muito curto', async () => {
        const res = await request(app).post(URL).set(internalKey())
            .send({ ...validBody, code: 'AB' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_CODE');
    });

    it('400 MISSING_NAME sem name', async () => {
        const res = await request(app).post(URL).set(internalKey())
            .send({ ...validBody, name: undefined });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_NAME');
    });

    it('400 INVALID_RARITY para raridade fora da whitelist', async () => {
        const res = await request(app).post(URL).set(internalKey())
            .send({ ...validBody, rarity: 'godlike' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_RARITY');
    });

    it('404 ACCOUNT_NOT_FOUND quando Discord ID não tem conta vinculada', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(null);

        const res = await request(app).post(URL).set(internalKey()).send(validBody);

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('403 INSUFFICIENT_PERMISSION quando Discord ID é user comum', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(
            makeAccount({ accessType: 'user', discordOauth2Id: '123456789012345678' })
        );

        const res = await request(app).post(URL).set(internalKey()).send(validBody);

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('INSUFFICIENT_PERMISSION');
    });

    it('403 ACCOUNT_SUSPENDED quando admin está banido', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(
            makeAdminAccount({ banned: true, discordOauth2Id: '123456789012345678' })
        );

        const res = await request(app).post(URL).set(internalKey()).send(validBody);

        expect(res.status).toBe(403);
    });

    it('409 BADGE_CODE_EXISTS quando código já existe', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(makeAdminAccount({ discordOauth2Id: '123456789012345678' }));
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ code: 'BOTBADGE' }));

        const res = await request(app).post(URL).set(internalKey()).send(validBody);

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('BADGE_CODE_EXISTS');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send(validBody);
        expect(res.status).toBe(401);
    });
});

// ─── POST /expapi/internal/redeembadge ─────────────────────────────────────
describe('POST /expapi/internal/redeembadge', () => {
    const URL = '/expapi/internal/redeembadge';

    it('200 resgata badge via bot', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(makeAccount({ discordOauth2Id: '123456789012345678' }));
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ code: 'VALID' }));
        UserBadgeService.hasRedeemed.mockResolvedValueOnce(false);
        // makeBadge() tem maxRedemptions: 0 por default, então countByBadge NÃO é chamado
        // — não setar mock para evitar contaminação do próximo teste
        UserBadgeService.redeem.mockResolvedValueOnce({});

        const res = await request(app).post(URL).set(internalKey())
            .send({ discordUserId: '123456789012345678', code: 'VALID' });

        expect(res.status).toBe(200);
        expect(res.body.badge.code).toBe('VALID');
    });

    it('400 MISSING_PARAMS sem discordUserId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ code: 'X' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 MISSING_PARAMS sem code', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ discordUserId: '123' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('404 ACCOUNT_NOT_FOUND quando Discord ID não tem conta', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(null);

        const res = await request(app).post(URL).set(internalKey())
            .send({ discordUserId: '123', code: 'X' });

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('404 BADGE_NOT_FOUND quando código não existe', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(makeAccount({ discordOauth2Id: '123' }));
        BadgeService.getByCode.mockResolvedValueOnce(null);

        const res = await request(app).post(URL).set(internalKey())
            .send({ discordUserId: '123', code: 'NOPE' });

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('BADGE_NOT_FOUND');
    });

    it('409 BADGE_ALREADY_REDEEMED quando já resgatou', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(makeAccount({ discordOauth2Id: '123' }));
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ code: 'X' }));
        UserBadgeService.hasRedeemed.mockResolvedValueOnce(true);

        const res = await request(app).post(URL).set(internalKey())
            .send({ discordUserId: '123', code: 'X' });

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('BADGE_ALREADY_REDEEMED');
    });

    it('403 BADGE_INACTIVE quando badge.active=false', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(makeAccount({ discordOauth2Id: '123' }));
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ active: false }));

        const res = await request(app).post(URL).set(internalKey())
            .send({ discordUserId: '123', code: 'X' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('BADGE_INACTIVE');
    });

    it('403 BADGE_LIMIT_REACHED', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(makeAccount({ discordOauth2Id: '123' }));
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ maxRedemptions: 10 }));
        UserBadgeService.hasRedeemed.mockResolvedValueOnce(false);
        UserBadgeService.countByBadge.mockResolvedValueOnce(10);

        const res = await request(app).post(URL).set(internalKey())
            .send({ discordUserId: '123', code: 'X' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('BADGE_LIMIT_REACHED');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send({ discordUserId: '123', code: 'X' });
        expect(res.status).toBe(401);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
