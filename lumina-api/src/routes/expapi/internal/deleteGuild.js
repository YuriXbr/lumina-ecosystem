const GuildService = require('../../../database/services/GuildService');
const { routeError, addLog } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/deleteguild';

// CORREÇÃO CRÍTICA: esta rota estava com o corpo do execute() vazio — nenhuma
// resposta HTTP era enviada nunca. Isso significa que TODA requisição para
// este endpoint ficava pendurada até o timeout do cliente/proxy, consumindo
// uma conexão TCP e um handler Node.js pelo caminho inteiro. Em volume, isso
// é um vetor trivial de esgotamento de conexões (DoS) e um vazamento de
// recursos (sockets/handles nunca liberados corretamente). Implementado
// abaixo com o mesmo padrão defensivo das demais rotas internal/*.
module.exports = {
    route: '/expapi/internal/deleteguild',
    description: "Delete a guild",
    apiKeyNeeded: false,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'both_delete', // POST e DELETE — 'both' seria GET+POST; o index.js trata esse caso abaixo

    async execute(req, res) {
        const { guildId } = req.body;
        if (!guildId) {
            return res.status(400).json({ error: 'Parâmetro guildId é obrigatório.', code: 'MISSING_GUILD_ID' });
        }

        try {
            const guild = await GuildService.getGuildData(guildId);
            if (!guild) {
                return res.status(404).json({ error: 'Guilda não encontrada.', code: 'GUILD_NOT_FOUND' });
            }

            await GuildService.delete({ guildId });
            addLog('API', 'guild.delete', `Guilda ${guildId} removida.`);
            return res.status(200).json({ message: 'Guilda removida com sucesso.', guildId });
        } catch (error) {
            return routeError({
                res, error,
                route: ROUTE,
                errorCode: 'DELETE_GUILD_ERROR',
                userMsg: 'Erro ao remover guilda.',
                extra: { guildId },
            });
        }
    }
};
