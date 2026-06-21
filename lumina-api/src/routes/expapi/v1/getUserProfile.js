const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../database/services/DashboardAccountService');

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
        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const email = decoded.email;

            // Busca a conta do usuário no Dashboard
            const account = await DashboardAccountService.getDashboardAccountByEmail(email);
            if (!account) {
                return res.status(404).json({ error: 'Conta não encontrada' });
            }

            // Retorna apenas as informações necessárias (sem dados sensíveis)
            const userProfile = {
                accountId: account.accountId,
                firstName: account.firstName,
                lastName: account.lastName,
                email: account.email,
                accessType: account.accessType || 'user',
                emailVerified: account.emailVerified || false,
                discordOauth2Id: account.discordOauth2Id || '',
                // Campos para compatibilidade com inventory page
                id: account.discordOauth2Id || '',
                avatar: account.discordAvatar || '',
                registrationDate: account.registrationDate,
                lastLogin: account.lastLogin,
                blocked: account.blocked || false,
                banned: account.banned || false,
                // Configurações do usuário
                emailNotifications: account.emailNotifications || true,
                discordNotifications: account.discordNotifications || true,
                botActivityAlerts: account.botActivityAlerts || false,
                publicProfile: account.publicProfile || false,
                showOnlineStatus: account.showOnlineStatus || true,
                language: account.language || 'en-US',
                timezone: account.timezone || 'America/Sao_Paulo'
            };

            return res.status(200).json(userProfile);
        } catch (error) {
            console.error('Erro ao buscar perfil do usuário:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
};
