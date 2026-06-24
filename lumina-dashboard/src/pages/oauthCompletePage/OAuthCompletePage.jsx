import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";

const OAUTH_ERROR_MESSAGES = {
    discord_already_linked: "Esta conta do Discord já está vinculada a outro usuário.",
    link_account_not_found: "Não foi possível encontrar sua conta para vincular. Tente fazer login novamente.",
    link_no_account:        "Você precisa estar logado para vincular o Discord.",
    email_exists:           "Este email já possui uma conta. Faça login e conecte o Discord no painel.",
    server_error:           "Ocorreu um erro no servidor. Tente novamente.",
    missing_code:           "Autorização cancelada ou negada. Tente novamente.",
};

/**
 * Página de destino do fluxo OAuth2.
 * O backend redireciona para `${origin}/oauth/complete#token=...&...`.
 *
 * Parâmetros lidos do fragmento (#):
 *   token         — JWT da sessão
 *   isNewAccount  — "true" se a conta foi criada agora
 *   hasPassword   — "false" se a conta ainda não tem senha
 *   linkedDiscord — "true" se veio do fluxo de vinculação (usuário já logado)
 *
 * Erros chegam como query param (?oauthError=...) para não vazar no fragmento.
 */
export default function OAuthCompletePage() {
    const navigate = useNavigate();
    const { onLoginSuccess } = useUser();
    const [error, setError] = useState("");
    const [isLinkError, setIsLinkError] = useState(false);

    // CORRIGIDO: guarda contra o efeito rodar mais de uma vez.
    //
    // Causa do bug "token não encontrado" mesmo com o OAuth2 tendo funcionado:
    // este efeito tinha `onLoginSuccess` nas dependências. Como essa função
    // normalmente não é memoizada (useCallback) no UserContext, chamar
    // `await onLoginSuccess()` dispara um setState lá dentro → o Provider
    // re-renderiza → `onLoginSuccess` ganha uma NOVA referência → o array de
    // dependências muda → o efeito RODA DE NOVO, antes do primeiro `navigate()`
    // ter sido chamado. Na 2ª execução o hash já tinha sido limpo pela 1ª
    // (window.history.replaceState), então `token` vinha `null` e a tela
    // mostrava "Token de autenticação não encontrado" — mesmo o login tendo
    // sido bem-sucedido por baixo dos panos.
    //
    // A correção: processar o hash só na PRIMEIRA execução, e não depender de
    // `onLoginSuccess`/`navigate` no array de dependências (ambos só são
    // usados dentro da função assíncrona, uma única vez).
    const hasProcessedRef = useRef(false);

    useEffect(() => {
        if (hasProcessedRef.current) return;
        hasProcessedRef.current = true;

        const hashParams  = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const queryParams = new URLSearchParams(window.location.search);

        const token         = hashParams.get("token");
        const isNewAccount  = hashParams.get("isNewAccount")  === "true";
        const hasPassword   = hashParams.get("hasPassword")   === "true";
        const linkedDiscord = hashParams.get("linkedDiscord") === "true";
        const oauthError    = queryParams.get("oauthError");

        // Remove token/erro da URL antes de qualquer outra coisa
        window.history.replaceState(null, "", window.location.pathname);

        if (oauthError) {
            const message = OAUTH_ERROR_MESSAGES[oauthError]
                ?? "Não foi possível completar a autenticação. Tente novamente.";
            setError(message);
            // Erros de vinculação têm origem no dashboard, não na tela de login
            const linkErrors = ["discord_already_linked", "link_account_not_found", "link_no_account"];
            setIsLinkError(linkErrors.includes(oauthError));
            return;
        }

        if (!token) {
            setError("Token de autenticação não encontrado. Tente fazer login novamente.");
            return;
        }

        (async () => {
            localStorage.setItem("token", token);
            try {
                await onLoginSuccess();
            } catch (err) {
                // Mesmo que falhe ao popular o contexto do usuário, o token já
                // foi salvo e é válido — não vale travar a navegação por isso,
                // a próxima tela vai buscar o perfil de novo.
                console.error("Erro ao carregar dados do usuário após OAuth2:", err);
            }

            if (linkedDiscord) {
                // Vinculação concluída — volta ao painel
                navigate("/dashboard", { replace: true });
            } else if (isNewAccount || !hasPassword) {
                // Conta nova ou sem senha — leva ao fluxo de definir senha
                navigate("/dashboard?setupPassword=1", { replace: true });
            } else {
                navigate("/dashboard", { replace: true });
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
        // Intencional: roda só no mount. `navigate` (react-router) é estável
        // por contrato; `onLoginSuccess` é capturado pela closure e chamado
        // uma única vez, protegido por hasProcessedRef — não precisamos
        // reagir a mudanças de referência dele.
    }, []);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-violet-600/50 px-4">
                <div className="bg-gray-100 shadow-lg rounded-lg p-8 max-w-md text-center space-y-4">
                    <p className="text-gray-800">{error}</p>
                    {isLinkError ? (
                        <a href="/dashboard" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Voltar para o painel
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
