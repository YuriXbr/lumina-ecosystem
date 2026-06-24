const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Hash bcrypt "fantasma" (de uma senha que nunca foi usada de verdade) usado só
// para igualar o tempo de resposta quando a conta não existe ou não tem senha,
// evitando que um atacante descubra por timing se um email está cadastrado.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8K9rfQrgrx0XJlGI3W8u/uX3jZbpES';

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

    /**
     * Valida força de senha. Usado tanto no registro tradicional
     * quanto na definição/alteração de senha (incluindo pós-OAuth2).
     */
    _validatePasswordStrength(password) {
        if (!password || typeof password !== 'string') {
            const err = new Error('Password is required');
            err.code = 'WEAK_PASSWORD';
            throw err;
        }
        if (password.length < 8 || password.length > 128) {
            const err = new Error('Password must be between 8 and 128 characters');
            err.code = 'WEAK_PASSWORD';
            throw err;
        }
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            const err = new Error('Password must contain uppercase, lowercase and numbers');
            err.code = 'WEAK_PASSWORD';
            throw err;
        }
    }

    async registerNewDashboardAccount(email, password, firstName, lastName, registrationIp, registrationUserAgent, registrationLocation, registrationCountry, registrationCity) {
        if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            throw new Error('Invalid email syntax');
        }
        this._validatePasswordStrength(password);

        const hashedPassword = bcrypt.hashSync(password, 12);

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

    /**
     * Cria uma conta a partir de um login/cadastro via OAuth2 (Discord, Google, etc.).
     * A conta nasce SEM senha — o usuário pode definir uma depois via
     * changePassword(accountId, null, novaSenha).
     */
    async createOAuthAccount({ email, firstName, lastName, emailVerified, provider, providerId, registrationIp, registrationUserAgent, registrationCountry }) {
        if (!provider || !providerId) {
            throw new Error('provider e providerId são obrigatórios');
        }
        if (!email || !/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            throw new Error('Invalid email syntax');
        }

        let generatedId = '';
        let checkUnique = null;
        do {
            generatedId = crypto.randomUUID();
            checkUnique = await this.getOne({ accountId: generatedId });
        } while (checkUnique);

        return this.create({
            accountId: generatedId,
            email,
            password: '', // sem senha até o usuário definir uma
            firstName: firstName || 'Usuário',
            lastName: lastName || provider,
            emailVerified: !!emailVerified,
            registrationIp,
            registrationUserAgent,
            registrationCountry,
            registrationDate: new Date(),
            authProviders: {
                [provider]: { providerId: String(providerId), linkedAt: new Date() }
            }
        });
    }

    /** Busca uma conta pelo par (provider, providerId), ex: ('discord', '123456789'). */
    async getDashboardAccountByProviderId(provider, providerId) {
        if (!provider || !providerId) {
            throw new Error('provider e providerId são obrigatórios');
        }
        return this.getOne({ [`authProviders.${provider}.providerId`]: String(providerId) });
    }

    /** Vincula (ou substitui) um provedor OAuth2 a uma conta já existente. */
    async linkOAuthProvider(accountId, provider, data) {
        if (!accountId || !provider) {
            throw new Error('accountId e provider são obrigatórios');
        }
        return this.update(
            { accountId },
            { $set: { [`authProviders.${provider}`]: data } }
        );
    }

    /**
     * Verifica credenciais de login por email/senha.
     * Lança um Error com `.code` em vez de retornar null, para que a rota
     * possa decidir a mensagem certa (sem expor informação sensível).
     * Códigos possíveis: INVALID_CREDENTIALS, OAUTH_ONLY, ACCOUNT_BANNED, ACCOUNT_BLOCKED.
     */
    async checkCredentials(email, password) {
        let account = null;
        try {
            account = await this.getDashboardAccountByEmail(email);
        } catch {
            account = null;
        }

        if (!account) {
            // Compare "fantasma" só para igualar o tempo de resposta (anti timing-attack)
            bcrypt.compareSync(password || '', DUMMY_HASH);
            const err = new Error('Account not found');
            err.code = 'INVALID_CREDENTIALS';
            throw err;
        }

        if (!account.password) {
            bcrypt.compareSync(password || '', DUMMY_HASH);
            const err = new Error('Account has no password set (OAuth-only)');
            err.code = 'OAUTH_ONLY';
            throw err;
        }

        const isPasswordValid = bcrypt.compareSync(password || '', account.password);
        if (!isPasswordValid) {
            const err = new Error('Invalid password');
            err.code = 'INVALID_CREDENTIALS';
            throw err;
        }

        if (account.banned) {
            const err = new Error('Account is banned');
            err.code = 'ACCOUNT_BANNED';
            throw err;
        }

        if (account.blocked) {
            const err = new Error('Account is blocked');
            err.code = 'ACCOUNT_BLOCKED';
            throw err;
        }

        return account;
    }

    /**
     * Define ou altera a senha de uma conta.
     * - Se a conta já tem senha, `currentPassword` é obrigatório e validado.
     * - Se a conta NÃO tem senha (conta criada via OAuth2), `currentPassword`
     *   pode ser `null` — é o caso de "definir senha pela primeira vez".
     */
    async changePassword(accountId, currentPassword, newPassword) {
        const account = await this.getDashboardAccountByAccountId(accountId);
        if (!account) {
            const err = new Error('Account not found');
            err.code = 'ACCOUNT_NOT_FOUND';
            throw err;
        }

        if (account.password) {
            if (!currentPassword || typeof currentPassword !== 'string' || !bcrypt.compareSync(currentPassword, account.password)) {
                const err = new Error('Current password incorrect');
                err.code = 'INVALID_CURRENT_PASSWORD';
                throw err;
            }
            if (bcrypt.compareSync(newPassword, account.password)) {
                const err = new Error('New password equals current password');
                err.code = 'SAME_PASSWORD';
                throw err;
            }
        }

        this._validatePasswordStrength(newPassword);

        const hashedPassword = bcrypt.hashSync(newPassword, 12);
        await this.update({ accountId }, { $set: { password: hashedPassword, lastPasswordChange: new Date() } });
        return true;
    }

    async getAllAccounts(options = {}) {
        const { page = 1, limit = 50, search = '', accessType = '' } = options;
        
        let query = {};
        
        // Filtro por tipo de acesso
        if (accessType) {
            query.accessType = accessType;
        }
        
        // Filtro por busca (nome, email, accountId) — regex escapado para evitar
        // ReDoS / injection via caracteres especiais de regex no termo de busca.
        if (search) {
            const safeSearch = escapeRegex(search);
            query.$or = [
                { firstName: { $regex: safeSearch, $options: 'i' } },
                { lastName: { $regex: safeSearch, $options: 'i' } },
                { email: { $regex: safeSearch, $options: 'i' } },
                { accountId: { $regex: safeSearch, $options: 'i' } }
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
