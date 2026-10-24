/**
 * __tests__/auth-routes.test.js
 *
 * Testes automatizados para as rotas de autenticação:
 *   POST /expapi/v1/login
 *   POST /expapi/v1/register
 *   GET  /expapi/v1/logout
 *   POST /expapi/v1/user/set-password
 *   PUT  /expapi/v1/user/change-password  (desativada → 501)
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../src/database/services/DashboardAccountService', () => ({
    checkCredentials: jest.fn(),
    registerNewDashboardAccount: jest.fn(),
    getDashboardAccountByEmail: jest.fn(),
    getDashboardAccountByAccountId: jest.fn(),
    changePassword: jest.fn(),
    isUsernameAvailable: jest.fn(),
    update: jest.fn(),
}));

jest.mock('../src/logger/logger', () => ({
    addLog: jest.fn(),
    routeError: jest.fn(({ res, errorCode, userMsg, status = 500 }) =>
        res.status(status).json({ error: userMsg, code: errorCode })
    ),
    sendErrorEmbed: jest.fn(),
    forceSendLogs: jest.fn(),
    // requestLogger deve retornar um middleware Express válido para não
    // quebrar o app.use(requestLogger()) no index.js quando o logger é mocked
    requestLogger: jest.fn(() => (req, res, next) => next()),
}));

jest.mock('../src/utils/sessionStore',()=>({isRevoked:jest.fn().mockResolvedValue(false),revokeToken:jest.fn().mockResolvedValue()}));

// Desabilita o setInterval do logger para evitar open handle
jest.useFakeTimers();

const DashboardAccountService = require('../src/database/services/DashboardAccountService');
const app = require('../index');
const {getCsrfTokens}=require('./helpers/testUtils');
let csrf;
const sessionToken=res=>decodeURIComponent(/lumina_token=([^;]+)/.exec(res.headers['set-cookie'].find(c=>c.startsWith('lumina_token=')))[1]);

const JWT_SECRET = 'test-secret';
const VALID_ACCOUNT = {
    email: 'user@example.com',
    accountId: 'acc-123',
    firstName: 'João',
    lastName: 'Silva',
    password: '$2a$10$hash',
};

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

beforeEach(async()=>{
 Object.values(DashboardAccountService).forEach(fn=>fn.mockReset?.());
 DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(VALID_ACCOUNT);
 DashboardAccountService.isUsernameAvailable.mockResolvedValue(true);
 csrf=await getCsrfTokens(app);
});

afterEach(() => {
    jest.clearAllMocks();
});

// ─── POST /expapi/v1/login ────────────────────────────────────────────────────

describe('POST /expapi/v1/login', () => {
    const URL = '/expapi/v1/login';

    it('400 se email ou senha estiverem ausentes', async () => {
        const res = await request(app).post(URL).set(csrf.headers).send({ email: 'user@example.com' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('400 se apenas a senha estiver ausente', async () => {
        const res = await request(app).post(URL).set(csrf.headers).send({ password: 'Senha123' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('401 para credenciais inválidas (INVALID_CREDENTIALS)', async () => {
        const err = new Error('bad creds'); err.code = 'INVALID_CREDENTIALS';
        DashboardAccountService.checkCredentials.mockRejectedValueOnce(err);

        const res = await request(app).post(URL).set(csrf.headers).send({ email: 'x@x.com', password: 'wrongPass1' });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('400 para conta somente OAuth2 (OAUTH_ONLY)', async () => {
        const err = new Error('oauth only'); err.code = 'OAUTH_ONLY';
        DashboardAccountService.checkCredentials.mockRejectedValueOnce(err);

        const res = await request(app).post(URL).set(csrf.headers).send({ email: 'x@x.com', password: 'Abc123456' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('OAUTH_ONLY');
    });

    it('403 para conta banida (ACCOUNT_BANNED)', async () => {
        const err = new Error('banned'); err.code = 'ACCOUNT_BANNED';
        DashboardAccountService.checkCredentials.mockRejectedValueOnce(err);

        const res = await request(app).post(URL).set(csrf.headers).send({ email: 'x@x.com', password: 'Abc123456' });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_BANNED');
    });

    it('403 para conta bloqueada (ACCOUNT_BLOCKED)', async () => {
        const err = new Error('blocked'); err.code = 'ACCOUNT_BLOCKED';
        DashboardAccountService.checkCredentials.mockRejectedValueOnce(err);

        const res = await request(app).post(URL).set(csrf.headers).send({ email: 'x@x.com', password: 'Abc123456' });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_BLOCKED');
    });

    it('200 retorna token JWT em login bem-sucedido', async () => {
        DashboardAccountService.checkCredentials.mockResolvedValueOnce(VALID_ACCOUNT);

        const res = await request(app)
            .post(URL).set(csrf.headers)
            .send({ email: VALID_ACCOUNT.email, password: 'Correta123' });

        expect(res.status).toBe(200);
        expect(res.body).not.toHaveProperty('token');
        expect(res.body).toHaveProperty('hasPassword');

        const decoded = jwt.verify(sessionToken(res), JWT_SECRET);
        expect(decoded.email).toBe(VALID_ACCOUNT.email);
        expect(decoded.accountId).toBe(VALID_ACCOUNT.accountId);
    });

    it('token JWT expirado após 1h', async () => {
        DashboardAccountService.checkCredentials.mockResolvedValueOnce(VALID_ACCOUNT);

        const res = await request(app)
            .post(URL).set(csrf.headers)
            .send({ email: VALID_ACCOUNT.email, password: 'Correta123' });

        const decoded = jwt.decode(sessionToken(res));
        expect(decoded.exp - decoded.iat).toBe(3600);
    });
});

// ─── POST /expapi/v1/register ─────────────────────────────────────────────────

describe('POST /expapi/v1/register', () => {
    const URL = '/expapi/v1/register';

    const validBody = {
        email: 'novo@exemplo.com',
        password: 'Senha123',
        firstName: 'Maria',
        lastName: 'Souza',
        username: 'testuser',
    };

    it('400 se campos obrigatórios estiverem faltando', async () => {
        const res = await request(app).post(URL).set(csrf.headers).send({ email: 'x@x.com' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('400 para senha muito curta', async () => {
        const res = await request(app).post(URL).set(csrf.headers).send({ ...validBody, password: 'Ab1' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('400 para senha sem letras maiúsculas', async () => {
        const res = await request(app).post(URL).set(csrf.headers).send({ ...validBody, password: 'apenas123' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('400 para senha sem números', async () => {
        const res = await request(app).post(URL).set(csrf.headers).send({ ...validBody, password: 'SenhaForte' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('400 se email já estiver cadastrado', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(VALID_ACCOUNT);

        const res = await request(app).post(URL).set(csrf.headers).send(validBody);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('REGISTRATION_FAILED');
    });

    it('400 para email inválido (getDashboardAccountByEmail lança)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockRejectedValueOnce(new Error('invalid email'));

        const res = await request(app).post(URL).set(csrf.headers).send({ ...validBody, email: 'nao-e-email' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_EMAIL');
    });

    it('200 em registro bem-sucedido', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.registerNewDashboardAccount.mockResolvedValueOnce({ accountId: 'new-acc-456' });

        const res = await request(app).post(URL).set(csrf.headers).send(validBody);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });

    it('senha com 72 caracteres (limite máximo) deve ser aceita', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.registerNewDashboardAccount.mockResolvedValueOnce({ accountId: 'acc' });

        const longPass = 'Aa1' + 'x'.repeat(69); // 72 ASCII bytes
        const res = await request(app).post(URL).set(csrf.headers).send({ ...validBody, password: longPass });
        expect(res.status).toBe(200);
    });

    it('senha com 73 caracteres (acima do limite) deve ser rejeitada', async () => {
        const tooLong = 'Aa1' + 'x'.repeat(70); // 73 ASCII bytes
        const res = await request(app).post(URL).set(csrf.headers).send({ ...validBody, password: tooLong });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('WEAK_PASSWORD');
    });
});

// ─── GET /expapi/v1/logout ────────────────────────────────────────────────────

describe('GET /expapi/v1/logout', () => {
    it('redireciona para / e limpa o cookie jwt', async () => {
        const res = await request(app).post('/expapi/v1/logout').set(csrf.headers);
        expect(res.status).toBe(200);
        expect(res.headers['set-cookie'].some(c=>c.startsWith('lumina_token=;'))).toBe(true);
    });
});

// ─── GET /expapi/v1/ (baseExpURL) ─────────────────────────────────────────────

describe('GET /expapi/v1/', () => {
    it('200 Pong!', async () => {
        const res = await request(app).get('/expapi/v1/');
        expect(res.status).toBe(200);
        expect(res.text).toBe('Pong!');
    });
});

// ─── GET /expapi/v1/getconfig (deprecado) ────────────────────────────────────

describe('GET /expapi/v1/getconfig', () => {
    it('410 Gone (rota desativada)', async () => {
        const res = await request(app).get('/expapi/v1/getconfig').set('Authorization','Bearer '+jwt.sign({email:VALID_ACCOUNT.email,accountId:VALID_ACCOUNT.accountId},JWT_SECRET,{expiresIn:'1h'}));
        // Rota enabled: false — comportamento depende do loader do index.js
        // (pode ser 404 ou 410 dependendo se o loader pula rotas disabled)
        expect(res.status).toBe(501);
        expect(res.body.code).toBe('ROUTE_DISABLED');
    });
});

// ─── POST /expapi/v1/user/set-password ───────────────────────────────────────

describe('POST /expapi/v1/user/set-password', () => {
    const URL = '/expapi/v1/user/set-password';

    const makeAuthHeader = (payload = { accountId: 'acc-123', email: 'user@example.com' }) =>
        `Bearer ${jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })}`;

    it('401 sem token de autenticação', async () => {
        const res = await request(app).post(URL).set(csrf.headers).send({ newPassword: 'Nova123' });
        expect(res.status).toBe(401);
    });

    it('400 se newPassword estiver ausente', async () => {
        const res = await request(app)
            .post(URL).set(csrf.headers)
            .set('Authorization', makeAuthHeader())
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('400 para senha atual incorreta (INVALID_CURRENT_PASSWORD)', async () => {
        const err = new Error('wrong'); err.code = 'INVALID_CURRENT_PASSWORD';
        DashboardAccountService.changePassword.mockRejectedValueOnce(err);

        const res = await request(app)
            .post(URL).set(csrf.headers)
            .set('Authorization', makeAuthHeader())
            .send({ currentPassword: 'errada', newPassword: 'Nova123' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('400 para mesma senha (SAME_PASSWORD)', async () => {
        const err = new Error('same'); err.code = 'SAME_PASSWORD';
        DashboardAccountService.changePassword.mockRejectedValueOnce(err);

        const res = await request(app)
            .post(URL).set(csrf.headers)
            .set('Authorization', makeAuthHeader())
            .send({ currentPassword: 'Igual123', newPassword: 'Igual123' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('SAME_PASSWORD');
    });

    it('400 para senha fraca (WEAK_PASSWORD)', async () => {
        const err = new Error('weak'); err.code = 'WEAK_PASSWORD';
        DashboardAccountService.changePassword.mockRejectedValueOnce(err);

        const res = await request(app)
            .post(URL).set(csrf.headers)
            .set('Authorization', makeAuthHeader())
            .send({ newPassword: 'fraca' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('404 quando conta não existe (ACCOUNT_NOT_FOUND)', async () => {
        const err = new Error('not found'); err.code = 'ACCOUNT_NOT_FOUND';
        DashboardAccountService.changePassword.mockRejectedValueOnce(err);

        const res = await request(app)
            .post(URL).set(csrf.headers)
            .set('Authorization', makeAuthHeader())
            .send({ newPassword: 'Nova123' });

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('200 em troca de senha bem-sucedida', async () => {
        DashboardAccountService.changePassword.mockResolvedValueOnce({...VALID_ACCOUNT,sessionVersion:1});

        const res = await request(app)
            .post(URL).set(csrf.headers)
            .set('Authorization', makeAuthHeader())
            .send({ newPassword: 'Nova123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });
});

// ─── PUT /expapi/v1/user/change-password (desativada) ────────────────────────

describe('PUT /expapi/v1/user/change-password', () => {
    it('501 — rota desativada', async () => {
        const res = await request(app)
            .put('/expapi/v1/user/change-password')
            .send({ currentPassword: 'A', newPassword: 'B' });
        expect(res.status).toBe(501);
        expect(res.body.code).toBe('ROUTE_DISABLED');
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 200));
});
