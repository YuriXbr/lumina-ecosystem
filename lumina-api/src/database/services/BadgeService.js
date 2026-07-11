const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

/**
 * BadgeService — gerencia definições de badges (códigos resgatáveis).
 *
 * Badges são medalhas criadas por admins e resgatadas por usuários via código.
 * O registro de quem resgatou qual badge fica em UserBadgeService.
 */
class BadgeService extends DatabaseService {
    constructor() {
        super('badges', mongoSchema.badges);
    }

    async getByCode(code) {
        return this.getOne({ code });
    }

    async listActive() {
        const now = new Date();
        return this.get({
            active: true,
            availableFrom: { $lte: now },
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: now } },
            ],
        });
    }

    async createBadge(data) {
        return this.create(data);
    }

    async updateByCode(code, data) {
        return this.update({ code }, data);
    }

    async deleteByCode(code) {
        return this.delete({ code });
    }

    async countRedemptions(code) {
        // Delega para UserBadgeService via lazy require (evita ciclo)
        const UserBadgeService = require('./UserBadgeService');
        return UserBadgeService.countByBadge(code);
    }
}

module.exports = new BadgeService();
