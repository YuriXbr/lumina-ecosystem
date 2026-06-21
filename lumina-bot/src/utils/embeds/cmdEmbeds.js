const Discord = require('discord.js');
var today = new Date(); var data = today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear() + ' ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
const c = require('../colorCodes.js');
const E = require('../../assets/emojis.js').emojis;
const { commandErrorWarning } = require('../logger/logModals/commandErrorWarning.js');


    /** Loading Embed constant
     * @type {MessageEmbed}
     */
    const loadingEmbed = new Discord.EmbedBuilder()
        .setColor(c.YELLOW)
        .setTitle(`${E.loading} | LOADING`)
        .setDescription("Wait a moment, I'm processing your request.")

    /** Error Embed constant
     * @type {MessageEmbed}
     * @param {string} message - Embed message
     * @param {string} origin - The embed caller origin (default: 'unknown')
     * @param {Interaction} interaction - interaction object
     * @param {boolean} autoReply - Function will send the embed automatically if true (need interaction object) (default: false)
     * @param {boolean} ephemeral - If the message will be ephemeral (default: true)
     * @param {boolean} riotLogo - If the embed will have the Riot Games logo (default: false)
     * @param {string} footerText - The text that will be displayed in the footer (default: null)
     * @returns {MessageEmbed} - Returns an error embed
     */
    async function complexLoadingEmbed(message = null , origin = 'unknown', interaction, autoReply = false, ephemeral = true, riotLogo = false, footerText = null) {    
        let url = riotLogo ? 'https://i.imgur.com/xU45ZZz.png' : null;
        let footer = footerText ? footerText+= ` | origin: ${origin}` : `origin: ${origin}`;

        const loadingEmbed = new Discord.EmbedBuilder()
        .setColor(c.YELLOW)
        .setTitle(`${E.loading} | LOADING`)
        .setDescription(message || "Wait a moment, I'm processing your request.")
        .setFooter({text:footer, iconURL: url})
        if(autoReply) await interaction.editReply({ embeds: [loadingEmbed], ephemeral: ephemeral, content: null });
        return loadingEmbed;
    }

    /** ErrorEmbed Function
    * @param {string} message - Embed message
    * @param {string} origin - The embed caller origin (default: 'unknown')
    * @param {Interaction} interaction - interaction object
    * @param {boolean} autoReply - Function will send the embed automatically if true (need interaction object) (default: false)
    * @param {boolean} ephemeral - If the message will be ephemeral (default: true)
    * @returns {MessageEmbed} - Returns an error embed
    */
    async function errorEmbed(message, origin = 'unknown', interaction, autoReply = false, ephemeral = true) {
        const errorEmbed = new Discord.EmbedBuilder()
        .setColor(c.RED)
        .setTitle(`${E.error} | ERROR`)
        .setDescription(message)
        .setFooter({text:`origin: ${origin}`})
        if(autoReply) await interaction.editReply({ embeds: [errorEmbed], ephemeral: ephemeral, content: null });
        console.log(c.error+ ' Origin: '+origin+' | '+message);
        commandErrorWarning(interaction, message);
        return errorEmbed;
    }

    /** SuccessEmbed Function
     * @param {string} message - Embed message
     * @param {string} origin - The embed caller origin (default: 'unknown')
     * @param {Interaction} interaction - interaction object
     * @param {boolean} autoReply - Function will send the embed automatically if true (need interaction object) (default: false)
     * @param {boolean} ephemeral - If the message will be ephemeral (default: true)
     * @param {boolean} riotLogo - If the embed will have the Riot Games logo (default: false)
     * @param {string} footerText - The text that will be displayed in the footer (default: null)
     * @returns {MessageEmbed} - Returns a success embed
     */
    async function complexsuccessEmbed(message, origin = 'unknown', interaction, autoReply = false, ephemeral = true, riotLogo = false, footerText = null) {
        let url = riotLogo ? 'https://i.imgur.com/xU45ZZz.png' : null;
        let footer = footerText ? footerText+= ` | origin: ${origin}` : `origin: ${origin}`;
        
        const successEmbed = new Discord.EmbedBuilder()
        .setColor(c.GREEN)
        .setTitle(`${E.greenMark} | SUCCESS`)
        .setDescription(message)
        .setFooter({text:footer, iconURL: url})
        if(autoReply) await interaction.editReply({ embeds: [successEmbed], ephemeral: ephemeral, content: null });
        return successEmbed;
    }

    const successEmbed = new Discord.EmbedBuilder()
        .setColor(c.GREEN)
        .setTitle(`${E.greenMark} | SUCCESS`)
        .setDescription("The request was successfully processed.")

module.exports = {
	loadingEmbed,
    complexLoadingEmbed,
    errorEmbed,
    successEmbed,
    complexsuccessEmbed
}