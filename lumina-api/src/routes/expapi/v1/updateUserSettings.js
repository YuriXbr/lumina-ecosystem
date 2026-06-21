const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../database/services/DashboardAccountService');

module.exports = {
    route: '/expapi/v1/user/settings',
    description: "Atualiza as configurações do usuário autenticado",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'put',

    async execute(req, res) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const email = decoded.email;

            // Valida os dados de entrada
            const {
                emailNotifications,
                discordNotifications,
                botActivityAlerts,
                publicProfile,
                showOnlineStatus,
                language,
                timezone
            } = req.body;

            // Validações básicas
            const allowedLanguages = ['pt-BR', 'en-US', 'es-ES'];
            const allowedTimezones = ['America/Sao_Paulo', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];

            if (language && !allowedLanguages.includes(language)) {
                return res.status(400).json({ error: 'Idioma inválido' });
            }

            if (timezone && !allowedTimezones.includes(timezone)) {
                return res.status(400).json({ error: 'Fuso horário inválido' });
            }

            // Busca a conta do usuário
            const account = await DashboardAccountService.getDashboardAccountByEmail(email);
            if (!account) {
                return res.status(404).json({ error: 'Conta não encontrada' });
            }

            // Prepara os dados para atualização (apenas campos que foram fornecidos)
            const updateData = {};
            if (typeof emailNotifications === 'boolean') updateData.emailNotifications = emailNotifications;
            if (typeof discordNotifications === 'boolean') updateData.discordNotifications = discordNotifications;
            if (typeof botActivityAlerts === 'boolean') updateData.botActivityAlerts = botActivityAlerts;
            if (typeof publicProfile === 'boolean') updateData.publicProfile = publicProfile;
            if (typeof showOnlineStatus === 'boolean') updateData.showOnlineStatus = showOnlineStatus;
            if (language) updateData.language = language;
            if (timezone) updateData.timezone = timezone;

            // Atualiza as configurações
            await DashboardAccountService.update(
                { email },
                { $set: updateData }
            );

            return res.status(200).json({ message: 'Configurações atualizadas com sucesso' });
        } catch (error) {
            console.error('Erro ao atualizar configurações do usuário:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
};
