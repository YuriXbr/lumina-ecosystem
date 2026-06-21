/**
 * @deprecated This route is deprecated as of configuration migration to .env and database
 * Configuration information should be fetched from:
 * - Environment variables (.env) for API keys and secrets
 * - Database for guild/user-specific configurations
 * - Dedicated configuration endpoints for specific data types
 */

module.exports = {
    route: '/expapi/v1/getconfig',
    description: "[DEPRECATED] Get info from configuration file - Use environment variables and database endpoints instead",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: false,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: true,
    method: 'get',

    async execute(req, res) {
        return res.status(410).json({
            error: 'Gone',
            message: 'This endpoint has been deprecated and removed',
            details: 'Configuration is now managed through environment variables (.env) and database. Use appropriate endpoints to fetch specific configurations.',
            timestamp: new Date().toISOString()
        });
    }
};
