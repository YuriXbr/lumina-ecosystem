
module.exports = {
    route: '/validateAuth',
    description: "validateAuth route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    middlewares: [],
    method: 'get',

    async execute(req, res) {
        res.send('validateAuth route');
    }
};
