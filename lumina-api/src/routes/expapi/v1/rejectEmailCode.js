'use strict';
// GET never changes security state: email link scanners cannot lock an account.
module.exports={route:'/expapi/v1/account/email-code/reject',method:'post',enabled:true,csrfProtectionNeeded:true,
 rateLimiter:require('../../../utils/ipRateLimiter').ipRateLimiter({max:15,windowMs:60000}),
 async execute(req,res){try{return res.json(await require('../../../utils/emailCodes').rejectCode(req.body?.token));}catch(error){return res.status(error.status||503).json({error:error.status?error.message:'Não foi possível bloquear os códigos.',code:error.code||'EMAIL_REJECT_UNAVAILABLE'});}}
};
