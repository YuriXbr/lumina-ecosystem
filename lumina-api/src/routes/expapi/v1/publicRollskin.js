const { resolveDiscordAccount } = require('../../../utils/resolveDiscordAccount');
const { rollSkin } = require('../../../utils/gachaService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/v1/rollskin';

module.exports = {
    route: '/expapi/v1/rollskin',
    description: "Roll a skin (usuário logado via dashboard)",
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: true,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { chestType } = req.body;
        const email = req.user.email;

        if (!chestType) {
            return res.status(400).json({ error: 'Parâmetro chestType é obrigatório.', code: 'MISSING_PARAMS' });
        }
        if (chestType !== 'masterWorkChests' && chestType !== 'hextechChests') {
            return res.status(400).json({ error: 'Tipo de baú inválido.', code: 'INVALID_CHEST_TYPE' });
        }

        let discordId;
        try {
            const resolved = await resolveDiscordAccount(email);
            discordId = resolved.discordId;
        } catch (err) {
            return routeError({
                res, error: err,
                route: ROUTE,
                errorCode: err.code || 'RESOLVE_DISCORD_ERROR',
                userMsg: err.message || 'Erro ao resolver conta Discord.',
                status: err.status || 400,
                extra: { email },
            });
        }

        try {
            const skin = await rollSkin(discordId, chestType);
            if (!skin) {
                return res.status(400).json({ error: 'Sem chaves ou baús suficientes.', code: 'INSUFFICIENT_RESOURCES' });
            }
            return res.status(200).json(skin);
        } catch (error) {
            return routeError({
                res, error,
                route: ROUTE,
                errorCode: 'ROLL_SKIN_ERROR',
                userMsg: 'Erro ao sortear skin.',
                extra: { email, discordId, chestType },
            });
        }
    }
};
