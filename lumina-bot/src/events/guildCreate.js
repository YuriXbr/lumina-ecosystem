const LuminaApiService = require('../utils/services/LuminaApiService');
const api = new LuminaApiService();

module.exports = {
    name: 'guildCreate',
    once: false,
    async execute(guild) {
        console.log(`Bot adicionado ao servidor: ${guild.name} (${guild.id}) - ${guild.memberCount} membros`);

        // Cria os dados da guilda via API
        try {
            await api.post('/expapi/internal/newguild', {
                guildId: guild.id,
                ownerId: guild.ownerId,
                guildName: guild.name
            });
        } catch (error) {
            console.error('Erro ao criar dados da guilda:', error.message);
        }
            
        // Atualiza os registros de ban herdados
        try {
            const bans = await guild.bans.fetch();
            for (const [userId, banInfo] of bans) {
                const staffId = banInfo.executor ? banInfo.executor.id : 'unknown';
                const reason = banInfo.reason ? `${banInfo.reason} (herdado)` : 'Sem motivo (herdado)';
                await api.post('/expapi/internal/newpunishrecord', {
                    type: 'ban',
                    guildId: guild.id,
                    targetId: userId,
                    staffId,
                    reason,
                    endTime: null
                });
            }
        } catch (error) {
            console.error('Erro ao importar bans herdados:', error.message);
        }
    },
};