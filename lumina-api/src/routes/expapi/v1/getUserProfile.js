const jwt                       = require('jsonwebtoken');
const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const { routeError }            = require('../../../logger/logger');

const ROUTE = 'GET /expapi/v1/user/profile';

module.exports = {
    route: '/expapi/v1/user/profile',
    description: "Busca informações do perfil do usuário autenticado",
    apiKeyNeeded: false, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false, 
    method: 'get',

    async execute(req, res) {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ error: 'Token não fornecido.', code: 'MISSING_TOKEN' });

        let decoded;
        try {
            decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ error: 'Token inválido ou expirado.', code: 'INVALID_TOKEN' });
        }

        try {
            const account = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            if (!account)
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            return res.status(200).json({
                accountId: account.accountId, firstName: account.firstName, lastName: account.lastName,
                email: account.email, accessType: account.accessType || 'user',
                emailVerified: account.emailVerified || false,
                discordOauth2Id: account.discordOauth2Id || '',
                hasPassword: !!account.password,
                authProviders: Object.keys(account.authProviders || {}),
                id: account.discordOauth2Id || '', avatar: account.discordAvatar || '',
                registrationDate: account.registrationDate, lastLogin: account.lastLogin,
                blocked: account.blocked || false, banned: account.banned || false,
                emailNotifications: account.emailNotifications ?? true,
                discordNotifications: account.discordNotifications ?? true,
                botActivityAlerts: account.botActivityAlerts || false,
                publicProfile: account.publicProfile || false,
                showOnlineStatus: account.showOnlineStatus ?? true,
                language: account.language || 'en-US',
                timezone: account.timezone || 'America/Sao_Paulo',
            });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_PROFILE_ERROR',
                userMsg: 'Erro ao buscar perfil do usuário.', extra: { email: decoded?.email } });
        }
    }
};
