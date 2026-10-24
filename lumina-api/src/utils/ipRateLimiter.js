'use strict';
const DatabaseService=require('../database/services/DataBaseService');
const {mongoSchema}=require('../database/schema');
const BASE_BLOCK_MS=60000,MAX_BLOCK_MS=86400000;
const service=new DatabaseService('ipRateLimits',mongoSchema.ipRateLimits);
function calcBlockDuration(count){return Math.min(BASE_BLOCK_MS*2**Math.min(Math.max(0,count),11),MAX_BLOCK_MS);}
function ipRateLimiter({max=60,windowMs=60000}={}) {
  return async(req,res,next)=>{
    // Unit suites provide middleware mocks. Integration suites run this path in development.
    if(process.env.NODE_ENV==='test')return next();
    try {
      await service.connect();
      const now=new Date(),ip=req.ip||'unknown',route=req.route?.path||req.path;
      const expired={$gte:[now,{$add:[{$ifNull:['$windowStart',now]},windowMs]}]};
      const blocked={$gt:[{$ifNull:['$blockedUntil',new Date(0)]},now]};
      const duration={$min:[MAX_BLOCK_MS,{$multiply:[BASE_BLOCK_MS,{$pow:[2,{$min:[{$max:[0,{$ifNull:['$blockCount',0]}]},11]}]}]}]};
      let record;
      for(let attempt=0;attempt<2;attempt++) {
        try {
          record=await service.model.findOneAndUpdate({ip,route},[
            {$set:{ip,route,windowStart:{$cond:[expired,now,{$ifNull:['$windowStart',now]}]},requestCount:{$cond:[expired,1,{$add:[{$ifNull:['$requestCount',0]},1]}]},blockCount:{$ifNull:['$blockCount',0]},updatedAt:now}},
            {$set:{blockedUntil:{$cond:[blocked,'$blockedUntil',{$cond:[{$gt:['$requestCount',max]},{$add:[now,duration]},null]}]},blockCount:{$cond:[{$and:[{$not:[blocked]},{$gt:['$requestCount',max]}]},{$add:['$blockCount',1]},'$blockCount']}}},
          ],{upsert:true,new:true});
          break;
        }catch(error){if(error.code!==11000||attempt)throw error;}
      }
      res.setHeader('X-RateLimit-Limit',String(max));
      res.setHeader('X-RateLimit-Remaining',String(Math.max(0,max-record.requestCount)));
      if(record.blockedUntil&&record.blockedUntil>now) {
        const seconds=Math.ceil((record.blockedUntil-now)/1000);
        res.setHeader('Retry-After',String(seconds));
        return res.status(429).json({code:'RATE_LIMIT_EXCEEDED',error:'Muitas tentativas. Tente novamente mais tarde.',retryAfterSeconds:seconds});
      }
      return next();
    }catch(error){return res.status(503).json({code:'RATE_LIMIT_UNAVAILABLE',error:'Serviço temporariamente indisponível.'});}
  };
}
module.exports={ipRateLimiter,calcBlockDuration,BASE_BLOCK_MS,MAX_BLOCK_MS};
