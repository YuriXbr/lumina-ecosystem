const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

module.exports = {
    permission: 'default',
    category: 'utility',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Provides a list of all commands.')
        .setDescriptionLocalizations(loc('Fornece uma lista de todos os comandos.', 'Proporciona una lista de todos los comandos.')),


    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));

        const embed = new EmbedBuilder()
            .setTitle(translator('cmd.help.title'))
            .setDescription(translator('cmd.help.description'))
            .setColor('Green')
            .setThumbnail(interaction.client.user.avatarURL());

        const categories = readdirSync(join(__dirname, '..'));
        categories.forEach(category => {
            const commands = readdirSync(join(__dirname, '..', category)).filter(file => file.endsWith('.js'));
            const commandList = commands.map(command => {
                const commandFile = require(join(__dirname, '..', category, command));
                return `\`${commandFile.data.name}\` — ${commandFile.data.description}`;
            }).join('\n');
            embed.addFields({ name: `${translator('cmd.help.categoryField')}: ${category}`, value: commandList });
        });

        embed.setFooter({ text: translator('cmd.help.footer') });
        interaction.reply({ embeds: [embed] });
    },
};
