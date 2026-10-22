// Provas locais de lógica, com dependências simuladas. Zero rede e zero escrita no MongoDB.
// Não prova exploração em produção; usa o código real com resultados de banco controlados.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const api = path.join(root, 'lumina-api');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'audit-local-only-not-a-production-secret';
process.env.OAUTH_STATE_SECRET = 'audit-state-local-only';
const results = [];
function mock(rel, exports) { const id = require.resolve(path.join(api, rel)); require.cache[id] = { id, filename: id, loaded: true, exports }; }
mock('src/logger/logger.js', { addLog() {}, routeError({ error }) { throw error; } });
const mongoose = require(path.join(api, 'node_modules/mongoose'));
const { mongoSchema } = require(path.join(api, 'src/database/schema'));
const guildSchema = new mongoose.Schema(mongoSchema.guilds);
const accountSchema = new mongoose.Schema(mongoSchema.dashboardAccounts);
const badgeSchema = new mongoose.Schema(mongoSchema.userBadges);
const Guild = mongoose.model('AuditLocalGuild', guildSchema);
const Account = mongoose.model('AuditLocalAccount', accountSchema);
const doc = new Guild({ guildId: '123456789012345678', guildReferenceName: 'Fixture', guildOwnerId: '123456789012345679', commandsEnabled: { 'league.profile': false }, autoMessages: [], blockedUsers: ['123456789012345680'], gachaEnabled: false });
assert.equal(doc.toObject().commandsEnabled, undefined);
assert.equal(doc.toObject().gachaEnabled, undefined);
assert.equal(new Account({ accountId: 'fixture', email: 'fixture@example.invalid', firstName: 'Fixture', lastName: 'Only' }).username, '');
assert.equal(accountSchema.indexes().some(([k, o]) => k.usernameLower && o.unique), false);
assert.equal(badgeSchema.indexes().some(([k, o]) => k.userEmail && k.badgeCode && o.unique), false);
results.push({ id: 'S02/S03/E01', finding: 'Schema descarta campos de configuração e não declara índices únicos normalizados/compostos; username ausente recebe string vazia.' });
async function main() {
  const inventory = require(path.join(api, 'src/database/services/UserInventoryService'));
  inventory.connect = async () => {};
  const updates = [];
  inventory.model = {
    findOne: async () => ({ userId: 'fixture', nextDailyReward: null, dailyRewardClaim: null, dailyRewardStreak: 0 }),
    findOneAndUpdate: async (query, update) => { updates.push({ query, update }); return { userId: 'fixture' }; },
  };
  const daily = await Promise.all([inventory.claimDaily('fixture'), inventory.claimDaily('fixture')]);
  assert.equal(daily.filter(d => d.claimed).length, 2);
  assert.equal(updates.every(u => Object.keys(u.query).length === 1), true);
  results.push({ id: 'S01', finding: 'Duas requisições com a mesma leitura concedem a diária: +6 baús e +2 chaves; filtro da gravação contém apenas userId.' });
  mock('src/database/services/UserInventoryService.js', { spendKeyAndChest: async () => ({ keys: 0 }), addInventory: async () => { throw new Error('Não esperado'); } });
  mock('src/database/services/SkinService.js', {
    getSkinsQuantity: async () => ({ totalSkins: 1, legacySkins: 1, epicSkins: 0, legendarySkins: 0, ultimateSkins: 0, mythicSkins: 0, transcendentSkins: 0 }),
    getSkinsId: async () => [1], getSkinInfo: async () => ({ id: 1, name: 'Fixture', rarity: 'legacy' }),
    addSkinToInventory: async () => null, // contrato real do service em falha de persistência
  });
  const { rollSkin } = require(path.join(api, 'src/utils/gachaService'));
  assert.equal((await rollSkin('fixture', 'hextechChests')).skinId, 1);
  results.push({ id: 'E02', finding: 'rollSkin retorna prêmio quando addSkinToInventory retorna null; débito não é reembolsado nesse caso.' });
  const stateHelper = require(path.join(api, 'src/oauthProviders/state'));
  const state = stateHelper.signState({ origin: 'http://localhost:5173', issuedAt: Date.now(), intent: 'login' });
  mock('src/oauthProviders/index.js', { getProvider: () => ({ name: 'discord', exchangeCode: async () => ({ accessToken: 'fixture', refreshToken: 'fixture', expiresIn: 60 }), getProfile: async () => ({ providerId: 'fixture-discord', email: 'fixture@example.invalid', emailVerified: true }) }) });
  mock('src/database/services/DashboardAccountService.js', {
    getDashboardAccountByProviderId: async () => null,
    getDashboardAccountByEmail: async () => ({ accountId: 'fixture', email: 'fixture@example.invalid', firstName: 'Fixture', lastName: 'Only', banned: true, blocked: true, password: 'fixture-hash' }),
    linkOAuthProvider: async () => {}, update: async () => {},
  });
  const callback = require(path.join(api, 'src/routes/expapi/Oauth2/authCallback'));
  let redirect = '', cookieCreated = false;
  await callback.execute({ params: { provider: 'discord' }, query: { code: 'fixture-code', state }, cookies: {}, headers: {}, ip: '127.0.0.1' }, {
    cookie() { cookieCreated = true; }, redirect(url) { redirect = url; }, status() { return this; }, send() {},
  });
  assert.equal(cookieCreated, true);
  assert.equal(new URL(redirect).pathname, '/oauth/complete');
  results.push({ id: 'S04/S05', finding: 'Callback sem cookie da transação aceita state assinado e emite sessão para conta banida/bloqueada encontrada pelo fallback de email. Rotas com checagem de conta ainda podem recusá-la.' });
  const scheduler = fs.readFileSync(path.join(root, 'lumina-bot/src/utils/services/PunishmentScheduler.js'), 'utf8');
  assert.equal(scheduler.includes("collection: 'punishlists'"), true);
  assert.equal(fs.existsSync(path.join(root, 'lumina-bot/src/utils/utils/services/LuminaApiService.js')), false);
  results.push({ id: 'E03', finding: 'Scheduler aponta para punishlists, diferente de banlists/mutelists/warnlists; require relativo de LuminaApiService não resolve.' });
  fs.writeFileSync(path.join(__dirname, 'evidencias/reproducoes.json'), JSON.stringify({ scope: 'isolated controlled dependencies; no live exploit', results }, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
