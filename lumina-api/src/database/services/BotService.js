const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class BotService extends DatabaseService {
    constructor() {
        super('bot', mongoSchema.bot);
    }

    async getBot() {
        return this.getOne();
    }

    async updateBot(data) {
        return this.update({}, data);
    }
}

module.exports = new BotService();