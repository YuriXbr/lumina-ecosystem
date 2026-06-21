const Discord = require('discord.js');
var today = new Date(); var data = today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear() + ' ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
const c = require('../colorCodes.js');
const E = require('../../assets/emojis.js').emojis;


    /** Generic Embed
     * @param {string} message - Embed message
     * @param {string} description - Embed description
     * @param {string} color - Embed color (default: BLUE)
     * @param {string} footerText - Embed footer text (default: null)
     * @param {string} footerIcon - Embed footer icon (default: null)
     * @param {object} fields - Embed fields object (default: null)
     * @param {string} thumbnail - Embed thumbnail url (default: null)
     * @param {string} image - Embed image url (default: null)
     * @param {string} author - Embed author (default: null)
     * @param {string} authorIcon - Embed author icon url (default: null)
     * @param {string} authorURL - Embed author url (default: null)
     * @param {string} authorText - Embed author text (default: null)
     * @param {boolean} timestamp - Embed timestamp (default: false)
     * @returns {MessageEmbed} - Returns a generic embed
     */
async function generalPurpouseEmbed(title = null, description = null, color = c.BLUE, footerText = null, footerIcon = null, fields = null, thumbnail = null, image = null, author = null, authorIcon = null, authorURL = null, authorText = null, timestamp = false) {
    const embed = new Discord.EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: footerText, iconURL: footerIcon })
        .setThumbnail(thumbnail)
        .setImage(image)
        .setAuthor({ name: authorText, iconURL: authorIcon, url: authorURL })
        .setTimestamp(timestamp)
        .addFields(fields);

    return embed;
}

    /** Generic Green Mark Embed
     * @param {string} title - Embed title
     * @param {string} description - Embed description
     * @param {string} color - Embed color (default: GREEN)
     * @param {string} footerText - Embed footer text (default: null)
     * @param {string} footerIcon - Embed footer icon (default: null)
     * @param {string} thumbnail - Embed thumbnail url (default: null)
     * @param {string} image - Embed image url (default: null)
     */
async function genericGreenMarkEmbed(title = null, description = null, color = c.GREEN, footerText = null, footerIcon = null, thumbnail = null, image = null) {
    const embed = new Discord.EmbedBuilder()
        .setColor(color)
        .setTitle(E.greenMark +" "+ title)
        .setDescription(description)
        .setFooter({ text: footerText, iconURL: footerIcon })
        .setThumbnail(thumbnail)
        .setImage(image);

    return embed;
    
}

    /** Generic Green Mark Embed    
     * @param {string} title - Embed title
     * @param {string} description - Embed description
     * @param {string} color - Embed color (default: GREEN)
     * @param {string} footerText - Embed footer text (default: null)
     * @param {string} footerIcon - Embed footer icon (default: null)
     * @param {string} thumbnail - Embed thumbnail url (default: null)
     * @param {string} image - Embed image url (default: null)
     */
async function genericBlueMarkEmbed(title = null, description = null, color = c.BLUE, footerText = null, footerIcon = null, thumbnail = null, image = null) {
    const embed = new Discord.EmbedBuilder()
        .setColor(color)
        .setTitle(E.blueMark +" "+ title)
        .setDescription(description)
        .setFooter({ text: footerText, iconURL: footerIcon })
        .setThumbnail(thumbnail)
        .setImage(image);

    return embed;
    
}

module.exports = { 
    generalPurpouseEmbed,
    genericGreenMarkEmbed,
    genericBlueMarkEmbed
 };