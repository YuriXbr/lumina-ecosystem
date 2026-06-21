const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class SkinlinesService extends DatabaseService {
    constructor() {
        super('skinslines', mongoSchema.skinlines);
    }

    async getSkinlines() {
        return this.getAll();
    }

    async getSkinlineData(skinlineId) {
        return this.getOne({ skinlineId });
    }

    async updateSkinlinesDatabase(skinlinesList) {
        try {
            await this.connect();

            const bulkOps = skinlinesList.map(skinlineData => ({
                updateOne: {
                    filter: { id: skinlineData.skinlineId },
                    update: { $set: skinlineData },
                    upsert: true
                }
            }));

            await this.model.bulkWrite(bulkOps);
            console.log('Skinlines data updated successfully');
        } catch (error) {
            console.error('Erro ao atualizar dados das linhas de skins:', error);
        }
    }
}

module.exports = new SkinlinesService();