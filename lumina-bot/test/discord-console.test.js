'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.API_BASE_URL='http://127.0.0.1:1';process.env.INTERNAL_API_KEY='isolated-test-internal';process.env.LUMINA_API_KEY='isolated-test-api-key';
const {GuildSyncService}=require('../src/utils/services/GuildSyncService');
const {BotConsoleService,redact}=require('../src/utils/services/BotConsoleService');
const makeClient=()=>({user:{id:'771421826974089236'},isReady:()=>true,ws:{ping:42},uptime:120000,guilds:{cache:new Map([['1',{id:'771421826974089236',ownerId:'771421826974089237',name:'Offline addition',memberCount:42}]])}});
test('READY reconciliation recovers cached guilds and invalidates missing configuration cache',async()=>{
 const calls=[],invalidated=[];
 const service=new GuildSyncService({api:{post:async(path,body)=>{calls.push({path,body});return{synced:body.guilds.map(g=>g.guildId),failed:[]};}},configCache:{invalidateCache:id=>invalidated.push(id)}});
 const result=await service.reconcile(makeClient());assert.equal(result.synced,1);assert.deepEqual(invalidated,['771421826974089236']);assert.equal(calls[0].path,'/expapi/internal/guilds/sync');assert.equal(calls[0].body.guilds[0].memberCount,42);
});
test('failed sync is retried and overlapping reconciliations coalesce',async()=>{
 let fail=true,calls=0,release;
 const service=new GuildSyncService({api:{post:async()=>{calls++;if(fail)throw new Error('offline');await new Promise(resolve=>{release=resolve;});return{synced:['771421826974089236'],failed:[]};}},configCache:{invalidateCache(){}}});
 assert.equal((await service.reconcile(makeClient())).failed,1);fail=false;
 const a=service.reconcile(makeClient()),b=service.reconcile(makeClient());assert.equal(a,b);release();await a;assert.equal(calls,2);
});
test('ingestion retries retain event identifiers, diagnostics use whitelist, and no secret is transmitted',async()=>{
 let now=0,fail=true;const calls=[];
 const service=new BotConsoleService({now:()=>now,api:{post:async(path,body)=>{calls.push(body);if(fail)throw new Error('offline');return{data:{commands:[{requestId:'demo',leaseToken:'lease',command:'status'}]}};}}});service.client=makeClient();
 process.env.LUMINA_TEST_SECRET='super-private-secret';service.capture('error',['token=super-private-secret']);
 await service.flush();assert.equal(service.events.length,1);assert.equal(service.failures,1);assert.ok(!JSON.stringify(calls).includes('super-private-secret'));
 await service.flush();assert.equal(calls.length,1);now=11000;fail=false;await service.flush();assert.equal(calls[0].events[0].eventId,calls[1].events[0].eventId);assert.equal(service.events.length,0);assert.equal(service.results[0].ok,true);assert.match(service.results[0].output,/online/);
 assert.throws(()=>service.diagnose('process.exit()'),/UNSUPPORTED/);delete process.env.LUMINA_TEST_SECRET;
});
test('bounded queue does not lose new messages when an in-flight batch overflows',async()=>{
 let finish;const service=new BotConsoleService({api:{post:()=>new Promise(resolve=>{finish=resolve;})}});service.client=makeClient();
 for(let i=0;i<500;i++)service.capture('info',['old',i]);const pending=service.flush();
 for(let i=0;i<100;i++)service.capture('info',['new',i]);
 finish({data:{commands:[]}});await pending;
 assert.ok(service.events.some(event=>event.message==='new 99'));assert.ok(service.events.length<=500);assert.ok(service.events.some(event=>event.level==='warning'));
});
test('redaction removes unknown bearer credentials and JWTs',()=>{assert.equal(redact('Bearer abc-secret'),'Bearer [redigido]');assert.ok(!redact('eyJabc.def.ghi').includes('eyJabc'));});
