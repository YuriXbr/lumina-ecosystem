'use strict';
const crypto=require('node:crypto');
const util=require('node:util');
const axios=require('axios');
function redact(text){
 text=String(text).replace(/\x1b\[[0-9;]*m/g,'');
 for(const [key,value]of Object.entries(process.env))if(/TOKEN|SECRET|PASS|KEY|MONGODB_URI|WEBHOOK/.test(key)&&value?.length>=8)text=text.split(value).join('[redigido]');
 return text.replace(/\bBearer\s+\S+/gi,'Bearer [redigido]').replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g,'[JWT redigido]').replace(/((?:password|secret|token|authorization|api[-_]?key)\s*[=:]\s*)\S+/gi,'$1[redigido]').slice(0,2000);
}
class BotConsoleService {
 constructor({api,now=()=>Date.now()}={}){
  this.api=api||axios.create({baseURL:process.env.API_BASE_URL,timeout:10000,maxBodyLength:300000,headers:{'internal-key':process.env.INTERNAL_API_KEY,'X-Lumina-API-Key':process.env.LUMINA_API_KEY}});
  this.now=now;this.workerId=crypto.randomUUID();this.events=[];this.results=[];this.originals={};this.timer=null;this.sending=false;this.nextAt=0;this.failures=0;this.dropped=0;
 }
 capture(level,args){
  if(this.events.length>=500){this.events.shift();this.dropped++;}
  this.events.push({eventId:crypto.randomUUID(),level,message:redact(util.formatWithOptions({depth:2,maxArrayLength:10,maxStringLength:2000},...args)),timestamp:new Date(this.now()).toISOString()});
 }
 start(client){
  if(this.timer)return;this.client=client;
  for(const [method,level]of Object.entries({log:'info',info:'info',warn:'warning',error:'error',debug:'debug'})){
   this.originals[method]=console[method];
   console[method]=(...args)=>{this.originals[method].apply(console,args);this.capture(level,args);};
  }
  this.timer=setInterval(()=>void this.flush(),10000);this.timer.unref?.();
 }
 status(){
  const client=this.client;
  return{botId:client.user.id,ready:client.isReady(),guildCount:client.guilds.cache.size,pingMs:Math.max(0,Number(client.ws.ping)||0),uptimeSeconds:Math.max(0,(client.uptime||0)/1000),memoryMb:process.memoryUsage().heapUsed/1048576,version:require('../../../package.json').version};
 }
 diagnose(command){
  const s=this.status();
  switch(command){
   case 'status':return`Bot ${s.ready?'online':'reconectando'} · ${s.guildCount} servidores · ${Math.floor(s.uptimeSeconds)}s de atividade · ${s.memoryMb.toFixed(1)} MB`;
   case 'ping':return`Latência do gateway Discord: ${Math.round(s.pingMs)} ms`;
   case 'guilds':return`Servidores no cache atual: ${s.guildCount}. A reconciliação automática ocorre no início e a cada 5 minutos.`;
   case 'help':return'Diagnósticos disponíveis: status, ping, guilds, help. Este console não executa código nem comandos do sistema.';
   default:throw new Error('UNSUPPORTED_DIAGNOSTIC');
  }
 }
 async flush(){
  if(this.sending||!this.client?.user?.id||this.now()<this.nextAt)return;
  this.sending=true;
  const events=this.events.slice(0,100),results=this.results.slice(0,5);
  try{
   const response=await this.api.post('/expapi/internal/bot-console',{workerId:this.workerId,status:this.status(),events,results});
   const acknowledged=new Set(events.map(event=>event.eventId));
   this.events=this.events.filter(event=>!acknowledged.has(event.eventId));
   const finished=new Set(results.map(result=>result.requestId+result.leaseToken));
   this.results=this.results.filter(result=>!finished.has(result.requestId+result.leaseToken));this.failures=0;this.nextAt=0;
   for(const job of response.data.commands||[]){
    if(this.results.some(result=>result.requestId===job.requestId))continue;
    try{this.results.push({requestId:job.requestId,leaseToken:job.leaseToken,ok:true,output:redact(this.diagnose(job.command))});}
    catch{this.results.push({requestId:job.requestId,leaseToken:job.leaseToken,ok:false,output:'Diagnóstico não permitido.'});}
   }
   if(this.dropped){this.capture('warning',[`${this.dropped} mensagens antigas descartadas do buffer local durante indisponibilidade.`]);this.dropped=0;}
  }catch{
   // No console call here: recording a transport error would recursively refill the queue.
   this.failures++;this.nextAt=this.now()+Math.min(60000,10000*2**Math.min(this.failures-1,3));
  }finally{this.sending=false;}
 }
 stop(){clearInterval(this.timer);this.timer=null;for(const [method,original]of Object.entries(this.originals))console[method]=original;this.originals={};}
}
let instance;
module.exports={BotConsoleService,redact,getBotConsole:()=>instance||(instance=new BotConsoleService())};
