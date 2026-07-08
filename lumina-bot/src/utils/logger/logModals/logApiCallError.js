const fs   = require('fs');
const path = require('path');
const colorCodes = require('../../colorCodes.js');

/**
 * Registra um erro de chamada à API em arquivo e no console.
 *
 * @param {string}        commandOrigin  - Origem do comando (ex: 'daily', 'ban')
 * @param {string}        functionName   - Nome da função/endpoint
 * @param {object}        [params]       - Parâmetros enviados
 * @param {Error|string}  error          - Erro capturado
 * @param {object}        [apiContext]   - Contexto enriquecido do LuminaApiService
 */
function logApiCallError(commandOrigin = 'unknown', functionName, params = {}, error, apiContext = null) {
    const ts       = new Date().toLocaleString('pt-BR').replace(',', '');
    const date     = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const time     = new Date().toLocaleTimeString('pt-BR').replace(/:/g, '-');
    const errorStr = error instanceof Error ? error.message : String(error);
    const stackStr = error instanceof Error ? (error.stack || 'N/A') : 'N/A';

    // Console
    console.error(colorCodes.error + colorCodes.alerta(
        `[API CALL ERROR] ${ts} | ${commandOrigin}@<${functionName}> | ${errorStr}`
    ));
    if (apiContext) {
        console.error(colorCodes.api + colorCodes.alerta(
            `  → ${apiContext.method} ${apiContext.endpoint} | HTTP ${apiContext.status ?? 'ERR'} | @ ${apiContext.calledAt}`
        ));
    }

    // Arquivo de log — path corrigido (subiu 4 níveis a partir de logModals/)
    const dir = path.join(__dirname, '..', '..', '..', '..', 'logs', commandOrigin, functionName, `${date}--${time}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const content = [
        `Data/Hora : ${ts}`,
        `Origem    : ${commandOrigin}`,
        `Função    : ${functionName}`,
        `Params    : ${JSON.stringify(params, null, 2)}`,
        `Erro      : ${errorStr}`,
        `Stack     : ${stackStr}`,
        apiContext ? [
            `--- API Context ---`,
            `Endpoint  : ${apiContext.method} ${apiContext.endpoint}`,
            `Status    : ${apiContext.status ?? 'N/A'}`,
            `CalledAt  : ${apiContext.calledAt ?? 'N/A'}`,
            `API Error : ${apiContext.apiError ?? 'N/A'} [${apiContext.apiCode ?? 'N/A'}]`,
            `API Params: ${JSON.stringify(apiContext.params, null, 2)}`,
        ].join('\n') : '',
    ].join('\n');

    fs.writeFileSync(path.join(dir, 'error.txt'), content, 'utf8');
}

module.exports = { logApiCallError };
