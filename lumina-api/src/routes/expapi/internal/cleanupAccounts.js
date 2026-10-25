'use strict';
module.exports={route:'/expapi/internal/accounts/cleanup',method:'post',enabled:true,internalKeyNeeded:true,
 async execute(req,res){try{return res.json(await require('../../../utils/accountCleanup').purgeDueAccounts());}catch{return res.status(503).json({error:'Manutenção temporariamente indisponível.',code:'CLEANUP_UNAVAILABLE'});}}
};
