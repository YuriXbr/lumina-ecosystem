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

describe('resolveDiscordAccount',()=>{
 const {resolveDiscordAccount}=require('../src/utils/resolveDiscordAccount');
 it('recusa conta inexistente',async()=>{DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);await expect(resolveDiscordAccount('missing@example.test')).rejects.toMatchObject({status:404,code:'ACCOUNT_NOT_FOUND'});});
 it('recusa conta sem vínculo persistido, mesmo com token OAuth',async()=>{await expect(resolveDiscordAccount({discordOauth2Token:'untrusted'})).rejects.toMatchObject({status:403,code:'DISCORD_NOT_LINKED'});});
 it('usa o ID vinculado sem depender de uma chamada ao Discord',async()=>{axios.get.mockClear();const account={discordOauth2Id:'123456789012345678'};expect(await resolveDiscordAccount(account)).toEqual({account,discordId:account.discordOauth2Id});expect(axios.get).not.toHaveBeenCalled();});
 it('prefere o vínculo do provider ao campo legado',async()=>{const account={discordOauth2Id:'123456789012345678',authProviders:{discord:{providerId:'223456789012345678'}}};expect((await resolveDiscordAccount(account)).discordId).toBe('223456789012345678');});
 it.each([{banned:true},{blocked:true}])('recusa suspensão: %j',async flag=>{await expect(resolveDiscordAccount({...flag,discordOauth2Id:'123456789012345678'})).rejects.toMatchObject({status:403,code:'ACCOUNT_SUSPENDED'});});
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
