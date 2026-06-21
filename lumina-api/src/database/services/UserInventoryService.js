const DatabaseService = require('./DataBaseService.js');
const { mongoSchema } = require('../schema.js');

class InventoryService extends DatabaseService {
    constructor() {
        super('inventory', mongoSchema.inventory);
    }

    async addInventory(userId, item, amount) {
        await this.connect();
        const query = { userId };
        const update = { $inc: { [item]: amount } };
        return this.model.findOneAndUpdate(query, update, { upsert: true, new: true });
    }

    async removeInventory(userId, item, amount) {
        await this.connect();
        const query = { userId };
        const update = { $inc: { [item]: -amount } };
        return this.model.findOneAndUpdate(query, update, { upsert: true, new: true });
    }

    async getInventory(userId) {
        await this.connect();
        return this.model.findOne({ userId });
    }

    async getAllInventories() {
        await this.connect();
        return this.model.find({});
    }

    async resetInventory(userId) {
        await this.connect();
        return this.model.findOneAndDelete({userId });
    }
}

module.exports = new InventoryService();