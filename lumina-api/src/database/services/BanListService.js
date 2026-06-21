const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class BanListService extends DatabaseService {
    constructor() {
        super('banlist', mongoSchema.punishList);
    }

    async addBan(guildId, targetId, staffId, reason, endTime) {
        return this.create({ guildId, targetId, staffId, reason, endTime });
    }

    async updateBan(guildId, targetId, data) {
        return this.update({ guildId, targetId }, data);
    }

    async removeBan(guildId, targetId) {
        return this.delete({ guildId, targetId });
    }
}

module.exports = new BanListService();
