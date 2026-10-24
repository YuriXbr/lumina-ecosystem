module.exports={name:'guildDelete',async execute(guild){
 try{await require('../utils/services/GuildSyncService').getGuildSync().leave(guild);}
 catch{console.warn('[GuildSync] Falha ao registrar saída; configuração foi preservada.');}
}};
