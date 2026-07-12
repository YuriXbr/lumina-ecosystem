/**
 * __tests__/routes/expapi-v1-userCheckUsername.test.js
 *
 * Suite para GET /expapi/v1/user/check-username
 * Auth OPCIONAL — funciona logado ou anônimo (para cadastro)
 *
 * Cobertura:
 *   - 200 available:true quando username é válido e livre
 *   - 200 available:false reason:'taken' quando já existe
 *   - 200 available:false reason:'invalid' quando sintaxe/blacklist falha
 *   - 400 MISSING_USERNAME sem ?username=
 *   - Usuário logado: exclui próprio username da checagem
 *   - Anônimo: checa contra todas as contas
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth,
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

describe('GET /expapi/v1/user/check-username', () => {
    const URL = '/expapi/v1/user/check-username';

    // ─── 200 Disponível ───────────────────────────────────────────────────
    it('200 available:true quando username é válido e livre', async () => {
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);

        const res = await request(app).get(`${URL}?username=newuser`);

        expect(res.status).toBe(200);
        expect(res.body.available).toBe(true);
        expect(res.body.reason).toBe('ok');
    });

    it('200 available:false reason:"taken" quando já existe', async () => {
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(false);

        const res = await request(app).get(`${URL}?username=taken`);

        expect(res.status).toBe(200);
        expect(res.body.available).toBe(false);
        expect(res.body.reason).toBe('taken');
    });

    // ─── 200 Inválido (sintaxe ou blacklist) ──────────────────────────────
    it('200 available:false reason:"invalid" para username muito curto', async () => {
        const res = await request(app).get(`${URL}?username=ab`);
        expect(res.status).toBe(200);
        expect(res.body.available).toBe(false);
        expect(res.body.reason).toBe('invalid');
        // Service não deve ser chamado (validação local falha primeiro)
        expect(DashboardAccountService.isUsernameAvailable).not.toHaveBeenCalled();
    });

    it('200 available:false reason:"invalid" para username blacklisted (admin)', async () => {
        const res = await request(app).get(`${URL}?username=admin`);
        expect(res.status).toBe(200);
        expect(res.body.available).toBe(false);
        expect(res.body.reason).toBe('invalid');
    });

    it('200 available:false reason:"invalid" para username com caracteres especiais', async () => {
        const res = await request(app).get(`${URL}?username=user@name`);
        expect(res.status).toBe(200);
        expect(res.body.available).toBe(false);
        expect(res.body.reason).toBe('invalid');
    });

    // ─── 400 Sem username ─────────────────────────────────────────────────
    it('400 MISSING_USERNAME sem query param', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_USERNAME');
    });

    it('400 MISSING_USERNAME com username vazio', async () => {
        const res = await request(app).get(`${URL}?username=`);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_USERNAME');
    });

    // ─── Usuário logado ───────────────────────────────────────────────────
    it('200 quando logado, exclui próprio accountId da checagem', async () => {
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        const token = makeJwt({ accountId: 'acc-mine-1' });

        const res = await request(app)
            .get(`${URL}?username=myname`)
            .set(bearerAuth(token));

        expect(res.status).toBe(200);
        // Service deve ser chamado com excludeAccountId = 'acc-mine-1'
        expect(DashboardAccountService.isUsernameAvailable).toHaveBeenCalledWith('myname', 'acc-mine-1');
    });

    it('200 quando anônimo, não passa excludeAccountId', async () => {
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);

        const res = await request(app).get(`${URL}?username=newuser`);

        expect(res.status).toBe(200);
        expect(DashboardAccountService.isUsernameAvailable).toHaveBeenCalledWith('newuser', null);
    });

    // ─── 500 Erro ─────────────────────────────────────────────────────────
    it('500 erro genérico do service', async () => {
        DashboardAccountService.isUsernameAvailable.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app).get(`${URL}?username=newuser`);
        expect(res.status).toBe(500);
    });

    // ─── Sanitização ──────────────────────────────────────────────────────
    it('username é trimado antes da checagem', async () => {
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);

        await request(app).get(`${URL}?username=%20%20newuser%20%20`);

        expect(DashboardAccountService.isUsernameAvailable).toHaveBeenCalledWith('newuser', null);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
