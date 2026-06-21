const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class MuteListService extends DatabaseService {
    constructor() {
        super('mutelist', mongoSchema.punishList);
    }

    async addMute(guildId, targetId, staffId, reason, endTime) {
        return this.create({ guildId, targetId, staffId, reason, endTime });
    }

    async updateMute(guildId, targetId, data) {
        return this.update({ guildId, targetId }, data);
    }

    async removeMute(guildId, targetId) {
        return this.delete({ guildId, targetId });
    }
}

module.exports = new MuteListService();
