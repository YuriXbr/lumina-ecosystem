const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const { routeError }            = require('../../../../logger/logger');

const ROUTE = 'PUT /expapi/v1/admin/users/:userId';
const ACCESS_LEVELS = { 
    user:0,
    vipUser:1,
    enterpriseUser:2,
    contentCreator:3,
    tester:4,
    support:5,
    moderator:6,
    admin:7,
    headadmin:8,
    developer:9,
    coowner:10,
    owner:11 
};

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
        const { verifyRequestAuthWithAccountCheck } = require('../../../../utils/authHelpers');
        const { user: decoded, account: adminAccount, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            const { userId } = req.params;
            if (!adminAccount) return res.status(404).json({ error: 'Conta de administrador não encontrada.', code: 'ACCOUNT_NOT_FOUND' });
            // Audit #4: bloqueia contas suspensas de usar rotas admin
            if (adminAccount.banned || adminAccount.blocked)
                return res.status(403).json({ error: 'Conta suspensa.', code: 'ACCOUNT_SUSPENDED' });

            const adminLevel = ACCESS_LEVELS[adminAccount.accessType] || 0;
            if (adminLevel < 5) return res.status(403).json({ error: 'Permissão insuficiente.', code: 'INSUFFICIENT_PERMISSION' });

            const targetUser = await DashboardAccountService.getDashboardAccountByAccountId(userId);
            if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado.', code: 'USER_NOT_FOUND' });

            const targetLevel = ACCESS_LEVELS[targetUser.accessType] || 0;
            const allowedFields = {};
            if (adminLevel >= 5 && targetLevel < 5) allowedFields.blocked = true;
            if (adminLevel >= 6 && targetLevel < adminLevel) Object.assign(allowedFields, { 
                banned:true,
                emailNotifications:true,
                discordNotifications:true,
                botActivityAlerts:true 
            });
            if (adminLevel >= 7 && req.body.accessType && ACCESS_LEVELS[req.body.accessType] < adminLevel && targetLevel < adminLevel) allowedFields.accessType = true;
            if (adminLevel >= 8 && targetLevel < adminLevel) Object.assign(allowedFields, { 
                firstName:true,
                lastName:true,
                emailVerified:true,
                publicProfile:true,
                showOnlineStatus:true,
                language:true,
                timezone:true 
            });

            const filteredData = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowedFields[k]));
            if (!Object.keys(filteredData).length)
                return res.status(403).json({ error: 'Nenhum campo permitido para alteração.', code: 'NO_ALLOWED_FIELDS' });

            await DashboardAccountService.updateAccount(userId, filteredData);
            return res.status(200).json({ message: 'Usuário atualizado com sucesso.', updatedFields: Object.keys(filteredData) });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'UPDATE_USER_ADMIN_ERROR',
                userMsg: 'Erro ao atualizar usuário.', extra: { email: decoded?.email, userId: req.params?.userId } });
        }
    }
};
