'use strict';
const DashboardAccountService = require('../database/services/DashboardAccountService');
async function resolveDiscordAccount(email) {
    const account = email && typeof email === 'object' ? email : await DashboardAccountService.getDashboardAccountByEmail(email);
    if (!account) throw { status: 404, code: 'ACCOUNT_NOT_FOUND', message: 'Conta não encontrada.' };
    if (account.banned || account.blocked) throw { status: 403, code: 'ACCOUNT_SUSPENDED', message: 'Conta suspensa.' };
    const discordId = account.authProviders?.discord?.providerId || account.discordOauth2Id;
    if (typeof discordId !== 'string' || !/^\d{16,20}$/.test(discordId)) throw { status: 403, code: 'DISCORD_NOT_LINKED', message: 'Vincule sua conta Discord nas configurações.' };
    return { account, discordId };
}
module.exports = { resolveDiscordAccount };
