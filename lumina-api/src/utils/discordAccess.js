'use strict';
const axios = require('axios');
const { encryptSecret,decryptSecret }=require('./secretEncryption');
const accounts=require('../database/services/DashboardAccountService');
const refreshing = new Map();
async function discordToken(account) {
  if (!account.discordOauth2Token) throw Object.assign(new Error('Reconecte sua conta Discord.'),{status:403,code:'DISCORD_NOT_LINKED'});
  if (account.discordOauth2TokenExpiresAt && new Date(account.discordOauth2TokenExpiresAt).getTime()>Date.now()+30000) return decryptSecret(account.discordOauth2Token);
  if (!refreshing.has(account.accountId)) refreshing.set(account.accountId,(async()=>{
    try {
      const params=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'refresh_token',refresh_token:decryptSecret(account.discordOauth2RefreshToken)});
      const {data}=await axios.post('https://discord.com/api/oauth2/token',params.toString(),{timeout:8000,headers:{'Content-Type':'application/x-www-form-urlencoded'}});
      await accounts.update({accountId:account.accountId},{$set:{discordOauth2Token:encryptSecret(data.access_token),discordOauth2RefreshToken:encryptSecret(data.refresh_token),discordOauth2TokenExpiresAt:new Date(Date.now()+data.expires_in*1000),discordOauth2TokenScope:data.scope}});
      return data.access_token;
    } catch (error) {
      if(error.response?.status===429)throw Object.assign(new Error('O Discord limitou as solicitações. Tente novamente em instantes.'),{status:429,code:'DISCORD_RATE_LIMITED'});
      if(!error.response || error.response.status>=500)throw Object.assign(new Error('O Discord está temporariamente indisponível.'),{status:503,code:'DISCORD_UNAVAILABLE'});
      throw Object.assign(new Error('Reconecte sua conta Discord.'),{status:403,code:'DISCORD_TOKEN_EXPIRED'});
    }
    finally {refreshing.delete(account.accountId);}
  })());
  return refreshing.get(account.accountId);
}
async function requireGuildManager(account,guildId) {
  const token=await discordToken(account);
  const guilds=[];
  let after;
  // Discord users may belong to more than 200 guilds. Do not silently drop later pages.
  for(let page=0;page<10;page++) {
    const {data}=await axios.get('https://discord.com/api/v10/users/@me/guilds',{timeout:8000,headers:{Authorization:`Bearer ${token}`},params:{limit:200,...(after?{after}:{})}});
    guilds.push(...data);
    if(data.some(g=>g.id===guildId)||data.length<200)break;
    after=data[data.length-1].id;
  }
  const guild=guilds.find(g=>g.id===guildId);
  const permissions=BigInt(guild?.permissions||0);
  if(!guild || !(guild.owner || (permissions & 0x8n) || (permissions & 0x20n))) throw Object.assign(new Error('Você não pode gerenciar este servidor.'),{status:403,code:'INSUFFICIENT_GUILD_PERMISSION'});
  return guild;
}
async function validateGuildResources(guildId,data) {
  const channels=Object.entries(data).filter(([key,value])=>key.endsWith('ChannelId')&&value).map(([,value])=>value).concat((data.autoMessages||[]).map(m=>m.channelId),data.blockedChannels||[]);
  const roles=Object.entries(data).filter(([key,value])=>key.endsWith('RoleId')&&value).map(([,value])=>value).concat(data.blockedRoles||[]);
  if(!channels.length&&!roles.length)return;
  if(!process.env.DISCORD_BOT_TOKEN)throw Object.assign(new Error('Não foi possível validar os canais e cargos.'),{status:503,code:'BOT_UNAVAILABLE'});
  const headers={Authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`};
  const [channelData,roleData]=await Promise.all([channels.length?axios.get(`https://discord.com/api/v10/guilds/${guildId}/channels`,{headers,timeout:8000}):null,roles.length?axios.get(`https://discord.com/api/v10/guilds/${guildId}/roles`,{headers,timeout:8000}):null]);
  if(channels.some(id=>!channelData.data.some(c=>c.id===id))||roles.some(id=>!roleData.data.some(r=>r.id===id)))throw Object.assign(new Error('Canal ou cargo não pertence ao servidor.'),{status:400,code:'INVALID_GUILD_RESOURCE'});
}
module.exports={discordToken,requireGuildManager,validateGuildResources};
