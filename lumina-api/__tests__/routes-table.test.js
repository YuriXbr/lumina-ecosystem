/**
 * __tests__/routes-table.test.js
 *
 * Testes da página inicial (tabela de endpoints) e dos headers de segurança
 * globais aplicados a toda a API.
 *
 * NOTA: substitui o antigo __tests__/routes.test.js, que fazia
 * `require('../src/database/db')` — módulo que não existe no projeto atual —
 * e testava um fluxo de login por variáveis de ambiente (DASHBOARD_EMAIL/
 * DASHBOARD_PASSWORD) que já não existe em src/routes/expapi/v1/login.js.
 * Esse arquivo quebrava a suíte (MODULE_NOT_FOUND) e não refletia o
 * comportamento real da aplicação.
 */

const request = require('supertest');

jest.mock('../src/database/services/DashboardAccountService', () => ({
    getDashboardAccountByEmail: jest.fn(),
    checkCredentials: jest.fn(),
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

let app;

beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.INTERNAL_API_KEY = 'test-internal-key';
    app = require('../index');
});

describe('GET / — tabela de endpoints', () => {
    it('retorna 200 e HTML listando as rotas registradas', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.type).toBe('text/html');
        expect(res.text).toContain('Lumina API');
    });

    it('escapa HTML nas descrições das rotas (proteção contra XSS refletido)', async () => {
        const res = await request(app).get('/');
        // Nenhuma descrição de rota deveria injetar uma tag <script> crua.
        expect(res.text).not.toMatch(/<script(?!.*swagger)/i);
    });
});

describe('Headers de segurança globais', () => {
    it('inclui os headers de segurança em qualquer resposta', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-frame-options']).toBe('DENY');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('inclui um X-Request-Id único por requisição (rastreabilidade)', async () => {
        const res1 = await request(app).get('/');
        const res2 = await request(app).get('/');
        expect(res1.headers['x-request-id']).toBeTruthy();
        expect(res2.headers['x-request-id']).toBeTruthy();
        expect(res1.headers['x-request-id']).not.toBe(res2.headers['x-request-id']);
    });
});

describe('Rota catch-all', () => {
    it('retorna 404 para rotas inexistentes', async () => {
        const res = await request(app).get('/rota-que-nao-existe-123');
        expect(res.status).toBe(404);
    });
});

describe('Rotas placeholder removidas', () => {
    it('não expõe mais os stubs mortos em /login, /register, /logout na raiz', async () => {
        // Essas rotas existiam em src/routes/api/v1/*.js sem prefixo real e
        // sem fazer nada além de devolver um texto fixo — removidas por serem
        // superfície de ataque/confusão desnecessária.
        const login = await request(app).get('/login');
        const register = await request(app).get('/register');
        expect(login.status).toBe(404);
        expect(register.status).toBe(404);
    });
});
