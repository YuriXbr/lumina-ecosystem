const { clearAuthCookie } = require('../../../utils/authHelpers');
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
        clearAuthCookie(res);
        addLog('API', 'logout', 'Usuário deslogou');
        // Redireciona para a home (ou deixa o frontend decidir)
        // Retorna JSON para o frontend poder tratar sem redirect
        return res.status(200).json({ ok: true });
    }
};
