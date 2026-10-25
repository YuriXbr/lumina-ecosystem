'use strict';
const crypto=require('node:crypto');
const mongoose=require('mongoose');
const DatabaseService=require('../database/services/DataBaseService');
const DAY=86400000,COMMANDS=['status','ping','guilds','help'];
const events=new DatabaseService('botconsoleevents',{eventId:{type:String,required:true},workerId:String,level:String,message:String,timestamp:Date,createdAt:Date,expiresAt:Date});
const runtime=new DatabaseService('botruntime',{workerId:{type:String,required:true},botId:String,ready:Boolean,guildCount:Number,pingMs:Number,uptimeSeconds:Number,memoryMb:Number,version:String,lastSeenAt:Date,expiresAt:Date});
const jobs=new DatabaseService('botconsolecommands',{requestId:{type:String,required:true},requestedBy:String,command:String,state:String,output:String,createdAt:Date,deadline:Date,expiresAt:Date,leasedBy:String,leaseToken:String,leaseUntil:Date,finishedAt:Date});
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const invalid=()=>Object.assign(new Error('Solicitação de console inválida.'),{status:400,code:'INVALID_CONSOLE_REQUEST'});
function redact(value){
 let text=String(value||'').replace(/\x1b\[[0-9;]*m/g,'');
 for(const [key,secret]of Object.entries(process.env))if(/TOKEN|SECRET|PASSWORD|PASS$|KEY|MONGODB_URI|WEBHOOK_URL/.test(key)&&secret?.length>=8)text=text.split(secret).join('[redigido]');
 return text.replace(/\bBearer\s+\S+/gi,'Bearer [redigido]').replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g,'[JWT redigido]').replace(/([?&](?:token|code|password|secret|key|api_key)=)[^&\s]+/gi,'$1[redigido]').replace(/((?:password|secret|token|authorization|api[-_]?key)\s*[=:]\s*)\S+/gi,'$1[redigido]').slice(0,2000);
}
function validateIngest(body){
 if(!body||!uuid(body.workerId)||!Array.isArray(body.events)||body.events.length>100||!Array.isArray(body.results||[])||(body.results||[]).length>5)throw invalid();
 const status=body.status;
 if(!status||typeof status.ready!=='boolean'||typeof status.botId!=='string'||!/^\d{16,20}$/.test(status.botId))throw invalid();
 for(const field of ['guildCount','pingMs','uptimeSeconds','memoryMb'])if(typeof status[field]!=='number'||!Number.isFinite(status[field])||status[field]<0)throw invalid();
 if(status.guildCount>10000000||status.memoryMb>1000000)throw invalid();
 for(const event of body.events)if(!uuid(event.eventId)||!['info','warning','error','debug','success','system'].includes(event.level)||typeof event.message!=='string'||event.message.length>4000||!Number.isFinite(Date.parse(event.timestamp)))throw invalid();
 for(const result of body.results||[])if(!uuid(result.requestId)||!uuid(result.leaseToken)||typeof result.output!=='string'||result.output.length>4000||typeof result.ok!=='boolean')throw invalid();
}
async function ingest(body){
 validateIngest(body);await events.connect();
 const now=new Date(),expiresAt=new Date(now.getTime()+DAY),workerId=body.workerId;
 if(body.events.length){
  const writes=body.events.map(event=>({updateOne:{filter:{eventId:event.eventId},update:{$setOnInsert:{eventId:event.eventId,workerId,level:event.level,message:redact(event.message),timestamp:new Date(Math.max(now.getTime()-DAY,Math.min(Date.parse(event.timestamp),now.getTime()+60000))),createdAt:now,expiresAt}},upsert:true}}));
  try{await events.model.bulkWrite(writes,{ordered:false});}catch(error){if(error.code!==11000||error.writeErrors?.some(e=>e.code!==11000))throw error;}
 }
 const s=body.status;
 await runtime.model.updateOne({workerId},{$set:{botId:s.botId,ready:s.ready,guildCount:Math.floor(s.guildCount),pingMs:s.pingMs,uptimeSeconds:s.uptimeSeconds,memoryMb:s.memoryMb,version:typeof s.version==='string'?s.version.slice(0,40):'',lastSeenAt:now,expiresAt}},{upsert:true});
 for(const result of body.results||[]){
  await jobs.model.updateOne({requestId:result.requestId,state:'running',leasedBy:workerId,leaseToken:result.leaseToken,leaseUntil:{$gt:now}},{$set:{state:result.ok?'completed':'failed',output:redact(result.output),finishedAt:now},$unset:{leaseToken:'',leaseUntil:''}});
 }
 const claimed=[];
 if(s.ready)for(let i=0;i<3;i++){
  const leaseToken=crypto.randomUUID();
  const job=await jobs.model.findOneAndUpdate({deadline:{$gt:now},$or:[{state:'pending'},{state:'running',leaseUntil:{$lte:now}}]},{$set:{state:'running',leasedBy:workerId,leaseToken,leaseUntil:new Date(now.getTime()+45000)}},{sort:{createdAt:1},new:true}).lean();
  if(!job)break;
  claimed.push({requestId:job.requestId,command:job.command,leaseToken});
 }
 return{ok:true,commands:claimed};
}
async function enqueue(accountId,{command,requestId}={}){
 if(typeof command!=='string'||!COMMANDS.includes(command)||!uuid(requestId))throw invalid();
 await jobs.connect();
 const prior=await jobs.model.findOne({requestId}).lean();
 if(prior){if(prior.requestedBy!==accountId||prior.command!==command)throw invalid();return{requestId,state:prior.state};}
 if(await jobs.model.countDocuments({requestedBy:accountId,createdAt:{$gt:new Date(Date.now()-60000)}})>=6)throw Object.assign(new Error('Aguarde antes de solicitar outro diagnóstico.'),{status:429,code:'CONSOLE_COMMAND_LIMIT'});
 const now=new Date();
 try{await jobs.model.create({requestId,requestedBy:accountId,command,state:'pending',createdAt:now,deadline:new Date(now.getTime()+120000),expiresAt:new Date(now.getTime()+DAY)});}
 catch(error){if(error.code!==11000)throw error;const duplicate=await jobs.model.findOne({requestId}).lean();if(duplicate?.requestedBy!==accountId||duplicate?.command!==command)throw invalid();}
 return{requestId,state:'pending'};
}
async function snapshot(cursor){
 if(cursor!==undefined&&(typeof cursor!=='string'||! /^[a-f0-9]{24}$/i.test(cursor)))throw invalid();
 await events.connect();const now=new Date();
 const query={expiresAt:{$gt:now},...(cursor?{_id:{$gt:new mongoose.Types.ObjectId(cursor)}}:{})};
 let rows=await events.model.find(query).sort({_id:cursor?1:-1}).limit(101).lean();
 const hasMore=!!cursor&&rows.length>100;
 rows=rows.slice(0,100);if(!cursor)rows.reverse();
 const workers=await runtime.model.find({lastSeenAt:{$gt:new Date(now.getTime()-45000)},ready:true},{_id:0,workerId:1,botId:1,guildCount:1,pingMs:1,uptimeSeconds:1,memoryMb:1,version:1,lastSeenAt:1}).limit(50).lean();
 const recent=await jobs.model.find({expiresAt:{$gt:now}},{leaseToken:0,leasedBy:0,requestedBy:0,expiresAt:0,_id:0}).sort({createdAt:-1}).limit(20).lean();
 return{events:rows.map(row=>({id:String(row._id),level:row.level,message:row.message,timestamp:row.timestamp})),cursor:rows.length?String(rows.at(-1)._id):cursor||null,hasMore,workers,commands:recent.map(job=>({...job,state:['pending','running'].includes(job.state)&&job.deadline<now?'expired':job.state})),pollAfterMs:5000,retentionHours:24};
}
module.exports={ingest,enqueue,snapshot,redact,validateIngest,events,runtime,jobs,COMMANDS};
