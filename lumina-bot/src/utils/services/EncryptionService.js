const crypto = require('crypto');
const readline = require('readline');
const LuminaApiService = require('./LuminaApiService');

class BotConfigService {
    constructor() {
        if (!process.env.ENCRYPTION_KEY) {
            throw new Error('A variável de ambiente ENCRYPTION_KEY não está definida. Verifique a configuração.');
        }

        this.bot = null;
        this.luminaApi = new LuminaApiService(); // Usa a classe LuminaApiService
    }

    // Função para descriptografar
    decrypt(encryptedText) {
        try {
            const [ivHex, encryptedData] = encryptedText.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY), iv);

            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('[Decrypt Error]', error.message);
            throw error;
        }
    }

    // Função para criptografar
    encrypt(data) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY), iv);

            let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return `${iv.toString('hex')}:${encrypted}`;
        } catch (error) {
            console.error('[Encrypt Error]', error.message);
            throw error;
        }
    }

    // Função para solicitar entrada do usuário
    askUser(question) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                rl.close();
                resolve(answer.trim() || null);
            });
        });
    }

    // Função para enviar dados atualizados ao servidor
    async updateBotConfig(updatedData) {
        try {
            //remover .token
            let _updatedData = { ...updatedData };
            delete _updatedData.token;
            
            const encryptedData = this.encrypt(_updatedData);
            await this.luminaApi.post('/expapi/internal/updatebot', { data: encryptedData });
            console.log('Configuração do bot atualizada com sucesso.');
            this.bot = updatedData['0'];
        } catch (err) {
            console.error('[updateBotConfig Error]', err.message);
        }
    }

    // Função recursiva para preencher campos faltantes
    async fillMissingFields(baseData) {
        const filledData = { ...baseData };

        for (const key in baseData) {
            const value = baseData[key];

            // Valores simples vazios
            if (value == null || value === '') {
                console.log(`O campo "${key}" precisa ser preenchido porque está vazio.`);

                const answer = await this.askUser(`Informe o valor para ${key}: `);

                filledData[key] = answer || value;
            }

            // Arrays vazios
            else if (Array.isArray(value)) {
                // Se o array já possui valores, mantém como está
                if (value.length > 0) {
                    continue;
                }

                console.log(`O campo "${key}" é uma lista vazia. Adicione itens um por vez. Digite "$" para finalizar.`);

                const arrayValues = [];

                while (true) {
                    const answer = await this.askUser(`\nAdicione um valor para ${key}: `);

                    if (answer === '$') {
                        break;
                    }

                    if (answer) {
                        arrayValues.push(answer);
                    }
                }

                filledData[key] = arrayValues;
            }

            // Objetos aninhados (ignora objetos vazios)
            else if (
                typeof value === 'object' &&
                value !== null
            ) {
                if (Object.keys(value).length === 0) {
                    continue;
                }

                console.log(`Preenchendo os campos aninhados dentro de "${key}".`);

                filledData[key] = await this.fillMissingFields(value);
            }
        }
        return filledData;
    }

    // Configuração principal
    async setupConfig() {
        try {
            const encryptedBot = await this.luminaApi.get('/expapi/internal/fetchbot');
            let decryptedBot = JSON.parse(this.decrypt(encryptedBot));
            
            //decryptedBot = await this.fillMissingFields(decryptedBot);
            //await this.updateBotConfig(decryptedBot);

            this.bot = decryptedBot;

            if(!process.env.DISCORD_BOT_TOKEN) {
                console.error('[ERRO] O token do bot não está definido no .env. Encerrando...');
                process.exit(1);
            }

            this.bot = decryptedBot;
            return this.bot;
        } catch (err) {
            console.error('[setupConfig Error]', err.message);
            process.exit(1);
        }
    }
};

module.exports = new BotConfigService();