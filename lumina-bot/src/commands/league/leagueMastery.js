const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');


module.exports = {
    permission: 'default',
    category: 'league',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('league-mastery')
        .setDescription('Get the mastery of a player in a champion')
        .setDescriptionLocalizations(loc('Obtém a maestria de um jogador em um campeão', 'Obtén la maestría de un jugador en un campeón'))
        .addStringOption(option =>
            option.setName('region')
                .setNameLocalizations({ "pt-BR": 'região', "es-ES": 'región' })
                .setDescription('The region of the player.')
                .setDescriptionLocalizations(loc('A região do jogador.', 'La región del jugador.'))
                .setRequired(true)
                .addChoices(
                    { name: 'AMERICAS', value: 'americas'},
                    { name: 'EUROPE', value: 'europe'},
                    { name: 'ASIA', value: 'asia'}
                )
        )
        .addStringOption(option =>
            option.setName('summonername')
                .setNameLocalizations({ "pt-BR": 'invocador', "es-ES": 'invocador' })
                .setDescription('The summoner name of the player.')
                .setDescriptionLocalizations(loc('O nome do invocador.', 'El nombre del invocador.'))
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('tagline')
                .setNameLocalizations({ "pt-BR": 'hashtag', "es-ES": 'etiqueta' })
                .setDescription('The tagline of the player.')
                .setDescriptionLocalizations(loc('A hashtag do jogador.', 'La etiqueta del jugador.'))
                .setRequired(true)
        ),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const region = interaction.options.getString('region');
        const summonername = interaction.options.getString('summonername');
        const tagline = interaction.options.getString('tagline');

        // TODO: implement mastery fetch
        return interaction.reply({ content: translator('cmd.leagueMastery.loadingTitle'), ephemeral: true });
    }
};
