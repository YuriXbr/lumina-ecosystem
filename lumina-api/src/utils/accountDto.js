'use strict';
function accountDto(account) {
  const fields = ['accountId','firstName','lastName','email','accessType','emailVerified','discordOauth2Id','registrationDate','lastLogin','blocked','banned','emailNotifications','discordNotifications','botActivityAlerts','publicProfile','showOnlineStatus','language','timezone','username','displayName','usernameChangedAt','displayNameChangedAt','deletionRequestedAt','deletionScheduledFor','discordOauth2TokenScope'];
  const scope = account.discordOauth2TokenScope || '';
  return { ...Object.fromEntries(fields.map(key => [key, account[key]])),
    accessType: account.accessType || 'user', language: account.language || 'pt-BR', timezone: account.timezone || 'America/Sao_Paulo',
    emailVerified: !!account.emailVerified, blocked: !!account.blocked, banned: !!account.banned,
    emailNotifications: account.emailNotifications ?? true, discordNotifications: account.discordNotifications ?? true,
    botActivityAlerts: !!account.botActivityAlerts, publicProfile: !!account.publicProfile, showOnlineStatus: account.showOnlineStatus ?? true,
    discordOauth2Id: account.discordOauth2Id || '', discordOauth2TokenScope: scope,
    // A missing legacy scope is unknown, not proof that consent was revoked.
    discordNeedsReauth: !!account.discordOauth2Id && !!scope.trim() && !scope.split(/\s+/).includes('guilds'),
    hasPassword: !!account.password, authProviders: Object.keys(account.authProviders || {}),
    id: account.discordOauth2Id || '', avatar: account.discordAvatar || '',
  };
}
module.exports = { accountDto };
