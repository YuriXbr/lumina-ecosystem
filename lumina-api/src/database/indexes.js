'use strict';
module.exports = {
  botconsoleevents: [[{eventId:1},{unique:true}],[{expiresAt:1},{expireAfterSeconds:0}]],
  botruntime: [[{workerId:1},{unique:true}],[{expiresAt:1},{expireAfterSeconds:0}],[{lastSeenAt:1},{}]],
  botconsolecommands: [[{requestId:1},{unique:true}],[{expiresAt:1},{expireAfterSeconds:0}],[{state:1,deadline:1,leaseUntil:1,createdAt:1},{}],[{requestedBy:1,createdAt:-1},{}]],
  emailchallenges: [[{accountId:1},{unique:true}],[{purgeAt:1},{expireAfterSeconds:0}]],
  emailrejections: [[{tokenHash:1},{unique:true}],[{expiresAt:1},{expireAfterSeconds:0}]],
  dashboardaccounts: [
    [{ usernameLower: 1 }, { name: 'username_normalized_unique', unique: true, partialFilterExpression: { usernameLower: { $type: 'string', $gt: '' } } }],
    [{ 'authProviders.discord.providerId': 1 }, { name: 'discord_provider_unique', unique: true, partialFilterExpression: { 'authProviders.discord.providerId': { $type: 'string', $gt: '' } } }],
    [{ deletionScheduledFor: 1 }, { name: 'account_closure_due' }],
  ],
  apicache: [[{ expiresAt:1 },{expireAfterSeconds:0}]],
  apilogs: [[{ expiresAt:1 },{expireAfterSeconds:0}],[{requestId:1},{}],[{level:1,createdAt:-1},{}],[{route:1,createdAt:-1},{}]],
  ipRateLimits: [[{ ip: 1, route: 1 }, { unique: true }], [{ updatedAt: 1 }, { expireAfterSeconds: 604800 }]],
  banlist: [[{ processedAt: 1, endTime: 1, leaseUntil: 1 }, {}]],
  mutelist: [[{ processedAt: 1, endTime: 1, leaseUntil: 1 }, {}]],
  warnlist: [[{ processedAt: 1, endTime: 1, leaseUntil: 1 }, {}]],
  userbadges: [[{ userEmail: 1, badgeCode: 1 }, { unique: true, name: 'user_badge_unique' }]],
  newsPosts: [[{ pinned: -1, publishedAt: -1 }, { name: 'news_feed' }]],
  revokedsessions: [[{ tokenHash: 1 }, { unique: true }], [{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
  oauthtransactions: [[{ nonceHash: 1 }, { unique: true }], [{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
  oauthexchanges: [[{ codeHash: 1 }, { unique: true }], [{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
};
