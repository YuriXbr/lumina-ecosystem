const jwt                       = require('jsonwebtoken');
const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const { routeError }            = require('../../../logger/logger');

const ROUTE = 'POST /expapi/v1/unlink-discord';

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
        if (!authHeader)
            return res.status(401).json({ error: 'Token não fornecido.', code: 'MISSING_TOKEN' });

        let decoded;
        try {
            decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ error: 'Token inválido ou expirado.', code: 'INVALID_TOKEN' });
        }

        try {
            const account = await DashboardAccountService.getDashboardAccountByAccountId(decoded.accountId);
            if (!account)
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            const isLinked = account.discordOauth2Id || account.authProviders?.discord?.providerId;
            if (!isLinked)
                return res.status(400).json({ error: 'Discord não está vinculado a esta conta.', code: 'DISCORD_NOT_LINKED' });

            await DashboardAccountService.update({ accountId: decoded.accountId }, {
                $set: {
                    discordOauth2Id: '', discordOauth2Token: '', discordOauth2RefreshToken: '',
                    discordOauth2TokenExpiresAt: null, discordOauth2TokenScope: '',
                    discordOauth2TokenType: '', discordOauth2TokenRequestDate: null,
                    discordOauth2TokenRequestIp: ''
                },
                $unset: { 'authProviders.discord': '' }
            });
            return res.status(200).json({ message: 'Discord desvinculado com sucesso.', success: true });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'UNLINK_DISCORD_ERROR',
                userMsg: 'Erro ao desvincular conta Discord.', extra: { accountId: decoded?.accountId } });
        }
    }
};
