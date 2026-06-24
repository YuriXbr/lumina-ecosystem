/**
 * Extrai uma mensagem de erro amigável de uma Response HTTP.
 *
 * ANTES: o frontend assumia que toda resposta de erro era JSON
 * (`response.json()`), mas várias rotas do backend respondiam texto puro
 * (`res.send('texto')`). Isso fazia o `JSON.parse` falhar, jogando a
 * execução pro catch genérico — por isso TODO erro (senha errada, conta
 * banida, rate limit, 500...) aparecia como "falha de conexão com a
 * internet", mesmo com a internet funcionando perfeitamente.
 *
 * Esta função tenta JSON primeiro, cai para texto puro, e só usa o
 * fallback genérico se nada for aproveitável.
 */
export async function parseApiError(response, fallbackMessage = 'Erro ao processar a solicitação.') {
    const contentType = response.headers.get('content-type') || '';

    try {
        if (contentType.includes('application/json')) {
            const data = await response.json();
            return { message: data?.error || fallbackMessage, code: data?.code || null };
        }
        const text = await response.text();
        return { message: text || fallbackMessage, code: null };
    } catch {
        return { message: fallbackMessage, code: null };
    }
}

/** Mensagem padrão por status HTTP, usada quando o backend não manda nada útil. */
export function statusFallbackMessage(status) {
    switch (status) {
        case 400: return 'Dados inválidos. Verifique as informações enviadas.';
        case 401: return 'Email ou senha incorretos.';
        case 403: return 'Acesso negado para esta conta.';
        case 404: return 'Recurso não encontrado.';
        case 429: return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.';
        case 500: return 'Erro interno do servidor. Tente novamente mais tarde.';
        default: return 'Não foi possível concluir a solicitação.';
    }
}

/**
 * Erros de rede de verdade (sem internet, DNS, CORS bloqueado, servidor fora do
 * ar) chegam ao catch como TypeError ("Failed to fetch", "NetworkError...").
 * Qualquer outro erro (parse, lançado manualmente, etc.) NÃO é falha de conexão.
 */
export function isNetworkError(error) {
    return error instanceof TypeError;
}
