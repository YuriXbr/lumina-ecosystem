const colorCodes = require('../../colorCodes.js');
const fs = require('fs');
const path = require('path');

    
    /** API Call Log
    * @param {string} commandOrigin - The origin of the command
    * @param {string} functionName - The name of the function
    * @param {object} params - The parameters of the function
    * @param {object} response - The response of the function
    * @param {object} reducedResponse - The reduced response of the function
    * @param {boolean} clogSilent - If the console log will be silent (default: true)
    * @param {string} clogMessage - The message that will be displayed in the console log (default: null)
    * @param {boolean} silent - If the message won't be sent to the logs channel (default: true)
    */
    function logApiCall(commandOrigin = "unknown", functionName, params, response, reducedResponse, clogSilent = true, clogMessage = null, silent = true) {
        if (!clogSilent) console.log(colorCodes.api + colorCodes.magentaBright(`[${commandOrigin}@<${functionName}>]: ${clogMessage || 'Function Called, no message provided'}`));
        const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').replace(/\..+/, '');
        const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const time = new Date().toLocaleTimeString('pt-BR').replace(/:/g, '-');
        const dir = path.join(__dirname, '../../../../', 'logs', commandOrigin, functionName, `${date}--${time}`);
    
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    
        const requestLogFile = path.join(dir, 'request.txt');
        const responseLogFile = path.join(dir, 'response.txt');
    
        const requestLogContent = `
    Data: ${new Date().toLocaleDateString('pt-BR')}
    Hora: ${new Date().toLocaleTimeString('pt-BR')}
    -- Origem do comando: ${commandOrigin}
    --- Função chamada: ${functionName}
    ---- Request: ${JSON.stringify(params, null, 2)}
    `;
    
        const responseLogContent = `
    Data: ${new Date().toLocaleDateString('pt-BR')}
    Hora: ${new Date().toLocaleTimeString('pt-BR')}
    -- Origem do comando: ${commandOrigin}
    --- Função chamada: ${functionName}
    ---- Reduced Response: ${JSON.stringify(reducedResponse, null, 2)}
    ---- Full Response: ${JSON.stringify(response, null, 2)}
    `;
    
        fs.writeFileSync(requestLogFile, requestLogContent);
        fs.writeFileSync(responseLogFile, responseLogContent);
    }

    module.exports = {
        logApiCall,
    };