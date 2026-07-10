'use strict';

const guildConfigCache = require('./GuildConfigCache');

/**
 * CommandGuard
 * ------------
 *
 * Validates a guild's config (cached) before a command is executed:
 *
 *   1. Is the command (or its category) enabled in `commandsEnabled`?
 *   2. For gacha commands → is `gachaEnabled` true?
 *   3. For chest commands → is `gachaChestsEnabled` true?
 *   4. Is the user (or any of their roles) in `blockedUsers` / `blockedRoles`?
 *
 * Returns `{ allowed: boolean, reason?: string }`. The cache is consulted
 * with the appropriate TTL — critical commands (moderation) get a 60s TTL,
 * everything else gets a 5-minute TTL via the same `GuildConfigCache`.
 */

/**
 * Categories whose commands are safety-sensitive — staff can change
 * moderation settings from the dashboard and expect them to take effect
 * quickly, so we use the shorter (60s) cache TTL.
 */
const CRITICAL_CATEGORIES = new Set(['moderation']);

/**
 * Categories that bypass per-guild config checks entirely:
 *   • `staff`  — bot administration commands (reload, stop, give, …),
 *                 not gated by guild config.
 *   • `setup`  — `/setuproles`, `/serversettings` — these are how the
 *                 guild config gets created in the first place, so they
 *                 can't be gated by it (chicken-and-egg).
 */
const BYPASS_CATEGORIES = new Set(['staff', 'setup']);

/**
 * Categories that touch the gacha subsystem. Gated by `gachaEnabled`.
 * (Forward-looking — the current codebase has no `gacha` category yet.)
 */
const GACHA_CATEGORIES = new Set(['gacha']);

/**
 * Categories that touch the chest subsystem (daily, openchest, …).
 * Gated by `gachaChestsEnabled`.
 */
const CHEST_CATEGORIES = new Set(['chests']);

/**
 * Default shape of a guild config. Used to fill in missing fields when
 * the API returns a partial row, so the guard always has something sane
 * to validate against.
 */
const DEFAULT_CONFIG = {
    commandsEnabled: {},     // e.g. { 'league.profile': true, 'moderation.ban': false }
    gachaEnabled: false,
    gachaChestsEnabled: false,
    blockedUsers: [],        // array of Discord user IDs
    blockedRoles: [],        // array of Discord role IDs
};

class CommandGuard {
    /**
     * Returns true if the command's category is critical (moderation),
     * meaning the cache should use the shorter TTL.
     *
     * @param {object} command
     * @returns {boolean}
     */
    static isCritical(command) {
        return Boolean(command && command.category && CRITICAL_CATEGORIES.has(command.category));
    }

    /**
     * Validates whether a command may be executed in this guild, by this
     * user, against the cached guild config.
     *
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {object} command - The command module from `client.commands`.
     * @returns {Promise<{ allowed: boolean, reason?: string }>}
     */
    static async check(interaction, command) {
        // DMs / no guild → nothing to validate, allow it through.
        if (!interaction.guild || !interaction.guildId) {
            return { allowed: true };
        }

        // Unknown command or no category → default to allowing.
        if (!command || !command.category) {
            return { allowed: true };
        }

        // Staff / setup commands bypass per-guild config entirely.
        if (BYPASS_CATEGORIES.has(command.category)) {
            return { allowed: true };
        }

        const isCritical = CommandGuard.isCritical(command);

        let config;
        try {
            config = await guildConfigCache.getCachedGuildConfig(
                interaction.guildId,
                isCritical,
            );
        } catch (error) {
            // If we can't read the config, don't block the command —
            // the actual command will surface the real API error. We
            // just log here so we have visibility.
            console.error('[CommandGuard] Falha ao buscar guild config:', error?.message ?? error);
            return { allowed: true };
        }

        // No config yet (guild not registered). Let the command run —
        // it can prompt setup on its own (see /setuproles).
        if (!config) {
            return { allowed: true };
        }

        const merged = CommandGuard._mergeDefaults(config);

        // ── 1. Category / command-level enable flag ──────────────────────
        // Two lookup conventions are supported:
        //   • `${category}.${commandName}` — per-command granularity.
        //   • `${category}`                — whole-category kill-switch.
        // `true`  = explicitly enabled
        // `false` = explicitly disabled
        // missing = treated as enabled (default-open)
        const commandKey = `${command.category}.${interaction.commandName}`;
        const commandsEnabled = merged.commandsEnabled;

        if (Object.prototype.hasOwnProperty.call(commandsEnabled, commandKey)
            && commandsEnabled[commandKey] === false) {
            return {
                allowed: false,
                reason: `O comando \`${commandKey}\` está desativado neste servidor.`,
            };
        }
        if (Object.prototype.hasOwnProperty.call(commandsEnabled, command.category)
            && commandsEnabled[command.category] === false) {
            return {
                allowed: false,
                reason: `A categoria \`${command.category}\` está desativada neste servidor.`,
            };
        }

        // ── 2. Gacha / chest gates ───────────────────────────────────────
        if (GACHA_CATEGORIES.has(command.category) && !merged.gachaEnabled) {
            return {
                allowed: false,
                reason: 'Os comandos de gacha estão desativados neste servidor.',
            };
        }
        if (CHEST_CATEGORIES.has(command.category) && !merged.gachaChestsEnabled) {
            return {
                allowed: false,
                reason: 'A abertura de baús está desativada neste servidor.',
            };
        }

        // ── 3. Blocked user / role check ─────────────────────────────────
        if (merged.blockedUsers.includes(interaction.user.id)) {
            return {
                allowed: false,
                reason: 'Você foi bloqueado de usar comandos deste servidor.',
            };
        }

        const memberRoles = interaction.member?.roles?.cache;
        if (memberRoles && merged.blockedRoles.length > 0) {
            for (const roleId of merged.blockedRoles) {
                if (memberRoles.has(roleId)) {
                    return {
                        allowed: false,
                        reason: 'Um dos seus cargos está bloqueado de usar comandos deste servidor.',
                    };
                }
            }
        }

        return { allowed: true };
    }

    /**
     * Merges a raw guild config from the API with the defaults so the
     * guard never has to deal with `undefined` for known fields.
     *
     * @param {object} config
     * @returns {object}
     * @private
     */
    static _mergeDefaults(config) {
        return {
            ...DEFAULT_CONFIG,
            ...config,
            commandsEnabled: {
                ...(config.commandsEnabled || DEFAULT_CONFIG.commandsEnabled),
            },
            blockedUsers: Array.isArray(config.blockedUsers) ? config.blockedUsers : [],
            blockedRoles: Array.isArray(config.blockedRoles) ? config.blockedRoles : [],
        };
    }
}

module.exports = CommandGuard;
