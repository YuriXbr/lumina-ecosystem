'use strict';
const {enqueue}=require('../../../../utils/botConsole');
const {consoleAdmin,consoleError}=require('../../../../utils/consoleAdmin');
module.exports={route:'/expapi/v1/admin/bot-console/commands',enabled:true,method:'post',csrfProtectionNeeded:true,
 async execute(req,res){try{const account=await consoleAdmin(req,res);if(!account)return;return res.status(202).json(await enqueue(account.accountId,req.body));}catch(error){return consoleError(res,error);}}
};
