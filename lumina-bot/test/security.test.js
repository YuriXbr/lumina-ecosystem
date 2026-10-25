'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const cachePath=require.resolve('../src/utils/services/GuildConfigCache');
const cache={getCachedGuildConfig:async()=>({})};
require.cache[cachePath]={id:cachePath,filename:cachePath,loaded:true,exports:cache};
const guard=require('../src/utils/services/CommandGuard');
const autoMessages=require('../src/utils/services/AutoMessageService');
const {processPunishment}=require('../src/utils/services/PunishmentScheduler');
const context={guild:{},guildId:'771421826974089236',channelId:'771421826974089237',user:{id:'771421826974089238'},member:{roles:{cache:new Map() }},commandName:'ban'};
test('command permissions fail closed when the API is unavailable',async()=>{
 cache.getCachedGuildConfig=async()=>{throw new Error('isolated outage');};
 assert.equal((await guard.check(context,{category:'moderation'})).allowed,false);
});
test('moderation, channel, user and role restrictions are respected',async()=>{
 for(const config of [{moderationEnabled:false},{blockedChannels:[context.channelId]},{blockedUsers:[context.user.id]},{blockedRoles:['restricted']}]){
  cache.getCachedGuildConfig=async()=>config;
  const interaction={...context,member:{roles:{cache:new Map([['restricted',{}]])}}};
  assert.equal((await guard.check(interaction,{category:'moderation'})).allowed,false);
 }
});
test('command key matches dashboard category.command and cannot override category denial',async()=>{
 cache.getCachedGuildConfig=async()=>({commandsEnabled:{'moderation.ban':true,moderation:false}});
 assert.equal((await guard.check(context,{category:'moderation'})).allowed,false);
});
test('chest commands require both gacha switches',async()=>{
 for(const config of [{gachaEnabled:false},{gachaChestsEnabled:false}]){
  cache.getCachedGuildConfig=async()=>config;
  assert.equal((await guard.check(context,{category:'chests'})).allowed,false);
 }
});
test('automatic messages never send into another guild and suppress automatic mentions',async()=>{
 cache.getCachedGuildConfig=async()=>({autoMessages:[{id:'test',enabled:true,channelId:'channel',message:'@everyone Test',intervalMinutes:5}]});
 let sent=[];
 const client={guilds:{cache:new Map([[context.guildId,{}]])},channels:{fetch:async()=>({guildId:'another',isTextBased:()=>true,send:async body=>sent.push(body)})}};
 autoMessages.sentTracker.clear();await autoMessages._poll(client);assert.equal(sent.length,0);
 client.channels.fetch=async()=>({guildId:context.guildId,isTextBased:()=>true,send:async body=>sent.push(body)});
 await autoMessages._poll(client);assert.deepEqual(sent,[{content:'@everyone Test',allowedMentions:{parse:[]}}]);
 await autoMessages._poll(client);assert.equal(sent.length,1);
});
test('ban expiry only unbans, mute expiry only removes the configured mute role',async()=>{
 const calls=[];
 const guild={bans:{fetch:async()=>({})},members:{unban:async()=>calls.push('unban'),fetch:async()=>({roles:{cache:new Map([['mute',{}]]),remove:async id=>calls.push(id)}})}};
 const client={guilds:{fetch:async()=>guild}};
 const api={post:async(path)=>{assert.equal(path,'/expapi/internal/fetchguilddata');return{muteRoleId:'mute'};}};
 await processPunishment(client,{type:'ban',...context,targetId:'target'},api);assert.deepEqual(calls,['unban']);
 await processPunishment(client,{type:'mute',...context,targetId:'target'},api);assert.deepEqual(calls,['unban','mute']);
});
test('superseded punishments and warn expiry never sanction or unsanction a member',async()=>{
 const client={guilds:{fetch:async()=>{throw new Error('should not access Discord');}}};
 await processPunishment(client,{type:'warn'},{});await processPunishment(client,{type:'ban',superseded:true},{});
});
test('already removed ban is an idempotent success',async()=>{
 const client={guilds:{fetch:async()=>({bans:{fetch:async()=>{throw Object.assign(new Error(),{code:10026});}}})}};
 await processPunishment(client,{type:'ban',guildId:'guild',targetId:'target'},{});
});
