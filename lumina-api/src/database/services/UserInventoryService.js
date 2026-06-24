const DatabaseService = require('./DataBaseService.js');
const { mongoSchema } = require('../schema.js');

// Recompensa fixa do resgate diário. Centralizado aqui para que o bot (/daily)
// e o dashboard (/expapi/v1/dailyreward) usem sempre os mesmos valores.
const DAILY_REWARD = {
    hextechChests: 3,
    keys: 1,
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
// Janela de tolerância para manter a sequência (streak): resgatando dentro de
// até 48h da última vez, a streak continua subindo. Depois disso, zera pra 1.
const STREAK_WINDOW_MS = 2 * DAY_IN_MS;

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

    /**
     * Resgata a recompensa diária do usuário (3 Baús Hextech + 1 Chave).
     * Cria o inventário se ele ainda não existir. Usado tanto pelo comando
     * /daily do bot quanto pela rota /expapi/v1/dailyreward do dashboard,
     * garantindo que os dois caminhos fiquem sempre consistentes.
     *
     * @param {string} userId - ID do Discord do usuário
     * @returns {Promise<object>}
     *   Sucesso:    { claimed: true, reward, streak, nextDailyReward, inventory }
     *   Em cooldown: { claimed: false, nextDailyReward, streak }
     */
    async claimDaily(userId) {
        await this.connect();

        let inventory = await this.model.findOne({ userId });
        if (!inventory) {
            inventory = await this.model.create({ userId });
        }

        const now = new Date();
        const nextAvailable = inventory.nextDailyReward ? new Date(inventory.nextDailyReward) : null;

        // Ainda dentro do cooldown de 24h: não libera o resgate.
        if (nextAvailable && now < nextAvailable) {
            return {
                claimed: false,
                nextDailyReward: nextAvailable,
                streak: inventory.dailyRewardStreak || 0,
            };
        }

        const lastClaim = inventory.dailyRewardClaim ? new Date(inventory.dailyRewardClaim) : null;
        const keepsStreak = lastClaim && (now.getTime() - lastClaim.getTime()) <= STREAK_WINDOW_MS;
        const newStreak = keepsStreak ? (inventory.dailyRewardStreak || 0) + 1 : 1;
        const nextDailyReward = new Date(now.getTime() + DAY_IN_MS);

        const updated = await this.model.findOneAndUpdate(
            { userId },
            {
                $inc: {
                    hextechChests: DAILY_REWARD.hextechChests,
                    keys: DAILY_REWARD.keys,
                },
                $set: {
                    dailyRewardClaim: now,
                    nextDailyReward,
                    dailyRewardStreak: newStreak,
                },
            },
            { new: true, upsert: true }
        );

        return {
            claimed: true,
            reward: DAILY_REWARD,
            streak: newStreak,
            nextDailyReward,
            inventory: updated,
        };
    }

    /**
     * Consulta o status da diária sem resgatar (usado pra exibir o
     * contador/disponibilidade antes do usuário confirmar o resgate).
     */
    async getDailyStatus(userId) {
        await this.connect();
        const inventory = await this.model.findOne({ userId });

        const nextDailyReward = inventory?.nextDailyReward ? new Date(inventory.nextDailyReward) : null;
        const available = !nextDailyReward || new Date() >= nextDailyReward;

        return {
            available,
            nextDailyReward,
            streak: inventory?.dailyRewardStreak || 0,
        };
    }
}

module.exports = new InventoryService();