const LuminaApiService = require('./LuminaApiService');

class PermissionsService {
    constructor() {
        this.luminaApi = new LuminaApiService();

        this.staffCache = {
            owners: [],
            admins: [],
            moderators: [],
            expiresAt: 0
        };
    }

    async loadStaff() {
        if (Date.now() < this.staffCache.expiresAt) {
            return this.staffCache;
        }
        console.log('[PermissionsService] Fetching staff data from API...');
        const staff = await this.luminaApi.get('/expapi/internal/staff');

        this.staffCache = {
            owners: staff.owners || [],
            admins: staff.admins || [],
            moderators: staff.moderators || [],
            expiresAt: Date.now() + 15 * 60 * 1000 // 15 min
        };

        return this.staffCache;
    }

    async isBotStaff(userId, tier = 'moderator') {
        const staff = await this.loadStaff();

        switch (tier) {
            case 'owner':
                return staff.owners.includes(userId);

            case 'admin':
                return (
                    staff.owners.includes(userId) ||
                    staff.admins.includes(userId)
                );

            case 'moderator':
                return (
                    staff.owners.includes(userId) ||
                    staff.admins.includes(userId) ||
                    staff.moderators.includes(userId)
                );

            default:
                return false;
        }
    }
}

module.exports = new PermissionsService;