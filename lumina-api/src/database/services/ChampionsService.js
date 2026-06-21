const DataBaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

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

            // Filter out invalid entries
            const validChampionsList = championsList.filter(champion => champion.championId && champion.championName);

            const bulkOps = validChampionsList.map(championData => ({
                updateOne: {
                    filter: { championId: championData.championId },
                    update: { $set: championData },
                    upsert: true
                }
            }));

            await this.model.bulkWrite(bulkOps);
            console.log('Champions data updated successfully');
        } catch (error) {
            console.error('Erro ao atualizar dados dos campeões:', error);
        }
    }

}

module.exports = new ChampionsService();