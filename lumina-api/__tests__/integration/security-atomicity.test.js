'use strict';
jest.mock('../../src/logger/logger',()=>({addLog:jest.fn(),routeError:jest.fn(({res,status=500,errorCode,userMsg})=>res.status(status).json({error:userMsg,code:errorCode})),requestLogger:()=>((req,res,next)=>next()),forceSendLogs:jest.fn(),sendErrorEmbed:jest.fn()}));
jest.mock('../../src/email/mailer',()=>({assertConfigured:jest.fn(),sendAccountEmail:jest.fn().mockResolvedValue({messageId:'isolated-test'})}));
process.env.EMAIL_CODE_SECRET='isolated-email-test-secret-32-characters-only';
const emailCodes=require('../../src/utils/emailCodes');
const mailer=require('../../src/email/mailer');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const inventory = require('../../src/database/services/UserInventoryService');
const badges = require('../../src/database/services/BadgeService');
const userBadges = require('../../src/database/services/UserBadgeService');
const { redeemBadge } = require('../../src/utils/badgeRedemption');
const sessions = require('../../src/utils/sessionStore');
const { issueSessionToken, verifyRequestAuthWithAccountCheck } = require('../../src/utils/authHelpers');
const accounts = require('../../src/database/services/DashboardAccountService');
let replica;
jest.setTimeout(180000);
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ instanceOpts:[{launchTimeout:60000}], replSet: { count: 1 }, binary: { version: '8.0.17' } });
  process.env.MONGODB_URI = replica.getUri('lumina_security_test');
  await inventory.connect();
  await Promise.all([inventory.model.init(), badges.model.init(), userBadges.model.init(), accounts.model.init(),emailCodes.states.model.init(),emailCodes.rejections.model.init()]);
});
afterAll(async () => { await mongoose.disconnect(); if (replica) await replica.stop(); });
test('40 concurrent daily claims issue exactly one reward', async () => {
  const id = '771421826974089236';
  const before = await inventory.ensureInventory(id);
  const results = await Promise.all(Array.from({ length: 40 }, () => inventory.claimDaily(id)));
  expect(results.filter(r => r.claimed)).toHaveLength(1);
  const after = await inventory.getInventory(id);
  expect(after.keys - before.keys).toBe(1);
  expect(after.hextechChests - before.hextechChests).toBe(3);
  expect(after.dailyRewardStreak).toBe(1);
});
test('40 concurrent chest openings cannot overspend or lose awards', async () => {
  const id = '771421826974089237';
  await inventory.ensureInventory(id);
  await inventory.model.updateOne({ userId:id }, { $set: { keys: 5, hextechChests: 5, skins: [] } });
  const results = await Promise.all(Array.from({ length: 40 }, () => inventory.awardSkinAndSpend(id,'hextechChests',1234)));
  expect(results.filter(Boolean)).toHaveLength(5);
  const after = await inventory.getInventory(id);
  expect(after.keys).toBe(0); expect(after.hextechChests).toBe(0); expect(after.skins).toHaveLength(5);
});
test('badge quota is enforced across concurrent different accounts', async () => {
  await badges.model.create({ code:'LIMITED',name:'Limited',maxRedemptions:2 });
  const results = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => redeemBadge({email:`u${i}@example.test`,accountId:`u${i}`,accessType:'user'},'LIMITED','dashboard')));
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(2);
  expect(await userBadges.model.countDocuments({ badgeCode:'LIMITED' })).toBe(2);
});
test('OAuth exchange is browser bound, origin bound and single use', async () => {
  const code = await sessions.createExchange('test-session','https://bot.luminasink.com','browser-secret');
  expect(await sessions.consumeExchange(code,'https://evil.example','browser-secret')).toBeNull();
  expect(await sessions.consumeExchange(code,'https://bot.luminasink.com','wrong-browser')).toBeNull();
  expect((await sessions.consumeExchange(code,'https://bot.luminasink.com','browser-secret')).token).toBe('test-session');
  expect(await sessions.consumeExchange(code,'https://bot.luminasink.com','browser-secret')).toBeNull();
});
test('logout revocation and password version invalidate an otherwise valid JWT', async () => {
  const account = await accounts.model.create({accountId:'auth-test',email:'auth@example.test',firstName:'Test',lastName:'Account'});
  const token = issueSessionToken(account);
  const req = () => ({headers:{authorization:`Bearer ${token}`}});
  expect((await verifyRequestAuthWithAccountCheck(req())).error).toBeNull();
  await sessions.revokeToken(token,new Date(Date.now()+60000));
  expect((await verifyRequestAuthWithAccountCheck(req())).error.code).toBe('SESSION_REVOKED');
  const otherToken = issueSessionToken(account);
  await accounts.model.updateOne({accountId:'auth-test'},{$inc:{sessionVersion:1}});
  expect((await verifyRequestAuthWithAccountCheck({headers:{authorization:`Bearer ${otherToken}`}})).error.code).toBe('SESSION_REVOKED');
});

