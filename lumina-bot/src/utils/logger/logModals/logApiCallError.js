const fs = require('fs');
const path = require('path');

    
    /** API Call Error
     * @param {string} commandOrigin - The origin of the command
     * @param {string} functionName - The name of the function
     * @param {object} params - The parameters of the function
     * @param {string} error - The error message
    */
    function logApiCallError(commandOrigin = "unknown", functionName, params = {}, error) {
        const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').replace(/\..+/, '');
        const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const time = new Date().toLocaleTimeString('pt-BR').replace(/:/g, '-');
        const dir = path.join(__dirname, '../', '../', 'logs', commandOrigin, functionName, `${date}--${time}`);
    
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    
        const errorLogFile = path.join(dir, 'error.txt');
    
        const errorLogContent = `
        Data: ${new Date().toLocaleDateString('pt-BR')}
        Hora: ${new Date().toLocaleTimeString('pt-BR')}
        -- Origem do comando: ${commandOrigin}
        --- Função chamada: ${functionName}
        ---- Params: ${JSON.stringify(params, null, 2)}
        ---- Error: ${error}
        `;
        fs.writeFileSync(errorLogFile, errorLogContent);
    }

module.exports = {
    logApiCallError
};