
module.exports = {
    route: '/configsUpdate',
    description: "configsUpdate route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    middlewares: [],
    method: 'get',

    async execute(req, res) {
        res.send('configsUpdate route');
    }
};
