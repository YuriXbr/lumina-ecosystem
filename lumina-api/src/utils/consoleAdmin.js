'use strict';
const {verifyRequestAuthWithAccountCheck}=require('./authHelpers');
async function consoleAdmin(req,res){
 const {account,error}=await verifyRequestAuthWithAccountCheck(req);
 if(error){res.status(error.status).json({error:error.message,code:error.code});return null;}
 if(!['admin','headadmin','developer','coowner','owner'].includes(account?.accessType)){res.status(403).json({error:'Permissão insuficiente.',code:'INSUFFICIENT_PERMISSION'});return null;}
 res.setHeader('Cache-Control','private, no-store');return account;
}
function consoleError(res,error){return res.status(error.status||503).json({code:error.status?error.code:'CONSOLE_UNAVAILABLE',error:error.status?error.message:'Console temporariamente indisponível.'});}
module.exports={consoleAdmin,consoleError};
