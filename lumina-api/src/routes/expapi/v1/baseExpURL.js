// Endpointed Checked on V1.2.0

module.exports = {
    route: '/expapi/v1/',
    description: "baseExpURL route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        res.status(200).send('Pong!');
    }
};
