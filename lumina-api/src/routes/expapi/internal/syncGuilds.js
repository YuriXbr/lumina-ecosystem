'use strict';
const guilds=require('../../../database/services/GuildService');
module.exports={route:'/expapi/internal/guilds/sync',enabled:true,method:'post',internalKeyNeeded:true,
 async execute(req,res){
  const batch=req.body?.guilds;
  if(!Array.isArray(batch)||batch.length<1||batch.length>100)return res.status(400).json({code:'INVALID_GUILD_BATCH',error:'Informe entre 1 e 100 servidores.'});
  const synced=[],failed=[];
  // Each item can be retried safely without resetting a server's configuration.
  for(const item of batch){try{const guild=await guilds.upsertMetadata(item||{});synced.push(guild.guildId);}catch(error){failed.push({guildId:typeof item?.guildId==='string'?item.guildId:null,code:error.status===400?error.code:'GUILD_SYNC_UNAVAILABLE'});}}
  return res.json({synced,failed});
 }
};
