'use strict';
const service=require('../../../utils/emailCodes');
const mailer=require('../../../email/mailer');
module.exports={route:'/expapi/v1/account/email-code/request',method:'post',enabled:true,csrfProtectionNeeded:true,
 rateLimiter:require('../../../utils/ipRateLimiter').ipRateLimiter({max:5,windowMs:15*60000}),
 async execute(req,res){
  try {
   const email=service.emailValue(req.body?.email),purpose=service.purposeValue(req.body?.purpose);mailer.assertConfigured();
   // Same immediate response for existing, unknown, suspended and throttled accounts.
   require('../../../utils/telemetry').background(service.requestCode(email,purpose).catch(()=>{console.error('[EMAIL] Delivery failed; requestId='+req.id);}));
   return res.status(202).json({ok:true,message:'Se esta conta puder receber o código, enviaremos um email. Aguarde até um minuto antes de solicitar outro.',expiresInSeconds:900});
  }catch(error){return res.status(error.status||503).json({error:error.status?error.message:'Envio temporariamente indisponível.',code:error.code||'EMAIL_UNAVAILABLE'});}
 }};
