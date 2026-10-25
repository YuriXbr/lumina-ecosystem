'use strict';
// O navegador troca um código descartável vinculado ao cookie e à origem.
// O JWT nunca é aceito do frontend nem devolvido no corpo da resposta.
const request = require('supertest');
const { makeJwt, makeExpiredJwt, makeWrongSecretJwt, makeAccount, mockLogger, mockDashboardAccountService } = require('../helpers/testUtils');
mockLogger();
mockDashboardAccountService();
const accounts = require('../../src/database/services/DashboardAccountService');
const store = require('../../src/utils/sessionStore');
const app = require('../../index');
jest.useFakeTimers();
afterAll(() => jest.useRealTimers());
const code = 'A'.repeat(43);
const origin = 'http://localhost:5179';
function exchange(body = { code }, headers = {}) {
  return request(app).post('/expapi/v1/exchange-token')
    .set({ Origin: origin, Cookie: 'lumina_oauth_exchange=browser-key', ...headers }).send(body);
}
beforeEach(() => {
  jest.clearAllMocks();
  accounts.getDashboardAccountByEmail.mockReset();
  store.consumeExchange.mockReset();
  accounts.getDashboardAccountByEmail.mockResolvedValue(makeAccount());
  store.isRevoked.mockResolvedValue(false);
  store.consumeExchange.mockResolvedValue({ token: makeJwt() });
});
describe('POST /expapi/v1/exchange-token', () => {
  it('emite cookie HttpOnly, limpa a transação e não expõe credenciais', async () => {
    const res = await exchange();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, user: { email: 'tester@example.com', hasPassword: true } });
    expect(res.body).not.toHaveProperty('token');
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['set-cookie'].find(c => c.startsWith('lumina_token='))).toMatch(/HttpOnly/);
    expect(res.headers['set-cookie'].find(c => c.startsWith('lumina_oauth_exchange='))).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(store.consumeExchange).toHaveBeenCalledWith(code, origin, 'browser-key');
  });
  it('preserva os dados públicos e o estado de escopo do Discord', async () => {
    accounts.getDashboardAccountByEmail.mockResolvedValue(makeAccount({ username: 'specialuser', discordOauth2Id: '123456789012345678', discordOauth2TokenScope: 'identify' }));
    const res = await exchange();
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: 'specialuser', discordNeedsReauth: true });
  });
  it.each([{}, { code: '' }, { code: 'short' }, { token: 'legacy-jwt' }, { code: { $ne: null } }])('rejeita corpo inválido %j sem consumir a transação', async body => {
    const res = await exchange(body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_EXCHANGE');
    expect(store.consumeExchange).not.toHaveBeenCalled();
  });
  it.each([{ Origin: 'https://evil.example' }, { Origin: '' }, { Cookie: '' }])('exige origem e cookie do navegador %j', async headers => {
    expect((await exchange({ code }, headers)).status).toBe(headers.Origin === 'https://evil.example' ? 403 : 400);
    expect(store.consumeExchange).not.toHaveBeenCalled();
  });
  it('rejeita código expirado, usado ou de outro navegador', async () => {
    store.consumeExchange.mockResolvedValue(null);
    const res = await exchange();
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('EXCHANGE_EXPIRED');
  });
  it.each([makeExpiredJwt(), makeWrongSecretJwt()])('revalida a assinatura e a expiração da sessão', async token => {
    store.consumeExchange.mockResolvedValue({ token });
    expect((await exchange()).status).toBe(401);
  });
  it.each([
    [null, 401, 'ACCOUNT_NOT_FOUND'],
    [makeAccount({ banned: true }), 403, 'ACCOUNT_BANNED'],
    [makeAccount({ blocked: true }), 403, 'ACCOUNT_BLOCKED'],
    [makeAccount({ sessionVersion: 1 }), 401, 'SESSION_REVOKED'],
  ])('revalida a conta no banco', async (account, status, expectedCode) => {
    accounts.getDashboardAccountByEmail.mockResolvedValue(account);
    const res = await exchange();
    expect(res.status).toBe(status);
    expect(res.body.code).toBe(expectedCode);
    expect((res.headers['set-cookie'] || []).some(c => c.startsWith('lumina_token='))).toBe(false);
  });
  it('rejeita sessão revogada', async () => {
    store.isRevoked.mockResolvedValue(true);
    expect((await exchange()).body.code).toBe('SESSION_REVOKED');
  });
  it('falha de forma fechada se a conta não puder ser consultada', async () => {
    accounts.getDashboardAccountByEmail.mockRejectedValue(new Error('DB down'));
    expect((await exchange()).status).toBe(503);
  });
  it('retorna indisponibilidade quando o armazenamento da transação falha', async () => {
    store.consumeExchange.mockRejectedValue(new Error('DB down'));
    const res = await exchange();
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('EXCHANGE_UNAVAILABLE');
  });
});
