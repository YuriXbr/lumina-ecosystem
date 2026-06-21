const axios = require('axios');

module.exports = class LuminaApiService {
    constructor(headers = {}) {
        if (!process.env.API_BASE_URL || !process.env.INTERNAL_API_KEY || !process.env.LUMINA_API_KEY) {
            throw new Error('Configuração incompleta: verifique as variáveis de ambiente (API_BASE_URL, INTERNAL_API_KEY, LUMINA_API_KEY).');
        }

        const baseURL = process.env.API_BASE_URL;
        const internalKey = process.env.INTERNAL_API_KEY;
        const apikey = `?apiKey=${encodeURIComponent(process.env.LUMINA_API_KEY)}`;

        this.baseApiKey = apikey;
        this.api = axios.create({
            baseURL: baseURL,
            headers: {
                'Content-Type': 'application/json',
                'internal-key': internalKey,
                ...headers,
            },
        });
    }

    async get(endpoint, apiKey = true, params = {}) {
        try {
            const response = await this.api.get(endpoint + (apiKey ? this.baseApiKey : ''), { params });
            return response.data;
        } catch (error) {
            console.error('[LuminaApiService GET Error]', error, error.message);
            throw error;
        }
    }

    async post(endpoint, data, apiKey = true) {
        try {
            const response = await this.api.post(endpoint + (apiKey ? this.baseApiKey : ''), data);
            return response.data;
        } catch (error) {
            console.error('[LuminaApiService POST Error]', error.message);
            throw error;
        }
    }
};
