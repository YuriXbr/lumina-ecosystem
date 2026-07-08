const DataBaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');
const { addLog } = require('../../logger/logger');

class ChampionsService extends DataBaseService {
    constructor() {
        super('champions', mongoSchema.champions);
    }

    async getChampions() {
        return this.getAll();
    }

    async getChampionData(championId) {
        return this.getOne({ championId });
    }

    async updateChampionsDatabase(championsList) {
        try {
            await this.connect();

            const validChampionsList = championsList.filter(c => c.championId && c.championName);

            const bulkOps = validChampionsList.map(championData => ({
                updateOne: {
                    filter: { championId: championData.championId },
                    update: { $set: championData },
                    upsert: true
                }
            }));

            const result = await this.model.bulkWrite(bulkOps);
            addLog('DB', 'champions.update', `bulkWrite: ${result.upsertedCount} inseridos, ${result.modifiedCount} atualizados`);
        } catch (error) {
            addLog('DB', 'champions.error', `Erro ao atualizar campeões: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new ChampionsService();
