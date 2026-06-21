
module.exports = {
    route: '/login',
    description: "login route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    middlewares: [],
    method: 'get',

    async execute(req, res) {
        res.send('login route');
    }
};
