const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');
const axios = require('axios');

module.exports = {
    permission: 'everyone',
    category: 'social',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('randomanimeimage')
        .setDescription('Get a random anime image!')
        .setDescriptionLocalizations(loc('Obter uma imagem de anime aleatória!', '¡Obtener una imagen de anime aleatoria!'))
        .setContexts(0, 1, 2),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const target = interaction.options.getUser('user');
        const result = await axios.get('https://api.otakugifs.xyz/gif?reaction=wave&format=gif');
        const animeResult = await axios.get('https://api.nekosapi.com/v4/images?limit=1');

        const range = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const embed = new EmbedBuilder()
            .setColor(range(0, 16777215))
            .setImage(animeResult.data.data[0].url)
            .setFooter({ text: 'Lumina Bot • Social' });

        await interaction.reply({ embeds: [embed] });
    },
};
