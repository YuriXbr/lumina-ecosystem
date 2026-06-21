
module.exports = {
    route: '/csrf-token',
    description: "csrf-token route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    middlewares: [],
    method: 'get',

    async execute(req, res) {
        res.send('csrf-token route');
    }
};
