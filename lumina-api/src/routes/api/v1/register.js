
module.exports = {
    route: '/register',
    description: "register route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    middlewares: [],
    method: 'get',

    async execute(req, res) {
        res.send('register route');
    }
};
