'use strict';
const mongoose=require('mongoose');
const accounts=require('../database/services/DashboardAccountService');
async function purgeDueAccounts(limit=25) {
 await accounts.connect();
 const due=await accounts.model.find({deletionScheduledFor:{$lte:new Date(),$ne:null}},{accountId:1}).limit(limit).lean();
 let processed=0;
 for(const candidate of due) {
  const removed=await mongoose.connection.transaction(async session=>{
   // Recheck inside the transaction so a simultaneous login/cancellation wins safely.
   const account=await accounts.model.findOneAndDelete({accountId:candidate.accountId,deletionScheduledFor:{$lte:new Date(),$ne:null}},{session}).lean();
   if(!account)return false;
   const db=mongoose.connection.db;
   await db.collection('userbadges').deleteMany({$or:[{accountId:account.accountId},{userEmail:account.email}]},{session});
   await db.collection('emailchallenges').deleteMany({accountId:account.accountId},{session});
   await db.collection('emailrejections').deleteMany({accountId:account.accountId},{session});
   const discordId=account.authProviders?.discord?.providerId||account.discordOauth2Id;
   if(discordId&&!await accounts.model.exists({$or:[{discordOauth2Id:discordId},{'authProviders.discord.providerId':discordId}]}).session(session)) {
    await db.collection(require('../database/services/UserInventoryService').model.collection.name).deleteMany({userId:discordId},{session});
   }
   // Moderation cases remain under their own retention policy. Personal account logs are anonymized.
   await db.collection('apilogs').updateMany({userEmail:account.email},{$set:{userEmail:'',userId:'',ip:'',userAgent:'',extra:{},message:'Evento de conta excluída'}},{session});
   return true;
  });
  if(removed)processed++;
 }
 return {processed};
}
module.exports={purgeDueAccounts};
