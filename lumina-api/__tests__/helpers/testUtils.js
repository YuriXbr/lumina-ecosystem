/**
 * __tests__/helpers/testUtils.js
 *
 * Utilitários compartilhados por todas as suítes de teste da Lumina API.
 *
 * Centraliza:
 *   - Geração de JWTs de teste (válido, expirado, malformado)
 *   - Geração de cookies de autenticação
 *   - Helper para resolver tokens CSRF em rotas state-changing
 *   - Mock factories para objetos comuns (account, badge, inventory, etc.)
 *   - Mock appliers para serviços de banco de dados e logger
 *
 * Importante: este arquivo NÃO deve ter side-effects no top-level. Tudo deve
 * ser lazy ou em factories, para que cada teste possa usá-lo isoladamente.
 */

'use strict';

const jwt = require('jsonwebtoken');

// ─── Configuração central de secrets de teste ──────────────────────────────
// Estes valores são setados pelo __tests__/setup-env.js, mas garantimos aqui
// caso algum teste rode isolado sem o setup (defensivo).
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-lumina-2026';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'test-internal-key';
const API_KEY = process.env.LUMINA_API_KEY || 'test-api-key';

// ─── Helpers de JWT ────────────────────────────────────────────────────────

/**
 * Gera um JWT válido para um usuário de teste.
 * @param {object} overrides - campos extras no payload
 * @param {object} options - opções do jwt.sign (expiresIn, etc.)
 */
