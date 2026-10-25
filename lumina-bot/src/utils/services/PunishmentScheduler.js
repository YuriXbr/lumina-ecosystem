'use strict';
const LuminaApiService=require('./LuminaApiService');
let timer,busy=false,lastCleanup=0;
async function processPunishment(client,job,api) {
  if(job.superseded||job.type==='warn')return;
  const guild=await client.guilds.fetch(job.guildId);
  if(job.type==='ban') {
    try {await guild.bans.fetch(job.targetId);}catch(error){if(error.code===10026)return;throw error;}
    await guild.members.unban(job.targetId,'Lumina: fim do prazo de banimento');
  } else if(job.type==='mute') {
    let member;
    try {member=await guild.members.fetch(job.targetId);}catch(error){if(error.code===10007)return;throw error;}
    const config=await api.post('/expapi/internal/fetchguilddata',{guildId:job.guildId});
    if(config.muteRoleId&&member.roles.cache.has(config.muteRoleId))await member.roles.remove(config.muteRoleId,'Lumina: fim do prazo de mute');
  } else throw new Error('INVALID_PUNISHMENT_TYPE');
}
async function pollExpiredPunishments(client) {
  if(busy)return;
  busy=true;
  try {
    const api=new LuminaApiService();
    if (Date.now()-lastCleanup>=3600000) {
      try {
        await api.post('/expapi/internal/accounts/cleanup',{});
        lastCleanup=Date.now();
      } catch(error) { console.error('[AccountCleanup]',error.code||error.name); }
    }
    const {jobs}=await api.post('/expapi/internal/punishments/claim',{});
    for(const job of jobs) {
      try {
        await processPunishment(client,job,api);
        await api.post('/expapi/internal/punishments/finish',{type:job.type,id:String(job._id),leaseToken:job.leaseToken,success:true});
      } catch(error) {
        await api.post('/expapi/internal/punishments/finish',{type:job.type,id:String(job._id),leaseToken:job.leaseToken,success:false,errorCode:String(error.code||'DISCORD_ERROR')}).catch(()=>{});
        console.error('[PunishmentScheduler] Job failed:',job.type,error.code||error.name);
      }
    }
  } catch(error) {console.error('[PunishmentScheduler] Poll failed:',error.code||error.name);}
  finally {busy=false;}
}
function startPunishmentScheduler(client,intervalMs=30000) {
  if(timer)return;
  timer=setInterval(()=>pollExpiredPunishments(client),intervalMs);
  timer.unref?.();
  void pollExpiredPunishments(client);
}
function stopPunishmentScheduler(){clearInterval(timer);timer=null;}
module.exports={startPunishmentScheduler,stopPunishmentScheduler,pollExpiredPunishments,processPunishment};
