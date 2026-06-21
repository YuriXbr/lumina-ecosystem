const DatabaseService = require("../../../database/services/DataBaseService");
// Endpointed Checked on V1.2.0

module.exports = {
    route: '/expapi/v1/db',
    description: "Get DataBase connection status",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    method: 'get',

    async execute(req, res) {
        try {
            const results = await new DatabaseService().checkConnection();
            res.status(200).send(`Connection State: ${JSON.stringify(results)} -- 1 = Connected, 2 = Connecting, 0 = Disconnected`);
        } catch (err) {
            res.status(500).send(`Connection failed. ${err}`);
        }
    }
};