async function emailAccount(name) {
 return accounts.model.create({accountId:name,email:`${name}@example.test`,firstName:'Test',lastName:'Email',password:await require('bcryptjs').hash('OldPassword123',4)});
}
function lastCode() {
 const message=mailer.sendAccountEmail.mock.calls.at(-1)[0].message;
 return {code:/código ([A-Z2-9]{8})/.exec(message.text)[1],token:/token=([A-Za-z0-9_-]{43})/.exec(message.text)[1]};
}
test('email code has eight characters, a 15 minute TTL, no plaintext storage, and exactly one successful consumption',async()=>{
 const account=await emailAccount('verify-test');
 await emailCodes.requestCode(account.email,'verify');
 const {code}=lastCode();expect(code).toMatch(/^[A-Z2-9]{8}$/);
 const state=await emailCodes.states.model.findOne({accountId:account.accountId}).lean();
 expect(state.expiresAt-state.requestedAt).toBe(900000);expect(JSON.stringify(state)).not.toContain(code);
 const results=await Promise.allSettled(Array.from({length:10},()=>emailCodes.confirmCode({email:account.email,purpose:'verify',code})));
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect((await accounts.model.findOne({accountId:account.accountId})).emailVerified).toBe(true);
});
test('expired code is rejected even before MongoDB TTL removes the record',async()=>{
 const account=await emailAccount('expired-test');await emailCodes.requestCode(account.email,'verify');const {code}=lastCode();
 await emailCodes.states.model.updateOne({accountId:account.accountId},{$set:{expiresAt:new Date(Date.now()-1)}});
 await expect(emailCodes.confirmCode({email:account.email,purpose:'verify',code})).rejects.toMatchObject({code:'INVALID_EMAIL_CODE'});
});
test('five wrong attempts disable the correct code',async()=>{
 const account=await emailAccount('attempts-test');await emailCodes.requestCode(account.email,'verify');const {code}=lastCode();
 for(let i=0;i<5;i++)await expect(emailCodes.confirmCode({email:account.email,purpose:'verify',code:'00000000'})).rejects.toMatchObject({code:'INVALID_EMAIL_CODE'});
 await expect(emailCodes.confirmCode({email:account.email,purpose:'verify',code})).rejects.toMatchObject({code:'INVALID_EMAIL_CODE'});
});
test('older email rejection invalidates a newer code and blocks both purposes for a full day',async()=>{
 const account=await emailAccount('reject-test');await emailCodes.requestCode(account.email,'verify');const old=lastCode();
 await emailCodes.states.model.updateOne({accountId:account.accountId},{$set:{requestedAt:new Date(Date.now()-61000)}});
 await emailCodes.requestCode(account.email,'reset');const newer=lastCode();
 const result=await emailCodes.rejectCode(old.token);expect(new Date(result.blockedUntil).getTime()-Date.now()).toBeGreaterThan(86390000);
 await expect(emailCodes.confirmCode({email:account.email,purpose:'reset',code:newer.code,newPassword:'NewPassword123'})).rejects.toMatchObject({code:'INVALID_EMAIL_CODE'});
 const sent=mailer.sendAccountEmail.mock.calls.length;
 await emailCodes.requestCode(account.email,'verify');await emailCodes.requestCode(account.email,'reset');expect(mailer.sendAccountEmail.mock.calls).toHaveLength(sent);
 const state=await emailCodes.states.model.findOne({accountId:account.accountId});expect(state.purgeAt>state.blockedUntil).toBe(true);
 await expect(emailCodes.rejectCode(old.token)).rejects.toMatchObject({code:'INVALID_REJECTION'});
 await emailCodes.states.model.updateOne({accountId:account.accountId},{$set:{blockedUntil:new Date(Date.now()-1),requestedAt:new Date(Date.now()-61000)}});
 await emailCodes.requestCode(account.email,'verify');expect(mailer.sendAccountEmail.mock.calls).toHaveLength(sent+1);
});
test('reset changes the password and revokes previous sessions atomically',async()=>{
 const account=await emailAccount('reset-test');const token=issueSessionToken(account);
 await emailCodes.requestCode(account.email,'reset');const {code}=lastCode();
 await emailCodes.confirmCode({email:account.email,purpose:'reset',code,newPassword:'NewPassword123'});
 const updated=await accounts.model.findOne({accountId:account.accountId});expect(await require('bcryptjs').compare('NewPassword123',updated.password)).toBe(true);expect(updated.sessionVersion).toBe(1);
 expect((await verifyRequestAuthWithAccountCheck({headers:{authorization:`Bearer ${token}`}})).error.code).toBe('SESSION_REVOKED');
 await expect(emailCodes.confirmCode({email:account.email,purpose:'reset',code,newPassword:'OtherPassword123'})).rejects.toMatchObject({code:'INVALID_EMAIL_CODE'});
});
test('a password change invalidates a previously issued recovery code',async()=>{
 const account=await emailAccount('stale-reset');await emailCodes.requestCode(account.email,'reset');const {code}=lastCode();
 await accounts.model.updateOne({accountId:account.accountId},{$inc:{sessionVersion:1}});
 await expect(emailCodes.confirmCode({email:account.email,purpose:'reset',code,newPassword:'NewPassword123'})).rejects.toMatchObject({code:'INVALID_EMAIL_CODE'});
});
test('concurrent requests send only one email and unknown accounts send none',async()=>{
 const account=await emailAccount('request-race');
 await Promise.all(Array.from({length:20},()=>emailCodes.requestCode(account.email,'verify')));
 expect(mailer.sendAccountEmail.mock.calls).toHaveLength(1);
 await emailCodes.requestCode('unknown@example.test','reset');expect(mailer.sendAccountEmail.mock.calls).toHaveLength(1);
});

