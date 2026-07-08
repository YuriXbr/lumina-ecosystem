/**
 * __tests__/utils-unit.test.js
 *
 * Testes unitários para:
 *   src/utils/resolveDiscordAccount
 *   src/oauthProviders/state  (signState / verifyState / isAllowedOrigin)
 *   src/ThirdParty/riotApi    (funções puras / tratamento de erro)
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('axios');
jest.mock('../src/database/services/DashboardAccountService', () => ({
    getDashboardAccountByEmail: jest.fn(),
    update: jest.fn(),
}));
jest.mock('../src/logger/logger', () => ({
    addLog: jest.fn(),
    routeError: jest.fn(),
    sendErrorEmbed: jest.fn(),
    forceSendLogs: jest.fn(),
    requestLogger: jest.fn(() => (req, res, next) => next()),
}));

const axios = require('axios');
const { addLog } = require('../src/logger/logger');
const DashboardAccountService = require('../src/database/services/DashboardAccountService');

beforeAll(() => {
    process.env.DISCORD_CLIENT_ID = 'cid';
    process.env.DISCORD_CLIENT_SECRET = 'csec';
    process.env.DISCORD_AUTH_REDIRECT_URI = 'http://localhost:3000/callback';
    process.env.OAUTH_STATE_SECRET = 'state-secret';
    process.env.RIOT_API_KEY = 'riot-key';
    process.env.RIOT_BASE_URL = 'api.riotgames.com';
});

afterEach(() => jest.clearAllMocks());

// ─── oauthProviders/state ─────────────────────────────────────────────────────

describe('oauthProviders/state', () => {
    const { signState, verifyState, isAllowedOrigin } = require('../src/oauthProviders/state');

    describe('isAllowedOrigin', () => {
        it('aceita origins da allow-list', () => {
            expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
            expect(isAllowedOrigin('https://bot.luminasink.com')).toBe(true);
        });

        it('rejeita origins não listadas', () => {
            expect(isAllowedOrigin('https://evil.com')).toBe(false);
            expect(isAllowedOrigin('')).toBe(false);
        });

        it('rejeita não-strings', () => {
            expect(isAllowedOrigin(null)).toBe(false);
            expect(isAllowedOrigin(undefined)).toBe(false);
        });
    });

    describe('signState / verifyState', () => {
        it('sign → verify retorna o payload original', () => {
            const payload = { origin: 'http://localhost:5173', intent: 'login', issuedAt: Date.now(), nonce: 'abc' };
            const state = signState(payload);
            const result = verifyState(state);
            expect(result).toMatchObject(payload);
        });

        it('verifyState retorna null para string vazia', () => {
            expect(verifyState('')).toBeNull();
        });

        it('verifyState retorna null para state sem ponto', () => {
            expect(verifyState('semPonto')).toBeNull();
        });

        it('verifyState retorna null quando HMAC está errado', () => {
            const state = signState({ origin: 'http://localhost:5173', issuedAt: Date.now() });
            const tampered = state.slice(0, -5) + 'XXXXX';
            expect(verifyState(tampered)).toBeNull();
        });

        it('verifyState retorna null para base64 inválido (JSON não parseável)', () => {
            const fakeBase = Buffer.from('não é json').toString('base64url');
            const hmac = require('crypto').createHmac('sha256', process.env.OAUTH_STATE_SECRET || 'fallback').update(fakeBase).digest('base64url');
            expect(verifyState(`${fakeBase}.${hmac}`)).toBeNull();
        });

        it('state alterado não verifica', () => {
            const original = signState({ origin: 'http://localhost:5173', issuedAt: Date.now(), intent: 'login' });
            // Altera o payload mas mantém o HMAC original (deve falhar)
            const [, hmac] = original.split('.');
            const malicious = Buffer.from(JSON.stringify({ origin: 'https://evil.com', intent: 'link', linkAccountId: 'victim' })).toString('base64url');
            expect(verifyState(`${malicious}.${hmac}`)).toBeNull();
        });
    });
});

// ─── utils/resolveDiscordAccount ─────────────────────────────────────────────

describe('resolveDiscordAccount', () => {
    const { resolveDiscordAccount } = require('../src/utils/resolveDiscordAccount');

    it('lança 404 se conta não existir', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);

        await expect(resolveDiscordAccount('ghost@example.com')).rejects.toMatchObject({
            status: 404,
            message: 'Conta não encontrada',
        });
    });

    it('lança 400 se token Discord não estiver vinculado', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce({
            email: 'user@example.com',
            discordOauth2Token: '',
        });

        await expect(resolveDiscordAccount('user@example.com')).rejects.toMatchObject({
            status: 400,
            message: 'Conta Discord não vinculada',
        });
    });

    it('retorna account e discordId com token válido (sem refresh necessário)', async () => {
        const future = new Date(Date.now() + 60 * 60 * 1000);
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce({
            email: 'user@example.com',
            discordOauth2Token: 'valid-token',
            discordOauth2TokenExpiresAt: future,
        });

        axios.get.mockResolvedValueOnce({ data: { id: 'discord-uid-42' } });

        const { account, discordId } = await resolveDiscordAccount('user@example.com');
        expect(discordId).toBe('discord-uid-42');
        expect(account).toBeDefined();
    });

    it('faz refresh do token quando expirado', async () => {
        const past = new Date(Date.now() - 1000);
        const accountData = {
            email: 'user@example.com',
            discordOauth2Token: 'expired-token',
            discordOauth2RefreshToken: 'refresh-tok',
            discordOauth2TokenExpiresAt: past,
        };
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(accountData);

        // Mock do endpoint de refresh (POST)
        axios.post.mockResolvedValueOnce({
            data: { access_token: 'new-tok', refresh_token: 'new-ref', expires_in: 3600 },
        });

        // Mock de update e da chamada Discord com novo token
        DashboardAccountService.update.mockResolvedValueOnce({ ...accountData, discordOauth2Token: 'new-tok' });
        axios.get.mockResolvedValueOnce({ data: { id: 'discord-uid-42' } });

        const { discordId } = await resolveDiscordAccount('user@example.com');
        expect(discordId).toBe('discord-uid-42');
        expect(DashboardAccountService.update).toHaveBeenCalled();
        expect(addLog).toHaveBeenCalledWith('API', 'discord.tokenRefresh', expect.any(String));
    });

    it('lança 500 se refresh falhar', async () => {
        const past = new Date(Date.now() - 1000);
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce({
            email: 'user@example.com',
            discordOauth2Token: 'expired-token',
            discordOauth2RefreshToken: 'bad-refresh',
            discordOauth2TokenExpiresAt: past,
        });
        axios.post.mockRejectedValueOnce(new Error('Discord server error'));

        await expect(resolveDiscordAccount('user@example.com')).rejects.toMatchObject({
            status: 500,
            message: 'Erro durante refresh do token',
        });
        expect(addLog).toHaveBeenCalledWith('API', 'discord.tokenRefresh.error', expect.any(String));
    });

    it('lança 500 se chamada à API Discord falhar (após token válido)', async () => {
        const future = new Date(Date.now() + 3600 * 1000);
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce({
            email: 'user@example.com',
            discordOauth2Token: 'valid-token',
            discordOauth2TokenExpiresAt: future,
        });
        axios.get.mockRejectedValueOnce(new Error('Discord API offline'));

        await expect(resolveDiscordAccount('user@example.com')).rejects.toMatchObject({
            status: 500,
            message: 'Erro interno ao obter informações do Discord',
        });
        expect(addLog).toHaveBeenCalledWith('API', 'discord.resolve.error', expect.any(String));
    });
});

// ─── ThirdParty/riotApi ───────────────────────────────────────────────────────

describe('riotApi', () => {
    let riotApi;

    beforeEach(() => {
        jest.resetModules();
        jest.mock('axios');
        jest.mock('../src/logger/logger', () => ({ addLog: jest.fn() }));
        riotApi = require('../src/ThirdParty/riotApi');
    });

    it('getAccountByRiotId retorna { error } em 404', async () => {
        const err = new Error('not found');
        err.response = { status: 404 };
        require('axios').get.mockRejectedValueOnce(err);

        const result = await riotApi.getAccountByRiotId('americas', 'Player', 'BR1');
        expect(result).toEqual({ error: 'Account not found' });
    });

    it('getAccountByRiotId retorna undefined em outros erros e chama addLog', async () => {
        const { addLog: mockAddLog } = require('../src/logger/logger');
        require('axios').get.mockRejectedValueOnce(new Error('timeout'));

        const result = await riotApi.getAccountByRiotId('americas', 'Player', 'BR1');
        expect(result).toBeUndefined();
        expect(mockAddLog).toHaveBeenCalledWith('RIOT', 'getAccountByRiotId.error', expect.any(String));
    });

    it('getDDragonVersions retorna dados em sucesso', async () => {
        require('axios').get.mockResolvedValueOnce({ data: ['14.1.1', '14.0.1'] });
        const result = await riotApi.getDDragonVersions();
        expect(result).toEqual(['14.1.1', '14.0.1']);
    });

    it('getDDragonVersions retorna undefined em falha e chama addLog', async () => {
        const { addLog: mockAddLog } = require('../src/logger/logger');
        require('axios').get.mockRejectedValueOnce(new Error('net error'));

        const result = await riotApi.getDDragonVersions();
        expect(result).toBeUndefined();
        expect(mockAddLog).toHaveBeenCalledWith('RIOT', 'getDDragonVersions.error', expect.any(String));
    });

    it('getLatestCDPatchVersion extrai versão corretamente', async () => {
        require('axios').get.mockResolvedValueOnce({ data: { version: '14.1.1+abc123' } });
        const version = await riotApi.getLatestCDPatchVersion();
        expect(version).toBe('14.1.1');
    });

    it('getChampionMastery retorna undefined e loga em falha', async () => {
        const { addLog: mockAddLog } = require('../src/logger/logger');
        require('axios').get.mockRejectedValueOnce(new Error('503'));

        const result = await riotApi.getChampionMastery('br1', 'puuid-123');
        expect(result).toBeUndefined();
        expect(mockAddLog).toHaveBeenCalledWith('RIOT', 'getChampionMastery.error', expect.any(String));
    });

    it('regionMap mapeia servidores corretamente', () => {
        expect(riotApi.regionMap.br1).toBe('americas');
        expect(riotApi.regionMap.kr).toBe('asia');
        expect(riotApi.regionMap.euw1).toBe('europe');
    });
});
