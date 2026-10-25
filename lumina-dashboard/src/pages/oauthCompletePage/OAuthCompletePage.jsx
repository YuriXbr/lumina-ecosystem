import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { apiPost } from "../../utils/apiFetch";
import { useT } from '../../i18n/LanguageContext.jsx';
import PageState from '../../components/PageState';

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
 * Troca um código de uso único, vinculado ao navegador, pelo cookie httpOnly.
 * Remove o fragmento antes da chamada. JWTs nunca são lidos da URL ou salvos
 * no localStorage.
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

        const exchangeCode = hashParams.get("code");
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

        // A sessão só é criada depois que a API valida o código e o navegador.
        (async () => {
            try {
                if (!exchangeCode) throw new Error("missing_code");
                const result = await apiPost("expapi/v1/exchange-token", { code: exchangeCode });
                await onLoginSuccess(result.user);
            } catch {
                setError(t("oauth.failed"));
                return;
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

    return error
        ? <PageState title={t('oauth.failed')} message={error} linkTo={isLinkError?'/members':'/login'} linkLabel={t(isLinkError?'oauth.backToMembers':'oauth.backToLogin')} />
        : <PageState loading title={t('oauth.completingLogin')} />;
}
