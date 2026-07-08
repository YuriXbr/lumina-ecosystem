const jwt                       = require('jsonwebtoken');
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
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Token não fornecido.', code: 'MISSING_TOKEN' });

        let decoded;
        try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET); }
        catch { return res.status(401).json({ error: 'Token inválido.', code: 'INVALID_TOKEN' }); }

        try {
            const adminAccount = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            if (!adminAccount) return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            const userLevel = ACCESS_LEVELS[adminAccount.accessType] || 0;
            if (userLevel < 5)
                return res.status(403).json({ error: 'Permissão insuficiente.', code: 'INSUFFICIENT_PERMISSION' });

            const users = await DashboardAccountService.getAllAccounts({
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50,
                search: req.query.search || '',
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
