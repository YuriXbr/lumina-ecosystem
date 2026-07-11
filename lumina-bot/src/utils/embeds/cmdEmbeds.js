const Discord = require('discord.js');
const c = require('../colorCodes.js');
const E = require('../../assets/emojis.js').emojis;
const { commandErrorWarning } = require('../logger/logModals/commandErrorWarning.js');
const i18n = require('../i18n/index.js');

/**
 * Embed helpers compartilhados — todos aceitam um `t` (translator) opcional.
 * Se `t` não for passado, usa en-US (fallback).
 *
 * Isto mantém compatibilidade com comandos que ainda não aceitam `t` em seu
 * `execute(interaction)`: podem chamar errorEmbed(message, origin) e tudo
 * funciona como antes.
 */

/**
 * Cria um loading embed traduzido.
 * @param {Function} [t] translator function (default: en-US)
 */
function buildLoadingEmbed(t) {
    const tr = t || i18n.getTranslator('en-US');
    return new Discord.EmbedBuilder()
        .setColor(c.YELLOW)
        .setTitle(`${E.loading} | ${tr('embed.loadingTitle')}`)
        .setDescription(tr('embed.loadingDesc'));
}

const loadingEmbed = buildLoadingEmbed(); // constante preservada p/ retrocompat

/**
 * @param {string} message
 * @param {string} origin
 * @param {Interaction} interaction
 * @param {boolean} autoReply
 * @param {boolean} ephemeral
 * @param {boolean} riotLogo
 * @param {string} footerText
 * @param {Function} [t] translator
 */
async function complexLoadingEmbed(message = null, origin = 'unknown', interaction, autoReply = false, ephemeral = true, riotLogo = false, footerText = null, t) {
    const tr = t || i18n.getTranslator('en-US');
    let url = riotLogo ? 'https://i.imgur.com/xU45ZZz.png' : null;
    let footer = footerText ? footerText += ` | origin: ${origin}` : `origin: ${origin}`;

    const embed = new Discord.EmbedBuilder()
        .setColor(c.YELLOW)
        .setTitle(`${E.loading} | ${tr('embed.loadingTitle')}`)
        .setDescription(message || tr('embed.loadingDesc'))
        .setFooter({ text: footer, iconURL: url });
    if (autoReply) await interaction.editReply({ embeds: [embed], ephemeral, content: null });
    return embed;
}

/**
 * @param {string} message
 * @param {string} origin
 * @param {Interaction} interaction
 * @param {boolean} autoReply
 * @param {boolean} ephemeral
 * @param {Function} [t] translator
 */
async function errorEmbed(message, origin = 'unknown', interaction, autoReply = false, ephemeral = true, t) {
    const tr = t || i18n.getTranslator('en-US');
    const embed = new Discord.EmbedBuilder()
        .setColor(c.RED)
        .setTitle(`${E.error} | ${tr('embed.errorTitle')}`)
        .setDescription(message)
        .setFooter({ text: `origin: ${origin}` });
    if (autoReply) await interaction.editReply({ embeds: [embed], ephemeral, content: null });
    console.log(c.error + ' Origin: ' + origin + ' | ' + message);
    commandErrorWarning(interaction, message);
    return embed;
}

/**
 * @param {string} message
 * @param {string} origin
 * @param {Interaction} interaction
 * @param {boolean} autoReply
 * @param {boolean} ephemeral
 * @param {boolean} riotLogo
 * @param {string} footerText
 * @param {Function} [t] translator
 */
async function complexsuccessEmbed(message, origin = 'unknown', interaction, autoReply = false, ephemeral = true, riotLogo = false, footerText = null, t) {
    const tr = t || i18n.getTranslator('en-US');
    let url = riotLogo ? 'https://i.imgur.com/xU45ZZz.png' : null;
    let footer = footerText ? footerText += ` | origin: ${origin}` : `origin: ${origin}`;

    const embed = new Discord.EmbedBuilder()
        .setColor(c.GREEN)
        .setTitle(`${E.greenMark} | ${tr('embed.successTitle')}`)
        .setDescription(message)
        .setFooter({ text: footer, iconURL: url });
    if (autoReply) await interaction.editReply({ embeds: [embed], ephemeral, content: null });
    return embed;
}

function buildSuccessEmbed(t) {
    const tr = t || i18n.getTranslator('en-US');
    return new Discord.EmbedBuilder()
        .setColor(c.GREEN)
        .setTitle(`${E.greenMark} | ${tr('embed.successTitle')}`)
        .setDescription(tr('embed.successDesc'));
}

const successEmbed = buildSuccessEmbed(); // retrocompat

module.exports = {
    loadingEmbed,
    buildLoadingEmbed,
    complexLoadingEmbed,
    errorEmbed,
    successEmbed,
    buildSuccessEmbed,
    complexsuccessEmbed,
};
