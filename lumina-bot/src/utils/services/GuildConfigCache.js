'use strict';

const LuminaApiService = require('./LuminaApiService');

/**
 * GuildConfigCache
 * ----------------
 *
 * In-memory cache for guild configuration fetched from the Lumina API.
 *
 * The bot used to hit `/expapi/internal/fetchguilddata` on every command
 * execution, which is slow. This cache sits in front of that call so the
 * vast majority of command invocations resolve locally.
 *
 * TTL strategy — a single entry per guild, with the freshness check using
 * the TTL that matches the caller's `isCritical` flag:
 *
 *   • Critical commands   (moderation: ban, mute, warn, unmute, unban,
 *                          unwarn) → 60s  TTL. Dashboard changes to
 *                          moderation settings propagate quickly.
 *   • Non-critical commands (league, chests, utility, …) → 300s TTL.
 *
 * We don't use Redis on purpose — the bot runs serverless-style and the
 * cache only needs to live for the process lifetime. A `Map` is enough.
 */
class GuildConfigCache {
    /** Critical commands: 60 seconds. */
    static TTL_CRITICAL_MS = 60 * 1000;

    /** Non-critical commands: 5 minutes (300 seconds). */
    static TTL_NON_CRITICAL_MS = 5 * 60 * 1000;

    constructor() {
        /** @type {Map<string, { config: object|null, fetchedAt: number }>} */
        this.cache = new Map();
        this.api = new LuminaApiService();
    }

    /**
     * Returns the cached guild config, fetching from the API when the
     * cached entry is stale (or missing) for the caller's criticality.
     *
     * @param {string} guildId       - Discord guild ID.
     * @param {boolean} [isCritical=false] - Use the 60s TTL when true.
     * @returns {Promise<object|null>} - Guild config row, or `null` if
     *                                   the guild isn't registered yet.
     */
    async getCachedGuildConfig(guildId, isCritical = false) {
        if (!guildId) {
            throw new Error('GuildConfigCache: guildId é obrigatório.');
        }

        const ttl = isCritical
            ? GuildConfigCache.TTL_CRITICAL_MS
            : GuildConfigCache.TTL_NON_CRITICAL_MS;

        const entry = this.cache.get(guildId);
        const now = Date.now();

        // Fresh enough for this caller → serve from cache.
        if (entry && (now - entry.fetchedAt) < ttl) {
            return entry.config;
        }

        let config;
        try {
            config = await this._fetchFromApi(guildId);
        } catch (error) {
            // Network/API failure — fall back to the stale entry if we
            // have one so the command still has something to work with.
            // Otherwise propagate so the caller can surface the error.
            if (entry) {
                console.warn('[GuildConfigCache] Falha ao atualizar cache — usando entrada antiga:', error?.message ?? error);
                return entry.config;
            }
            throw error;
        }

        // Don't cache null/undefined (guild not registered yet). The next
        // call should retry so a freshly-registered guild is picked up.
        if (config) {
            this.cache.set(guildId, { config, fetchedAt: now });
        } else if (entry) {
            // Preserve a previous entry so a transient empty response
            // doesn't wipe out good cached data.
            return entry.config;
        }

        return config;
    }

    /**
     * Removes the cached config for a guild. Call this whenever the
     * dashboard (or any other flow) updates a guild's configuration so
     * the next command execution re-fetches the fresh values.
     *
     * @param {string} guildId
     */
    invalidateCache(guildId) {
        this.cache.delete(guildId);
    }

    /**
     * Clears the entire cache. Mainly useful for tests or hot reloads.
     */
    invalidateAll() {
        this.cache.clear();
    }

    /**
     * Returns the cached config for a guild *without* fetching, or
     * `null` if nothing is cached yet. Useful for debugging/metrics.
     *
     * @param {string} guildId
     * @returns {object|null}
     */
    peek(guildId) {
        const entry = this.cache.get(guildId);
        return entry ? entry.config : null;
    }

    /**
     * Fetches the guild config from the Lumina API. Uses the same
     * endpoint already used by `/serversettings` and `/setuproles`.
     *
     * @param {string} guildId
     * @returns {Promise<object|null>}
     * @private
     */
    async _fetchFromApi(guildId) {
        return this.api.post('/expapi/internal/fetchguilddata', { guildId });
    }
}

// Export a singleton — we want one shared cache across the whole bot.
module.exports = new GuildConfigCache();
