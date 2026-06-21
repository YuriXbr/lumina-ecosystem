const url = require('url');

module.exports = {
    route: '/expapi/oauth2/discord/login',
    description: "Discord oauth2 login route",
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        const discordAuthUrl = 'https://discord.com/oauth2/authorize';
        const params = new url.URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            response_type: 'code',
            redirect_uri: process.env.DISCORD_REDIRECT_URI,
            scope: 'identify guilds email messages.read',
            state: req.query.origin || 'https://bot.luminasink.com'
        });

        res.redirect(`${discordAuthUrl}?${params.toString()}`);
    }
}