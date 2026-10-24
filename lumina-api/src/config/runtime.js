'use strict';
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  require('@dotenvx/dotenvx').config({ path: process.env.NODE_ENV === 'production' ? '.env' : '.env.dev', quiet: true });
}
if (process.env.NODE_ENV !== 'test') {
  for (const name of ['JWT_SECRET','OAUTH_STATE_SECRET','MONGODB_URI','INTERNAL_API_KEY','LUMINA_API_KEY','ENCRYPTION_KEY']) {
    if (!process.env[name]) throw new Error(`Missing required configuration: ${name}`);
  }
}
const axios = require('axios');
axios.defaults.timeout = 8000;
axios.defaults.maxContentLength = 4 * 1024 * 1024;
axios.defaults.maxBodyLength = 512 * 1024;
