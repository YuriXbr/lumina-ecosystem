const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../../api/riotApi.js');
const { errorEmbed, buildLoadingEmbed } = require('../../utils/embeds/cmdEmbeds.js');
const { error } = require('../../utils/colorCodes.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

module.exports = {
    permission: 'default',
    category: 'league',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('leaguechampionrotation')
        .setDescription('Shows the champions currently in rotation.')
        .setDescriptionLocalizations(loc(
            'Mostra os campeões atualmente em rotação.',
            'Muestra los campeones actualmente en rotación.'
        )),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        await interaction.deferReply({ content: translator('common.loading') });

        interaction.editReply({ embeds: [buildLoadingEmbed(translator)] });

        const rotationChampionsId = await api.getChampionRotation('leaguechampionrotation');
        if (!rotationChampionsId) {
            return errorEmbed(translator('cmd.leagueChampionRotation.apiError'), 'leaguechampionrotation', interaction, true, true, translator);
        }

        const rotationChampions = await Promise.all(rotationChampionsId.map(async (id) => {
            try {
                return await api.fetchChampionName(id, 'leaguechampionrotation');
            } catch (err) {
                errorEmbed('Error fetching champion name from ID', 'leaguechampionrotation', interaction, false, true, translator);
            }
        }));

        const embed = new EmbedBuilder()
            .setTitle(translator('cmd.leagueChampionRotation.title'))
            .setDescription(translator('cmd.leagueChampionRotation.description'))
            .setColor('#0099ff')
            .setFooter({ text: 'Powered by Riot Games API', iconURL: 'https://i.imgur.com/xU45ZZz.png' })
            .addFields(rotationChampions
                .filter(champion => champion !== null)
                .map(champion => ({ name: champion.id, value: `${champion.title}`, inline: true })));

        interaction.editReply({ embeds: [embed] });
    },
};
