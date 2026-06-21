const Discord = require('discord.js');
var today = new Date(); var data = today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear() + ' ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
const c = require('../colorCodes.js');

/** Create Ready Embed
 * @returns {MessageEmbed} - Returns a ready embed
 */
async function createReadyEmbed() {
    const readyEmbed = new Discord.EmbedBuilder()
        .setColor(c.GREEN)
        .setTitle('✅ | CONEXÃO ESTABELECIDA')
        .setDescription("BOT FOI INICIADO")
        .addFields([
            {name: 'DATA DE CONEXÃO', value: `${data}`},
        ]);
    return readyEmbed;
}


module.exports = {
	createReadyEmbed
}