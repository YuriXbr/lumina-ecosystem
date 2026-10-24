'use strict';
const SNOWFLAKE = /^\d{16,20}$/;
const booleanFields = new Set(['djEnabled','moderationEnabled','memberWelcomeToggle','memberDmToggle','persistentMute','persistentWarns','autoWarnPunishment','canPunishStaff','gachaEnabled','gachaChestsEnabled']);
const idFields = new Set(['memberJoinChannelId','memberLeaveChannelId','moderationChannelId','botInfoChannelId','eventLogChannelId','djRoleId','muteRoleId','banRoleId']);
const listFields = new Set(['blockedUsers','blockedRoles','blockedChannels']);
const limits = { warnsToMute:[0,1000],warnsToTimeOut:[0,1000],warnsToKick:[0,1000],warnsToBan:[0,1000],warnDuration:[0,31536000000],gachaMaxRolls:[0,1000],gachaRollsRefreshInterval:[60000,31536000000] };
function invalid(field) { throw Object.assign(new Error(`Valor inválido para ${field}.`), { code:'INVALID_CONFIG',status:400 }); }
function validateGuildConfig(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).length > 50) invalid('configuração');
  const data = {};
  for (const [field,value] of Object.entries(body)) {
    if (booleanFields.has(field)) { if (typeof value !== 'boolean') invalid(field); }
    else if (idFields.has(field)) { if (typeof value !== 'string' || (value && !SNOWFLAKE.test(value))) invalid(field); }
    else if (listFields.has(field)) { if (!Array.isArray(value) || value.length > 500 || value.some(id=>typeof id !== 'string' || !SNOWFLAKE.test(id))) invalid(field); }
    else if (limits[field]) { const [min,max]=limits[field]; if (!Number.isSafeInteger(value) || value<min || value>max) invalid(field); }
    else if (field==='prefix') { if (typeof value!=='string' || value.length<1 || value.length>10 || /\s|@/.test(value)) invalid(field); }
    else if (field==='guildLocale') { if (!['pt-BR','en-US','es-ES'].includes(value)) invalid(field); }
    else if (field==='gachaGameMode') { if (!['personal','server'].includes(value)) invalid(field); }
    else if (['memberJoinMessage','memberLeaveMessage','memberJoinDmMessage'].includes(field)) { if(typeof value!=='string'||value.length>2000) invalid(field); }
    else if (field==='commandsEnabled') {
      if(!value || Array.isArray(value) || typeof value!=='object' || Object.keys(value).length>200 || Object.entries(value).some(([key,v])=>!(/^[a-z]+(?:\.[a-z]+)?$/.test(key))||typeof v!=='boolean')) invalid(field);
    } else if (field==='autoMessages') {
      if(!Array.isArray(value)||value.length>25) invalid(field);
      for(const entry of value) {
        if(!entry || typeof entry.id!=='string'||entry.id.length>64||!SNOWFLAKE.test(entry.channelId)||typeof entry.message!=='string'||!entry.message.trim()||entry.message.length>2000||!Number.isSafeInteger(entry.intervalMinutes)||entry.intervalMinutes<1||entry.intervalMinutes>43200||typeof entry.enabled!=='boolean'||Object.keys(entry).some(k=>!['id','channelId','message','intervalMinutes','enabled'].includes(k))) invalid(field);
      }
    } else invalid(field);
    data[field]=value;
  }
  if(!Object.keys(data).length) invalid('configuração vazia');
  return data;
}
const FIELDS = [...booleanFields,...idFields,...listFields,...Object.keys(limits),'prefix','guildLocale','gachaGameMode','memberJoinMessage','memberLeaveMessage','memberJoinDmMessage','commandsEnabled','autoMessages'];
const configDto = guild => Object.fromEntries(FIELDS.filter(field => guild[field] !== undefined).map(field=>[field,guild[field]]));
module.exports={ validateGuildConfig,configDto,SNOWFLAKE };
