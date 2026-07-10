/**
 * Helper centralizado para chamadas de API do dashboard.
 *
 * Mudanças principais vs fetch direto:
 *   1. `credentials: 'include'` SEMPRE — necessário para enviar o cookie httpOnly
 *      que carrega o JWT. Sem isso, o browser não envia o cookie cross-origin.
 *   2. Não usa mais `Authorization: Bearer` header (o JWT está no cookie).
 *   3. Tratamento centralizado de 401 (sessão expirada) — limpa estado e redireciona.
 *   4. Helpers para GET/POST/PUT/DELETE com JSON automático.
 *   5. Helper para pegar CSRF token (necessário para rotas state-changing).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL;

let csrfTokenCache = null;
let csrfTokenPromise = null;

/**
 * Busca e cacheia o CSRF token (necessário para POST/PUT/DELETE com cookies).
 * O token é um double-submit cookie: o backend seta um cookie `_csrf` e
 * espera o mesmo valor no header `X-CSRF-Token`.
 */
export async function getCsrfToken() {
    if (csrfTokenCache) return csrfTokenCache;
    if (csrfTokenPromise) return csrfTokenPromise;

    csrfTokenPromise = fetch(`${API_BASE}expapi/v1/csrf-token`, {
        credentials: 'include',
    })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            csrfTokenCache = data?.csrfToken || '';
            return csrfTokenCache;
        })
        .catch(() => {
            csrfTokenCache = '';
            return '';
        });

    return csrfTokenPromise;
}

/**
 * Wrapper de fetch que sempre inclui credentials: include.
 * Se a resposta for 401, dispara um evento para o UserContext limpar o estado.
 */
export async function apiFetch(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

    const mergedOptions = {
        ...options,
        credentials: 'include',
        headers: {
            ...options.headers,
        },
    };

    // Se tem body, assume JSON
    if (mergedOptions.body && typeof mergedOptions.body === 'object') {
        mergedOptions.headers['Content-Type'] = 'application/json';
        mergedOptions.body = JSON.stringify(mergedOptions.body);
    }

    const response = await fetch(fullUrl, mergedOptions);

    // 401 = sessão expirada ou token inválido
    if (response.status === 401) {
        // Dispara evento para UserContext limpar
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    return response;
}

/**
 * GET request.
 */
export async function apiGet(url) {
    return apiFetch(url, { method: 'GET' });
}

/**
 * GET request que já faz parse do JSON.
 */
export async function apiGetJson(url) {
    const res = await apiGet(url);
    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) detail = body.error;
        } catch {}
        const err = new Error(detail);
        err.status = res.status;
        err.response = res;
        throw err;
    }
    return res.json();
}

/**
 * POST/PUT/DELETE request com CSRF token automático.
 */
export async function apiMutation(url, { method = 'POST', body } = {}) {
    const csrfToken = await getCsrfToken();
    return apiFetch(url, {
        method,
        headers: {
            'X-CSRF-Token': csrfToken,
        },
        body: body || undefined,
    });
}

/**
 * POST request com body JSON + CSRF.
 */
export async function apiPost(url, body) {
    const res = await apiMutation(url, { method: 'POST', body });
    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
            const errBody = await res.json();
            if (errBody?.error) detail = errBody.error;
        } catch {}
        const err = new Error(detail);
        err.status = res.status;
        err.response = res;
        throw err;
    }
    return res.json();
}

/**
 * PUT request com body JSON + CSRF.
 */
export async function apiPut(url, body) {
    const res = await apiMutation(url, { method: 'PUT', body });
    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
            const errBody = await res.json();
            if (errBody?.error) detail = errBody.error;
        } catch {}
        const err = new Error(detail);
        err.status = res.status;
        err.response = res;
        throw err;
    }
    return res.json();
}

/**
 * DELETE request com CSRF.
 */
export async function apiDelete(url) {
    const res = await apiMutation(url, { method: 'DELETE' });
    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
            const errBody = await res.json();
            if (errBody?.error) detail = errBody.error;
        } catch {}
        const err = new Error(detail);
        err.status = res.status;
        err.response = res;
        throw err;
    }
    return res.json();
}

/**
 * Verifica se há sessão ativa chamando /session.
 * Retorna { authenticated, user }.
 */
export async function checkSession() {
    try {
        const res = await apiGet('expapi/v1/session');
        if (!res.ok) return { authenticated: false };
        const data = await res.json();
        return data;
    } catch {
        return { authenticated: false };
    }
}

/**
 * Faz logout chamando o endpoint backend (que limpa o cookie).
 */
export async function apiLogout() {
    try {
        const csrfToken = await getCsrfToken();
        await apiFetch('expapi/v1/logout', {
            method: 'POST',
            headers: { 'X-CSRF-Token': csrfToken },
        });
    } catch {
        // Mesmo se falhar, o frontend deve limpar o estado
    }
}

export { API_BASE };
