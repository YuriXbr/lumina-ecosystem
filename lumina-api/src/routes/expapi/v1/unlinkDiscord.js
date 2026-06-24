const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../database/services/DashboardAccountService.js');

module.exports = {
    route: '/expapi/v1/unlink-discord',
    description: "Remove a vinculação da conta Discord do usuário",
    apiKeyNeeded: false,
    jwtNeeded: true,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: true,
    method: 'post',

    async execute(req, res) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const accountId = decoded.accountId;

            const account = await DashboardAccountService.getDashboardAccountByAccountId(accountId);
            if (!account) {
                return res.status(404).json({ error: 'Conta não encontrada' });
            }

            // Checa nos dois lugares: campo legado e nova estrutura
            const isLinked = account.discordOauth2Id || account.authProviders?.discord?.providerId;
            if (!isLinked) {
                return res.status(400).json({ error: 'Discord não está vinculado a esta conta' });
            }

            await DashboardAccountService.update(
                { accountId },
                {
                    $set: {
                        discordOauth2Id: '',
                        discordOauth2Token: '',
                        discordOauth2RefreshToken: '',
                        discordOauth2TokenExpiresAt: null,
                        discordOauth2TokenScope: '',
                        discordOauth2TokenType: '',
                        discordOauth2TokenRequestDate: null,
                        discordOauth2TokenRequestIp: ''
                    },
                    $unset: { 'authProviders.discord': '' }
                }
            );

            return res.status(200).json({ message: 'Discord deslinkado com sucesso', success: true });

        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: 'Token inválido' });
            }
            console.error('Erro ao deslinkar Discord:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
};