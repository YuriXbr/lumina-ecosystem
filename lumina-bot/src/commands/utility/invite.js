const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

module.exports = {
    permission: 'everyone',
    category: 'utility',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Adds Lumina Bot to another server')
        .setDescriptionLocalizations(loc(
            'Adiciona o Lumina Bot em outro servidor',
            'Añade Lumina Bot a otro servidor'
        )),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const clientId = process.env.DISCORD_CLIENT_ID || interaction.client.user.id;
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot+applications.commands`;

        const embed = new EmbedBuilder()
            .setTitle(translator('cmd.invite.title'))
            .setDescription(translator('cmd.invite.descriptionText'))
            .setColor('#7C3AED')
            .setFooter({ text: 'Lumina Bot', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel(translator('cmd.invite.button'))
                    .setStyle(ButtonStyle.Link)
                    .setURL(inviteUrl)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};
