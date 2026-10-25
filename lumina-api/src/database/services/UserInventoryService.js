'use strict';
const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');
const DAY = 86400000;
const ITEMS = new Set(['hextechChests', 'masterWorkChests', 'keys']);
const CHESTS = new Set(['hextechChests', 'masterWorkChests']);
function validateQuantity(item, amount) {
  if (!ITEMS.has(item) || !Number.isSafeInteger(Number(amount)) || Number(amount) <= 0) throw new Error('Item ou quantidade inválida');
  return Number(amount);
}
class InventoryService extends DatabaseService {
  constructor() { super('inventory', mongoSchema.inventory); }
  async ensureInventory(userId) {
    if (typeof userId !== 'string' || !/^\d{16,20}$/.test(userId)) throw new Error('Invalid Discord user ID');
    await this.connect();
    try { return await this.model.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { upsert: true, new: true, setDefaultsOnInsert: true }); }
    catch (error) { if (error.code === 11000) return this.model.findOne({ userId }); throw error; }
  }
  async addInventory(userId, item, amount) {
    const quantity = validateQuantity(item, amount);
    await this.ensureInventory(userId);
    return this.model.findOneAndUpdate({ userId, [item]: { $lte: Number.MAX_SAFE_INTEGER - quantity } }, { $inc: { [item]: quantity } }, { new: true });
  }
  async removeInventory(userId, item, amount) {
    const quantity = validateQuantity(item, amount);
    await this.connect();
    return this.model.findOneAndUpdate({ userId, [item]: { $gte: quantity } }, { $inc: { [item]: -quantity } }, { new: true });
  }
  async getInventory(userId) { await this.connect(); return this.model.findOne({ userId }); }
  async getAllInventories() { await this.connect(); return this.model.find({}); }
  async resetInventory(userId) { await this.connect(); return this.model.findOneAndDelete({ userId }); }
  async claimDaily(userId) {
    await this.ensureInventory(userId);
    const now = new Date();
    const updated = await this.model.findOneAndUpdate(
      { userId, $or: [{ nextDailyReward: null }, { nextDailyReward: { $lte: now } }] },
      [{ $set: {
        hextechChests: { $add: [{ $ifNull: ['$hextechChests', 0] }, 3] },
        keys: { $add: [{ $ifNull: ['$keys', 0] }, 1] },
        dailyRewardStreak: { $cond: [{ $and: [{ $ne: [{ $ifNull: ['$dailyRewardClaim', null] }, null] }, { $gte: ['$dailyRewardClaim', new Date(now.getTime() - 2 * DAY - 3600000)] }] }, { $add: [{ $ifNull: ['$dailyRewardStreak', 0] }, 1] }, 1] },
        dailyRewardClaim: now, nextDailyReward: new Date(now.getTime() + DAY),
      } }], { new: true }
    );
    if (!updated) {
      const current = await this.model.findOne({ userId });
      return { claimed: false, nextDailyReward: current?.nextDailyReward, streak: current?.dailyRewardStreak || 0 };
    }
    return { claimed: true, reward: { hextechChests: 3, keys: 1 }, streak: updated.dailyRewardStreak, nextDailyReward: updated.nextDailyReward, inventory: updated };
  }
  async spendKeyAndChest(userId, chest) {
    if (!CHESTS.has(chest)) throw new Error('Invalid chest');
    await this.ensureInventory(userId);
    return this.model.findOneAndUpdate({ userId, keys: { $gte: 1 }, [chest]: { $gte: 1 } }, { $inc: { keys: -1, [chest]: -1 } }, { new: true });
  }
  // Debit and award are a single write, including when the process dies mid-request.
  async awardSkinAndSpend(userId, chest, skinId) {
    if (!CHESTS.has(chest) || !Number.isSafeInteger(Number(skinId))) throw new Error('Invalid chest or skin');
    await this.ensureInventory(userId);
    return this.model.findOneAndUpdate({ userId, keys: { $gte: 1 }, [chest]: { $gte: 1 } },
      { $inc: { keys: -1, [chest]: -1 }, $push: { skins: Number(skinId) } }, { new: true });
  }
  async getDailyStatus(userId) {
    const inventory = await this.getInventory(userId);
    return { available: !inventory?.nextDailyReward || new Date() >= inventory.nextDailyReward, nextDailyReward: inventory?.nextDailyReward || null, streak: inventory?.dailyRewardStreak || 0 };
  }
}
module.exports = new InventoryService();
