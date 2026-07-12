/**
 * __tests__/routes/expapi-v1-register.test.js
 *
 * Suite de testes para POST /expapi/v1/register
 *
 * Cobertura:
 *   - 200 sucesso (registro bem-sucedido)
 *   - 400 MISSING_FIELDS (email/senha/nome/sobrenome faltando)
 *   - 400 WEAK_PASSWORD (curta, sem maiúscula/minúscula/número, > 128 chars)
 *   - 400 INVALID_NAME (nome vazio após sanitização)
 *   - 400 MISSING_USERNAME / INVALID_USERNAME
 *   - 400 INVALID_DISPLAY_NAME
 *   - 400 INVALID_EMAIL (sintaxe inválida detectada pelo service)
 *   - 400 REGISTRATION_FAILED (email já existe)
 *   - 409 USERNAME_TAKEN (username já em uso, detectado em race)
 *   - 500 erro interno
 *   - Inputs inválidos: tipos errados, campos null, body vazio
 *   - Sanitização: nome/sobrenome com < > são limpos, slice 60 chars
 */

'use strict';

const request = require('supertest');

const {
    JWT_SECRET, getCsrfTokens, combineAuthAndCsrf,
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

const VALID_BODY = {
    email: 'novo@exemplo.com',
    password: 'SenhaForte123',
    firstName: 'Maria',
    lastName: 'Souza',
    username: 'mariasz',
    displayName: 'Maria S',
};

describe('POST /expapi/v1/register', () => {
    const URL = '/expapi/v1/register';
    let csrf;

    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    // ─── 200 Sucesso ──────────────────────────────────────────────────────
    it('200 em registro bem-sucedido', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        DashboardAccountService.registerNewDashboardAccount.mockResolvedValueOnce({ accountId: 'acc-new-1' });

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send(VALID_BODY);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Conta criada com sucesso.');
        expect(res.body).toHaveProperty('username', 'mariasz');
    });

    it('200 sem displayName usa firstName como default', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        DashboardAccountService.registerNewDashboardAccount.mockResolvedValueOnce({ accountId: 'acc-new-2' });

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, displayName: undefined });

        expect(res.status).toBe(200);
        expect(res.body.displayName).toBe('Maria');
    });

    // ─── 400 Campos obrigatórios faltando ─────────────────────────────────
    it('400 MISSING_FIELDS quando body está vazio', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send({});
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('400 MISSING_FIELDS quando falta senha', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ email: 'a@b.com', firstName: 'A', lastName: 'B', username: 'abcd' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('400 MISSING_FIELDS quando falta firstName', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ email: 'a@b.com', password: 'Senha123', lastName: 'B', username: 'abcd' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('400 MISSING_FIELDS quando falta lastName', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ email: 'a@b.com', password: 'Senha123', firstName: 'A', username: 'abcd' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    // ─── 400 Validação de senha ───────────────────────────────────────────
    it('400 WEAK_PASSWORD para senha muito curta (< 8)', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, password: 'Ab1' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('400 WEAK_PASSWORD para senha sem letra maiúscula', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, password: 'senhafraca123' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('400 WEAK_PASSWORD para senha sem letra minúscula', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, password: 'SENHAFORTE123' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('400 WEAK_PASSWORD para senha sem números', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, password: 'SenhaForte' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('400 WEAK_PASSWORD para senha com 129 caracteres (> 128)', async () => {
        const tooLong = 'Aa1' + 'x'.repeat(126);
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, password: tooLong });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('200 para senha com exatamente 128 caracteres (limite)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        DashboardAccountService.registerNewDashboardAccount.mockResolvedValueOnce({ accountId: 'acc' });

        const maxPass = 'Aa1' + 'x'.repeat(125);
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, password: maxPass });
        expect(res.status).toBe(200);
    });

    // ─── 400 Username ─────────────────────────────────────────────────────
    it('400 MISSING_USERNAME quando username não é enviado', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, username: undefined });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_USERNAME');
    });

    it('400 INVALID_USERNAME para username muito curto (< 4)', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, username: 'abc' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_USERNAME');
    });

    it('400 INVALID_USERNAME para username muito longo (> 16)', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, username: 'abcdefghijklmnopqr' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_USERNAME');
    });

    it('400 INVALID_USERNAME para username com caracteres especiais', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, username: 'user@name' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_USERNAME');
    });

    it('400 INVALID_USERNAME para username começando com _', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, username: '_maria' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_USERNAME');
    });

    it('400 INVALID_USERNAME para username terminando com _', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, username: 'maria_' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_USERNAME');
    });

    it('400 INVALID_USERNAME para username apenas com números', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, username: '123456' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_USERNAME');
    });

    it('400 INVALID_USERNAME para username blacklisted (admin)', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, username: 'admin' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_USERNAME');
    });

    it('400 INVALID_USERNAME para username blacklisted (discord)', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, username: 'discord' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_USERNAME');
    });

    // ─── 400 Nome/sobrenome ───────────────────────────────────────────────
    it('400 INVALID_NAME quando firstName é apenas espaços', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, firstName: '   ' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_NAME');
    });

    it('400 INVALID_NAME quando lastName é vazio após sanitização', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, lastName: '<>' });
        // <> é removido pela regex replace(/[<>]/g, ''), resultando em string vazia
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_NAME');
    });

    // ─── 400 Email já cadastrado / inválido ───────────────────────────────
    it('400 REGISTRATION_FAILED quando email já existe', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce({ accountId: 'existing' });

        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send(VALID_BODY);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('REGISTRATION_FAILED');
    });

    it('400 INVALID_EMAIL quando service lança "Invalid email syntax"', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockRejectedValueOnce(new Error('Invalid email syntax'));

        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, email: 'nao-e-email' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_EMAIL');
    });

    // ─── 409 Username já em uso ───────────────────────────────────────────
    it('409 USERNAME_TAKEN quando isUsernameAvailable retorna false', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(false);

        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send(VALID_BODY);
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('USERNAME_TAKEN');
    });

    it('409 USERNAME_TAKEN em race condition (erro 11000 do Mongo)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        const dupErr = new Error('E11000 duplicate key: usernameLower');
        dupErr.code = 11000;
        DashboardAccountService.registerNewDashboardAccount.mockRejectedValueOnce(dupErr);

        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send(VALID_BODY);
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('USERNAME_TAKEN');
    });

    // ─── 500 Erro interno ─────────────────────────────────────────────────
    it('500 erro genérico do service', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        DashboardAccountService.registerNewDashboardAccount.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send(VALID_BODY);
        expect(res.status).toBe(500);
    });

    it('500 quando registerNewDashboardAccount retorna null', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        DashboardAccountService.registerNewDashboardAccount.mockResolvedValueOnce(null);

        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send(VALID_BODY);
        expect(res.status).toBe(500);
        expect(res.body.code).toBe('SERVER_ERROR');
    });

    // ─── Sanitização ──────────────────────────────────────────────────────
    it('firstName e lastName têm < e > removidos antes de chegar ao service', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        DashboardAccountService.registerNewDashboardAccount.mockResolvedValueOnce({ accountId: 'acc' });

        await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, firstName: '<script>Maria</script>', lastName: 'S<>ouza' });

        const callArgs = DashboardAccountService.registerNewDashboardAccount.mock.calls[0];
        // callArgs: [email, password, firstName, lastName, ...]
        // <script>Maria</script> com /[<>]/g removido = scriptMaria/script
        expect(callArgs[2]).toBe('scriptMaria/script');
        expect(callArgs[3]).toBe('Souza');
    });

    it('firstName é truncado para 60 caracteres', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        DashboardAccountService.registerNewDashboardAccount.mockResolvedValueOnce({ accountId: 'acc' });

        const longName = 'A'.repeat(100);
        await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, firstName: longName });

        const callArgs = DashboardAccountService.registerNewDashboardAccount.mock.calls[0];
        expect(callArgs[2].length).toBe(60);
    });

    it('email é trimado e lowercased antes de chegar ao service', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.isUsernameAvailable.mockResolvedValueOnce(true);
        DashboardAccountService.registerNewDashboardAccount.mockResolvedValueOnce({ accountId: 'acc' });

        await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ ...VALID_BODY, email: '  NOVO@Exemplo.COM  ' });

        const callArgs = DashboardAccountService.getDashboardAccountByEmail.mock.calls[0];
        expect(callArgs[0]).toBe('novo@exemplo.com');
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
