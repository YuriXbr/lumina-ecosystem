
module.exports = {
    route: '/index',
    description: "index route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    middlewares: [],
    method: 'get',

    async execute(req, res) {
        res.send('index route');
    }
};
