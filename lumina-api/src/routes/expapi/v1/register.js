const DashboardAccountService = require('../../../database/services/DashboardAccountService.js');
// Endpointed Checked on V1.2.0

module.exports = {
    route: '/expapi/v1/register',
    description: "Dashboard register route",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: true, // RATE LIMITING ADICIONADO
    csrfProtectionNeeded: true, // CSRF PROTECTION ADICIONADO
    method: 'post',

    async execute(req, res) {
        const { email, password, firstName, lastName } = req.body;
        const registrationIp = req.ip;
        const registrationUserAgent = req.headers['user-agent'];
        const registrationLocation = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const registrationCountry = req.headers['cf-ipcountry'] || '';
        const registrationCity = '';

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).send('Invalid data.');
        }

        // Validação de força da senha
        if (password.length < 8) {
            return res.status(400).send('Password must be at least 8 characters long.');
        }
        
        // Verificação básica de complexidade da senha
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        
        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            return res.status(400).send('Password must contain uppercase, lowercase and numbers.');
        }

        // Sanitização básica dos dados de entrada
        const sanitizedEmail = email.trim().toLowerCase();
        const sanitizedFirstName = firstName.trim().replace(/[<>]/g, '');
        const sanitizedLastName = lastName.trim().replace(/[<>]/g, '');

        const account = await DashboardAccountService.getDashboardAccountByEmail(sanitizedEmail);
        if (account) {
            // Usar mensagem genérica para evitar enumeração
            return res.status(400).send('Registration failed. Please check your data.');
        }

        try {
            const newAccount = await DashboardAccountService.registerNewDashboardAccount(
                sanitizedEmail, password, sanitizedFirstName, sanitizedLastName, 
                registrationIp, registrationUserAgent, registrationLocation, 
                registrationCountry, registrationCity
            );
            if (!newAccount) {
                return res.status(500).send('Error creating account.');
            }
            res.status(200).send('Account created.');
        } catch (error) {
            console.error('Registration error:', error);
            return res.status(400).send('Registration failed. Please check your data.');
        }
    }
};