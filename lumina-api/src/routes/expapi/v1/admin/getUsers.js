const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../../database/services/DashboardAccountService');

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
        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const email = decoded.email;

            // Busca a conta do usuário que está fazendo a requisição
            const adminAccount = await DashboardAccountService.getDashboardAccountByEmail(email);
            if (!adminAccount) {
                return res.status(404).json({ error: 'Conta não encontrada' });
            }

            // Verifica se o usuário tem permissão para ver usuários (nível 5+)
            const accessLevels = {
                user: 0, vipUser: 1, enterpriseUser: 2, contentCreator: 3, tester: 4,
                support: 5, moderator: 6, admin: 7, headadmin: 8, developer: 9, coowner: 10, owner: 11
            };

            const userLevel = accessLevels[adminAccount.accessType] || 0;
            if (userLevel < 5) {
                return res.status(403).json({ error: 'Permissão insuficiente' });
            }

            // Query parameters
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const search = req.query.search || '';
            const accessType = req.query.accessType || '';

            // Busca todos os usuários (com filtros se fornecidos)
            const users = await DashboardAccountService.getAllAccounts({
                page,
                limit,
                search,
                accessType
            });

            // Remove dados sensíveis baseado no nível do usuário
            const sanitizedUsers = users.map(user => {
                const baseData = {
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

                // Moderadores+ podem ver informações do Discord
                if (userLevel >= 6) {
                    baseData.discordOauth2Id = user.discordOauth2Id;
                    baseData.discordLinked = !!user.discordOauth2Id;
                }

                // Admins+ podem ver configurações de notificação
                if (userLevel >= 7) {
                    baseData.emailNotifications = user.emailNotifications;
                    baseData.discordNotifications = user.discordNotifications;
                    baseData.botActivityAlerts = user.botActivityAlerts;
                }

                return baseData;
            });

            return res.status(200).json({
                users: sanitizedUsers,
                pagination: {
                    page,
                    limit,
                    total: users.length,
                    hasMore: users.length === limit
                }
            });
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
};
