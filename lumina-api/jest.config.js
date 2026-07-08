/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',

    // Timeout maior para testes com operações async (DB, HTTP)
    testTimeout: 15000,

    // Limpa mocks entre cada test file automaticamente
    clearMocks: true,
    restoreMocks: true,

    // Diretórios de teste
    testMatch: [
        '**/__tests__/**/*.test.js',
        '**/__tests__/**/*.spec.js',
    ],

    // Cobertura de código
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/database/schema.js',
        '!src/oauthProviders/index.js',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],

    // Garante NODE_ENV=test em todos os testes (sem isso o loginLimiter
    // executa de verdade e gera 429 nos testes que fazem múltiplas requests)
    testEnvironmentOptions: {
        env: { NODE_ENV: 'test' }
    },
    globals: {
        'NODE_ENV': 'test'
    },

    // Define NODE_ENV=test via setupFiles para garantir que env.js/auth.js
    // a leia antes de qualquer require
    setupFiles: ['<rootDir>/__tests__/setup-env.js'],
};
