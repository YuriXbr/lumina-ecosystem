const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../../database/services/DashboardAccountService');
const GuildService = require('../../../../database/services/GuildService');

module.exports = {
    route: '/expapi/v1/admin/guilds',
    description: "Busca lista de guildas para administração",
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

            // Busca a conta do usuário que está fazendo a requisição
            const adminAccount = await DashboardAccountService.getDashboardAccountByEmail(email);
            if (!adminAccount) {
                return res.status(404).json({ error: 'Conta não encontrada' });
            }

            // Verifica se o usuário tem permissão para ver guildas (nível 7+)
            const accessLevels = {
                user: 0, vipUser: 1, enterpriseUser: 2, contentCreator: 3, tester: 4,
                support: 5, moderator: 6, admin: 7, headadmin: 8, developer: 9, coowner: 10, owner: 11
            };

            const userLevel = accessLevels[adminAccount.accessType] || 0;
            if (userLevel < 7) {
                return res.status(403).json({ error: 'Permissão insuficiente para acessar guildas' });
            }

            // Query parameters
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const search = req.query.search || '';

            // Busca todas as guildas
            let allGuilds = await GuildService.getAll();
            
            // Filtra por busca se fornecida
            if (search) {
                allGuilds = allGuilds.filter(guild => 
                    guild.guildReferenceName?.toLowerCase().includes(search.toLowerCase()) ||
                    guild.guildId?.includes(search)
                );
            }
            
            // Aplicar paginação
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const guilds = allGuilds.slice(startIndex, endIndex);
            
            // Mapear para formato esperado pelo frontend
            const formattedGuilds = guilds.map(guild => ({
                guildId: guild.guildId,
                guildName: guild.guildReferenceName,
                memberCount: guild.memberCount || 0,
                botEnabled: true, // Assumir ativo se está no banco
                welcomeEnabled: guild.memberWelcomeToggle || false,
                moderationEnabled: !!guild.moderationChannelId,
                musicEnabled: guild.djEnabled || false,
                addedDate: guild.createdAt || new Date(),
                lastActivity: guild.updatedAt || new Date(),
                // Configurações adicionais para o modal
                prefix: guild.prefix || 'l!',
                language: guild.guildLocale || 'en-US',
                djEnabled: guild.djEnabled || false,
                memberDmToggle: guild.memberDmToggle || false,
                persistentMute: guild.persistentMute || false,
                autoWarnPunishment: guild.autoWarnPunishment || false
            }));

            return res.status(200).json({
                guilds: formattedGuilds,
                pagination: {
                    page,
                    limit,
                    total: allGuilds.length,
                    hasMore: endIndex < allGuilds.length
                }
            });
        } catch (error) {
            console.error('Erro ao buscar guildas:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
};
