const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');

const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'moderation',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user.')
        .addUserOption(o => o.setName('user').setDescription('The user to ban.').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('The reason for the ban.'))
        .addStringOption(o => o.setName('time').setDescription('The time for the ban (ex: 1d, 2h, 30m, 45s).')),

    async execute(interaction) {
        await interaction.deferReply();

        const user   = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided.';
        const target = interaction.guild.members.cache.get(user.id);
        const staff  = interaction.guild.members.cache.get(interaction.user.id);
        const time   = interaction.options.getString('time');
        let banEndDate = null;

        if (time) {
            const match = time.match(/(\d+)([dhms])/);
            if (match) {
                const [, amount, unit] = match;
                const ms = { d: 86400000, h: 3600000, m: 60000, s: 1000 }[unit] ?? 0;
                banEndDate = Date.now() + parseInt(amount) * ms;
            }
        }

        if (!staff.permissions.has(PermissionsBitField.Flags.BanMembers) && !staff.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: 'Você não tem permissão para banir usuários.', ephemeral: true });
        }

        try {
            await interaction.guild.bans.create(user.id, { reason: `STAFF: ${interaction.user.tag} | REASON: ${reason}` });
        } catch (err) {
            return interaction.editReply({ content: 'Não foi possível banir o usuário (sem permissão do bot).', ephemeral: true });
        }

        await interaction.followUp({
            embeds: [new EmbedBuilder()
                .setTitle('Ban Applied').setColor('Green')
                .setDescription(`Você baniu **${user.tag}** com sucesso.`)
                .addFields({ name: 'Motivo', value: reason, inline: true }, { name: 'Duração', value: time ?? 'Permanente', inline: true })],
            ephemeral: true,
        });

        if (banEndDate) {
            setTimeout(async () => {
                try { await interaction.guild.members.unban(user.id); } catch { /* Ignora se já foi desbanido */ }
            }, banEndDate - Date.now());
        }

        // Registra na API — erro propaga com apiContext para o interactionCreate
        await api.post('/expapi/internal/newpunishrecord', {
            type: 'ban',
            guildId: interaction.guild.id,
            targetId: user.id,
            staffId: interaction.user.id,
            reason,
            endTime: banEndDate,
        });

        return interaction.editReply({
            content: `👮‍♀️ <@${interaction.user.id}> baniu **${user.tag}** com sucesso.`,
        });
    }
};
