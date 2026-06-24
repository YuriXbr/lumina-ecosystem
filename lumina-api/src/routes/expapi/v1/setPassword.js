const DashboardAccountService = require('../../../database/services/DashboardAccountService.js');

/**
 * Define a senha de uma conta que ainda não tem uma (ex: criada via OAuth2),
 * ou troca a senha de uma conta existente, se `currentPassword` for enviado
 * e bater com a senha atual.
 *
 * - Conta sem senha: envie apenas { newPassword }.
 * - Conta com senha: envie { currentPassword, newPassword }.
 *
 * (A lógica de exigir ou não currentPassword vive em
 * DashboardAccountService.changePassword, então essa rota serve tanto para
 * "definir senha pela primeira vez" quanto para "alterar senha".)
 */
module.exports = {
    route: '/expapi/v1/user/set-password',
    description: "Define ou altera a senha do usuário autenticado (suporta contas OAuth2 sem senha)",
    apiKeyNeeded: false,
    jwtNeeded: true,
    enabled: true,
    loginLimiterNeeded: true,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ error: 'Nova senha é obrigatória.', code: 'MISSING_FIELDS' });
        }

        // req.user é populado pelo middleware jwtNeeded em index.js
        const accountId = req.user && req.user.accountId;
        if (!accountId) {
            return res.status(401).json({ error: 'Token inválido.', code: 'INVALID_TOKEN' });
        }

        try {
            await DashboardAccountService.changePassword(accountId, currentPassword || null, newPassword);
            return res.status(200).json({ message: 'Senha definida com sucesso.' });
        } catch (error) {
            switch (error.code) {
                case 'ACCOUNT_NOT_FOUND':
                    return res.status(404).json({ error: 'Conta não encontrada.', code: error.code });
                case 'INVALID_CURRENT_PASSWORD':
                    return res.status(400).json({
                        error: 'Senha atual incorreta ou não informada.',
                        code: 'INVALID_CURRENT_PASSWORD'
                    });
                case 'SAME_PASSWORD':
                    return res.status(400).json({ error: 'A nova senha deve ser diferente da atual.', code: error.code });
                case 'WEAK_PASSWORD':
                    return res.status(400).json({
                        error: 'A senha deve ter entre 8 e 128 caracteres, com maiúscula, minúscula e número.',
                        code: error.code
                    });
                default:
                    console.error('Erro ao definir/alterar senha:', error);
                    return res.status(500).json({ error: 'Erro interno do servidor.', code: 'SERVER_ERROR' });
            }
        }
    }
};
