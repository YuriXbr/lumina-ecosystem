// __tests__/setup-env.js
// Executado antes de qualquer módulo ser carregado em cada arquivo de teste.
// Garante que NODE_ENV=test, o que:
//   1. Faz loginLimiter/registerLimiter em auth.js retornarem next() diretamente
//   2. Faz ipRateLimiter() em utils/ipRateLimiter.js retornarem next() diretamente
//   3. Evita que @dotenvx/dotenvx sobrescreva variáveis de teste com valores de produção
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-lumina-2026';
process.env.INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'test-internal-key';
process.env.LUMINA_API_KEY = process.env.LUMINA_API_KEY || 'test-api-key';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(32); // 32 bytes para AES-256
