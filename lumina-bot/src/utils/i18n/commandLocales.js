'use strict';

/**
 * Discord command metadata localizations.
 *
 * O Discord suporta `setNameLocalizations` / `setDescriptionLocalizations`
 * para traduzir o NOME e a DESCRIÇÃO dos slash commands (e suas opções)
 * exibidos no cliente do Discord ANTES de o usuário sequer executar o comando.
 *
 * Estas traduções são distintas das traduções de RESPOSTA (que usam o
 * translator em runtime). O Discord exige locale codes específicos:
 *   - 'pt-BR' para português brasileiro
 *   - 'en-US' para inglês americano
 *   - 'es-ES' para espanhol (Espanha)
 *
 * Este módulo centraliza todas as localizações de metadata para que possam
 * ser aplicadas de forma consistente em todos os comandos.
 */

const PT = 'pt-BR';
const EN = 'en-US';
const ES = 'es-ES';

/**
 * Helper para construir um LocalizationMap a partir de um objeto simples.
 * @param {string} en  texto em inglês (default do SlashCommandBuilder)
 * @param {string} pt  texto em português
 * @param {string} es  texto em espanhol
 * @returns {object} LocalizationMap no formato { 'pt-BR': '...', 'es-ES': '...' }
 *   (en-US não precisa estar no map — é o default definido via setName/setDescription)
 */
function loc(pt, es) {
    const map = {};
    if (pt) map[PT] = pt;
    if (es) map[ES] = es;
    return map;
}

module.exports = {
    PT, EN, ES,
    loc,
};
