import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { useT } from '../../i18n/LanguageContext.jsx';

const OAUTH_ERROR_MESSAGES = {
    discord_already_linked: "oauth.discordAlreadyLinked",
    link_account_not_found: "oauth.linkAccountNotFound",
    link_no_account:        "oauth.linkNoAccount",
    email_exists:           "oauth.emailExists",
    server_error:           "oauth.serverError",
    missing_code:           "oauth.missingCode",
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
  const t = useT();
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

        const isNewAccount  = hashParams.get("isNewAccount")  === "true";
        const hasPassword   = hashParams.get("hasPassword")   === "true";
        const linkedDiscord = hashParams.get("linkedDiscord") === "true";
        const oauthError    = queryParams.get("oauthError");

        // Limpa a URL (remove fragment/query)
        window.history.replaceState(null, "", window.location.pathname);

        if (oauthError) {
            const messageKey = OAUTH_ERROR_MESSAGES[oauthError] ?? 'oauth.failed';
            setError(t(messageKey));
            const linkErrors = ["discord_already_linked", "link_account_not_found", "link_no_account"];
            setIsLinkError(linkErrors.includes(oauthError));
            return;
        }

        // Sucesso: o cookie httpOnly já foi setado pelo backend no redirect.
        // Apenas carrega o user no contexto (via /session).
        (async () => {
            try {
                await onLoginSuccess();
            } catch (err) {
                console.error("Erro ao carregar dados do usuário após OAuth2:", err);
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
                            {t("oauth.backToMembers")}
                        </a>
                    ) : (
                        <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                            {t("oauth.backToLogin")}
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
                <span className="text-lg">{t("oauth.completingLogin")}</span>
            </div>
        </div>
    );
}
