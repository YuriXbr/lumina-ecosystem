'use strict';

const { Events, ActivityType } = require('discord.js');
const {
    noPermission,
    eventLogEmbed,
    commandErrorWarning,
    commandMetrics,
} = require('../utils/logger/logger.js');
const permissionsService = require('../utils/services/PermissionsService.js');
const botConfigService   = require('../utils/services/EncryptionService.js');
const CommandGuard       = require('../utils/services/CommandGuard.js');

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;
        const { client } = interaction;

        const command = client.commands.get(interaction.commandName);
        if (!command) {
            await commandErrorWarning(
                interaction,
                new Error(`Comando /${interaction.commandName} não encontrado na coleção do bot.`),
                'Este comando não foi encontrado. Tente novamente ou contate um administrador.',
            );
            return;
        }

        client.user.setActivity({
            name: botConfigService.bot.activityName,
            type: ActivityType[botConfigService.bot.activityType],
            url:  botConfigService.bot.activityUrl || undefined,
        });

        // ── Verificação de permissões ──────────────────────────────────────────
        if (!await permissionsService.isBotStaff(interaction.user.id, 'owner') && command.permission === 'owner')
            return noPermission(command, interaction, 'InteractionCreate');
        if (!await permissionsService.isBotStaff(interaction.user.id, 'admin') && command.permission === 'admin')
            return noPermission(command, interaction, 'InteractionCreate');
        if (!await permissionsService.isBotStaff(interaction.user.id, 'moderator') && command.permission === 'moderator')
            return noPermission(command, interaction, 'InteractionCreate');

        // ── Guard de configuração da guilda (com cache por TTL) ───────────────
        // Moderation commands get a 60s TTL; everything else gets 5 min.
        // Returns { allowed: boolean, reason?: string } — if blocked, the
        // reason is shown to the user as an ephemeral reply.
        const guardResult = await CommandGuard.check(interaction, command);
        if (!guardResult.allowed) {
            // Avoid crashing if the interaction was somehow already ack'd.
            const payload = {
                content: guardResult.reason ?? 'Você não pode usar este comando aqui.',
                ephemeral: true,
            };
            if (interaction.deferred || interaction.replied) {
                return interaction.followUp(payload);
            }
            return interaction.reply(payload);
        }

        // ── Execução com tracking de métricas ─────────────────────────────────
        const startedAt = Date.now();
        let execError   = null;

        try {
            await command.execute(interaction);
        } catch (error) {
            execError = error;
        }

        const durationMs = Date.now() - startedAt;

        // Registra a métrica com o contexto completo da interação
        // (inclui opções/parâmetros, usuário, guild, canal, duração, erro)
        commandMetrics.record(interaction, durationMs, execError);

        if (execError) {
            // Log de evento para o canal do Discord
            eventLogEmbed(
                interaction,
                'InteractionCreate',
                `/${interaction.commandName} ERRO em ${durationMs}ms — ${execError.message} — ${interaction.user.tag} em ${interaction.guild?.name ?? 'DM'}`,
            );

            // Notifica o usuário e loga o erro com contexto de API se houver
            await commandErrorWarning(
                interaction,
                execError,
                'Ocorreu um erro ao executar o comando. Nossa equipe foi notificada.',
                execError.apiContext ?? null,
            );
        } else {
            // Log de sucesso no canal de eventos
            eventLogEmbed(
                interaction,
                'InteractionCreate',
                `/${interaction.commandName} ✅ ${durationMs}ms — ${interaction.user.tag} em ${interaction.guild?.name ?? 'DM'}`,
            );
        }
    },
};
