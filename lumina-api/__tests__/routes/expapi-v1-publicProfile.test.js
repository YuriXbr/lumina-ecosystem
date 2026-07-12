/**
 * __tests__/routes/expapi-v1-publicProfile.test.js
 *
 * Suite para GET /expapi/v1/public-profile/:identifier
 * ROTA PÚBLICA — não exige auth.
 *
 * Cobertura:
 *   - 200 perfil público quando publicProfile=true
 *   - 200 perfil mínimo quando publicProfile=false
 *   - 400 INVALID_IDENTIFIER (muito curto, muito longo)
 *   - 404 USER_NOT_FOUND
 *   - Suporta UUID, Discord ID (17-19 dígitos), username
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeAccount,
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

describe('GET /expapi/v1/public-profile/:identifier', () => {
    const URL = (id) => `/expapi/v1/public-profile/${id}`;

    // ─── 200 Sucesso ──────────────────────────────────────────────────────
    it('200 retorna perfil completo quando publicProfile=true', async () => {
        const account = makeAccount({
            accountId: 'a1b2c3d4-e5f6-g7h8-i9j0-k12345678901',
            username: 'pubuser',
            displayName: 'Pub User',
            discordOauth2Id: '123456789012345678',
            publicProfile: true,
            registrationDate: new Date('2024-01-01'),
            accessType: 'vipUser',
        });
        DashboardAccountService.getPublicAccountByIdentifier.mockResolvedValueOnce(account);

        const res = await request(app).get(URL('pubuser'));

        expect(res.status).toBe(200);
        expect(res.body.username).toBe('pubuser');
        expect(res.body.displayName).toBe('Pub User');
        expect(res.body.publicProfile).toBe(true);
        expect(res.body).toHaveProperty('registrationDate');
        expect(res.body).toHaveProperty('accessType', 'vipUser');
        expect(res.body).toHaveProperty('badges');
        expect(res.body).toHaveProperty('inventoryStats');
    });

    it('200 retorna perfil mínimo quando publicProfile=false', async () => {
        const account = makeAccount({
            username: 'privuser',
            displayName: 'Priv User',
            publicProfile: false,
        });
        DashboardAccountService.getPublicAccountByIdentifier.mockResolvedValueOnce(account);

        const res = await request(app).get(URL('privuser'));

        expect(res.status).toBe(200);
        expect(res.body.username).toBe('privuser');
        expect(res.body.publicProfile).toBe(false);
        // Campos extras não devem ser expostos
        expect(res.body).not.toHaveProperty('registrationDate');
        expect(res.body).not.toHaveProperty('accessType');
    });

    it('200 busca por UUID', async () => {
        const uuid = 'a1b2c3d4-e5f6-g7h8-i9j0-k12345678901';
        const account = makeAccount({ accountId: uuid, publicProfile: true });
        DashboardAccountService.getPublicAccountByIdentifier.mockResolvedValueOnce(account);

        const res = await request(app).get(URL(uuid));

        expect(res.status).toBe(200);
        expect(DashboardAccountService.getPublicAccountByIdentifier).toHaveBeenCalledWith(uuid);
    });

    it('200 busca por Discord ID (17-19 dígitos)', async () => {
        const discordId = '123456789012345678';
        const account = makeAccount({ discordOauth2Id: discordId, publicProfile: true });
        DashboardAccountService.getPublicAccountByIdentifier.mockResolvedValueOnce(account);

        const res = await request(app).get(URL(discordId));

        expect(res.status).toBe(200);
        expect(DashboardAccountService.getPublicAccountByIdentifier).toHaveBeenCalledWith(discordId);
    });

    // ─── 400 Identifier inválido ──────────────────────────────────────────
    it('400 INVALID_IDENTIFIER quando id tem < 3 chars', async () => {
        const res = await request(app).get(URL('ab'));
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_IDENTIFIER');
    });

    it('400 INVALID_IDENTIFIER quando id tem > 64 chars', async () => {
        const longId = 'a'.repeat(65);
        const res = await request(app).get(URL(longId));
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_IDENTIFIER');
    });

    it('400 INVALID_IDENTIFIER quando id é vazio', async () => {
        const res = await request(app).get('/expapi/v1/public-profile/');
        expect(res.status).toBe(404); // cai no catch-all
    });

    // ─── 404 Usuário não encontrado ───────────────────────────────────────
    it('404 USER_NOT_FOUND quando identifier não existe', async () => {
        DashboardAccountService.getPublicAccountByIdentifier.mockResolvedValueOnce(null);

        const res = await request(app).get(URL('ghostuser'));

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    // ─── 500 Erro ─────────────────────────────────────────────────────────
    it('500 erro genérico do service', async () => {
        DashboardAccountService.getPublicAccountByIdentifier.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app).get(URL('someuser'));
        expect(res.status).toBe(500);
    });

    // ─── Não exige auth ───────────────────────────────────────────────────
    it('funciona sem auth (rota pública)', async () => {
        DashboardAccountService.getPublicAccountByIdentifier.mockResolvedValueOnce(
            makeAccount({ publicProfile: true })
        );
        const res = await request(app).get(URL('anyone'));
        expect(res.status).toBe(200);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
