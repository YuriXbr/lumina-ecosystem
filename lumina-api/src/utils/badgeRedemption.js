'use strict';
const mongoose = require('mongoose');
const BadgeService = require('../database/services/BadgeService');
const UserBadgeService = require('../database/services/UserBadgeService');
const { connectDatabase } = require('../database/services/DataBaseService');
const LEVELS = { user:0,vipUser:1,enterpriseUser:2,contentCreator:3,tester:4,support:5,moderator:6,admin:7,headadmin:8,developer:9,coowner:10,owner:11 };
function fail(code, status, message) { throw Object.assign(new Error(message), { code, status }); }
async function redeemBadge(account, code, via) {
  if (!account || account.banned || account.blocked) fail('ACCOUNT_SUSPENDED',403,'Conta indisponível.');
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(code.trim())) fail('INVALID_CODE',400,'Código inválido.');
  const normalized = code.trim().toUpperCase();
  await connectDatabase();
  try {
    return await mongoose.connection.transaction(async session => {
      const badge = await BadgeService.model.findOne({ code: normalized }).session(session).lean();
      if (!badge) fail('BADGE_NOT_FOUND',404,'Código de badge inválido.');
      const now = new Date();
      if (!badge.active) fail('BADGE_INACTIVE',403,'Badge indisponível.');
      if (badge.availableFrom > now) fail('BADGE_NOT_YET_AVAILABLE',403,'Badge ainda indisponível.');
      if (badge.expiresAt && badge.expiresAt <= now) fail('BADGE_EXPIRED',403,'Badge expirada.');
      if ((LEVELS[account.accessType] || 0) < (LEVELS[badge.minAccessLevel] || 0)) fail('INSUFFICIENT_ACCESS_LEVEL',403,'Permissão insuficiente.');
      if (await UserBadgeService.model.exists({ userEmail: account.email, badgeCode: normalized }).session(session)) fail('BADGE_ALREADY_REDEEMED',409,'Você já resgatou esta badge.');
      const count = await UserBadgeService.model.countDocuments({ badgeCode: normalized }).session(session);
      if (badge.maxRedemptions > 0 && count >= badge.maxRedemptions) fail('BADGE_LIMIT_REACHED',403,'Limite de resgates atingido.');
      // Every redemption writes the badge, preventing count-then-insert write skew.
      await BadgeService.model.updateOne({ _id: badge._id }, { $inc: { redemptionVersion: 1 } }, { session });
      await UserBadgeService.model.create([{ userEmail: account.email, accountId: account.accountId, badgeCode: normalized, redeemedAt: now, redeemedVia: via }], { session });
      return { code: badge.code, name: badge.name, description: badge.description, imageUrl: badge.imageUrl, rarity: badge.rarity, highlightColor: badge.highlightColor };
    });
  } catch (error) {
    if (error.code === 11000) fail('BADGE_ALREADY_REDEEMED',409,'Você já resgatou esta badge.');
    throw error;
  }
}
module.exports = { redeemBadge };
