'use strict';
// Dry-run by default. Never deletes records or resolves duplicates silently.
const path = require('path');
require('@dotenvx/dotenvx').config({path:path.resolve(__dirname,'..',process.env.NODE_ENV==='production'?'.env':'.env.dev'),quiet:true});
const mongoose = require('mongoose');
const fs = require('fs');
const { encryptSecret } = require('../src/utils/secretEncryption');
const apply = process.argv.includes('--apply');
async function main() {
  await mongoose.connect(process.env.MONGODB_URI,{autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:5000});
  const directory = path.resolve(__dirname,'../src/database/services');
  for (const file of fs.readdirSync(directory)) if (/Service\.js$/.test(file) && file!=='DataBaseService.js') require(path.join(directory,file));
  require('../src/utils/sessionStore');
  require('../src/utils/emailCodes');
  require('../src/utils/ipRateLimiter');
  require('../src/utils/botConsole');
  const accounts = mongoose.connection.collection('dashboardaccounts');
  const duplicateChecks = [
    ['dashboardaccounts',[{$match:{username:{$type:'string',$gt:''}}},{$group:{_id:{$toLower:'$username'},count:{$sum:1}}},{$match:{count:{$gt:1}}}]],
    ['dashboardaccounts',[{$match:{'authProviders.discord.providerId':{$type:'string',$gt:''}}},{$group:{_id:'$authProviders.discord.providerId',count:{$sum:1}}},{$match:{count:{$gt:1}}}]],
    ['userbadges',[{$group:{_id:{userEmail:'$userEmail',badgeCode:'$badgeCode'},count:{$sum:1}}},{$match:{count:{$gt:1}}}]],
  ];
  let conflicts = 0;
  for (const [collection,pipeline] of duplicateChecks) {
    const count = (await mongoose.connection.collection(collection).aggregate([...pipeline,{$count:'count'}]).toArray())[0]?.count || 0;
    conflicts += count; console.log(JSON.stringify({collection,duplicateGroups:count}));
  }
  if (conflicts) throw new Error('Duplicate groups require manual reconciliation; no changes applied.');
  const current = await accounts.indexes();
  const obsolete = current.filter(index => (index.key.deletionScheduledFor && index.expireAfterSeconds!==undefined) || (index.key.usernameLower && index.name!=='username_normalized_unique' && !index.unique));
  console.log(JSON.stringify({mode:apply?'apply':'dry-run',obsoleteIndexes:obsolete.map(i=>i.name),models:mongoose.modelNames()}));
  if (!apply) return;
  for (const index of obsolete) await accounts.dropIndex(index.name);
  await accounts.updateMany({username:''},{$unset:{username:'',usernameLower:''}});
  await accounts.updateMany({username:{$type:'string',$gt:''}},[{$set:{usernameLower:{$toLower:'$username'}}}]);
  for await (const account of accounts.find({},{projection:{discordOauth2Token:1,discordOauth2RefreshToken:1}})) {
    for (const field of ['discordOauth2Token','discordOauth2RefreshToken']) {
      const value = account[field];
      if (value && !value.startsWith('v1.')) await accounts.updateOne({_id:account._id,[field]:value},{$set:{[field]:encryptSecret(value)}});
    }
  }
  for (const name of mongoose.modelNames()) await mongoose.model(name).createIndexes();
  console.log('Security migration completed. No credentials or user records exported.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
