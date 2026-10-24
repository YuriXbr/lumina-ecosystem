'use strict';
const guilds=require('../../../database/services/GuildService');
module.exports={route:'/expapi/internal/guilds/leave',enabled:true,method:'post',internalKeyNeeded:true,
 async execute(req,res){
  const guildId=req.body?.guildId;
  if(typeof guildId!=='string'||!/^\d{16,20}$/.test(guildId))return res.status(400).json({code:'INVALID_GUILD_ID',error:'Servidor inválido.'});
  await guilds.update({guildId},{$set:{botPresent:false,lastSyncedAt:new Date()}});
  return res.json({ok:true});
 }
};
