'use strict';
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const DatabaseService = require('../database/services/DataBaseService');
const accounts = require('../database/services/DashboardAccountService');
const mailer = require('../email/mailer');
const {codeEmail,passwordChangedEmail}=require('../email/templates');
const DAY=86400000,TTL=15*60000,ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const states=new DatabaseService('emailchallenges',{accountId:{type:String,required:true},credentialVersion:Number,purpose:String,codeHash:String,requestId:String,expiresAt:Date,requestedAt:Date,attempts:{type:Number,default:0},consumedAt:Date,blockedUntil:Date,purgeAt:Date,deliveryState:String});
const rejections=new DatabaseService('emailrejections',{tokenHash:{type:String,required:true},accountId:{type:String,required:true},expiresAt:{type:Date,required:true},usedAt:Date});
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function digest(accountId,purpose,code) {
  if (!process.env.EMAIL_CODE_SECRET) throw new Error('EMAIL_CODE_SECRET is required');
  return crypto.createHmac('sha256',process.env.EMAIL_CODE_SECRET).update(`${accountId}:${purpose}:${code}`).digest('hex');
}
function emailValue(email) {if(typeof email!=='string'||email.length>254||!(/^[\w.+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email.trim())))throw Object.assign(new Error('Informe um email válido.'),{status:400,code:'INVALID_EMAIL'});return email.trim().toLowerCase();}
function purposeValue(purpose){if(!['verify','reset'].includes(purpose))throw Object.assign(new Error('Solicitação inválida.'),{status:400,code:'INVALID_PURPOSE'});return purpose;}
function invalidCode(){return Object.assign(new Error('Código inválido, expirado ou bloqueado. Solicite outro código.'),{status:400,code:'INVALID_EMAIL_CODE'});}
const active=(accountId,purpose,now)=>({accountId,purpose,consumedAt:null,deliveryState:'sent',attempts:{$lt:5},expiresAt:{$gt:now},$or:[{blockedUntil:null},{blockedUntil:{$lte:now}}]});
async function requestCode(email,purpose) {
  email=emailValue(email);purposeValue(purpose);mailer.assertConfigured();
  const account=await accounts.getDashboardAccountByEmail(email);
  if(!account||account.banned||account.blocked||(purpose==='verify'&&account.emailVerified))return;
  await states.connect();
  try {await states.model.updateOne({accountId:account.accountId},{$setOnInsert:{accountId:account.accountId}},{upsert:true});}catch(error){if(error.code!==11000)throw error;}
  const now=new Date(),requestId=crypto.randomUUID(),code=Array.from({length:8},()=>ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
  const state=await states.model.findOneAndUpdate({accountId:account.accountId,$and:[{$or:[{blockedUntil:null},{blockedUntil:{$lte:now}}]},{$or:[{requestedAt:null},{requestedAt:{$lte:new Date(now.getTime()-60000)}}]}]},{$set:{purpose,credentialVersion:account.sessionVersion||0,codeHash:digest(account.accountId,purpose,code),requestId,expiresAt:new Date(now.getTime()+TTL),requestedAt:now,attempts:0,consumedAt:null,purgeAt:new Date(now.getTime()+2*DAY),deliveryState:'pending'}},{new:true});
  if(!state)return;
  const rejectionToken=crypto.randomBytes(32).toString('base64url');
  await rejections.create({tokenHash:hash(rejectionToken),accountId:account.accountId,expiresAt:new Date(now.getTime()+DAY)});
  const origin=process.env.ACCOUNT_PUBLIC_ORIGIN||'https://bot.luminasink.com';
  const url=new URL('/security/code',origin);
  if(process.env.NODE_ENV==='production'&&url.protocol!=='https:')throw new Error('ACCOUNT_PUBLIC_ORIGIN requires HTTPS');
  url.hash=`token=${rejectionToken}`;
  try {
    await mailer.sendAccountEmail({to:account.email,purpose,message:codeEmail({purpose,code,rejectionUrl:url.href})});
    await states.model.updateOne({accountId:account.accountId,requestId,consumedAt:null},{$set:{deliveryState:'sent'}});
  }catch(error){await states.model.updateOne({accountId:account.accountId,requestId},{$set:{consumedAt:new Date(),codeHash:null,deliveryState:'failed'}});throw Object.assign(new Error('Não foi possível enviar o email.'),{code:'EMAIL_DELIVERY_FAILED'});}
}
async function confirmCode({email,purpose,code,newPassword}) {
  email=emailValue(email);purposeValue(purpose);
  if(typeof code!=='string'||!(/^[a-zA-Z0-9]{8}$/.test(code)))throw invalidCode();
  const account=await accounts.getDashboardAccountByEmail(email);
  if(!account||account.banned||account.blocked)throw invalidCode();
  const normalized=code.toUpperCase(),now=new Date(),codeHash=digest(account.accountId,purpose,normalized);
  const validQuery=()=>({...active(account.accountId,purpose,new Date()),codeHash,...(purpose==='reset'?{credentialVersion:account.sessionVersion||0}:{})});
  await states.connect();
  let passwordHash;
  if(purpose==='reset') {
    accounts._validatePasswordStrength(newPassword);
    // Avoid expensive password hashing on an invalid code.
    if(!await states.model.exists(validQuery())){await states.model.updateOne(active(account.accountId,purpose,now),{$inc:{attempts:1}});throw invalidCode();}
    passwordHash=await bcrypt.hash(newPassword,12);
  }
  const completed=await mongoose.connection.transaction(async session=>{
    const challenge=await states.model.findOneAndUpdate(validQuery(),{$set:{consumedAt:new Date(),codeHash:null}},{session,new:true});
    if(!challenge){await states.model.updateOne(active(account.accountId,purpose,new Date()),{$inc:{attempts:1}},{session});return false;}
    const change=purpose==='verify'?{$set:{emailVerified:true,emailVerifiedAt:new Date()}}:{$set:{password:passwordHash,emailVerified:true,emailVerifiedAt:new Date(),lastPasswordChange:new Date(),passwordAttempts:0,passwordLockedUntil:null},$inc:{sessionVersion:1}};
    const result=await accounts.model.updateOne({accountId:account.accountId,email,banned:{$ne:true},blocked:{$ne:true},...(purpose==='reset'?{$or:[{sessionVersion:account.sessionVersion||0},...(!account.sessionVersion?[{sessionVersion:{$exists:false}}]:[])]}:{})},change,{session});
    if(result.matchedCount!==1)throw invalidCode();
    return true;
  });
  if(!completed)throw invalidCode();
  if(purpose==='reset') require('./telemetry').background(mailer.sendAccountEmail({to:account.email,purpose:'alert',message:passwordChangedEmail()}));
  return {ok:true,message:purpose==='verify'?'Email confirmado com sucesso.':'Senha redefinida. Entre novamente com sua nova senha.'};
}
async function rejectCode(token) {
  if(typeof token!=='string'||!(/^[A-Za-z0-9_-]{43}$/.test(token)))throw Object.assign(new Error('Link inválido ou expirado.'),{status:400,code:'INVALID_REJECTION'});
  await states.connect();
  return mongoose.connection.transaction(async session=>{
    const now=new Date();
    const rejection=await rejections.model.findOneAndUpdate({tokenHash:hash(token),expiresAt:{$gt:now},usedAt:null},{$set:{usedAt:now}},{session,new:true});
    if(!rejection)throw Object.assign(new Error('Link inválido, expirado ou já utilizado.'),{status:400,code:'INVALID_REJECTION'});
    const blockedUntil=new Date(now.getTime()+DAY);
    await states.model.updateOne({accountId:rejection.accountId},{$set:{codeHash:null,consumedAt:now,blockedUntil,purgeAt:new Date(now.getTime()+2*DAY)}},{session,upsert:true});
    return {ok:true,blockedUntil,message:'Código invalidado. Novos códigos de verificação e recuperação estão bloqueados por 24 horas.'};
  });
}
module.exports={requestCode,confirmCode,rejectCode,emailValue,purposeValue,states,rejections,TTL,DAY};
