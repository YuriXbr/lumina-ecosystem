const { clearAuthCookie, extractToken, verifyRequestAuth } = require('../../../utils/authHelpers');
const { addLog } = require('../../../logger/logger');

module.exports = {
    route: '/expapi/v1/logout',
    description: 'Dashboard logout route',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    method: 'post',

    async execute(req, res) {
        // Limpa o cookie httpOnly que carrega o JWT
        const { user } = verifyRequestAuth(req);
        try { if (user) await require('../../../utils/sessionStore').revokeToken(extractToken(req), new Date(user.exp * 1000)); }
        catch { return res.status(503).json({ code: 'LOGOUT_UNAVAILABLE', error: 'Não foi possível encerrar a sessão. Tente novamente.' }); }
        clearAuthCookie(res);
        addLog('API', 'logout', 'Usuário deslogou');
        // Redireciona para a home (ou deixa o frontend decidir)
        // Retorna JSON para o frontend poder tratar sem redirect
        return res.status(200).json({ ok: true });
    }
};
