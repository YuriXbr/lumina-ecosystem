const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');


module.exports = {
    permission: 'default',
    category: 'league',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('league-mastery')
        .setDescription('Get the mastery of a player in a champion')
        .addStringOption(option =>
            option.setName('region')
                .setNameLocalizations({
                    "pt-BR": 'região'
                })
                .setDescription('The region of the player.')
                .setDescriptionLocalizations({
                    "pt-BR": 'A região do jogador.'
                })
                .setRequired(true)
                .addChoices(
                    { name: 'AMERICAS', value: 'americas'},
                    { name: 'EUROPE', value: 'europe'},
                    { name: 'ASIA', value: 'asia'}
                )
        )
        .addStringOption(option => 
            option.setName('summonername')
                .setNameLocalizations({
                    "pt-BR": 'invocador'
                })
                .setDescription('The summoner name of the player.')
                .setDescriptionLocalizations({
                    "pt-BR": 'O nome do invocador.'
                })
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('tagline')
                .setNameLocalizations({
                    "pt-BR": 'hashtag'
                })
                .setDescription('The tagline of the player.')
                .setDescriptionLocalizations({
                    "pt-BR": 'O hashtag do jogador.'
                })
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const region = interaction.options.getString('region');
        const summonername = interaction.options.getString('summonername');
        const tagline = interaction.options.getString('tagline');
        
        

        
    }
};