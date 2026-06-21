
module.exports = {
    route: '/getConfigs',
    description: "getConfigs route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    middlewares: [],
    method: 'get',

    async execute(req, res) {
        res.send('getConfigs route');
    }
};
