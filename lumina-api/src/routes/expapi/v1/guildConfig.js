'use strict';
const GuildService=require('../../../database/services/GuildService');
const {verifyRequestAuthWithAccountCheck}=require('../../../utils/authHelpers');
const {requireGuildManager,validateGuildResources}=require('../../../utils/discordAccess');
const {validateGuildConfig,configDto,SNOWFLAKE}=require('../../../utils/guildConfig');
const {routeError,addLog}=require('../../../logger/logger');
module.exports={route:'/expapi/v1/guilds/:guildId/config',method:'put',enabled:true,csrfProtectionNeeded:true,
  async execute(req,res) {
    const {account,error}=await verifyRequestAuthWithAccountCheck(req);
    if(error)return res.status(error.status).json({code:error.code,error:error.message});
    try {
      if(!SNOWFLAKE.test(req.params.guildId))return res.status(400).json({code:'INVALID_GUILD_ID',error:'Servidor inválido.'});
      const data=validateGuildConfig(req.body);
      await requireGuildManager(account,req.params.guildId);
      await validateGuildResources(req.params.guildId,data);
      const guild=await GuildService.updateGuildData(req.params.guildId,data);
      if(!guild)return res.status(404).json({code:'GUILD_NOT_FOUND',error:'Adicione o Lumina a este servidor primeiro.'});
      addLog('AUDIT','guild.config.updated','Configuração de servidor atualizada',{userId:account.accountId,extra:{guildId:req.params.guildId,fields:Object.keys(data)}});
      return res.json({message:'Configurações salvas.',updatedFields:Object.keys(data),config:configDto(guild)});
    } catch(error) {
      if(error.status)return res.status(error.status).json({code:error.code,error:error.message});
      return routeError({res,error,route:'guild.config',errorCode:'GUILD_CONFIG_ERROR',userMsg:'Não foi possível salvar as configurações.'});
    }
  },
};