test('account cleanup removes dependent private records and respects cancellation',async()=>{
 const account=await emailAccount('closure-test');
 const discordId='771421826974089239';
 await accounts.model.updateOne({accountId:account.accountId},{$set:{discordOauth2Id:discordId,deletionScheduledFor:new Date(Date.now()-1000)}});
 await inventory.ensureInventory(discordId);
 await userBadges.model.create({userEmail:account.email,accountId:account.accountId,badgeCode:'CLOSURE'});
 await emailCodes.requestCode(account.email,'reset');
 const cancelled=await emailAccount('cancelled-closure');
 await accounts.model.updateOne({accountId:cancelled.accountId},{$set:{deletionScheduledFor:null}});
 const {purgeDueAccounts}=require('../../src/utils/accountCleanup');
 expect((await purgeDueAccounts()).processed).toBe(1);
 expect(await accounts.model.exists({accountId:account.accountId})).toBeNull();
 expect(await inventory.getInventory(discordId)).toBeNull();
 expect(await userBadges.model.exists({accountId:account.accountId})).toBeNull();
 expect(await emailCodes.states.model.exists({accountId:account.accountId})).toBeNull();
 expect(await accounts.model.exists({accountId:cancelled.accountId})).toBeTruthy();
});
test('punishment leases prevent two workers claiming the same expiry and preserve retry data',async()=>{
 const bans=require('../../src/database/services/BanListService');const mutes=require('../../src/database/services/MuteListService');const warns=require('../../src/database/services/WarnListService');
 await Promise.all([bans.model.init(),mutes.model.init(),warns.model.init()]);
 const job=await bans.model.create({guildId:'771421826974089236',targetId:'771421826974089238',reason:'Isolated test',staffId:'771421826974089239',endTime:new Date(Date.now()-1000)});
 const {claimPunishments,finishPunishment}=require('../../src/utils/punishmentJobs');
 const results=await Promise.all([claimPunishments(),claimPunishments()]);
 const claimed=results.flat().filter(j=>String(j._id)===String(job._id));expect(claimed).toHaveLength(1);expect(claimed[0].type).toBe('ban');
 expect(await finishPunishment({type:'ban',id:String(job._id),leaseToken:'wrong',success:true})).toBeNull();
 await finishPunishment({type:'ban',id:String(job._id),leaseToken:claimed[0].leaseToken,success:false,errorCode:'DISCORD_RETRY'});
 const updated=await bans.model.findById(job._id);expect(updated.endTime.getTime()).toBe(job.endTime.getTime());expect(updated.processedAt).toBeFalsy();expect(updated.nextAttemptAt>Date.now()).toBe(true);
});

