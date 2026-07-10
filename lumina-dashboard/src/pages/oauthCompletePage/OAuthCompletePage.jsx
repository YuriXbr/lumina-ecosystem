import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";

const OAUTH_ERROR_MESSAGES = {
    discord_already_linked: "Esta conta do Discord já está vinculada a outro usuário.",
    account_banned:        "Esta conta foi banida.",
    account_blocked:       "Esta conta está bloqueada.",
    link_account_not_found: "Não foi possível encontrar sua conta para vincular. Tente fazer login novamente.",
    link_no_account:        "Você precisa estar logado para vincular o Discord.",
    email_exists:           "Este email já possui uma conta. Faça login e conecte o Discord no painel.",
    server_error:           "Ocorreu um erro no servidor. Tente novamente.",
    missing_code:           "Autorização cancelada ou negada. Tente novamente.",
};

/**
 * Página de destino do fluxo OAuth2.
 *
 * APÓS A MIGRAÇÃO PARA COOKIE httpOnly:
 *   O backend seta o cookie `lumina_token` (httpOnly) no redirect,
 *   e o fragmento da URL só carrega FLAGS booleanas (isNewAccount,
 *   hasPassword, linkedDiscord) — não mais o JWT.
 *
 *   O frontend não precisa mais ler token da URL nem salvar no localStorage.
 *   Apenas chama onLoginSuccess() que vai buscar /session (que usa o cookie).
 *
 * Erros chegam como query param (?oauthError=...).
 */
export default function OAuthCompletePage() {
    const navigate = useNavigate();
    const { onLoginSuccess } = useUser();
    const [error, setError] = useState("");
    const [isLinkError, setIsLinkError] = useState(false);

    const hasProcessedRef = useRef(false);

    useEffect(() => {
        if (hasProcessedRef.current) return;
        hasProcessedRef.current = true;

        const hashParams  = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const queryParams = new URLSearchParams(window.location.search);

        const token        = hashParams.get("token");
        const isNewAccount  = hashParams.get("isNewAccount")  === "true";
        const hasPassword   = hashParams.get("hasPassword")   === "true";
        const linkedDiscord = hashParams.get("linkedDiscord") === "true";
        const oauthError    = queryParams.get("oauthError");

        // Limpa a URL (remove fragment/query) IMEDIATAMENTE — não deixa o token na URL
        window.history.replaceState(null, "", window.location.pathname);

        if (oauthError) {
            const message = OAUTH_ERROR_MESSAGES[oauthError]
                ?? "Não foi possível completar a autenticação. Tente novamente.";
            setError(message);
            const linkErrors = ["discord_already_linked", "link_account_not_found", "link_no_account"];
            setIsLinkError(linkErrors.includes(oauthError));
            return;
        }

        if (!token) {
            setError("Token de autenticação não encontrado. Tente fazer login novamente.");
            return;
        }

        // Troca o token da URL por um cookie httpOnly via POST (same-origin através do proxy).
        // Isso resolve o problema do cookie ser setado no domínio errado em desenvolvimento
        // (callback OAuth roda em localhost:3000, dashboard em localhost:5173).
        (async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
                const response = await fetch(`${API_BASE}expapi/v1/exchange-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ token }),
                });

                if (response.ok) {
                    const data = await response.json();
                    // Usa o user retornado diretamente — não precisa chamar /session
                    await onLoginSuccess(data.user || null);
                } else {
                    // Fallback: tenta carregar via /session (cookie pode ter sido setado pelo redirect)
                    await onLoginSuccess();
                }
            } catch (err) {
                console.error("Erro ao trocar token por cookie:", err);
                // Última tentativa: carrega via /session
                try { await onLoginSuccess(); } catch {}
            }

            if (linkedDiscord) {
                navigate("/settings", { replace: true });
            } else if (isNewAccount || !hasPassword) {
                navigate("/settings?setupPassword=1", { replace: true });
            } else {
                navigate("/members", { replace: true });
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-violet-600/50 px-4">
                <div className="bg-gray-100 shadow-lg rounded-lg p-8 max-w-md text-center space-y-4">
                    <p className="text-gray-800">{error}</p>
                    {isLinkError ? (
                        <a href="/members" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Voltar para a Área de Membros
                        </a>
                    ) : (
                        <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Voltar para o login
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-violet-600/50">
            <div className="flex items-center gap-3 text-white">
                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-lg">Concluindo login...</span>
            </div>
        </div>
    );
}
