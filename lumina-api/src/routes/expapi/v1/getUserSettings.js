const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../database/services/DashboardAccountService');

module.exports = {
    route: '/expapi/v1/user/settings',
    description: "Busca as configurações do usuário autenticado",
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

            // Retorna as configurações do usuário (com valores padrão se não existirem)
            const userSettings = {
                emailNotifications: account.emailNotifications || true,
                discordNotifications: account.discordNotifications || true,
                botActivityAlerts: account.botActivityAlerts || false,
                publicProfile: account.publicProfile || false,
                showOnlineStatus: account.showOnlineStatus || true,
                language: account.language || 'pt-BR',
                timezone: account.timezone || 'America/Sao_Paulo'
            };

            return res.status(200).json(userSettings);
        } catch (error) {
            console.error('Erro ao buscar configurações do usuário:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
};
