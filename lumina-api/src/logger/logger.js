const axios = require('axios');

let logBuffer = [];
let lastLogTime = Date.now();

// Função para adicionar logs ao buffer
const addLog = (type, action, message) => {
    const now = new Date();
    const timestamp = now.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(',', '');
    const logMessage = `[${timestamp}] - [${type}<${action}>]: ${message}`;
    logBuffer.push(logMessage);
    lastLogTime = Date.now();
};

// Função para enviar logs através do webhook
const sendWebhook = (message) => {
    const data = {
        content: `\`\`\`logs\n${message}\n\`\`\``
    };
    axios.post(process.env.WEBHOOK_URL, JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json'
        },
    });
};

// Intervalo para verificar e enviar logs a cada 30 segundos
setInterval(() => {
    const currentTime = Date.now();
    if (logBuffer.length > 0) {
        const logsToSend = logBuffer.join('\n');
        sendWebhook(logsToSend);
        logBuffer = [];
    } else if (currentTime - lastLogTime >= 60000*60) {
        sendWebhook('ping');
        lastLogTime = currentTime;
    }
}, 15000);

const forceSendLogs = () => {
    const logsToSend = logBuffer.join('\n');
    sendWebhook(logsToSend);
    logBuffer = [];
}

module.exports = { addLog, sendWebhook, forceSendLogs };