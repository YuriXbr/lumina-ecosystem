'use strict';
jest.mock('../../src/logger/logger',()=>({addLog:jest.fn(),routeError:jest.fn(({res,status=500,errorCode,userMsg})=>res.status(status).json({error:userMsg,code:errorCode})),requestLogger:()=>((req,res,next)=>next()),forceSendLogs:jest.fn(),sendErrorEmbed:jest.fn()}));
const crypto=require('node:crypto');
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const consoleService=require('../../src/utils/botConsole');
const guilds=require('../../src/database/services/GuildService');
const {accountDto}=require('../../src/utils/accountDto');
let replica;
jest.setTimeout(180000);
const botId='771421826974089236',workerId=crypto.randomUUID();
const status={botId,ready:true,guildCount:2,pingMs:42,uptimeSeconds:120,memoryMb:60};
const ingest=(extra={})=>consoleService.ingest({workerId,status,events:[],...extra});
beforeAll(async()=>{
 process.env.DISCORD_CLIENT_ID='771421826974089236';
 process.env.DISCORD_CLIENT_SECRET='isolated-discord-provider-secret';
 process.env.DISCORD_AUTH_REDIRECT_URI='https://api-bot.luminasink.com/expapi/oauth2/discord/auth/callback';
 replica=await MongoMemoryReplSet.create({instanceOpts:[{launchTimeout:60000}],replSet:{count:1},binary:{version:'8.0.17'}});
 process.env.MONGODB_URI=replica.getUri('lumina_discord_console_test');
 await guilds.connect();await Promise.all([guilds.model.init(),consoleService.events.model.init(),consoleService.runtime.model.init(),consoleService.jobs.model.init()]);
});
afterAll(async()=>{await mongoose.disconnect();await replica?.stop();});
beforeEach(async()=>{await Promise.all([consoleService.events.model.deleteMany({}),consoleService.runtime.model.deleteMany({}),consoleService.jobs.model.deleteMany({})]);});
test('a startup sync creates missing guilds and preserves existing configuration under concurrent retries',async()=>{
 const metadata={guildId:botId,ownerId:'771421826974089237',guildName:'Servidor durante queda',memberCount:42};
 await Promise.all(Array.from({length:10},()=>guilds.upsertMetadata(metadata)));
 expect(await guilds.model.countDocuments({guildId:botId})).toBe(1);
 await guilds.model.updateOne({guildId:botId},{$set:{prefix:'L?',moderationEnabled:true,autoMessages:[{id:'existing',channelId:'771421826974089238',message:'Keep me',intervalMinutes:10,enabled:true}],botPresent:false}});
 await guilds.upsertMetadata({...metadata,guildName:'Novo nome',memberCount:43});
 const guild=await guilds.getGuildData(botId);
 expect(guild).toMatchObject({guildReferenceName:'Novo nome',memberCount:43,prefix:'L?',moderationEnabled:true,botPresent:true});
 expect(guild.autoMessages[0].message).toBe('Keep me');
});
test('sync refuses injected identifiers and invalid counts before any write',async()=>{
 await expect(guilds.upsertMetadata({guildId:{$ne:null},ownerId:botId,guildName:'No'})).rejects.toMatchObject({status:400});
 await expect(guilds.upsertMetadata({guildId:botId,ownerId:botId,guildName:'No',memberCount:-1})).rejects.toMatchObject({status:400});
});
test('session DTO keeps Discord scope and never exposes access/refresh tokens or password',()=>{
 const dto=accountDto({discordOauth2Id:botId,discordOauth2TokenScope:'identify guilds guilds.members.read',password:'private-hash',discordOauth2Token:'private-token',discordOauth2RefreshToken:'private-refresh'});
 expect(dto.discordOauth2TokenScope).toContain('guilds');expect(dto.discordNeedsReauth).toBe(false);
 expect(JSON.stringify(dto)).not.toMatch(/private-/);
 expect(accountDto({discordOauth2Id:botId}).discordNeedsReauth).toBe(false);
 expect(accountDto({discordOauth2Id:botId,discordOauth2TokenScope:'identify email'}).discordNeedsReauth).toBe(true);
});
test('retrying the same log batch does not duplicate events and produces real bot heartbeat metrics',async()=>{
 const event={eventId:crypto.randomUUID(),level:'info',message:'Bot started',timestamp:new Date().toISOString()};
 await ingest({events:[event]});await ingest({events:[event]});
 const view=await consoleService.snapshot();expect(view.events).toHaveLength(1);expect(view.workers[0]).toMatchObject({guildCount:2,pingMs:42});
 expect(view).not.toHaveProperty('memory');
});
test('logs are incremental with cursor pagination and no loss across multiple pages',async()=>{
 for(let i=0;i<3;i++)await ingest({events:Array.from({length:50},(_,j)=>({eventId:crypto.randomUUID(),level:'info',message:`${i}:${j}`,timestamp:new Date().toISOString()}))});
 const first=await consoleService.events.model.findOne().sort({_id:1}).lean();
 const next=await consoleService.snapshot(String(first._id));expect(next.events).toHaveLength(100);expect(next.hasMore).toBe(true);
 const last=await consoleService.snapshot(next.cursor);expect(last.events).toHaveLength(49);expect(last.hasMore).toBe(false);
 expect(new Set([...next.events,...last.events].map(e=>e.id)).size).toBe(149);
});
test('redacts credentials and omits expired logs and stale heartbeat before TTL deletion',async()=>{
 process.env.CONSOLE_TEST_SECRET='dont-leak-this-secret';
 await ingest({events:[{eventId:crypto.randomUUID(),level:'error',message:'token=dont-leak-this-secret Bearer sensitive',timestamp:new Date().toISOString()}]});
 expect((await consoleService.snapshot()).events[0].message).not.toMatch(/dont-leak|sensitive/);
 await consoleService.events.model.updateMany({},{$set:{expiresAt:new Date(Date.now()-1)}});
 await consoleService.runtime.model.updateMany({},{$set:{lastSeenAt:new Date(Date.now()-46000)}});
 const view=await consoleService.snapshot();expect(view.events).toHaveLength(0);expect(view.workers).toHaveLength(0);delete process.env.CONSOLE_TEST_SECRET;
});
test('only diagnostic commands are accepted; retries remain idempotent',async()=>{
 const requestId=crypto.randomUUID();
 await expect(consoleService.enqueue('admin',{command:'eval process.env',requestId})).rejects.toMatchObject({status:400});
 await consoleService.enqueue('admin',{command:'ping',requestId});await consoleService.enqueue('admin',{command:'ping',requestId});
 expect(await consoleService.jobs.model.countDocuments()).toBe(1);
 await expect(consoleService.enqueue('another-admin',{command:'ping',requestId})).rejects.toMatchObject({status:400});
});
test('command lease is exclusive and forged result cannot complete it',async()=>{
 const requestId=crypto.randomUUID();await consoleService.enqueue('admin',{command:'status',requestId});
 const first=await ingest();expect(first.commands).toHaveLength(1);expect((await ingest({workerId:crypto.randomUUID()})).commands).toHaveLength(0);
 const result={...first.commands[0],ok:true,output:'Online'};
 await ingest({workerId:crypto.randomUUID(),results:[result]});
 expect((await consoleService.jobs.model.findOne({requestId})).state).toBe('running');
 await ingest({results:[result]});expect((await consoleService.jobs.model.findOne({requestId})).state).toBe('completed');
 expect((await consoleService.snapshot()).commands[0]).not.toHaveProperty('leaseToken');
});
test('abandoned lease can be recovered but old lease cannot overwrite the result',async()=>{
 const requestId=crypto.randomUUID();await consoleService.enqueue('admin',{command:'ping',requestId});const a=(await ingest()).commands[0];
 await consoleService.jobs.model.updateOne({requestId},{$set:{leaseUntil:new Date(Date.now()-1)}});
 const other=crypto.randomUUID(),b=(await ingest({workerId:other})).commands[0];expect(b.leaseToken).not.toBe(a.leaseToken);
 await ingest({results:[{...a,ok:true,output:'old'}]});
 expect((await consoleService.jobs.model.findOne({requestId})).state).toBe('running');
 await ingest({workerId:other,results:[{...b,ok:true,output:'new'}]});
 expect((await consoleService.jobs.model.findOne({requestId})).output).toBe('new');
});
test('offline command expires and malformed cursors or oversized ingestion are rejected',async()=>{
 const requestId=crypto.randomUUID();await consoleService.enqueue('admin',{command:'ping',requestId});
 await consoleService.jobs.model.updateOne({requestId},{$set:{deadline:new Date(Date.now()-1)}});
 expect((await ingest()).commands).toHaveLength(0);expect((await consoleService.snapshot()).commands[0].state).toBe('expired');
 await expect(consoleService.snapshot({$ne:null})).rejects.toMatchObject({status:400});
 await expect(ingest({events:Array(101).fill({})})).rejects.toMatchObject({status:400});
});
test('HTTP console enforces internal keys, current admin role, and real CSRF',async()=>{
 const request=require('supertest'),app=require('../../index');
 const accounts=require('../../src/database/services/DashboardAccountService');
 const {issueSessionToken}=require('../../src/utils/authHelpers');
 const account=await accounts.model.create({accountId:'console-http-admin',email:'console-admin@example.test',firstName:'Test',lastName:'Admin',accessType:'admin'});
 const token=issueSessionToken(account),auth={Authorization:'Bearer '+token};
 expect((await request(app).get('/expapi/v1/admin/bot-console')).status).toBe(401);
 const adminView=await request(app).get('/expapi/v1/admin/bot-console').set(auth);
 expect(adminView.status).toBe(200);expect(adminView.headers['cache-control']).toContain('no-store');
 expect((await request(app).post('/expapi/internal/bot-console').send({workerId,status,events:[]})).status).toBe(401);
 expect((await request(app).post('/expapi/internal/bot-console').set('internal-key',process.env.INTERNAL_API_KEY).set('X-Lumina-API-Key',process.env.LUMINA_API_KEY).send({workerId,status,events:[]})).status).toBe(200);
 expect((await request(app).post('/expapi/v1/admin/bot-console/commands').set(auth).send({command:'status',requestId:crypto.randomUUID()})).status).toBe(403);
 const csrf=await require('../helpers/testUtils').getCsrfTokens(app);
 const result=await request(app).post('/expapi/v1/admin/bot-console/commands').set({...auth,...csrf.headers}).send({command:'status',requestId:crypto.randomUUID()});
 expect(result.status).toBe(202);
 await accounts.model.updateOne({accountId:account.accountId},{$set:{accessType:'user'}});
 expect((await request(app).get('/expapi/v1/admin/bot-console').set(auth)).status).toBe(403);
});
test('ordinary Discord login does not force a new consent; explicit relink does',()=>{
 const provider=require('../../src/oauthProviders/discordProvider');
 expect(new URL(provider.getAuthorizationUrl('signed-state')).searchParams.has('prompt')).toBe(false);
 expect(new URL(provider.getAuthorizationUrl('signed-state',{forceConsent:true})).searchParams.get('prompt')).toBe('consent');
});
test('legacy email-only session resolves the verified account ID before unlinking Discord',async()=>{
 const accounts=require('../../src/database/services/DashboardAccountService');
 const request=require('supertest'),app=require('../../index');
 const decoy=await accounts.model.create({accountId:'legacy-decoy',email:'legacy-decoy@example.test',firstName:'Test',lastName:'Decoy',password:'test-hash',discordOauth2Id:'771421826974089239'});
 const target=await accounts.model.create({accountId:'legacy-target',email:'legacy-target@example.test',firstName:'Test',lastName:'Target',password:'test-hash',discordOauth2Id:'771421826974089240'});
 const token=require('jsonwebtoken').sign({email:target.email},process.env.JWT_SECRET,{expiresIn:'5m'});
 const auth={Authorization:'Bearer '+token};
 const checked=await require('../../src/utils/authHelpers').verifyRequestAuthWithAccountCheck({headers:{authorization:auth.Authorization}});
 expect(checked.user.accountId).toBe(target.accountId);
 const csrf=await require('../helpers/testUtils').getCsrfTokens(app);
 const response=await request(app).post('/expapi/v1/unlink-discord').set({...auth,...csrf.headers}).send({});
 expect(response.status).toBe(200);
 expect((await accounts.model.findOne({accountId:target.accountId})).discordOauth2Id).toBe('');
 expect((await accounts.model.findOne({accountId:decoy.accountId})).discordOauth2Id).toBe(decoy.discordOauth2Id);
});
async function startLink(account) {
 const request=require('supertest'),app=require('../../index');
 const token=require('../../src/utils/authHelpers').issueSessionToken(account);
 const response=await request(app).get('/expapi/oauth2/discord/auth/start?intent=link&origin=https://bot.luminasink.com').set('Cookie','lumina_token='+token);
 expect(response.status).toBe(302);
 const nonceCookie=response.headers['set-cookie'].find(c=>c.startsWith('lumina_oauth=')).split(';')[0];
 return{state:new URL(response.headers.location).searchParams.get('state'),cookies:'lumina_token='+token+'; '+nonceCookie};
}
function mockDiscordExchange(){
 const provider=require('../../src/oauthProviders/discordProvider');
 jest.spyOn(provider,'exchangeCode').mockResolvedValue({accessToken:'isolated-access',refreshToken:'isolated-refresh',expiresIn:3600,scope:'identify email guilds guilds.members.read'});
 jest.spyOn(provider,'getProfile').mockResolvedValue({providerId:'771421826974089249',username:'testdiscord',emailVerified:true,email:'oauth-link@example.test'});
}
test('revocation between link start and callback prevents binding a Discord identity',async()=>{
 const accounts=require('../../src/database/services/DashboardAccountService'),request=require('supertest'),app=require('../../index');
 const account=await accounts.model.create({accountId:'revoked-oauth',email:'revoked-oauth@example.test',firstName:'Test',lastName:'OAuth',password:'test-hash'});
 const flow=await startLink(account);mockDiscordExchange();
 await accounts.model.updateOne({accountId:account.accountId},{$inc:{sessionVersion:1}});
 const response=await request(app).get('/expapi/oauth2/discord/auth/callback').query({code:'isolated-code',state:flow.state}).set('Cookie',flow.cookies);
 expect(response.headers.location).toContain('oauthError=link_no_account');
 expect((await accounts.model.findOne({accountId:account.accountId})).discordOauth2Id||'').toBe('');
});
test('successful link returns a browser-bound single-use code and keeps tokens encrypted',async()=>{
 const accounts=require('../../src/database/services/DashboardAccountService'),request=require('supertest'),app=require('../../index');
 const account=await accounts.model.create({accountId:'valid-oauth',email:'valid-oauth@example.test',firstName:'Test',lastName:'OAuth',password:'test-hash'});
 const flow=await startLink(account);mockDiscordExchange();
 const response=await request(app).get('/expapi/oauth2/discord/auth/callback').query({code:'isolated-code',state:flow.state}).set('Cookie',flow.cookies);
 const redirect=new URL(response.headers.location),code=new URLSearchParams(redirect.hash.slice(1)).get('code');
 expect(code).toMatch(/^[\w-]{43}$/);expect(redirect.hash).not.toContain('token=');
 const updated=await accounts.model.findOne({accountId:account.accountId});expect(updated.discordOauth2Token).toMatch(/^v1\./);expect(updated.discordOauth2TokenScope).toContain('guilds.members.read');
 const exchangeCookie=response.headers['set-cookie'].find(c=>c.startsWith('lumina_oauth_exchange=')).split(';')[0];
 const exchange=await request(app).post('/expapi/v1/exchange-token').set('Origin','https://bot.luminasink.com').set('Cookie',exchangeCookie).send({code});
 expect(exchange.status).toBe(200);expect(exchange.body.user.discordNeedsReauth).toBe(false);expect(exchange.body).not.toHaveProperty('token');
 expect((await request(app).post('/expapi/v1/exchange-token').set('Origin','https://bot.luminasink.com').set('Cookie',exchangeCookie).send({code})).status).toBe(401);
 expect((await request(app).get('/expapi/oauth2/discord/auth/callback').query({code:'isolated-code',state:flow.state}).set('Cookie',flow.cookies)).status).toBe(400);
});
