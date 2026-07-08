const jwt        = require('jsonwebtoken');
const axios      = require('axios');
const BotService = require('../../../../database/services/BotService');
const { routeError } = require('../../../../logger/logger');

const ROUTE = 'GET /expapi/v1/discord/guild/:guildId';

module.exports = {
    route: '/expapi/v1/discord/guild/:guildId',
    description: "Busca informações da guilda diretamente da API do Discord",
    apiKeyNeeded: false, 
    jwtNeeded: false,
    enabled: true, 
    method: 'get', 
    checkAuthNeeded: false,

    async execute(req, res) {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Token não fornecido.', code: 'MISSING_TOKEN' });

        let decoded;
        try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET); }
        catch { return res.status(401).json({ error: 'Token inválido ou expirado.', code: 'INVALID_TOKEN' }); }

        const { guildId } = req.params;
        if (!guildId || !/^\d{17,19}$/.test(guildId))
            return res.status(400).json({ error: 'Guild ID inválido.', code: 'INVALID_GUILD_ID' });

        try {
            const bot = await BotService.getBot();
            const discordBotToken = bot?.token || process.env.DISCORD_BOT_TOKEN;
            if (!discordBotToken)
                return res.status(500).json({ error: 'Token do bot Discord não configurado.', code: 'BOT_TOKEN_MISSING' });

            const discordRes = await axios.get(
                `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
                { headers: { Authorization: `Bot ${discordBotToken}`, 'Content-Type': 'application/json' } }
            );

            const g = discordRes.data;
            return res.status(200).json({
                id: g.id, 
                name: g.name, 
                icon: g.icon,
                member_count: g.member_count, 
                approximate_member_count: g.approximate_member_count,
                owner_id: g.owner_id, 
                features: g.features,
                verification_level: g.verification_level, 
                premium_tier: g.premium_tier,
                roles: (g.roles||[]).map(r => ({ 
                    id:r.id,
                    name:r.name,
                    permissions:r.permissions,
                    position:r.position,
                    color:r.color,
                    hoist:r.hoist,
                    managed:r.managed,
                    mentionable:r.mentionable,
                    icon:r.icon,unicode_emoji:r.unicode_emoji,
                    flags:r.flags,tags:r.tags||null 
                })),
                system_channel_id: g.system_channel_id, 
                nsfw: g.nsfw, 
                nsfw_level: g.nsfw_level,
                preferred_locale: g.preferred_locale, 
                mfa_level: g.mfa_level,
                max_members: g.max_members, 
                approximate_presence_count: g.approximate_presence_count||0,
                emojis: g.emojis||[], stickers: g.stickers||[],
                premium_progress_bar_enabled: g.premium_progress_bar_enabled||false,
                splash: g.splash||null, banner: g.banner||null,
            });
        } catch (error) {
            if (error.response?.status === 404)
                return res.status(404).json({ error: 'Guilda não encontrada ou bot não está no servidor.', code: 'GUILD_NOT_FOUND' });
            if (error.response?.status === 403)
                return res.status(403).json({ error: 'Bot sem permissão para acessar esta guilda.', code: 'BOT_NO_PERMISSION' });
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_DISCORD_GUILD_ERROR',
                userMsg: 'Erro ao buscar dados da guilda no Discord.', extra: { guildId, email: decoded?.email } });
        }
    }
};
