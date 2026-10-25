'use strict';
const nodemailer = require('nodemailer');
let transport;
function assertConfigured() {
  const method=process.env.MAIL_TRANSPORT||'smtp';
  const validCredentials=method==='smtp'?!!process.env.SMTP_PASS:method==='gmail_api'&&!!process.env.GMAIL_CLIENT_ID&&!!process.env.GMAIL_CLIENT_SECRET&&!!process.env.GMAIL_REFRESH_TOKEN;
  if (!process.env.SMTP_USER || !validCredentials || !process.env.EMAIL_CODE_SECRET || process.env.EMAIL_CODE_SECRET.length<32) throw Object.assign(new Error('O envio de emails ainda não está configurado.'),{status:503,code:'EMAIL_UNAVAILABLE'});
  if (process.env.NODE_ENV!=='production' && !process.env.MAIL_DEV_RECIPIENT) throw Object.assign(new Error('Defina MAIL_DEV_RECIPIENT para testes isolados.'),{status:503,code:'EMAIL_UNAVAILABLE'});
}
async function sendAccountEmail({to,purpose,message}) {
  assertConfigured();
  if (!transport) transport=process.env.MAIL_TRANSPORT==='gmail_api'?require('./gmailTransport'):nodemailer.createTransport({host:process.env.SMTP_HOST||'smtp.gmail.com',port:Number(process.env.SMTP_PORT||465),secure:process.env.SMTP_SECURE!=='false',requireTLS:true,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:12000,disableFileAccess:true,disableUrlAccess:true});
  const production=process.env.NODE_ENV==='production';
  const address=production?(purpose==='verify'?(process.env.MAIL_FROM_VERIFY||'verify@luminasink.com'):(process.env.MAIL_FROM_NOREPLY||'noreply@luminasink.com')):(process.env.MAIL_FROM_DEV||'devenv@luminasink.com');
  return transport.sendMail({from:{name:production?'Lumina':'Lumina · Desenvolvimento',address},to:production?to:process.env.MAIL_DEV_RECIPIENT,replyTo:process.env.MAIL_REPLY_TO||'suporte@luminasink.com',...message});
}
module.exports={assertConfigured,sendAccountEmail};
