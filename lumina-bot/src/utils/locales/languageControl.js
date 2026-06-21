// arquivo que ira controlar o idioma do app

const fs = require('node:fs');
const path = require('node:path');

async function getLanguage(lang = 'en-US') {
    const filePath = path.join(__dirname, `../../locales/${lang}.json`);
    
    try {
        const file = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(file);
    } catch (error) {
        try{
            console.log('Error:', error);
            const file = await fs.promises.readFile(path.join(__dirname, '../../locales/en-US.json'), 'utf-8');
            return JSON.parse(file);
        } catch (error) {
            console.log('Error:', error);
            return null;
        }
    }
}

module.exports = getLanguage;