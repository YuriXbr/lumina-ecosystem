
module.exports = {
    route: '/api/v1',
    description: "baseURL route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    middlewares: [],
    method: 'get',

    async execute(req, res) {
        res.send('baseURL route');
    }
};
