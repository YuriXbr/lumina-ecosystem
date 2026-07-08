const { EmbedBuilder } = require('discord.js');
const colorCodes = require('../../colorCodes.js');
const botConfigService = require('../../services/EncryptionService.js');

const mainGuild   = botConfigService.bot.mainGuild;
const errorChannel = botConfigService.bot.logErrorChannel;
const allChannel   = botConfigService.bot.logAllChannel;

/**
 * Envia uma mensagem de erro genérica (não ligada a um comando) ao canal de erros.
 * @param {Error|string} error  - O erro capturado
 * @param {import('discord.js').Client} client
 * @param {object} [context]    - Dados extras para o embed { label: value }
 */
async function sendErrorMessages(error, client, context = {}) {
    const errorStr = error instanceof Error ? error.message : String(error);
    const stackStr = error instanceof Error && error.stack ? error.stack.slice(0, 1000) : 'N/A';
    const ts = new Date().toLocaleString('pt-BR').replace(',', '');

    console.error(colorCodes.error + colorCodes.alerta(`[ERROR] ${ts} | ${errorStr}`));
    if (error?.stack) console.error(colorCodes.error + colorCodes.alerta(error.stack));

    try {
        const guild   = client.guilds.cache.get(mainGuild);
        const channel = guild?.channels.cache.get(errorChannel || allChannel);
        if (!channel) return;

        const fields = [
            { name: '💬 Mensagem', value: `\`${errorStr.slice(0, 1000)}\``, inline: false },
            { name: '🕐 Horário',  value: `\`${ts}\``,                      inline: true  },
            { name: '📋 Stack',    value: `\`\`\`${stackStr}\`\`\``,        inline: false },
        ];

        for (const [label, value] of Object.entries(context)) {
            fields.push({ name: label, value: String(value).slice(0, 512), inline: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('❌ Erro no Sistema')
            .setColor(0xFF3636)
            .setFields(fields)
            .setTimestamp()
            .setFooter({ text: 'Lumina Bot Error Logger' });

        await channel.send({ embeds: [embed] });
    } catch (logErr) {
        console.error('[sendErrorMessages] Falha ao enviar embed:', logErr.message);
    }
}

module.exports = { sendErrorMessages };
