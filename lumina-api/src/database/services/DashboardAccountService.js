const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class DashboardAccountService extends DatabaseService {
    constructor() {
        super('dashboardaccounts', mongoSchema.dashboardAccounts);
    }

    async getDashboardAccountByEmail(email) {
        if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            throw new Error('Invalid email syntax');
        }
        return this.getOne({ email });
    }

    async registerNewDashboardAccount(email, password, firstName, lastName, registrationIp, registrationUserAgent, registrationLocation, registrationCountry, registrationCity) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            throw new Error('Invalid email syntax');
        }
        
        // Geração segura de ID usando crypto
        let generatedId = '';
        let checkUnique = null;
        do {
            generatedId = crypto.randomUUID();
            checkUnique = await this.getOne({ accountId: generatedId }); // CORREÇÃO: usar accountId
        } while (checkUnique);
        
        return this.create({
            accountId: generatedId,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            registrationIp,
            registrationUserAgent,
            registrationLocation,
            registrationCountry,
            registrationCity,
            registrationDate: new Date()
        });
    }

    async checkCredentials(email, password) {
        try {
            const account = await this.getDashboardAccountByEmail(email);
            if (!account) throw new Error('Account not found');
            const isPasswordValid = bcrypt.compareSync(password, account.password);
            if (!isPasswordValid) throw new Error('Invalid password');
            return account;
        } catch (error) {
            return null
        }
    }

    async getAllAccounts(options = {}) {
        const { page = 1, limit = 50, search = '', accessType = '' } = options;
        
        let query = {};
        
        // Filtro por tipo de acesso
        if (accessType) {
            query.accessType = accessType;
        }
        
        // Filtro por busca (nome, email, accountId)
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { accountId: { $regex: search, $options: 'i' } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        return this.get(query, {}, { skip, limit, sort: { registrationDate: -1 } });
    }

    async getDashboardAccountByAccountId(accountId) {
        if (!accountId) {
            throw new Error('Account ID is required');
        }
        return this.getOne({ accountId });
    }

    async updateAccount(accountId, updateData) {
        if (!accountId) {
            throw new Error('Account ID is required');
        }
        if (typeof updateData !== 'object') {
            throw new Error('Update data must be an object');
        }
        
        // Remove campos sensíveis que não devem ser atualizados diretamente
        const { password, accountId: _, ...safeUpdateData } = updateData;
        
        return this.update({ accountId }, { $set: safeUpdateData });
    }
}

module.exports = new DashboardAccountService();
