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
const i18n               = require('../utils/i18n/index.js');

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;
        const { client } = interaction;

        // ── Resolve translator antes de qualquer reply ──────────────────────
        // O locale vem do cliente do Discord (interaction.locale) — não precisa
        // de roundtrip ao banco. Se por algum motivo não estiver disponível,
        // usamos interaction.guildLocale. Caso nenhum exista, fallback en-US.
        const locale = i18n.resolveFromInteraction(interaction);
        const t = i18n.getTranslator(locale);

        const command = client.commands.get(interaction.commandName);
        if (!command) {
            await commandErrorWarning(
                interaction,
                new Error(`Command /${interaction.commandName} not found in bot collection.`),
                t('common.commandNotFound'),
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

        // ── Execução com tracking de métricas ─────────────────────────────────
        // O translator `t` é injetado como segundo argumento para que os comandos
        // possam traduzir strings sem precisar resolver locale eles mesmos.
        // Comandos que ainda não aceitam `t` simplesmente o ignoram (JS não reclama
        // de params extras).
        const startedAt = Date.now();
        let execError   = null;

        // CommandGuard: check per-guild config (blocked users, disabled commands, etc.)
        const CommandGuard = require('../utils/services/CommandGuard.js');
        const guardResult = await CommandGuard.check(interaction, command);
        if (!guardResult.allowed) {
            if (guardResult.reason) {
                return interaction.editReply({ content: guardResult.reason, ephemeral: true });
            }
            return; // Silent rejection
        }

        // Cooldown check (B-C5): per-user-per-command cooldown
        if (command.cooldown && command.cooldown > 0) {
            const cooldownKey = `${interaction.user.id}:${command.data.name}`;
            const now = Date.now();
            if (interaction.client._cooldowns?.has(cooldownKey)) {
                const expires = interaction.client._cooldowns.get(cooldownKey);
                if (now < expires) {
                    const remaining = Math.ceil((expires - now) / 1000);
                    return interaction.editReply({ content: `⏳ Wait ${remaining}s before using this command again.`, ephemeral: true });
                }
            }
            if (!interaction.client._cooldowns) interaction.client._cooldowns = new Map();
            interaction.client._cooldowns.set(cooldownKey, now + command.cooldown * 1000);
            // Auto-clean after expiry
            setTimeout(() => interaction.client._cooldowns?.delete(cooldownKey), command.cooldown * 1000 + 1000);
        }

        try {
            await command.execute(interaction, t);
        } catch (error) {
            execError = error;
        }

        const durationMs = Date.now() - startedAt;

        // Registra a métrica com o contexto completo da interação
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
                t('common.commandError'),
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
