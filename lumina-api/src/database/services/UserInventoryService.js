const DatabaseService = require('./DataBaseService.js');
const { mongoSchema } = require('../schema.js');
const { addLog } = require('../../logger/logger');

const DAILY_REWARD = {
    hextechChests: 3,
    keys: 1,
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const STREAK_WINDOW_MS = 2 * DAY_IN_MS;

// Whitelist de itens que podem ser adicionados/removidos do inventário.
// Prevenção contra NoSQL injection: sem isto, um attacker com a internal-key
// poderia passar item="_id" ou item="dailyRewardStreak" e corromper campos
// arbitrários do documento via $inc.
const ALLOWED_ITEMS = new Set([
    'hextechChests',
    'masterWorkChests',
    'keys',
]);

class InventoryService extends DatabaseService {
    constructor() {
        super('inventory', mongoSchema.inventory);
    }

    async addInventory(userId, item, amount) {
        if (!ALLOWED_ITEMS.has(item)) {
            throw new Error(`Item inválido: ${item}`);
        }
        const qty = Number(amount);
        if (!Number.isFinite(qty) || qty <= 0) {
            throw new Error(`Quantidade inválida: ${amount}`);
        }
        await this.connect();
        return this.model.findOneAndUpdate(
            { userId },
            { $inc: { [item]: qty } },
            { upsert: true, new: true }
        );
    }

    async removeInventory(userId, item, amount) {
        if (!ALLOWED_ITEMS.has(item)) {
            throw new Error(`Item inválido: ${item}`);
        }
        const qty = Number(amount);
        if (!Number.isFinite(qty) || qty <= 0) {
            throw new Error(`Quantidade inválida: ${amount}`);
        }
        await this.connect();
        return this.model.findOneAndUpdate(
            { userId },
            { $inc: { [item]: -qty } },
            { upsert: true, new: true }
        );
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
        return this.model.findOneAndDelete({ userId });
    }

    /**
     * Resgata a recompensa diária do usuário (3 Baús Hextech + 1 Chave).
     * Cria o inventário se ele ainda não existir.
     */
    async claimDaily(userId) {
        await this.connect();

        let inventory = await this.model.findOne({ userId });
        if (!inventory) {
            inventory = await this.model.create({ userId });
        }

        const now = new Date();
        const nextAvailable = inventory.nextDailyReward ? new Date(inventory.nextDailyReward) : null;

        if (nextAvailable && now < nextAvailable) {
            return {
                claimed: false,
                nextDailyReward: nextAvailable,
                streak: inventory.dailyRewardStreak || 0,
            };
        }

        const lastClaim = inventory.dailyRewardClaim ? new Date(inventory.dailyRewardClaim) : null;
        // Grace period: 1 hour buffer beyond the 48h window (B-H10)
    const GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour
    const keepsStreak = lastClaim && (now.getTime() - lastClaim.getTime()) <= (STREAK_WINDOW_MS + GRACE_PERIOD_MS);
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

        addLog('DB', 'inventory.daily', `Diária resgatada (user=${userId}, streak=${newStreak})`);

        return {
            claimed: true,
            reward: DAILY_REWARD,
            streak: newStreak,
            nextDailyReward,
            inventory: updated,
        };
    }

    /**
     * Gasta atomicamente 1 chave + 1 baú do tipo informado, SE E SOMENTE SE o
     * usuário tiver ambos disponíveis no momento exato da operação no banco.
     *
     * CORREÇÃO DE SEGURANÇA (race condition / TOCTOU): a implementação anterior
     * fazia getInventory() -> calculava (quantidade - 1) em memória -> update().
     * Duas requisições simultâneas (ex: o usuário clicando 2x rápido, ou um
     * script automatizado) liam o MESMO saldo antes de qualquer uma escrever,
     * então ambas passavam na checagem "> 0" e ambas debitavam — permitindo
     * gastar 1 chave real e receber 2 skins (double-spend / duplicação de item).
     *
     * A versão abaixo usa um findOneAndUpdate condicional: o filtro exige
     * `keys >= 1 AND [chest] >= 1` no MESMO comando atômico que decrementa.
     * O MongoDB garante que apenas uma requisição concorrente pode satisfazer
     * a condição por vez — a segunda simplesmente não encontra documento e
     * recebe `null`, sem nunca decrementar abaixo de zero.
     *
     * @returns {Promise<object|null>} o inventário já atualizado, ou null se
     *          o usuário não tinha chave/baú suficiente.
     */
    async spendKeyAndChest(userId, chest) {
        await this.connect();

        // Garante que o documento existe antes da tentativa condicional
        // (upsert aqui poderia criar o doc já "gastando" recurso inexistente).
        await this.model.findOneAndUpdate(
            { userId },
            { $setOnInsert: { userId } },
            { upsert: true, new: false }
        );

        return this.model.findOneAndUpdate(
            { userId, keys: { $gte: 1 }, [chest]: { $gte: 1 } },
            { $inc: { keys: -1, [chest]: -1 } },
            { new: true }
        );
    }

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
