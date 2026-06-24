const discordProvider = require('./discordProvider');
// Para plugar um novo provedor, crie o arquivo (ex: googleProvider.js) seguindo
// o mesmo contrato de discordProvider.js e registre-o abaixo. Nenhuma outra
// parte do sistema precisa mudar.
// const googleProvider = require('./googleProvider');
// const githubProvider = require('./githubProvider');

const providers = {
    discord: discordProvider,
    // google: googleProvider,
    // github: githubProvider,
};

function getProvider(name) {
    const provider = providers[name];
    if (!provider) {
        const err = new Error(`Provedor OAuth2 desconhecido: ${name}`);
        err.code = 'UNKNOWN_PROVIDER';
        throw err;
    }
    return provider;
}

module.exports = { providers, getProvider };
