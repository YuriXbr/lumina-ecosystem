const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class WarnListService extends DatabaseService {
    constructor() {
        super('warnlist', mongoSchema.punishList);
    }

    async addWarn(guildId, targetId, staffId, reason, endTime) {
        return this.create({ guildId, targetId, staffId, reason, endTime });
    }

    async removeWarn(guildId, targetId) {
        return this.delete({ guildId, targetId });
    }
}

module.exports = new WarnListService();
