const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

const actions = [
    "airkiss",
    "angrystare",
    "bite",
    "bleh",
    "blush",
    "brofist",
    "celebrate",
    "cheers",
    "clap",
    "confused",
    "cool",
    "cry",
    "cuddle",
    "dance",
    "drool",
    "evillaugh",
    "facepalm",
    "handhold",
    "happy",
    "headbang",
    "hug",
    "huh",
    "kiss",
    "laugh",
    "lick",
    "love",
    "mad",
    "nervous",
    "no",
    "nom",
    "nosebleed",
    "nuzzle",
    "nyah",
    "pat",
    "peek",
    "pinch",
    "poke",
    "pout",
    "punch",
    "roll",
    "run",
    "sad",
    "scared",
    "shout",
    "shrug",
    "shy",
    "sigh",
    "sing",
    "sip",
    "slap",
    "sleep",
    "slowclap",
    "smack",
    "smile",
    "smug",
    "sneeze",
    "sorry",
    "stare",
    "stop",
    "surprised",
    "sweat",
    "thumbsup",
    "tickle",
    "tired",
    "wave",
    "wink",
    "woah",
    "yawn",
    "yay",
    "yes"
  ]
module.exports = {
    permission: 'everyone',
    category: 'social',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('act')
        .setDescription('Perform an action!')
        .setDescriptionLocalizations(loc('Realize uma ação!', '¡Realiza una acción!'))
        .addStringOption(option =>
            option.setName('action')
                .setDescription('The action to perform')
                .setDescriptionLocalizations(loc('A ação a ser realizada', 'La acción a realizar'))
                .setRequired(true)
                .addChoices(...actions.map(a => ({ name: a, value: a }))))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to perform the action on')
                .setDescriptionLocalizations(loc('O usuário que te fez chorar', 'El usuario que te hizo llorar'))
                .setRequired(true))
        .setContexts(0, 1, 2),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const target = interaction.options.getUser('user');
        const result = await axios.get(`https://api.otakugifs.xyz/gif?reaction=${interaction.options.getString('action')}&format=gif`);

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            //Swap the social. ... based on the action choosen by the user, for example if the user chooses "hug" then it should be social.hug.actionText
            .setDescription(translator(`cmd.social.${interaction.options.getString('action')}.actionText`, { author: interaction.user.username, target: target.username }))
            .setImage(result.data.url)
            .setFooter({ text: 'Lumina Bot • Social' });

        await interaction.reply({ embeds: [embed] });
    },
};
