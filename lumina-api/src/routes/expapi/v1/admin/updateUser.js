const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../../database/services/DashboardAccountService');

module.exports = {
    route: '/expapi/v1/admin/users/:userId',
    description: "Atualiza dados de um usuário específico",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
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
            const userId = req.params.userId;
            const updateData = req.body;

            // Busca a conta do administrador
            const adminAccount = await DashboardAccountService.getDashboardAccountByEmail(email);
            if (!adminAccount) {
                return res.status(404).json({ error: 'Conta de administrador não encontrada' });
            }

            // Verifica permissões
            const accessLevels = {
                user: 0, vipUser: 1, enterpriseUser: 2, contentCreator: 3, tester: 4,
                support: 5, moderator: 6, admin: 7, headadmin: 8, developer: 9, coowner: 10, owner: 11
            };

            const adminLevel = accessLevels[adminAccount.accessType] || 0;
            if (adminLevel < 5) {
                return res.status(403).json({ error: 'Permissão insuficiente' });
            }

            // Busca o usuário alvo
            const targetUser = await DashboardAccountService.getDashboardAccountByAccountId(userId);
            if (!targetUser) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            const targetLevel = accessLevels[targetUser.accessType] || 0;

            // Define campos permitidos baseado no nível
            const allowedFields = {};

            // Support+ pode bloquear/desbloquear usuários comuns
            if (adminLevel >= 5 && targetLevel < 5) {
                allowedFields.blocked = true;
            }

            // Moderadores+ podem banir usuários e alterar notificações
            if (adminLevel >= 6) {
                if (targetLevel < adminLevel) {
                    allowedFields.banned = true;
                    allowedFields.emailNotifications = true;
                    allowedFields.discordNotifications = true;
                    allowedFields.botActivityAlerts = true;
                }
            }

            // Admins+ podem alterar nível de acesso (mas não promover acima do próprio nível)
            if (adminLevel >= 7) {
                if (updateData.accessType && accessLevels[updateData.accessType] < adminLevel) {
                    allowedFields.accessType = true;
                }
            }

            // HeadAdmins+ podem alterar qualquer coisa de usuários abaixo deles
            if (adminLevel >= 8 && targetLevel < adminLevel) {
                Object.assign(allowedFields, {
                    firstName: true,
                    lastName: true,
                    emailVerified: true,
                    publicProfile: true,
                    showOnlineStatus: true,
                    language: true,
                    timezone: true
                });
            }

            // Filtra apenas campos permitidos
            const filteredData = {};
            Object.keys(updateData).forEach(key => {
                if (allowedFields[key]) {
                    filteredData[key] = updateData[key];
                }
            });

            if (Object.keys(filteredData).length === 0) {
                return res.status(403).json({ error: 'Nenhum campo permitido para alteração' });
            }

            // Atualiza o usuário
            await DashboardAccountService.updateAccount(userId, filteredData);

            return res.status(200).json({ 
                message: 'Usuário atualizado com sucesso',
                updatedFields: Object.keys(filteredData)
            });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
};
