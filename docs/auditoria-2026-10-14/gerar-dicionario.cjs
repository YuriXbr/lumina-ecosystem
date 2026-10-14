'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const { mongoSchema } = require(path.join(root, 'lumina-api/src/database/schema'));
const live = JSON.parse(fs.readFileSync(path.join(__dirname, 'evidencias/mongo-metadata.json'), 'utf8'));
const mappings = {
  bot: 'bots', inventory: 'inventories', guilds: 'guilds', punishList: ['banlists', 'mutelists', 'warnlists'],
  userHistory: 'userhistories', skins: 'skins', skinsIdList: 'skinsidlists', champions: 'champions',
  skinlines: 'skinslines', universes: 'universes', dashboardAccounts: 'dashboardaccounts',
  newsPosts: 'newsposts', badges: 'badges', userBadges: 'userbadges', apiLogs: 'apilogs', apiCache: 'apicaches', ipRateLimits: 'ipratelimits',
};
const md = ['# Dicionário de dados reconstruído', '', 'Data: 14/10/2026. Fonte: schema.js + metadados MongoDB autorizados. Todos os campos declarados foram incluídos. O arquivo não contém valores de usuários, tokens ou segredos.', '', 'Os tipos observados vêm de até 1.000 documentos por coleção; ausência na amostra não prova ausência em toda a coleção. `Object`/`Array` são campos flexíveis, sem contrato interno declarado. `unique` no schema representa um índice pretendido, não um validador; os índices reais estão listados separadamente. `_id` (ObjectId, PK) e `__v` (inteiro de versão) são campos adicionados pelo Mongoose.', ''];
const schemas = [];
for (const [schemaName, schema] of Object.entries(mongoSchema)) {
  const names = [].concat(mappings[schemaName]);
  md.push(`## ${schemaName} → ${names.join(', ')}`, '', '| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |', '|---|---|---|---|---|');
  const fields = [];
  for (const [name, def] of Object.entries(schema)) {
    const observed = [...new Set(live.collections.filter(c => names.includes(c.name)).flatMap(c => c.fields || []).filter(f => f.field === name).map(f => f.type))];
    const field = { name, type: def.type?.name || 'Unknown', required: !!def.required, unique: !!def.unique, sparse: !!def.sparse, indexed: !!def.index, observedTypes: observed };
    fields.push(field);
    md.push(`| ${name} | ${field.type} | ${field.required ? 'sim' : 'não'} | ${field.unique ? 'UNIQUE' + (field.sparse ? ' sparse' : '') : field.indexed ? 'não único' : '—'} | ${observed.join(', ') || 'não observado'} |`);
  }
  for (const name of names) {
    const col = live.collections.find(c => c.name === name);
    md.push('', `Índices reais de **${name}** (${col?.count ?? '?'} documentos):`, '');
    for (const i of col?.indexes || []) md.push(`- ${i.name}: ${JSON.stringify(i.key)}${i.unique ? ', UNIQUE' : ''}${i.sparse ? ', sparse' : ''}${i.expireAfterSeconds !== undefined ? ', TTL ' + i.expireAfterSeconds + ' segundos' : ''}${i.partialFilterExpression ? ', filtro parcial ' + JSON.stringify(i.partialFilterExpression) : ''}.`);
    const extra = [...new Set((col?.fields || []).filter(f => !schema[f.field] && !['_id', '__v'].includes(f.field)).map(f => f.field))];
    if (extra.length) md.push('', `Campos observados não declarados neste schema: ${extra.join(', ')}.`);
  }
  md.push(''); schemas.push({ schemaName, collections: names, fields });
}
fs.writeFileSync(path.join(__dirname, 'DICIONARIO-DADOS.md'), md.join('\n').trimEnd() + '\n');
fs.writeFileSync(path.join(__dirname, 'evidencias/schema-declarado.json'), JSON.stringify({ schemas }, null, 2) + '\n');
const validation = { capturedAt: new Date().toISOString(), node: process.version, dependencies: {}, tests: {} };
for (const name of ['lumina-api', 'lumina-dashboard', 'lumina-bot']) {
  const pkg = require(path.join(root, name, 'package.json'));
  const lock = require(path.join(root, name, 'package-lock.json'));
  validation.dependencies[name] = { declared: pkg.dependencies, devDeclared: pkg.devDependencies, lockedVersions: Object.fromEntries(Object.entries(lock.packages).filter(([p]) => p.startsWith('node_modules/') && p.split('node_modules/').length === 2).map(([p, v]) => [p.slice(13), v.version])) };
  for (const [suffix, key] of [['deps', 'allAudit'], ['prod', 'productionAudit']]) {
    const audit = JSON.parse(fs.readFileSync(path.join(process.env.TEMP, `${name}-audit-${suffix}.json`), 'utf8').replace(/^\uFEFF/, ''));
    validation.dependencies[name][key] = { metadata: audit.metadata, vulnerabilities: audit.vulnerabilities, error: audit.error };
  }
}
const tests = JSON.parse(fs.readFileSync(path.join(process.env.TEMP, 'lumina-api-audit-tests.json'), 'utf8'));
validation.tests.api = { suites: tests.numTotalTestSuites, passedSuites: tests.numPassedTestSuites, failedSuites: tests.numFailedTestSuites, total: tests.numTotalTests, passed: tests.numPassedTests, failed: tests.numFailedTests, pending: tests.numPendingTests, failedFiles: tests.testResults.filter(t => t.status !== 'passed').map(t => ({ file: path.relative(root, t.name), assertions: t.assertionResults.filter(a => a.status === 'failed').map(a => ({ title: a.fullName, error: a.failureMessages[0]?.replace(/\u001b\[[0-9;]*m/g, '').split('\n').slice(0, 6).join('\n') })), loadFailure: !t.assertionResults.length ? t.message?.replace(/\u001b\[[0-9;]*m/g, '').split('\n').slice(0, 12).join('\n') : undefined })) };
validation.tests.dashboard = { build: 'passed', javascriptKB: 718.18, javascriptGzipKB: 194.34, lint: 'failed: missing eslint.config.js', unit: 'not executable: vitest, jsdom and testing-library absent from package.json/install', browser: 'home/login/members, anonymous, API isolated; default narrow viewport and 1440x900 desktop' };
validation.tests.bot = { automatedSuite: 'absent: npm test is placeholder' };
fs.writeFileSync(path.join(__dirname, 'evidencias/validacao.json'), JSON.stringify(validation, null, 2) + '\n');
console.log(JSON.stringify({ schemas: schemas.length, fields: schemas.reduce((n, s) => n + s.fields.length, 0), collections: live.collections.length }));
