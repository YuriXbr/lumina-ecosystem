const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

const api = new LuminaApiService();

const RARITY_COLORS = {
    common:     0x6B7280, // gray
    rare:       0x3B82F6, // blue
    epic:       0xA855F7, // purple
    legendary:  0xF97316, // orange
    mythic:     0xEC4899, // pink
};

module.exports = {
    permission: 'default',
    category: 'utility',
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('redeem')
        .setDescription('Redeem a badge code.')
        .setDescriptionLocalizations(loc(
            'Resgata uma badge via código.',
            'Canjea una insignia mediante código.'
        ))
        .addStringOption(option => option
            .setName('code')
            .setDescription('The badge code to redeem.')
            .setDescriptionLocalizations(loc('O código da badge para resgatar.', 'El código de la insignia para canjear.'))
            .setRequired(true)),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        await interaction.deferReply({ ephemeral: true });

        const code = interaction.options.getString('code');
        if (!code) {
            return interaction.editReply({ content: translator('cmd.redeem.noCode') });
        }

        try {
            // Chama a rota interna da API — o bot passa o Discord ID do usuário,
            // a API encontra a conta vinculada e registra a redenção.
            const result = await api.post('/expapi/internal/redeembadge', {
                discordUserId: interaction.user.id,
                code: code,
            });

            const badge = result.badge;
            const rarityColor = RARITY_COLORS[badge.rarity] || 0x8B5CF6;

            const embed = new EmbedBuilder()
                .setTitle(translator('cmd.redeem.title'))
                .setDescription(translator('cmd.redeem.description', { name: badge.name }))
                .setColor(rarityColor)
                .addFields(
                    { name: translator('cmd.redeem.rarityField'), value: badge.rarity, inline: true },
                    { name: translator('cmd.redeem.codeField'), value: badge.code, inline: true },
                )
                .setFooter({ text: translator('cmd.redeem.footer') })
                .setTimestamp();

            if (badge.imageUrl) {
                embed.setThumbnail(badge.imageUrl);
            }

            if (badge.description) {
                embed.addFields({ name: translator('badges.admin.description', { defaultValue: 'Description' }), value: badge.description, inline: false });
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            // O LuminaApiService já logou o erro com contexto completo.
            // Tenta extrair a mensagem de erro da API para mostrar ao usuário.
            const apiError = error?.response?.data?.error || error?.apiContext?.apiError;
            return interaction.editReply({
                content: apiError || translator('apiError.generic', { defaultValue: 'An error occurred.' }),
            });
        }
    },
};
