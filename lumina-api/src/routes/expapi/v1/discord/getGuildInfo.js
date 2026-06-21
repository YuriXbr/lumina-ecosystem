const jwt = require('jsonwebtoken');
const BotService = require('../../../../database/services/BotService');
const axios = require('axios');

// Função para fazer fetch compatível com Node.js
async function fetchApi(url, options = {}) {
    try {
        // Verificar se fetch está disponível globalmente (Node 18+)
        if (typeof fetch !== 'undefined') {
            return await fetch(url, options);
        }
        
        // Fallback para node-fetch se necessário
        const fetch = (await import('node-fetch')).default;
        return await fetch(url, options);
    } catch (error) {
        console.error('Erro ao fazer requisição:', error);
        throw error;
    }
}

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
        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Verificar se o token é válido e obter o email do usuário
            if (!decoded || !decoded.email) {
                return res.status(401).json({ error: 'Token inválido ou expirado' });
            }
            const { guildId } = req.params;

            if (!guildId || !/^\d{17,19}$/.test(guildId)) {
                return res.status(400).json({ error: 'Guild ID inválido' });
            }

            // Verificar se temos o token do bot do Discord
            let bot = await BotService.getBot();
            const discordBotToken = bot.token || process.env.DISCORD_BOT_TOKEN;

            if (!discordBotToken) {
                return res.status(500).json({ error: 'Token do bot Discord não configurado' });
            }

            const discordResponse = await axios.get(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, {
                headers: { 
                    'Authorization': `Bot ${discordBotToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!discordResponse.status || discordResponse.status < 200 || discordResponse.status >= 300) {
                // Verificar o status da resposta e retornar erros apropriados
                if (discordResponse.status === 404) {
                    return res.status(404).json({ error: 'Guilda não encontrada ou bot não está no servidor' });
                }
                if (discordResponse.status === 403) {
                    return res.status(403).json({ error: 'Bot não tem permissão para acessar esta guilda' });
                }
                return res.status(discordResponse.status).json({ error: 'Erro na API do Discord' });
            }

            const guildData = await discordResponse.data;

            // Retornar apenas os dados necessários
            return res.status(200).json({
                id: guildData.id,
                name: guildData.name,
                icon: guildData.icon,
                member_count: guildData.member_count,
                approximate_member_count: guildData.approximate_member_count,
                owner_id: guildData.owner_id,
                features: guildData.features,
                verification_level: guildData.verification_level,
                premium_tier: guildData.premium_tier,
                roles: guildData.roles.map(role => ({
                    id: role.id,
                    name: role.name,
                    description: role.description,
                    permissions: role.permissions,
                    position: role.position,
                    color: role.color,
                    hoist: role.hoist,
                    managed: role.managed,
                    mentionable: role.mentionable,
                    icon: role.icon,
                    unicode_emoji: role.unicode_emoji,
                    flags: role.flags,
                    tags: role.tags || null // Adiciona tags se existirem
                })),
                system_channel_id: guildData.system_channel_id,
                system_channel_flags: guildData.system_channel_flags,
                widget_enabled: guildData.widget_enabled,
                widget_channel_id: guildData.widget_channel_id,
                rules_channel_id: guildData.rules_channel_id,
                public_updates_channel_id: guildData.public_updates_channel_id,
                embed_enabled: guildData.embed_enabled,
                embed_channel_id: guildData.embed_channel_id,
                nsfw: guildData.nsfw,
                nsfw_level: guildData.nsfw_level,
                preferred_locale: guildData.preferred_locale,
                explicit_content_filter: guildData.explicit_content_filter,
                default_message_notifications: guildData.default_message_notifications,
                mfa_level: guildData.mfa_level,
                max_members: guildData.max_members,
                max_video_channel_users: guildData.max_video_channel_users,
                max_stage_video_channel_users: guildData.max_stage_video_channel_users,
                max_presences: guildData.max_presences,
                latest_onboarding_question_id: guildData.latest_onboarding_question_id,
                incidents_data: guildData.incidents_data || null,
                inventory_settings: guildData.inventory_settings || null,
                home_header: guildData.home_header || null,
                splash: guildData.splash || null,
                discovery_splash: guildData.discovery_splash || null,
                banner: guildData.banner || null,
                vanity_url_code: guildData.vanity_url_code || null,
                owner_configured_content_level: guildData.owner_configured_content_level || 0,
                safety_alerts_channel_id: guildData.safety_alerts_channel_id || null,
                approximate_presence_count: guildData.approximate_presence_count || 0,
                emojis: guildData.emojis || [],
                stickers: guildData.stickers || [],
                incidents_data: guildData.incidents_data || null,
                premium_progress_bar_enabled: guildData.premium_progress_bar_enabled || false
            });

        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: 'Token inválido' });
            }
            console.error('Erro ao buscar dados da guilda do Discord:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
};
