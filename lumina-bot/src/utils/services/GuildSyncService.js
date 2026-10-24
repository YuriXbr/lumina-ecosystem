'use strict';
const LuminaApiService=require('./LuminaApiService');
const cache=require('./GuildConfigCache');
class GuildSyncService {
 constructor({api=new LuminaApiService(),configCache=cache}={}){this.api=api;this.configCache=configCache;this.running=null;this.timer=null;this.lastResult=null;}
 metadata(guild){return{guildId:guild.id,ownerId:guild.ownerId,guildName:guild.name,memberCount:guild.memberCount};}
 async syncOne(guild){
  if(guild.available===false)return;
  const result=await this.api.post('/expapi/internal/guilds/sync',{guilds:[this.metadata(guild)]});
  if(result.failed?.length)throw new Error('GUILD_SYNC_FAILED');
  this.configCache.invalidateCache(guild.id);
 }
 reconcile(client){
  if(this.running)return this.running;
  this.running=(async()=>{
   // READY supplies the full guild cache, including additions made while offline.
   const guilds=[...client.guilds.cache.values()].filter(g=>g.available!==false);
   let synced=0,failed=0;
   for(let offset=0;offset<guilds.length;offset+=100){
    const batch=guilds.slice(offset,offset+100);
    try{
     const result=await this.api.post('/expapi/internal/guilds/sync',{guilds:batch.map(g=>this.metadata(g))});
     for(const id of result.synced||[])this.configCache.invalidateCache(id);
     synced+=(result.synced||[]).length;failed+=(result.failed||[]).length;
    }catch{failed+=batch.length;}
   }
   this.lastResult={synced,failed,completedAt:new Date().toISOString()};
   console[failed?'warn':'info'](`[GuildSync] ${synced} servidores sincronizados; ${failed} pendentes para nova tentativa.`);
   return this.lastResult;
  })().finally(()=>{this.running=null;});
  return this.running;
 }
 start(client){if(this.timer)return;void this.reconcile(client);this.timer=setInterval(()=>{if(client.isReady())void this.reconcile(client);},300000);this.timer.unref?.();}
 stop(){clearInterval(this.timer);this.timer=null;}
 async leave(guild){await this.api.post('/expapi/internal/guilds/leave',{guildId:guild.id});this.configCache.invalidateCache(guild.id);}
}
let instance;
module.exports={GuildSyncService,getGuildSync:()=>instance||(instance=new GuildSyncService())};
