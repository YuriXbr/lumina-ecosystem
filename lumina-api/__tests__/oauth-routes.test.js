/**
 * __tests__/oauth-routes.test.js
 *
 * Testes para as rotas OAuth2:
 *   GET /expapi/oauth2/:provider/auth/start
 *   GET /expapi/oauth2/:provider/auth/callback
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../src/database/services/DashboardAccountService', () => ({
    getDashboardAccountByProviderId: jest.fn(),
    getDashboardAccountByEmail: jest.fn(),
    getDashboardAccountByAccountId: jest.fn(),
    createOAuthAccount: jest.fn(),
    linkOAuthProvider: jest.fn(),
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

jest.mock('../src/oauthProviders/discordProvider', () => ({
    name: 'discord',
    getAuthorizationUrl: jest.fn(state => `https://discord.com/oauth2/authorize?state=${state}`),
    exchangeCode: jest.fn(),
    getProfile: jest.fn(),
}));

jest.useFakeTimers();

const DashboardAccountService = require('../src/database/services/DashboardAccountService');
const discordProvider = require('../src/oauthProviders/discordProvider');
const { signState } = require('../src/oauthProviders/state');

const app = require('../index');
const JWT_SECRET = 'test-secret';

const ALLOWED_ORIGIN = 'http://localhost:5173';
const VALID_ACCOUNT = {
    email: 'discord@example.com',
    accountId: 'acc-discord-1',
    firstName: 'Test',
    lastName: 'User',
    password: '$2a$hash',
};

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DISCORD_CLIENT_ID = 'test-client-id';
    process.env.DISCORD_CLIENT_SECRET = 'test-client-secret';
    process.env.DISCORD_AUTH_REDIRECT_URI = 'http://localhost:3000/expapi/oauth2/discord/auth/callback';
    process.env.OAUTH_STATE_SECRET = 'oauth-state-secret';
});

afterEach(() => jest.clearAllMocks());

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Gera um state HMAC válido para os testes de callback */
function makeValidState(overrides = {}) {
    return signState({
        origin: ALLOWED_ORIGIN,
        nonce: crypto.randomUUID(),
        issuedAt: Date.now(),
        intent: 'login',
        ...overrides,
    });
}

// ─── GET /expapi/oauth2/:provider/auth/start ──────────────────────────────────

