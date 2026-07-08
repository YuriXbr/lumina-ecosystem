// Endpointed Checked on V1.2.0

module.exports = {
    route: '/expapi/v1/logout',
    description: 'Dashboard logout route',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    method: 'get',

    async execute(req, res) {
        res.clearCookie('jwt');
        res.redirect('/');
    }
};
