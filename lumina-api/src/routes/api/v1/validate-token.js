
module.exports = {
    route: '/validate-token',
    description: "validate-token route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    middlewares: [],
    method: 'get',

    async execute(req, res) {
        res.send('validate-token route');
    }
};
