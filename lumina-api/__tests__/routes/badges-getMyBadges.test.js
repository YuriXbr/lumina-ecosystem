/**
 * __tests__/routes/badges-getMyBadges.test.js
 *
 * Suite para GET /expapi/v1/badges/my
 * Lista badges do usuário autenticado
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, makeAccount, makeBadge,
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

describe('GET /expapi/v1/badges/my', () => {
    const URL = '/expapi/v1/badges/my';
    const authHeader = () => bearerAuth(makeJwt());

    it('200 retorna badges do usuário ordenadas por raridade', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        UserBadgeService.getByUser.mockResolvedValueOnce([
            { badgeCode: 'COMMON1', redeemedAt: new Date(), redeemedVia: 'dashboard' },
            { badgeCode: 'MYTHIC1', redeemedAt: new Date(), redeemedVia: 'bot' },
            { badgeCode: 'EPIC1', redeemedAt: new Date(), redeemedVia: 'dashboard' },
        ]);
        BadgeService.getByCode.mockImplementation((code) => {
            const map = {
                COMMON1: makeBadge({ code: 'COMMON1', rarity: 'common' }),
                MYTHIC1: makeBadge({ code: 'MYTHIC1', rarity: 'mythic' }),
                EPIC1: makeBadge({ code: 'EPIC1', rarity: 'epic' }),
            };
            return Promise.resolve(map[code] || null);
        });

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.badges).toHaveLength(3);
        // Mythic deve vir primeiro (raridade mais alta)
        expect(res.body.badges[0].rarity).toBe('mythic');
        expect(res.body.badges[1].rarity).toBe('epic');
        expect(res.body.badges[2].rarity).toBe('common');
    });

    it('200 retorna lista vazia quando usuário não tem badges', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        UserBadgeService.getByUser.mockResolvedValueOnce([]);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.badges).toEqual([]);
    });

    it('200 filtra badges deletadas (null)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        UserBadgeService.getByUser.mockResolvedValueOnce([
            { badgeCode: 'EXISTS', redeemedAt: new Date(), redeemedVia: 'dashboard' },
            { badgeCode: 'DELETED', redeemedAt: new Date(), redeemedVia: 'dashboard' },
        ]);
        BadgeService.getByCode.mockImplementation((code) => {
            if (code === 'EXISTS') return Promise.resolve(makeBadge({ code }));
            return Promise.resolve(null); // DELETED badge
        });

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.badges).toHaveLength(1);
        expect(res.body.badges[0].code).toBe('EXISTS');
    });

    it('401 sem auth', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(401);
    });

    it('401 ACCOUNT_NOT_FOUND quando conta não existe', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('403 ACCOUNT_BANNED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ banned: true })
        );
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
    });

    it('500 erro do service', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        UserBadgeService.getByUser.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
