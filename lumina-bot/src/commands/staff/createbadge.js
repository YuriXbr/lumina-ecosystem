const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

const api = new LuminaApiService();

const VALID_RARITIES = [
    { name: 'Common',    value: 'common' },
    { name: 'Rare',      value: 'rare' },
    { name: 'Epic',      value: 'epic' },
    { name: 'Legendary', value: 'legendary' },
    { name: 'Mythic',    value: 'mythic' },
];

const ACCESS_LEVELS = [
    { name: 'User', value: 'user' },
    { name: 'VIP', value: 'vipUser' },
    { name: 'Enterprise', value: 'enterpriseUser' },
    { name: 'Content Creator', value: 'contentCreator' },
    { name: 'Tester', value: 'tester' },
    { name: 'Support', value: 'support' },
    { name: 'Moderator', value: 'moderator' },
    { name: 'Admin', value: 'admin' },
    { name: 'Head Admin', value: 'headadmin' },
    { name: 'Developer', value: 'developer' },
    { name: 'Co-Owner', value: 'coowner' },
    { name: 'Owner', value: 'owner' },
];

const RARITY_COLORS = {
    common:     0x6B7280,
    rare:       0x3B82F6,
    epic:       0xA855F7,
    legendary:  0xF97316,
    mythic:     0xEC4899,
};

module.exports = {
    permission: 'admin',
    category: 'staff',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('createbadge')
        .setDescription('Create a new badge (admin only).')
        .setDescriptionLocalizations(loc(
            'Cria uma nova badge (apenas admin).',
            'Crea una nueva insignia (solo admin).'
        ))
        .addStringOption(option => option
            .setName('code')
            .setDescription('Unique redemption code (3+ chars, uppercase).')
            .setDescriptionLocalizations(loc('Código único de resgate (3+ caracteres, maiúsculas).', 'Código único de canje (3+ caracteres, mayúsculas).'))
            .setRequired(true))
        .addStringOption(option => option
            .setName('name')
            .setDescription('Badge name.')
            .setDescriptionLocalizations(loc('Nome da badge.', 'Nombre de la insignia.'))
            .setRequired(true))
        .addStringOption(option => option
            .setName('description')
            .setDescription('Badge description.')
            .setDescriptionLocalizations(loc('Descrição da badge.', 'Descripción de la insignia.'))
            .setRequired(false))
        .addStringOption(option => option
            .setName('image')
            .setDescription('Badge image URL.')
            .setDescriptionLocalizations(loc('URL da imagem da badge.', 'URL de la imagen de la insignia.'))
            .setRequired(false))
        .addStringOption(option => option
            .setName('rarity')
            .setDescription('Badge rarity.')
            .setDescriptionLocalizations(loc('Raridade da badge.', 'Rareza de la insignia.'))
            .setRequired(false)
            .addChoices(VALID_RARITIES))
        .addStringOption(option => option
            .setName('color')
            .setDescription('Highlight color (hex, e.g. #8B5CF6).')
            .setDescriptionLocalizations(loc('Cor de destaque (hex, ex: #8B5CF6).', 'Color de destaque (hex, ej: #8B5CF6).'))
            .setRequired(false))
        .addIntegerOption(option => option
            .setName('maxredemptions')
            .setDescription('Max redemptions (0 = unlimited).')
            .setDescriptionLocalizations(loc('Máximo de resgates (0 = ilimitado).', 'Máximo de canjes (0 = ilimitado).'))
            .setRequired(false)
            .setMinValue(0))
        .addStringOption(option => option
            .setName('minlevel')
            .setDescription('Minimum access level to redeem.')
            .setDescriptionLocalizations(loc('Nível de acesso mínimo para resgatar.', 'Nivel de acceso mínimo para canjear.'))
            .setRequired(false)
            .addChoices(ACCESS_LEVELS)),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        await interaction.deferReply({ ephemeral: true });

        const code = interaction.options.getString('code');
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description') || '';
        const imageUrl = interaction.options.getString('image') || '';
        const rarity = interaction.options.getString('rarity') || 'common';
        const highlightColor = interaction.options.getString('color') || '#8B5CF6';
        const maxRedemptions = interaction.options.getInteger('maxredemptions') ?? 0;
        const minAccessLevel = interaction.options.getString('minlevel') || 'user';

        if (!code || code.trim().length < 3) {
            return interaction.editReply({ content: translator('cmd.createbadge.missingFields') });
        }
        if (!name) {
            return interaction.editReply({ content: translator('cmd.createbadge.missingFields') });
        }

        try {
            const result = await api.post('/expapi/internal/createbadge', {
                discordUserId: interaction.user.id,
                code: code,
                name: name,
                description: description,
                imageUrl: imageUrl,
                rarity: rarity,
                highlightColor: highlightColor,
                maxRedemptions: maxRedemptions,
                minAccessLevel: minAccessLevel,
            });

            const badge = result.badge;
            const rarityColor = RARITY_COLORS[badge.rarity] || 0x8B5CF6;

            const embed = new EmbedBuilder()
                .setTitle(translator('cmd.createbadge.title'))
                .setDescription(translator('cmd.createbadge.description', { code: badge.code }))
                .setColor(rarityColor)
                .addFields(
                    { name: 'Name', value: badge.name, inline: true },
                    { name: 'Rarity', value: badge.rarity, inline: true },
                    { name: 'Code', value: badge.code, inline: true },
                )
                .setFooter({ text: 'Lumina Bot — Badge System' })
                .setTimestamp();

            if (badge.description) {
                embed.addFields({ name: 'Description', value: badge.description, inline: false });
            }
            if (badge.imageUrl) {
                embed.setThumbnail(badge.imageUrl);
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            const apiError = error?.response?.data?.error || error?.apiContext?.apiError;
            return interaction.editReply({
                content: apiError || translator('cmd.createbadge.error'),
            });
        }
    },
};
