const DashboardAccountService = require('../../../database/services/DashboardAccountService');
const { routeError, addLog }  = require('../../../logger/logger');

const ROUTE = 'GET /expapi/v1/public-profile/:identifier';

/**
 * Retorna perfil público de um usuário por UUID, Discord ID ou username.
 * Não exige auth. Só expõe campos explicitamente públicos.
 */
module.exports = {
    route: '/expapi/v1/public-profile/:identifier',
    description: 'Busca perfil público de um usuário por UUID/Discord ID/username',
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        try {
            const identifier = String(req.params.identifier || '').trim();
            if (!identifier || identifier.length < 3 || identifier.length > 64) {
                return res.status(400).json({
                    error: 'Identificador inválido.',
                    code: 'INVALID_IDENTIFIER',
                });
            }

            const account = await DashboardAccountService.getPublicAccountByIdentifier(identifier);

            if (!account) {
                return res.status(404).json({
                    error: 'Usuário não encontrado.',
                    code: 'USER_NOT_FOUND',
                });
            }

            // Respeita preferência de perfil público — se desativado, só mostra mínimo
            const isPublic = !!account.publicProfile;

            const profile = {
                accountId: account.accountId,
                username: account.username || '',
                displayName: account.displayName || (account.firstName ? `${account.firstName} ${account.lastName || ''}`.trim() : ''),
                discordOauth2Id: account.discordOauth2Id || '',
                avatar: account.discordAvatar || '',
                publicProfile: isPublic,
            };

            if (isPublic) {
                profile.registrationDate = account.registrationDate;
                profile.accessType = account.accessType || 'user';
                profile.badges = []; // placeholder para futuro
                profile.inventoryStats = null; // placeholder
            }

            // Não loga identificadores para não vazar quem está sendo procurado
            addLog('API', 'public.profile.view', `Perfil visualizado: ${account.accountId}`);

            return res.status(200).json(profile);
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'FETCH_PUBLIC_PROFILE_ERROR',
                userMsg: 'Erro ao buscar perfil público.',
            });
        }
    }
};
