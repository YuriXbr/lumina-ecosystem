const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const DashboardAccountService = require('../../../../database/services/DashboardAccountService');

module.exports = {
    route: '/expapi/v1/user/change-password',
    description: "Altera a senha do usuário autenticado",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: true,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'put',

    async execute(req, res) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const email = decoded.email;

            const { currentPassword, newPassword } = req.body;

            // Validações básicas
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres' });
            }

            // Verificação de complexidade da senha
            const hasUpperCase = /[A-Z]/.test(newPassword);
            const hasLowerCase = /[a-z]/.test(newPassword);
            const hasNumbers = /\d/.test(newPassword);
            
            if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
                return res.status(400).json({ 
                    error: 'A nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número' 
                });
            }

            // Busca a conta do usuário
            const account = await DashboardAccountService.getDashboardAccountByEmail(email);
            if (!account) {
                return res.status(404).json({ error: 'Conta não encontrada' });
            }

            // Verifica a senha atual
            const isCurrentPasswordValid = bcrypt.compareSync(currentPassword, account.password);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({ error: 'Senha atual incorreta' });
            }

            // Verifica se a nova senha é diferente da atual
            const isSamePassword = bcrypt.compareSync(newPassword, account.password);
            if (isSamePassword) {
                return res.status(400).json({ error: 'A nova senha deve ser diferente da senha atual' });
            }

            // Criptografa a nova senha
            const hashedNewPassword = bcrypt.hashSync(newPassword, 10);

            // Atualiza a senha
            await DashboardAccountService.update(
                { email },
                { 
                    $set: { 
                        password: hashedNewPassword,
                        lastPasswordChange: new Date()
                    }
                }
            );

            return res.status(200).json({ message: 'Senha alterada com sucesso' });
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
};
