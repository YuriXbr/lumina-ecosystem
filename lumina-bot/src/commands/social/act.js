const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

// "angrystare",
// "brofist",
// "cheers",
// "cool",
// "clap",
// "cry",
// "headbang",
//     "hug",
//     "huh",
//     "kiss",
//     "laugh",
//      "lick",
//     "love",
//     "nervous",
//     "nom",
//     "nuzzle",
//     "peek",
//     "pinch",
//     "punch",
//     "roll",
//     "run",
//     "shout",
//     "sing",
//     "sip",
//     "smack",
//     "smug",
//     "sneeze",
//     "sorry",
//     "stop",
//     "sweat",
//     "nosebleed",
//     "airkiss",
//     "dance",
//     "slap",
//     "smile",
//     "wave",
//     "slowclap",
//     "celebrate",
//     "thumbsup",
//     "surprised",
//     "yes",
//     "woah",
//     "confused",
//     "evillaugh",
// "no",

const actions = [
    "bleh",
    "bite",
    "blush",
    "cuddle",
    "facepalm",
    "handhold",
    "happy",
    "mad",
    "nyah",
    "pat",
    "poke",
    "pout",
    "sad",
    "shrug",
    "sigh",
    "sleep",
    "stare",
    "tickle",
    "tired",
    "wink",
    "yawn",
    "scared",
    "shy",
    "yay",
    "drool",
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
            .setDescription(
                // convert to string
                translator(
                    toString(`cmd.social.${interaction.options.getString('action')}.actionText`), 
                    { 
                        author: interaction.user.username, 
                        target: target.username })
                )
            .setImage(result.data.url)
            .setFooter({ text: 'Lumina Bot • Social' });

        await interaction.reply({ embeds: [embed] });
    },
};
