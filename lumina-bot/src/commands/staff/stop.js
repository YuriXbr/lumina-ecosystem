const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

module.exports = {
    permission: 'admin',
    category: 'staff',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('botstop')
        .setDescription('Stops the bot.')
        .setDescriptionLocalizations(loc('Para o bot.', 'Detiene el bot.')),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));

        const embed = new EmbedBuilder()
            .setTitle(translator('cmd.stop.title'))
            .setDescription(translator('cmd.stop.description'))
            .setColor('Red');

        await interaction.reply({ embeds: [embed], ephemeral: true });
        // Confirmation: require a second click within 10 seconds
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_stop')
                    .setLabel('Confirm Stop')
                    .setStyle(ButtonStyle.Danger)
            );
        await interaction.editReply({ content: '⚠️ Are you sure? Click to confirm bot shutdown.', components: [row] });
        const filter = i => i.customId === 'confirm_stop' && i.user.id === interaction.user.id;
        try {
            const confirm = await interaction.editReply.awaitMessageComponent({ filter, time: 10000 });
            await confirm.update({ content: '🛑 Shutting down...', components: [] });
            process.exit(0);
        } catch {
            await interaction.editReply({ content: 'Shutdown cancelled.', components: [] });
        }
    },
};
