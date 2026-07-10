const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const { routeError }            = require('../../../../logger/logger');

const ROUTE = 'GET /expapi/v1/admin/users';
const ACCESS_LEVELS = { user:0,vipUser:1,enterpriseUser:2,contentCreator:3,tester:4,
    support:5,moderator:6,admin:7,headadmin:8,developer:9,coowner:10,owner:11 };

module.exports = {
    route: '/expapi/v1/admin/users',
    description: "Busca lista de usuários para administração",
    apiKeyNeeded: false, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false, 
    method: 'get',

    async execute(req, res) {
        const { verifyRequestAuth } = require('../../../../utils/authHelpers');
        const { user: decoded, error: authError } = verifyRequestAuth(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            const adminAccount = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            if (!adminAccount) return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            const userLevel = ACCESS_LEVELS[adminAccount.accessType] || 0;
            if (userLevel < 5)
                return res.status(403).json({ error: 'Permissão insuficiente.', code: 'INSUFFICIENT_PERMISSION' });

            // Limites seguros: page mínimo 1, limit entre 1 e 100
            const safePage  = Math.max(parseInt(req.query.page)  || 1, 1);
            const safeLimit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);

            const users = await DashboardAccountService.getAllAccounts({
                page:       safePage,
                limit:      safeLimit,
                search:     req.query.search     || '',
                accessType: req.query.accessType || '',
            });

            const sanitizedUsers = users.map(user => {
                const base = { 
                    accountId: user.accountId, 
                    firstName: user.firstName, 
                    lastName: user.lastName,
                    email: user.email, 
                    accessType: user.accessType, 
                    emailVerified: user.emailVerified,
                    registrationDate: user.registrationDate, 
                    lastLogin: user.lastLogin,
                    blocked: user.blocked, 
                    banned: user.banned 
                };
                if (userLevel >= 6) { 
                    base.discordOauth2Id = user.discordOauth2Id; 
                    base.discordLinked = !!user.discordOauth2Id; 
                }
                if (userLevel >= 7) { 
                    base.emailNotifications = user.emailNotifications;
                    base.discordNotifications = user.discordNotifications; 
                    base.botActivityAlerts = user.botActivityAlerts; 
                }
                return base;
            });

            return res.status(200).json({ 
                users: sanitizedUsers, 
                pagination: { page: safePage, 
                    limit: safeLimit, 
                    total: users.length, 
                    hasMore: users.length === safeLimit 
                } 
            });
        } catch (error) {
            return routeError({ 
                res, 
                error, 
                route: ROUTE, 
                errorCode: 'FETCH_USERS_ERROR',
                userMsg: 'Erro ao buscar usuários.', 
                extra: { email: decoded?.email } 
            });
        }
    }
};
