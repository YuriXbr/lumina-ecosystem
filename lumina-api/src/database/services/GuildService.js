const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class GuildService extends DatabaseService {
    constructor() {
        super('guilds', mongoSchema.guilds);
    }

    async getGuildData(guildId) {
        return this.getOne({ guildId });
    }

    async createGuildData(guildData) {
        return this.create(guildData);
    }

    async updateGuildData(guildId, data) {
        if (typeof guildId !== 'string') throw new Error('guildId must be a string');
        if (typeof data !== 'object') throw new Error('data must be an object');
        return this.update({ guildId }, data);
    }
}

module.exports = new GuildService();