function makeJwt(overrides = {}, options = {}) {
    const payload = {
        email: 'tester@example.com',
        accountId: 'acc-test-0001',
        firstName: 'Test',
        lastName: 'User',
        ...overrides,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h', ...options });
}

/** JWT já expirado (útil para testar 401 TOKEN_EXPIRED). */
function makeExpiredJwt(overrides = {}) {
    return makeJwt(overrides, { expiresIn: '-1s' });
}

/** JWT assinado com segredo errado (útil para testar 401 INVALID_TOKEN). */
function makeWrongSecretJwt(overrides = {}) {
    const payload = {
        email: 'tester@example.com',
        accountId: 'acc-test-0001',
        ...overrides,
    };
    return jwt.sign(payload, 'wrong-secret-xxxxx', { expiresIn: '1h' });
}

/** String que parece JWT mas não é (3 partes separadas por ponto, mas lixo). */
function makeGarbageJwt() {
    return 'aaaa.bbbb.cccc';
}

// ─── Helpers de header/cookie ──────────────────────────────────────────────

/** Monta o header Authorization: Bearer <token> para supertest. */
function bearerAuth(token = makeJwt()) {
    return { Authorization: `Bearer ${token}` };
}

/** Monta o header internal-key para supertest. */
function internalKey(value = INTERNAL_KEY) {
    return { 'internal-key': value };
}

/** Monta o header X-Lumina-API-Key para supertest. */
function apiKeyHeader(value = API_KEY) {
    return { 'x-lumina-api-key': value };
}

/** Monta o cookie lumina_token para supertest (via header Cookie). */
function cookieAuth(token = makeJwt()) {
    return { Cookie: `lumina_token=${token}` };
}

/**
 * Faz um GET /expapi/v1/csrf-token primeiro e devolve os tokens/cookies CSRF.
 *
 * Como o app em teste usa o middleware real de CSRF, este é o fluxo correto
 * para obter um cookie+header válidos que rotas POST/PUT/DELETE exigem.
 */
async function getCsrfTokens(app) {
    const supertest = require('supertest');
    const res = await supertest(app).get('/expapi/v1/csrf-token');
    const setCookie = res.headers['set-cookie'] || [];
    let csrfCookieValue = '';
    for (const c of setCookie) {
        const match = /csrf_token=([^;]+)/.exec(c);
        if (match) { csrfCookieValue = match[1]; break; }
    }
    const headerToken = res.body && res.body.csrfToken ? res.body.csrfToken : csrfCookieValue;
    return {
        token: headerToken,
        cookie: `csrf_token=${csrfCookieValue}`,
        headers: {
            'X-CSRF-Token': headerToken,
            Cookie: `csrf_token=${csrfCookieValue}`,
        },
    };
}

/**
 * Combina header de autenticação JWT + cookie CSRF em um único objeto de headers.
 * Útil para rotas que exigem ambos (jwtNeeded + csrfProtectionNeeded).
 */
function combineAuthAndCsrf(authHeaders, csrfHeaders) {
    const merged = { ...authHeaders, ...csrfHeaders };
    const cookies = [];
    if (authHeaders && authHeaders.Cookie) cookies.push(authHeaders.Cookie);
    if (csrfHeaders && csrfHeaders.Cookie) cookies.push(csrfHeaders.Cookie);
    if (cookies.length) merged.Cookie = cookies.join('; ');
    return merged;
}

// ─── Mock factories ────────────────────────────────────────────────────────

/** Cria uma conta mockada do dashboard. */
function makeAccount(overrides = {}) {
    return {
        accountId: 'acc-test-0001',
        email: 'tester@example.com',
        password: '$2a$10$mockHashNotReal',
        firstName: 'Test',
        lastName: 'User',
        accessType: 'user',
        emailVerified: true,
        discordOauth2Id: '',
        discordAvatar: '',
        registrationDate: new Date('2024-01-01'),
        lastLogin: null,
        banned: false,
        blocked: false,
        username: 'tester',
        displayName: 'Test User',
        usernameChangedAt: null,
        displayNameChangedAt: null,
        authProviders: {},
        emailNotifications: true,
        discordNotifications: true,
        botActivityAlerts: false,
        publicProfile: false,
        showOnlineStatus: true,
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        deletionRequestedAt: null,
        deletionScheduledFor: null,
        ...overrides,
    };
}

/** Cria uma conta admin para testes de rotas admin. */
function makeAdminAccount(overrides = {}) {
    return makeAccount({
        accountId: 'acc-admin-0001',
        email: 'admin@luminasink.com',
        accessType: 'admin',
        username: 'admin',
        displayName: 'Admin User',
        ...overrides,
    });
}

/** Cria uma badge mockada. */
function makeBadge(overrides = {}) {
    return {
        code: 'TESTBADGE',
        name: 'Test Badge',
        description: 'A badge for testing',
        imageUrl: 'https://example.com/badge.png',
        rarity: 'common',
        highlightColor: '#8B5CF6',
        availableFrom: new Date('2024-01-01'),
        expiresAt: null,
        maxRedemptions: 0,
        minAccessLevel: 'user',
        createdBy: 'admin@luminasink.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true,
        ...overrides,
    };
}

/** Cria um inventário mockado. */
function makeInventory(overrides = {}) {
    return {
        userId: '123456789012345678',
        hextechChests: 10,
        masterWorkChests: 1,
        keys: 11,
        skins: [1001, 1002],
        dailyRewardClaim: null,
        nextDailyReward: null,
        dailyRewardStreak: 0,
        ...overrides,
    };
}

/** Cria uma guilda mockada. */
function makeGuild(overrides = {}) {
    return {
        guildId: '987654321098765432',
        guildReferenceName: 'Test Server',
        guildOwnerId: '111111111111111111',
        prefix: 'l!',
        memberCount: 100,
        djEnabled: false,
        memberWelcomeToggle: false,
        moderationChannelId: '',
        guildLocale: 'en-US',
        ...overrides,
    };
}

/** Cria um post de notícia mockado. */
function makeNewsPost(overrides = {}) {
    return {
        _id: '65a1b2c3d4e5f6a7b8c9d0e1',
        title: 'Test News',
        body: 'This is a test news post body.',
        excerpt: 'Test excerpt',
        imageUrl: 'https://example.com/news.png',
        tag: 'novidade',
        pinned: false,
        publishedAt: new Date(),
        authorEmail: 'admin@luminasink.com',
        authorName: 'Admin User',
        ...overrides,
    };
}

// ─── Mock appliers (cada um seta jest.mock e retorna o módulo mockado) ─────

function mockLogger() {
    jest.mock('../../src/logger/logger', () => ({
        addLog: jest.fn(),
        routeError: jest.fn(({ res, errorCode, userMsg, status = 500 }) =>
            res.status(status).json({ error: userMsg, code: errorCode })
        ),
        sendErrorEmbed: jest.fn(),
        forceSendLogs: jest.fn(),
        requestLogger: jest.fn(() => (req, res, next) => next()),
    }));
    return require('../../src/logger/logger');
}

function mockDashboardAccountService() {
    jest.mock('../../src/database/services/DashboardAccountService', () => ({
        checkCredentials: jest.fn(),
        registerNewDashboardAccount: jest.fn(),
        getDashboardAccountByEmail: jest.fn(),
        getDashboardAccountByAccountId: jest.fn(),
        getDashboardAccountByProviderId: jest.fn(),
        getPublicAccountByIdentifier: jest.fn(),
        getOne: jest.fn(),
        getAllAccounts: jest.fn(),
        changePassword: jest.fn(),
        update: jest.fn(),
        updateAccount: jest.fn(),
        linkOAuthProvider: jest.fn(),
        createOAuthAccount: jest.fn(),
        isUsernameAvailable: jest.fn(),
        setUsername: jest.fn(),
        setDisplayName: jest.fn(),
        requestAccountClosure: jest.fn(),
        cancelAccountClosure: jest.fn(),
    }));
    return require('../../src/database/services/DashboardAccountService');
}

function mockInventoryService() {
    jest.mock('../../src/database/services/UserInventoryService', () => ({
        getInventory: jest.fn(),
        addInventory: jest.fn(),
        removeInventory: jest.fn(),
        claimDaily: jest.fn(),
        spendKeyAndChest: jest.fn(),
        getDailyStatus: jest.fn(),
        create: jest.fn(),
        getAllInventories: jest.fn(),
        resetInventory: jest.fn(),
    }));
    return require('../../src/database/services/UserInventoryService');
}

function mockBadgeService() {
    jest.mock('../../src/database/services/BadgeService', () => ({
        getByCode: jest.fn(),
        listActive: jest.fn(),
        getAll: jest.fn(),
        createBadge: jest.fn(),
        updateByCode: jest.fn(),
        deleteByCode: jest.fn(),
    }));
    return require('../../src/database/services/BadgeService');
}

function mockUserBadgeService() {
    jest.mock('../../src/database/services/UserBadgeService', () => ({
        getByUser: jest.fn(),
        getByBadge: jest.fn(),
        hasRedeemed: jest.fn(),
        countByBadge: jest.fn(),
        redeem: jest.fn(),
        remove: jest.fn(),
    }));
    return require('../../src/database/services/UserBadgeService');
}

function mockGuildService() {
    jest.mock('../../src/database/services/GuildService', () => ({
        getGuildData: jest.fn(),
        createGuildData: jest.fn(),
        updateGuildData: jest.fn(),
        delete: jest.fn(),
        getAll: jest.fn(),
    }));
    return require('../../src/database/services/GuildService');
}

function mockBotService() {
    jest.mock('../../src/database/services/BotService', () => ({
        getBot: jest.fn(),
        updateBot: jest.fn(),
    }));
    return require('../../src/database/services/BotService');
}

function mockSkinService() {
    jest.mock('../../src/database/services/SkinService', () => ({
        addSkinToInventory: jest.fn(),
        getSkinInfo: jest.fn(),
        getSkinsId: jest.fn(),
        getSkinsQuantity: jest.fn(),
        getAllSkins: jest.fn(),
        fetchUserSkins: jest.fn(),
        updateSkinsDatabase: jest.fn(),
    }));
    return require('../../src/database/services/SkinService');
}

function mockNewsService() {
    jest.mock('../../src/database/services/NewsService', () => ({
        listPublished: jest.fn(),
        getById: jest.fn(),
        createPost: jest.fn(),
        updatePost: jest.fn(),
        deletePost: jest.fn(),
    }));
    return require('../../src/database/services/NewsService');
}

function mockLogService() {
    jest.mock('../../src/database/services/LogService', () => ({
        write: jest.fn(),
        queryLogs: jest.fn(),
    }));
    return require('../../src/database/services/LogService');
}

function mockPunishServices() {
    jest.mock('../../src/database/services/BanListService', () => ({
        addBan: jest.fn(),
        updateBan: jest.fn(),
        removeBan: jest.fn(),
    }));
    jest.mock('../../src/database/services/MuteListService', () => ({
        addMute: jest.fn(),
        updateMute: jest.fn(),
        removeMute: jest.fn(),
    }));
    jest.mock('../../src/database/services/WarnListService', () => ({
        addWarn: jest.fn(),
        update: jest.fn(),
        removeWarn: jest.fn(),
    }));
    return {
        BanListService: require('../../src/database/services/BanListService'),
        MuteListService: require('../../src/database/services/MuteListService'),
        WarnListService: require('../../src/database/services/WarnListService'),
    };
}

/**
 * Aplica TODOS os mocks de serviços de banco de uma vez.
 * Útil para testes de integração que tocam vários serviços.
 */
function mockAllDatabaseServices() {
    return {
        DashboardAccountService: mockDashboardAccountService(),
        InventoryService: mockInventoryService(),
        BadgeService: mockBadgeService(),
        UserBadgeService: mockUserBadgeService(),
        GuildService: mockGuildService(),
        BotService: mockBotService(),
        SkinService: mockSkinService(),
        NewsService: mockNewsService(),
        LogService: mockLogService(),
        ...mockPunishServices(),
    };
}

// ─── Mock do axios (para rotas que chamam Discord API) ────────────────────
function mockAxios(handlers = {}) {
    jest.mock('axios');
    const mockedAxios = require('axios');
    if (handlers.get) mockedAxios.get.mockImplementation(handlers.get);
    if (handlers.post) mockedAxios.post.mockImplementation(handlers.post);
    return mockedAxios;
}

// ─── Export ────────────────────────────────────────────────────────────────

module.exports = {
    JWT_SECRET,
    INTERNAL_KEY,
    API_KEY,
    makeJwt,
    makeExpiredJwt,
    makeWrongSecretJwt,
    makeGarbageJwt,
    bearerAuth,
    internalKey,
    apiKeyHeader,
    cookieAuth,
    getCsrfTokens,
    combineAuthAndCsrf,
    makeAccount,
    makeAdminAccount,
    makeBadge,
    makeInventory,
    makeGuild,
    makeNewsPost,
    mockLogger,
    mockDashboardAccountService,
    mockInventoryService,
    mockBadgeService,
    mockUserBadgeService,
    mockGuildService,
    mockBotService,
    mockSkinService,
    mockNewsService,
    mockLogService,
    mockPunishServices,
    mockAllDatabaseServices,
    mockAxios,
};
