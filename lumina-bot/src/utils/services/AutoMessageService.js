const GuildConfigCache = require('./GuildConfigCache');

/**
 * AutoMessageService — polls guild configs for auto-messages.
 * Silently skips guilds with no config (404) to avoid log spam.
 */
class AutoMessageService {
    constructor() {
        this.isPolling = false;
        this.pollIntervalMs = 60 * 1000;
        this.intervalId = null;
        this.sentTracker = new Map();
    }

    start(client) {
        if (this.intervalId) return;
        console.log(`[AutoMessageService] Started (poll every ${this.pollIntervalMs / 1000}s)`);
        this.intervalId = setInterval(() => {
            this._poll(client).catch(err => {
                console.error('[AutoMessageService] Poll error:', err.message);
            });
        }, this.pollIntervalMs);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    async _poll(client) {
        if (this.isPolling) return;
        this.isPolling = true;
        try {
            const now = Date.now();
            for (const [guildId] of client.guilds.cache) {
                let config;
                try {
                    config = await GuildConfigCache.getCachedGuildConfig(guildId, false);
                } catch { continue; }
                if (!config) continue;
                const msgs = config.autoMessages;
                if (!Array.isArray(msgs) || msgs.length === 0) continue;
                for (const m of msgs) {
                    if (!m?.enabled || !m?.channelId || !m?.message || !m?.intervalMinutes) continue;
                    const key = `${guildId}:${m.id || m.channelId}`;
                    const last = this.sentTracker.get(key) || 0;
                    if (now - last < m.intervalMinutes * 60000) continue;
                    try {
                        const ch = await client.channels.fetch(m.channelId);
                        if (!ch) continue;
                        await ch.send(m.message);
                        this.sentTracker.set(key, now);
                    } catch (e) {
                        if (e.code !== 10003 && e.code !== 50013)
                            console.warn(`[AutoMessageService] Channel ${m.channelId}: ${e.message}`);
                    }
                }
            }
        } finally { this.isPolling = false; }
    }
}

module.exports = new AutoMessageService();
