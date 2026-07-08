const { EmbedBuilder } = require('discord.js');
const colorCodes = require('../../colorCodes.js');
const botConfigService = require('../../services/EncryptionService.js');

const mainGuild   = botConfigService.bot.mainGuild;
const errorChannel = botConfigService.bot.logErrorChannel;
const allChannel   = botConfigService.bot.logAllChannel;

/**
 * Registra e reporta um erro de comando com rastreabilidade completa.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {Error|string} error          - Erro capturado
 * @param {string}       userMessage    - Mensagem exibida ao usuário
 * @param {object}       [apiContext]   - Contexto de chamada à API, se houver:
 *   @param {string}   apiContext.endpoint   - Endpoint chamado
 *   @param {string}   apiContext.method     - Método HTTP
 *   @param {number}   apiContext.status     - Status HTTP recebido
 *   @param {string}   apiContext.calledAt   - ISO timestamp da chamada
 *   @param {object}   apiContext.params     - Payload/parâmetros enviados
 *   @param {string}   [apiContext.apiError] - Mensagem de erro da API
 *   @param {string}   [apiContext.apiCode]  - Código de erro da API
 */
async function commandErrorWarning(interaction, error, userMessage = 'Ocorreu um erro ao executar o comando.', apiContext = null) {
    const ts = new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).replace(',', '');

    const errorStr = error instanceof Error ? error.message : String(error);
    const stackStr = error instanceof Error && error.stack
        ? error.stack.slice(0, 1000)
        : 'Stack não disponível';

    // ── Console log rico ──────────────────────────────────────────────────────
    console.error(colorCodes.error + colorCodes.alerta(
        `[COMMAND ERROR] ${ts} | Comando: /${interaction.commandName} | Usuário: ${interaction.user.tag} (${interaction.user.id}) | Guild: ${interaction.guild?.name} (${interaction.guild?.id})`
    ));
    console.error(colorCodes.error + colorCodes.alerta(`  Mensagem: ${errorStr}`));
    if (apiContext) {
        console.error(colorCodes.api + colorCodes.alerta(
            `  API: ${apiContext.method} ${apiContext.endpoint} → HTTP ${apiContext.status} @ ${apiContext.calledAt}`
        ));
        console.error(colorCodes.api + colorCodes.alerta(
            `  Params: ${JSON.stringify(apiContext.params)}`
        ));
        if (apiContext.apiError) console.error(colorCodes.api + colorCodes.alerta(`  API Error: ${apiContext.apiError} [${apiContext.apiCode || 'N/A'}]`));
    }
    console.error(colorCodes.error + colorCodes.alerta(`  Stack:\n${stackStr}`));

    // ── Embed de log no Discord ───────────────────────────────────────────────
    try {
        const client = interaction.client;
        const guild  = client.guilds.cache.get(mainGuild);
        const channel = guild?.channels.cache.get(errorChannel || allChannel);

        if (channel) {
            const fields = [
                { name: '⚔️ Comando',   value: `\`/${interaction.commandName}\` (ID: ${interaction.commandId})`, inline: false },
                { name: '👤 Usuário',   value: `${interaction.user.tag} (${interaction.user.id})`,                inline: true  },
                { name: '🏠 Guild',     value: `${interaction.guild?.name ?? 'N/A'} (${interaction.guild?.id ?? 'N/A'})`, inline: true },
                { name: '📢 Canal',     value: `#${interaction.channel?.name ?? 'N/A'} (${interaction.channel?.id ?? 'N/A'})`, inline: true },
                { name: '🕐 Horário',   value: `\`${ts}\``,                                                      inline: true  },
                { name: '🌐 Locale',    value: `User: ${interaction.locale} / Guild: ${interaction.guildLocale}`, inline: true  },
                { name: '⚙️ Estado',    value: `deferred: ${interaction.deferred} | replied: ${interaction.replied} | ephemeral: ${interaction.ephemeral}`, inline: false },
                { name: '💬 Erro',      value: `\`\`\`${errorStr.slice(0, 900)}\`\`\``,                          inline: false },
                { name: '📋 Stacktrace', value: `\`\`\`${stackStr}\`\`\``,                                       inline: false },
            ];

            if (apiContext) {
                fields.push(
                    { name: '🌐 API Endpoint', value: `\`${apiContext.method} ${apiContext.endpoint}\``, inline: true },
                    { name: '📊 HTTP Status',  value: `\`${apiContext.status ?? 'N/A'}\``,              inline: true },
                    { name: '⏱️ API CalledAt', value: `\`${apiContext.calledAt ?? 'N/A'}\``,            inline: true },
                    { name: '📦 Params Enviados', value: `\`\`\`json\n${JSON.stringify(apiContext.params, null, 2).slice(0, 500)}\n\`\`\``, inline: false },
                );
                if (apiContext.apiError) {
                    fields.push({ name: '❌ Resposta da API', value: `\`${apiContext.apiError}\` [${apiContext.apiCode ?? 'N/A'}]`, inline: false });
                }
            }

            // Opções do usuário (parâmetros do slash command)
            const options = interaction.options?.data ?? [];
            if (options.length > 0) {
                const optStr = options.map(o => `${o.name}: ${JSON.stringify(o.value)}`).join('\n');
                fields.push({ name: '🎛️ Opções do Comando', value: `\`\`\`\n${optStr.slice(0, 500)}\n\`\`\``, inline: false });
            }

            const embed = new EmbedBuilder()
                .setTitle(`❌ Erro em \`/${interaction.commandName}\``)
                .setColor(0xFF3636)
                .setFields(fields)
                .setTimestamp()
                .setFooter({ text: 'Lumina Bot Error Logger' });

            await channel.send({ embeds: [embed] });
        }
    } catch (logErr) {
        console.error('[commandErrorWarning] Falha ao enviar embed de erro:', logErr.message);
    }

    // ── Resposta ao usuário (ephemeral) ───────────────────────────────────────
    const userEmbed = new EmbedBuilder()
        .setTitle('❌ Ops, algo deu errado!')
        .setDescription(userMessage)
        .setColor(0xFF3636);

    try {
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ embeds: [userEmbed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [userEmbed], ephemeral: true });
        }
    } catch (replyErr) {
        console.error('[commandErrorWarning] Falha ao responder ao usuário:', replyErr.message);
    }
}

module.exports = { commandErrorWarning };
