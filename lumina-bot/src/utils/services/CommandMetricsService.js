'use strict';

/**
 * src/utils/services/CommandMetricsService.js
 *
 * Tracking de métricas de execução de comandos Discord.
 * Cada execução é registrada localmente (em memória) e enviada para a
 * API Lumina via POST /expapi/internal/commandlog com contexto completo:
 * opções/parâmetros, usuário, guild, canal, duração, erros.
 */

const startedAt = Date.now();

/** @type {Map<string, { count: number, errorCount: number, totalMs: number, lastCalledAt: string|null, lastErrorAt: string|null, lastErrorMsg: string|null }>} */
const commandStats = new Map();

let totalCommands = 0;
let totalErrors   = 0;

// ─── Extração de opções do slash command ──────────────────────────────────────

/**
 * Serializa as opções de um ChatInputCommandInteraction de forma segura.
 * Retorna um objeto { nomeDaOpcao: valor } com todos os subcomandos, grupos
 * e opções resolvidas para que o log tenha o contexto completo do que foi
 * solicitado pelo usuário.
 */
function extractOptions(interaction) {
    try {
        const opts = {};

        // Subcommand group
        const group = interaction.options.getSubcommandGroup?.(false);
        if (group) opts._subcommandGroup = group;

        // Subcommand
        const sub = interaction.options.getSubcommand?.(false);
        if (sub) opts._subcommand = sub;

        // Opções simples
        for (const opt of (interaction.options?.data ?? [])) {
            // Para subcommand groups e subcommands, desce recursivamente
            if (opt.options?.length) {
                for (const sub of opt.options) {
                    if (sub.options?.length) {
                        for (const leaf of sub.options) {
                            opts[leaf.name] = _resolveValue(leaf);
                        }
                    } else {
                        opts[sub.name] = _resolveValue(sub);
                    }
                }
            } else {
                opts[opt.name] = _resolveValue(opt);
            }
        }

        return opts;
    } catch {
        return {};
    }
}

function _resolveValue(opt) {
    // Retorna o valor mais informativo disponível sem expor dados sensíveis em demasia
    if (opt.user)    return `@${opt.user.tag} (${opt.user.id})`;
    if (opt.member)  return `member:${opt.member.id}`;
    if (opt.role)    return `role:${opt.role.name} (${opt.role.id})`;
    if (opt.channel) return `#${opt.channel.name} (${opt.channel.id})`;
    return opt.value;
}

// ─── Registro de execução ─────────────────────────────────────────────────────

/**
 * Registra a execução de um comando com contexto completo.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {number}  durationMs  - Tempo total de execução em ms
 * @param {Error|null} [error]  - Erro capturado, se houver
 */
function record(interaction, durationMs, error = null) {
    const commandName = interaction.commandName;
    totalCommands++;

    let stats = commandStats.get(commandName);
    if (!stats) {
        stats = { count: 0, errorCount: 0, totalMs: 0, lastCalledAt: null, lastErrorAt: null, lastErrorMsg: null };
        commandStats.set(commandName, stats);
    }

    stats.count++;
    stats.totalMs += durationMs;
    stats.lastCalledAt = new Date().toISOString();

    if (error) {
        totalErrors++;
        stats.errorCount++;
        stats.lastErrorAt  = new Date().toISOString();
        stats.lastErrorMsg = String(error.message || error).slice(0, 500);
    }

    // Envia log detalhado para a API (fire-and-forget)
    _sendLogToApi(interaction, commandName, durationMs, error).catch(() => {});
}

async function _sendLogToApi(interaction, commandName, durationMs, error) {
    try {
        const LuminaApiService = require('./LuminaApiService');
        const api = new LuminaApiService();

        const options = extractOptions(interaction);
        const level   = error ? 'error' : 'info';
        const status  = error ? '❌ ERRO' : '✅ OK';

        // Mensagem legível com todos os parâmetros relevantes
        const optStr = Object.entries(options).length > 0
            ? Object.entries(options).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' | ')
            : '(sem opções)';

        const message = error
            ? `/${commandName} falhou em ${durationMs.toFixed(0)}ms — ${error.message || error} | opts: ${optStr}`
            : `/${commandName} executado em ${durationMs.toFixed(0)}ms | opts: ${optStr}`;

        await api.post('/expapi/internal/commandlog', {
            level,
            type:      'COMMAND',
            action:    `command.${commandName}`,
            message,
            durationMs,

            // Identificação completa do usuário
            userId:     interaction.user.id,
            userEmail:  '', // Bot não tem acesso ao email — fica vazio

            extra: {
                // Usuário
                userTag:          interaction.user.tag,
                userDisplayName:  interaction.member?.displayName || interaction.user.displayName,
                userLocale:       interaction.locale,

                // Localização
                guildId:          interaction.guild?.id   || 'DM',
                guildName:        interaction.guild?.name || 'DM',
                channelId:        interaction.channel?.id   || '',
                channelName:      interaction.channel?.name || '',
                guildLocale:      interaction.guildLocale || '',

                // Comando
                commandId:        interaction.commandId,
                commandName,
                subcommand:       options._subcommand      || null,
                subcommandGroup:  options._subcommandGroup || null,
                options:          (() => {
                    // Remove campos internos antes de serializar
                    const { _subcommand, _subcommandGroup, ...rest } = options;
                    return rest;
                })(),

                // Estado da interação
                deferred:   interaction.deferred,
                replied:    interaction.replied,
                ephemeral:  interaction.ephemeral,

                // Erro (se houver)
                error:      error ? String(error.message || error).slice(0, 1000) : null,
                errorCode:  error?.apiContext?.apiCode || null,
                apiEndpoint:error?.apiContext?.endpoint || null,
                apiStatus:  error?.apiContext?.status   || null,
            },
        }, /* apiKey= */ false);
    } catch {
        // Falha silenciosa — log de comando não pode travar a resposta ao usuário
    }
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

function getSnapshot() {
    const commands = {};
    for (const [name, s] of commandStats.entries()) {
        commands[name] = {
            count:        s.count,
            errorCount:   s.errorCount,
            avgDurationMs: s.count > 0 ? Math.round((s.totalMs / s.count) * 10) / 10 : 0,
            errorRate:    s.count > 0 ? Math.round((s.errorCount / s.count) * 10000) / 100 : 0,
            lastCalledAt: s.lastCalledAt,
            lastErrorAt:  s.lastErrorAt,
            lastErrorMsg: s.lastErrorMsg,
        };
    }

    return {
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        totalCommands,
        totalErrors,
        errorRate: totalCommands > 0 ? Math.round((totalErrors / totalCommands) * 10000) / 100 : 0,
        commands,
        topCommands: [...commandStats.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([name, s]) => ({ name, count: s.count, errorCount: s.errorCount })),
    };
}

function _reset() {
    commandStats.clear();
    totalCommands = 0;
    totalErrors   = 0;
}

module.exports = { record, getSnapshot, _reset, extractOptions };