describe('GET /expapi/oauth2/:provider/auth/start', () => {
    const START = (provider = 'discord') => `/expapi/oauth2/${provider}/auth/start`;

    it('302 redireciona para a URL de autorização do provedor', async () => {
        const res = await request(app)
            .get(START())
            .query({ origin: ALLOWED_ORIGIN, intent: 'login' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('discord.com/oauth2/authorize');
    });

    it('400 para origin não permitida', async () => {
        const res = await request(app)
            .get(START())
            .query({ origin: 'https://evil.com', intent: 'login' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_ORIGIN');
    });

    it('404 para provedor desconhecido', async () => {
        const res = await request(app)
            .get(START('google'))
            .query({ origin: ALLOWED_ORIGIN });

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('UNKNOWN_PROVIDER');
    });

    it('intent inválido cai para login (padrão)', async () => {
        const res = await request(app)
            .get(START())
            .query({ origin: ALLOWED_ORIGIN, intent: 'invalid' });

        // Deve redirecionar normalmente (intent padrão = login)
        expect(res.status).toBe(302);
    });

    it('intent link sem linkToken redireciona com oauthError', async () => {
        const res = await request(app)
            .get(START())
            .query({ origin: ALLOWED_ORIGIN, intent: 'link' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('oauthError=link_no_account');
    });

    it('intent link com linkToken válido redireciona para provedor', async () => {
        const linkToken = jwt.sign({ accountId: 'acc-123' }, JWT_SECRET, { expiresIn: '1h' });

        const res = await request(app)
            .get(START())
            .query({ origin: ALLOWED_ORIGIN, intent: 'link', linkToken });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('discord.com/oauth2/authorize');
    });

    it('intent link com linkToken expirado redireciona com erro', async () => {
        // Token assinado com exp no passado
        const expiredToken = jwt.sign(
            { accountId: 'acc-123', iat: Math.floor(Date.now() / 1000) - 3700, exp: Math.floor(Date.now() / 1000) - 100 },
            JWT_SECRET
        );

        const res = await request(app)
            .get(START())
            .query({ origin: ALLOWED_ORIGIN, intent: 'link', linkToken: expiredToken });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('oauthError=link_no_account');
    });
});

// ─── GET /expapi/oauth2/:provider/auth/callback ───────────────────────────────

describe('GET /expapi/oauth2/:provider/auth/callback', () => {
    const CB = (provider = 'discord') => `/expapi/oauth2/${provider}/auth/callback`;

    it('404 para provedor não suportado', async () => {
        const res = await request(app).get(CB('github')).query({ code: 'abc', state: makeValidState() });
        expect(res.status).toBe(404);
    });

    it('400 para state inválido', async () => {
        const res = await request(app).get(CB()).query({ code: 'abc', state: 'invalid.state' });
        expect(res.status).toBe(400);
    });

    it('400 para state expirado', async () => {
        const expiredState = makeValidState({ issuedAt: Date.now() - 11 * 60 * 1000 });
        const res = await request(app).get(CB()).query({ code: 'abc', state: expiredState });
        expect(res.status).toBe(400);
    });

    it('redireciona com oauthError quando Discord retorna erro', async () => {
        const state = makeValidState();
        const res = await request(app).get(CB()).query({ error: 'access_denied', state });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('oauthError=access_denied');
    });

    it('redireciona com oauthError quando code está ausente', async () => {
        const state = makeValidState();
        const res = await request(app).get(CB()).query({ state });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('oauthError=missing_code');
    });

    it('login — conta existente por providerId → redireciona com token', async () => {
        discordProvider.exchangeCode.mockResolvedValueOnce({
            accessToken: 'access-token', refreshToken: 'refresh-token',
            expiresIn: 3600, scope: 'identify email', tokenType: 'Bearer',
        });
        discordProvider.getProfile.mockResolvedValueOnce({
            providerId: 'discord-uid-1', email: 'discord@example.com',
            emailVerified: true, username: 'TestUser',
        });
        DashboardAccountService.getDashboardAccountByProviderId.mockResolvedValueOnce(VALID_ACCOUNT);
        DashboardAccountService.update.mockResolvedValueOnce(VALID_ACCOUNT);

        const state = makeValidState({ intent: 'login' });
        const res = await request(app).get(CB()).query({ code: 'valid-code', state });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('token=');
        expect(res.headers.location).toContain('isNewAccount=false');
    });

    it('login — sem conta existente → cria nova conta e redireciona', async () => {
        discordProvider.exchangeCode.mockResolvedValueOnce({
            accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600, scope: 'identify', tokenType: 'Bearer',
        });
        discordProvider.getProfile.mockResolvedValueOnce({
            providerId: 'discord-new-uid', email: 'new@example.com',
            emailVerified: false, username: 'NewUser',
        });
        DashboardAccountService.getDashboardAccountByProviderId.mockResolvedValueOnce(null);
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        DashboardAccountService.createOAuthAccount.mockResolvedValueOnce({
            ...VALID_ACCOUNT, accountId: 'new-acc', email: 'new@example.com',
        });
        DashboardAccountService.update.mockResolvedValueOnce({});

        const state = makeValidState({ intent: 'login' });
        const res = await request(app).get(CB()).query({ code: 'code-new', state });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('isNewAccount=true');
    });

    it('register — email já cadastrado → redireciona com oauthError email_exists', async () => {
        discordProvider.exchangeCode.mockResolvedValueOnce({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600, scope: '', tokenType: 'Bearer' });
        discordProvider.getProfile.mockResolvedValueOnce({
            providerId: 'disc-uid-reg', email: 'existing@example.com',
            emailVerified: true, username: 'Existing',
        });
        DashboardAccountService.getDashboardAccountByProviderId.mockResolvedValueOnce(null); // Discord não vinculado
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(VALID_ACCOUNT); // Email existe

        const state = makeValidState({ intent: 'register' });
        const res = await request(app).get(CB()).query({ code: 'code-reg', state });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('oauthError=email_exists');
    });

    it('link — sem linkAccountId no state → oauthError link_no_account', async () => {
        discordProvider.exchangeCode.mockResolvedValueOnce({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600, scope: '', tokenType: 'Bearer' });
        discordProvider.getProfile.mockResolvedValueOnce({
            providerId: 'disc-uid-link', email: 'link@example.com', emailVerified: true, username: 'LinkUser',
        });

        // State de link sem linkAccountId
        const state = makeValidState({ intent: 'link' });
        const res = await request(app).get(CB()).query({ code: 'code-link', state });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('oauthError=link_no_account');
    });

    it('link — Discord já vinculado a outra conta → oauthError discord_already_linked', async () => {
        discordProvider.exchangeCode.mockResolvedValueOnce({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600, scope: '', tokenType: 'Bearer' });
        discordProvider.getProfile.mockResolvedValueOnce({
            providerId: 'disc-uid-2', email: 'other@example.com', emailVerified: true, username: 'Other',
        });

        const myAccount = { ...VALID_ACCOUNT, accountId: 'acc-mine' };
        const otherAccount = { ...VALID_ACCOUNT, accountId: 'acc-other' };

        DashboardAccountService.getDashboardAccountByAccountId.mockResolvedValueOnce(myAccount);
        DashboardAccountService.getDashboardAccountByProviderId.mockResolvedValueOnce(otherAccount); // já vinculado a outra

        const state = makeValidState({ intent: 'link', linkAccountId: 'acc-mine' });
        const res = await request(app).get(CB()).query({ code: 'code-link', state });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('oauthError=discord_already_linked');
    });

    it('callback — erro inesperado do provider → redireciona com server_error', async () => {
        discordProvider.exchangeCode.mockRejectedValueOnce(new Error('Discord API down'));

        const state = makeValidState();
        const res = await request(app).get(CB()).query({ code: 'bad-code', state });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('oauthError=server_error');
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 200));
});
