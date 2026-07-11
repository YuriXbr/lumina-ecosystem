const axios = require('axios');

/**
 * LuminaApiService — cliente HTTP para a Lumina API.
 *
 * Cada chamada bem-sucedida retorna `response.data` diretamente.
 * Em caso de erro, lança um objeto enriquecido com contexto para que o
 * chamador possa repassar ao `commandErrorWarning` via `apiContext`.
 */
module.exports = class LuminaApiService {
    constructor(headers = {}) {
        if (!process.env.API_BASE_URL || !process.env.INTERNAL_API_KEY || !process.env.LUMINA_API_KEY) {
            throw new Error('Configuração incompleta: verifique API_BASE_URL, INTERNAL_API_KEY e LUMINA_API_KEY.');
        }

        this.luminaApiKey = process.env.LUMINA_API_KEY;
        this.api = axios.create({
            baseURL: process.env.API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
                'internal-key': process.env.INTERNAL_API_KEY,
                'X-Lumina-API-Key': this.luminaApiKey || '',
                ...headers,
            },
        });
    }

    /**
     * Executa uma requisição e normaliza o erro com contexto de rastreabilidade.
     * @param {string} method     - 'get' | 'post' | 'put' | 'delete'
     * @param {string} endpoint   - Caminho da rota (ex: '/expapi/internal/claimdaily')
     * @param {object} [data]     - Payload para POST/PUT
     * @param {object} [params]   - Query params para GET
     * @param {boolean} [apiKey]  - Se deve anexar a apiKey (padrão: true)
     */
    async _request(method, endpoint, { data, params, apiKey = true } = {}) {
        const calledAt = new Date().toISOString();
        const url = endpoint;

        try {
            const response = await this.api[method](url, method === 'get' ? { params } : data, method === 'get' ? undefined : { params });
            return response.data;
        } catch (error) {
            // Enriquece o erro com contexto de rastreabilidade entre Bot ↔ API
            const apiError = {
                endpoint,
                method: method.toUpperCase(),
                status: error.response?.status ?? null,
                calledAt,
                params: data ?? params ?? {},
                apiError: error.response?.data?.error ?? (typeof error.response?.data === 'string' ? error.response.data : null),
                apiCode:  error.response?.data?.code  ?? null,
            };

            // Suprime logs para 404 em fetchguilddata (guilda não registrada é normal)
            const isFetchGuild404 = endpoint === '/expapi/internal/fetchguilddata' && apiError.status === 404;
            if (!isFetchGuild404) {
                const ts = new Date().toLocaleString('pt-BR').replace(',', '');
                console.error(`[LuminaApiService] ${ts} | ${method.toUpperCase()} ${endpoint} → HTTP ${apiError.status ?? 'ERR'}`);
                console.error(`  Params: ${JSON.stringify(apiError.params)}`); // Keys are now in headers, not URL
                console.error(`  API Error: ${apiError.apiError} [${apiError.apiCode ?? 'N/A'}]`);
                if (error.stack) console.error(`  Stack: ${error.stack.split('\n').slice(0,4).join('\n')}`);
            }

            // Anexa o contexto ao erro para que o catch do comando passe ao commandErrorWarning
            error.apiContext = apiError;
            throw error;
        }
    }

    async get(endpoint, apiKey = true, params = {}) {
        return this._request('get', endpoint, { params, apiKey });
    }

    async post(endpoint, data, apiKey = true) {
        return this._request('post', endpoint, { data, apiKey });
    }

    async put(endpoint, data, apiKey = true) {
        return this._request('put', endpoint, { data, apiKey });
    }

    async delete(endpoint, apiKey = true) {
        return this._request('delete', endpoint, { apiKey });
    }
};
