/**
 * __tests__/helpers/setupMockReset.js
 *
 * Helper para resetar mocks entre testes SEM quebrar module-level mocks.
 *
 * O problema: jest.resetAllMocks() reseta até os mocks criados com
 * jest.mock('module', () => ({...})), removendo a factory function.
 * Isso quebra testes que dependem de mocks de módulo (como oauthProviders).
 *
 * Este helper reset apenas mocks individuais (jest.fn()), preservando
 * as factories dos module-level mocks.
 *
 * Uso: afterEach(() => resetFunctionMocks());
 */

'use strict';

/**
 * Reseta todos os jest.fn() mocks, mas preserva module-level mock factories.
 *
 * Estratégia: itera sobre jest.mocked() para cada mock conhecido e chama
 * mockReset() apenas nos que foram criados com jest.fn() (não com factory).
 *
 * Como não temos como distinguir programaticamente, este helper exige que
 * o caller passe a lista de mocks para resetar.
 */
function resetFunctionMocks(mocks = []) {
    for (const mock of mocks) {
        if (mock && typeof mock.mockClear === 'function') {
            mock.mockClear();
        }
        if (mock && typeof mock.mockReset === 'function') {
            // mockReset clears calls AND removes implementation
            // Mas NÃO afeta a factory do jest.mock('module', () => ({...}))
            mock.mockReset();
        }
    }
}

module.exports = { resetFunctionMocks };
