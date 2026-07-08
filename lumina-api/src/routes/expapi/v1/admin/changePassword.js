const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const DashboardAccountService = require('../../../../database/services/DashboardAccountService');
const { routeError } = require('../../../../logger/logger');

const ROUTE = 'PUT /expapi/v1/user/change-password';

module.exports = {
    route: '/expapi/v1/user/change-password',
    description: 'Altera a senha do usuário autenticado',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: false, // Desativado — use /expapi/v1/user/set-password
    loginLimiterNeeded: true,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'put',

    async execute(req, res) {
        return res.status(501).json({
            error: 'Rota desativada. Use /expapi/v1/user/set-password para definir ou alterar a senha.',
            code: 'ROUTE_DISABLED'
        });

        // ── Código preservado para referência futura ──────────────────────────────────
        /* eslint-disable no-unreachable */
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido', code: 'MISSING_TOKEN' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const email = decoded.email;

            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias', code: 'MISSING_FIELDS' });
            }
            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres', code: 'WEAK_PASSWORD' });
            }

            const hasUpperCase = /[A-Z]/.test(newPassword);
            const hasLowerCase = /[a-z]/.test(newPassword);
            const hasNumbers = /\d/.test(newPassword);
            if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
                return res.status(400).json({
                    error: 'A nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número',
                    code: 'WEAK_PASSWORD'
                });
            }

            const account = await DashboardAccountService.getDashboardAccountByEmail(email);
            if (!account) {
                return res.status(404).json({ error: 'Conta não encontrada', code: 'ACCOUNT_NOT_FOUND' });
            }

            const isCurrentPasswordValid = bcrypt.compareSync(currentPassword, account.password);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({ error: 'Senha atual incorreta', code: 'INVALID_CURRENT_PASSWORD' });
            }

            const isSamePassword = bcrypt.compareSync(newPassword, account.password);
            if (isSamePassword) {
                return res.status(400).json({ error: 'A nova senha deve ser diferente da senha atual', code: 'SAME_PASSWORD' });
            }

            const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
            await DashboardAccountService.update(
                { email },
                { $set: { password: hashedNewPassword, lastPasswordChange: new Date() } }
            );

            return res.status(200).json({ message: 'Senha alterada com sucesso' });
        } catch (error) {
            return routeError({
                res, error,
                route: ROUTE,
                errorCode: 'CHANGE_PASSWORD_ERROR',
                userMsg: 'Erro interno do servidor.',
            });
        }
        /* eslint-enable no-unreachable */
    }
};
