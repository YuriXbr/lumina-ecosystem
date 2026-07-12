/**
 * __tests__/routes/badges-redeemBadge.test.js
 *
 * Suite para POST /expapi/v1/badges/redeem
 * Resgata badge via código
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf,
    makeAccount, makeBadge,
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
});

afterEach(() => jest.clearAllMocks());

describe('POST /expapi/v1/badges/redeem', () => {
    const URL = '/expapi/v1/badges/redeem';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const headers = () => combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers);

    it('200 resgata badge com sucesso', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        // makeBadge() tem maxRedemptions: 0, então countByBadge NÃO é chamado
        // — não setar mock para evitar contaminação do teste BADGE_LIMIT_REACHED
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ code: 'VALID' }));
        UserBadgeService.redeem.mockResolvedValueOnce({});

        const res = await request(app).post(URL).set(headers()).send({ code: 'VALID' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.badge.code).toBe('VALID');
    });

    it('400 MISSING_CODE sem code', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        const res = await request(app).post(URL).set(headers()).send({});
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_CODE');
    });

    it('400 MISSING_CODE quando code não é string', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        const res = await request(app).post(URL).set(headers()).send({ code: 123 });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_CODE');
    });

    it('404 BADGE_NOT_FOUND quando código não existe', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        BadgeService.getByCode.mockResolvedValueOnce(null);

        const res = await request(app).post(URL).set(headers()).send({ code: 'NOPE' });

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('BADGE_NOT_FOUND');
    });

    it('403 BADGE_INACTIVE quando badge.active=false', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ active: false }));

        const res = await request(app).post(URL).set(headers()).send({ code: 'INACTIVE' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('BADGE_INACTIVE');
    });

    it('403 BADGE_NOT_YET_AVAILABLE quando availableFrom é futuro', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({
            availableFrom: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 dias no futuro
        }));

        const res = await request(app).post(URL).set(headers()).send({ code: 'FUTURE' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('BADGE_NOT_YET_AVAILABLE');
    });

    it('403 BADGE_EXPIRED quando expiresAt é passado', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({
            expiresAt: new Date(Date.now() - 1000), // expirado
        }));

        const res = await request(app).post(URL).set(headers()).send({ code: 'EXPIRED' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('BADGE_EXPIRED');
    });

    it('403 INSUFFICIENT_ACCESS_LEVEL quando user não tem nível mínimo', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ accessType: 'user' })
        );
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ minAccessLevel: 'admin' }));

        const res = await request(app).post(URL).set(headers()).send({ code: 'ADMIN_ONLY' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('INSUFFICIENT_ACCESS_LEVEL');
    });

    it('403 BADGE_LIMIT_REACHED quando maxRedemptions atingido', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ maxRedemptions: 100 }));
        UserBadgeService.countByBadge.mockResolvedValueOnce(100);

        const res = await request(app).post(URL).set(headers()).send({ code: 'LIMITED' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('BADGE_LIMIT_REACHED');
    });

    it('409 BADGE_ALREADY_REDEEMED em race condition (E11000)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        // makeBadge() tem maxRedemptions: 0 por default, então countByBadge NÃO é chamado
        // — não setar mock para evitar contaminação do próximo teste
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge());
        const dupErr = new Error('E11000 duplicate key');
        dupErr.code = 11000;
        UserBadgeService.redeem.mockRejectedValueOnce(dupErr);

        const res = await request(app).post(URL).set(headers()).send({ code: 'DUP' });

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('BADGE_ALREADY_REDEEMED');
    });

    it('401 sem auth', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send({ code: 'X' });
        expect(res.status).toBe(401);
    });

    it('403 ACCOUNT_SUSPENDED quando banido', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ banned: true })
        );
        const res = await request(app).post(URL).set(headers()).send({ code: 'X' });
        expect(res.status).toBe(403);
    });

    it('código é normalizado para UPPERCASE antes de buscar', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        BadgeService.getByCode.mockResolvedValueOnce(null);

        await request(app).post(URL).set(headers()).send({ code: 'lowercase' });

        expect(BadgeService.getByCode).toHaveBeenCalledWith('LOWERCASE');
    });

    it('500 erro ao registrar redenção', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge());
        UserBadgeService.countByBadge.mockResolvedValueOnce(0);
        UserBadgeService.redeem.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app).post(URL).set(headers()).send({ code: 'X' });

        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
