const { SlashCommandBuilder, ButtonStyle } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');

module.exports = {
    permission: 'default',
    category: 'utility',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Provides a list of all commands.'),


    async execute(interaction) {
        
        const embed = new EmbedBuilder()
            .setTitle('Help')
            .setColor('Green')
            .setThumbnail(interaction.client.user.avatarURL());

        const categories = readdirSync(join(__dirname, '..'));
        categories.forEach(category => {
            const commands = readdirSync(join(__dirname, '..', category)).filter(file => file.endsWith('.js'));
            const commandList = commands.map(command => {
                const commandFile = require(join(__dirname, '..', category, command));
                return `\`${commandFile.data.name}\` - ${commandFile.data.description}`;
            }).join('\n');
            embed.addFields({ name: category, value: commandList });
        });

        //TO DO:
        // a context menu with a list of all commands, the selected command will be focused sowin the command description and parameters, and the new embed will have a "back" button to return to the main embed
        // the back button will have a custom id to be identified by the code and will be styled as a secondary button


        interaction.reply({ embeds: [embed] });
        
    },
};