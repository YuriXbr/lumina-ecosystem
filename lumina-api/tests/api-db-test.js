require('@dotenvx/dotenvx').config()
const axios = require('axios');

const baseUrl = test ?'https://api.luminasink.com/' : "http://localhost:3000";
const apiKey = process.env.LUMINA_API_KEY; // Use the API key from the config file
const internalKey = process.env.INTERNAL_API_KEY; // Use the internal key from the config file

async function test() {
    
}

test();