const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

/**
 * UserBadgeService — gerencia o registro de quais usuários resgataram quais badges.
 *
 * Tabela N:N entre dashboardAccounts e badges.
 * Cada documento representa uma redenção única ( userEmail + badgeCode ).
 */
class UserBadgeService extends DatabaseService {
    constructor() {
        super('userbadges', mongoSchema.userBadges);
    }

    async getByUser(userEmail) {
        return this.get({ userEmail });
    }

    async getByBadge(badgeCode) {
        return this.get({ badgeCode });
    }

    async hasRedeemed(userEmail, badgeCode) {
        const doc = await this.getOne({ userEmail, badgeCode });
        return !!doc;
    }

    async countByBadge(badgeCode) {
        return this.count({ badgeCode });
    }

    async redeem(userEmail, badgeCode, via = 'dashboard') {
        return this.create({ userEmail, badgeCode, redeemedAt: new Date(), redeemedVia: via });
    }

    async remove(userEmail, badgeCode) {
        return this.delete({ userEmail, badgeCode });
    }
}

module.exports = new UserBadgeService();
