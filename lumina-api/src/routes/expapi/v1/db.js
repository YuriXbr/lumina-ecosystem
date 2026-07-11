const DatabaseService = require('../../../database/services/DataBaseService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'GET /expapi/v1/db';
// Endpointed Checked on V1.2.0

module.exports = {
    route: '/expapi/v1/db',
    description: 'Get DataBase connection status',
    apiKeyNeeded: false,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    method: 'get',

    async execute(req, res) {
        try {
            const results = await new DatabaseService('healthcheck', { _id: false }).checkConnection();
            res.status(200).send(
                `Connection State: ${JSON.stringify(results)} -- 1 = Connected, 2 = Connecting, 0 = Disconnected`
            );
        } catch (error) {
            return routeError({
                res, error,
                route: ROUTE,
                errorCode: 'DB_CONNECTION_ERROR',
                userMsg: 'Erro ao verificar conexão com o banco de dados.',
            });
        }
    }
};
