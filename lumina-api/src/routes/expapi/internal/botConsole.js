'use strict';
const {ingest}=require('../../../utils/botConsole');
const {consoleError}=require('../../../utils/consoleAdmin');
module.exports={route:'/expapi/internal/bot-console',enabled:true,method:'post',internalKeyNeeded:true,apiKeyNeeded:true,
 async execute(req,res){try{return res.json(await ingest(req.body));}catch(error){return consoleError(res,error);}}
};
