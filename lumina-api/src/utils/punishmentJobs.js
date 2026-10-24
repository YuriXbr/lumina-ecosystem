'use strict';
const crypto=require('crypto');
const services={ban:require('../database/services/BanListService'),mute:require('../database/services/MuteListService'),warn:require('../database/services/WarnListService')};
async function claimPunishments() {
  const jobs=[],now=new Date();
  for(const [type,service] of Object.entries(services)) {
    await service.connect();
    for(let i=0;i<3 && jobs.length<3;i++) {
      const leaseToken=crypto.randomUUID();
      const job=await service.model.findOneAndUpdate({endTime:{$lte:now,$gt:new Date(0)},processedAt:null,$and:[{$or:[{leaseUntil:null},{leaseUntil:{$lte:now}}]},{$or:[{nextAttemptAt:null},{nextAttemptAt:{$lte:now}}]}]},{$set:{leaseUntil:new Date(now.getTime()+120000),leaseToken},$inc:{attempts:1}},{new:true,sort:{endTime:1}}).lean();
      if(!job)break;
      const superseded=type!=='warn'&&!!await service.model.exists({_id:{$ne:job._id},guildId:job.guildId,targetId:job.targetId,processedAt:null,$or:[{endTime:null},{endTime:{$gt:now}}]});
      jobs.push({...job,type,superseded});
    }
  }
  return jobs;
}
async function finishPunishment({type,id,leaseToken,success,errorCode}) {
  const service=services[type];
  if(!service||typeof id!=='string'||!(/^[a-f0-9]{24}$/i.test(id))||typeof leaseToken!=='string')throw Object.assign(new Error('Job inválido'),{status:400});
  await service.connect();
  return service.model.findOneAndUpdate({_id:id,leaseToken,leaseUntil:{$gt:new Date()},processedAt:null},{$set:success?{processedAt:new Date(),leaseUntil:null,leaseToken:null,lastErrorCode:''}:{nextAttemptAt:new Date(Date.now()+60000),leaseUntil:null,leaseToken:null,lastErrorCode:String(errorCode||'DISCORD_ERROR').slice(0,100)}},{new:true});
}
module.exports={claimPunishments,finishPunishment};
