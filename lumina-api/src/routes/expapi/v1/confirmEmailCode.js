'use strict';
module.exports={route:'/expapi/v1/account/email-code/confirm',method:'post',enabled:true,csrfProtectionNeeded:true,
 rateLimiter:require('../../../utils/ipRateLimiter').ipRateLimiter({max:15,windowMs:15*60000}),
 async execute(req,res){try{return res.json(await require('../../../utils/emailCodes').confirmCode(req.body||{}));}catch(error){return res.status(error.code==='WEAK_PASSWORD'?400:error.status||503).json({error:error.status?error.message:error.code==='WEAK_PASSWORD'?'Use pelo menos 8 caracteres com maiúscula, minúscula e número. Evite senhas muito longas.':'Não foi possível concluir a confirmação.',code:error.code||'EMAIL_CONFIRM_UNAVAILABLE'});}}
};
