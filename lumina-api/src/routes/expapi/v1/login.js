const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../database/services/DashboardAccountService.js');
// Endpointed Checked on V1.2.0

module.exports = {
    route: '/expapi/v1/login',
    description: "Dashboard login route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: true,
    csrfProtectionNeeded: true, // CSRF PROTECTION ADICIONADO
    method: 'post',

    async execute(req, res) {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send('Missing email or password.');
        }
        
        // Validação apenas via banco de dados - BACKDOOR REMOVIDO
        const account = await DashboardAccountService.checkCredentials(email, password);
        if (!account) {
            return res.status(401).send('Invalid email or password.');
        }

        const accountId = account.accountId;
        const firstName = account.firstName;
        const lastName = account.lastName;
    
        const token = jwt.sign({ email, accountId, firstName, lastName }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token });
    }
};