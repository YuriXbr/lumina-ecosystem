// Inspeção autorizada, somente leitura. Não importa serviços Mongoose nem cria índices.
// Executar da raiz: node docs/auditoria-2026-10-14/inspecionar-mongo.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const { MongoClient } = require(path.join(root, 'lumina-api/node_modules/mongodb'));
const dotenv = require(path.join(root, 'lumina-api/node_modules/dotenv'));
const { mongoSchema } = require(path.join(root, 'lumina-api/src/database/schema'));
const envFile = path.join(root, 'lumina-api/.env');
const parsed = fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile)) : {};
const uri = process.env.MONGODB_URI || parsed.MONGODB_URI;
if (!uri || uri.startsWith('encrypted:')) {
  console.error('MONGODB_URI ausente ou criptografada. Fornecer pela variável de ambiente, sem imprimir o valor.');
  process.exit(1);
}
const fieldAllowlist = new Set([
  '_id', '__v', 'discordAvatar', 'memberCount', 'commandsEnabled', 'autoMessages',
  'blockedUsers', 'blockedRoles', 'gachaEnabled', 'gachaChestsEnabled', 'type',
  ...Object.values(mongoSchema).flatMap(s => Object.keys(s)),
]);
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000, maxPoolSize: 2, appName: 'lumina-readonly-audit' });
const result = { capturedAt: new Date().toISOString(), mode: 'read-only', collections: [], integrity: {} };
const opts = { maxTimeMS: 10000, allowDiskUse: false };
async function scalar(collection, pipeline) {
  const values = await collection.aggregate([...pipeline, { $count: 'count' }], opts).toArray();
  return values[0]?.count || 0;
}
async function inspect() {
  await client.connect();
  const db = client.db(); // Nome resolvido da URI; não registra URI, hostname ou credenciais.
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const names = new Set(collections.map(c => c.name));
  for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    if (name.startsWith('system.')) continue;
    const col = db.collection(name);
    const entry = { name };
    try {
      entry.count = await col.countDocuments({}, { maxTimeMS: 10000 });
      entry.indexes = (await col.listIndexes().toArray()).map(i => ({ name: i.name, key: i.key, unique: !!i.unique, sparse: !!i.sparse, ...(i.expireAfterSeconds !== undefined ? { expireAfterSeconds: i.expireAfterSeconds } : {}), ...(i.partialFilterExpression ? { partialFilterExpression: i.partialFilterExpression } : {}) }));
      entry.sampleLimit = 1000;
      const fields = await col.aggregate([
        { $limit: entry.sampleLimit },
        { $project: { fields: { $objectToArray: '$$ROOT' } } },
        { $unwind: '$fields' },
        { $group: { _id: { field: '$fields.k', type: { $type: '$fields.v' } }, occurrences: { $sum: 1 } } },
        { $sort: { '_id.field': 1, '_id.type': 1 } },
      ], opts).toArray();
      entry.fields = fields.filter(f => fieldAllowlist.has(f._id.field)).map(f => ({ field: f._id.field, type: f._id.type, occurrences: f.occurrences }));
      entry.unlistedTopLevelFields = fields.filter(f => !fieldAllowlist.has(f._id.field)).length;
    } catch (e) { entry.error = e.codeName || e.name; }
    result.collections.push(entry);
  }
  if (names.has('dashboardaccounts')) {
    const col = db.collection('dashboardaccounts');
    result.integrity.accountsWithoutUsername = await col.countDocuments({ $or: [{ username: '' }, { username: null }, { username: { $exists: false } }] }, { maxTimeMS: 10000 });
    result.integrity.duplicateNormalizedUsernames = await scalar(col, [ { $match: { usernameLower: { $type: 'string', $ne: '' } } }, { $group: { _id: '$usernameLower', n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } } ]);
    result.integrity.duplicateProviderIds = await scalar(col, [ { $match: { 'authProviders.discord.providerId': { $type: 'string', $ne: '' } } }, { $group: { _id: '$authProviders.discord.providerId', n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } } ]);
  }
  if (names.has('userbadges')) {
    const col = db.collection('userbadges');
    result.integrity.duplicateBadgePairs = await scalar(col, [ { $group: { _id: { userEmail: '$userEmail', badgeCode: '$badgeCode' }, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } } ]);
    if (names.has('dashboardaccounts')) result.integrity.badgesWithoutAccount = await scalar(col, [ { $lookup: { from: 'dashboardaccounts', localField: 'userEmail', foreignField: 'email', as: 'account' } }, { $match: { account: { $size: 0 } } } ]);
    if (names.has('badges')) result.integrity.redemptionsWithoutBadge = await scalar(col, [ { $lookup: { from: 'badges', localField: 'badgeCode', foreignField: 'code', as: 'badge' } }, { $match: { badge: { $size: 0 } } } ]);
  }
  if (names.has('inventories')) {
    const col = db.collection('inventories');
    result.integrity.negativeInventoryBalances = await col.countDocuments({ $or: ['keys', 'hextechChests', 'masterWorkChests'].map(f => ({ [f]: { $lt: 0 } })) }, { maxTimeMS: 10000 });
    if (names.has('dashboardaccounts')) result.integrity.inventoriesWithoutLinkedDashboard = await scalar(col, [ { $lookup: { from: 'dashboardaccounts', localField: 'userId', foreignField: 'discordOauth2Id', as: 'account' } }, { $match: { account: { $size: 0 } } } ]);
  }
  result.catalogArrayShapes = {};
  for (const [collection, field] of [['skinsidlists', 'skinLines'], ['universes', 'skinsSets'], ['inventories', 'skins']]) {
    if (!names.has(collection)) continue;
    result.catalogArrayShapes[`${collection}.${field}`] = await db.collection(collection).aggregate([
      { $unwind: `$${field}` },
      { $group: { _id: { type: { $type: `$${field}` } }, occurrences: { $sum: 1 } } },
    ], opts).toArray();
  }
  for (const [collection, field] of [['skinsidlists', 'championId'], ['skins', 'championId']]) {
    if (!names.has(collection) || !names.has('champions')) continue;
    result.integrity[`${collection}WithoutChampion`] = await scalar(db.collection(collection), [
      { $lookup: { from: 'champions', localField: field, foreignField: 'championId', as: 'champion' } },
      { $match: { champion: { $size: 0 } } },
    ]);
  }
  fs.writeFileSync(path.join(__dirname, 'evidencias/mongo-metadata.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ collections: result.collections.map(c => ({ name: c.name, count: c.count, indexes: c.indexes?.map(i => i.name), error: c.error })), integrity: result.integrity }, null, 2));
}
inspect().catch(e => { console.error('Falha na inspeção:', e.codeName || e.name); process.exitCode = 1; }).finally(() => client.close());
