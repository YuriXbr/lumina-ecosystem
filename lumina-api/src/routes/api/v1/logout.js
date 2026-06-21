
module.exports = {
    route: '/logout',
    description: "logout route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    middlewares: [],
    method: 'get',

    async execute(req, res) {
        res.send('logout route');
    }
};
