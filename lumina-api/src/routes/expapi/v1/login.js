const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../database/services/DashboardAccountService.js');
// Endpointed Checked on V1.2.0
// ALTERADO: respostas de erro agora são SEMPRE JSON ({ error, code }).
// Antes usavam res.send('texto'), e como o frontend faz response.json(),
// o parse falhava e caía no catch genérico de "erro de conexão" —
// mascarando o motivo real (senha errada, conta banida, rate limit, etc).

module.exports = {
    route: '/expapi/v1/login',
    description: "Dashboard login route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: true,
    csrfProtectionNeeded: true,
    method: 'post',

    async execute(req, res) {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios.', code: 'MISSING_FIELDS' });
        }

        try {
            const account = await DashboardAccountService.checkCredentials(email, password);

            const token = jwt.sign(
                {
                    email: account.email,
                    accountId: account.accountId,
                    firstName: account.firstName,
                    lastName: account.lastName,
                    discordId: account.discordId || null,
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            return res.status(200).json({ token, hasPassword: !!account.password });
        } catch (error) {
            switch (error.code) {
                case 'OAUTH_ONLY':
                    // Trade-off consciente: revela que a conta usa login social.
                    // É uma prática comum (Google/GitHub fazem o mesmo) e melhora
                    // muito a UX; se preferir zero enumeração, troque para a
                    // mesma mensagem do INVALID_CREDENTIALS abaixo.
                    return res.status(400).json({
                        error: 'Esta conta usa login social. Entre com o botão "Continuar com Discord".',
                        code: 'OAUTH_ONLY'
                    });
                case 'ACCOUNT_BANNED':
                    return res.status(403).json({ error: 'Esta conta foi banida.', code: 'ACCOUNT_BANNED' });
                case 'ACCOUNT_BLOCKED':
                    return res.status(403).json({ error: 'Esta conta está bloqueada.', code: 'ACCOUNT_BLOCKED' });
                case 'INVALID_CREDENTIALS':
                    return res.status(401).json({ error: 'Email ou senha incorretos.', code: 'INVALID_CREDENTIALS' });
                default:
                    console.error('Erro inesperado no login:', error);
                    return res.status(500).json({ error: 'Erro interno do servidor. Tente novamente.', code: 'SERVER_ERROR' });
            }
        }
    }
};