test('password changes compare the original hash and return the version actually committed',async()=>{
 const account=await emailAccount('password-race');
 const read=jest.spyOn(accounts,'getDashboardAccountByAccountId').mockResolvedValue(account.toObject());
 let results;
 try {results=await Promise.allSettled([accounts.changePassword(account.accountId,'OldPassword123','RacePassword123'),accounts.changePassword(account.accountId,'OldPassword123','OtherPassword123')]);}finally{read.mockRestore();}
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect(results.find(r=>r.status==='rejected').reason.code).toBe('SESSION_CHANGED');
 expect(results.find(r=>r.status==='fulfilled').value.sessionVersion).toBe(1);
});
test('HTTP email flows require CSRF, hide account existence and never cancel through GET',async()=>{
 const request=require('supertest');const {getCsrfTokens}=require('../helpers/testUtils');
 const tasks=[];const telemetry=require('../../src/utils/telemetry');
 const background=jest.spyOn(telemetry,'background').mockImplementation(p=>{const guarded=p.catch(()=>{});tasks.push(guarded);return guarded;});
 try {
  const app=require('../../index');const prefix='/expapi/v1/account/email-code';
  expect((await request(app).post(prefix+'/request').send({email:'absent@example.test',purpose:'verify'})).status).toBe(403);
  const account=await emailAccount('http-email');await emailCodes.requestCode(account.email,'verify');const {code,token}=lastCode();
  const csrf=await getCsrfTokens(app);
  const known=await request(app).post(prefix+'/request').set(csrf.headers).send({email:account.email,purpose:'verify'});
  const unknown=await request(app).post(prefix+'/request').set(csrf.headers).send({email:'absent@example.test',purpose:'verify'});
  expect(known.status).toBe(202);expect(unknown.body).toEqual(known.body);expect(JSON.stringify(known.body)).not.toContain(code);
  const get=await request(app).get(prefix+'/reject').query({token});expect(get.status).toBe(404);
  expect((await emailCodes.states.model.findOne({accountId:account.accountId})).blockedUntil).toBeFalsy();
  const confirmed=await request(app).post(prefix+'/confirm').set(csrf.headers).send({email:account.email,purpose:'verify',code});expect(confirmed.status).toBe(200);
  expect((await request(app).post(prefix+'/confirm').set(csrf.headers).send({email:account.email,purpose:'verify',code})).status).toBe(400);
 }finally{await Promise.all(tasks);background.mockRestore();}
});
test('shared IP limiter permits exactly the quota under concurrent requests and fails closed',async()=>{
 const {ipRateLimiter}=require('../../src/utils/ipRateLimiter');const model=mongoose.model('ipRateLimits');await model.init();
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='development';
 try {
  let passed=0,blocked=0;const limiter=ipRateLimiter({max:5,windowMs:60000});
  await Promise.all(Array.from({length:40},()=>limiter({ip:'isolated-test',path:'/isolated-rate'},{setHeader(){},status(code){this.statusCode=code;return this;},json(){expect(this.statusCode).toBe(429);blocked++;}},()=>{passed++;})));
  expect(passed).toBe(5);expect(blocked).toBe(35);
  const fail=jest.spyOn(model,'findOneAndUpdate').mockRejectedValue(new Error('isolated outage'));
  let unavailable;
  try {await limiter({ip:'isolated-outage',path:'/isolated-rate'},{setHeader(){},status(code){unavailable=code;return this;},json(){}},()=>{throw new Error('must not authorize');});}finally{fail.mockRestore();}
  expect(unavailable).toBe(503);
 }finally{process.env.NODE_ENV=previous;}
});
