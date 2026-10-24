import {API_BASE} from '../../../utils/apiBase';
import { useState } from "react";
import { parseApiError, statusFallbackMessage, isNetworkError } from "../../../utils/apiError";
import { useT } from '../../../i18n/LanguageContext.jsx';

/**
 * Modal para o usuário definir uma senha pela primeira vez (contas criadas
 * via OAuth2 nascem sem senha) ou trocar a senha existente.
 *
 * Uso sugerido (dentro da página de Settings do dashboard):
 *
 *   const [showSetPassword, setShowSetPassword] = useState(false);
 *   useEffect(() => {
 *     if (!userProfile) return;
 *     const params = new URLSearchParams(window.location.search);
 *     if (!userProfile.hasPassword || params.get('setupPassword') === '1') {
 *       setShowSetPassword(true);
 *     }
 *   }, [userProfile]);
 *   ...
 *   {showSetPassword && (
 *     <SetPasswordModal
 *       onSuccess={() => setShowSetPassword(false)}
 *       onSkip={() => setShowSetPassword(false)}
 *     />
 *   )}
 */
export default function SetPasswordModal({ onSuccess, onSkip }) {
  const t = useT();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
            setError(t("membersArea.setPassword.lengthError"));
            return;
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
            setError(t("membersArea.setPassword.complexError"));
            return;
        }
        if (password !== confirmPassword) {
            setError(t("membersArea.setPassword.mismatchError"));
            return;
        }

        setIsLoading(true);
        try {
            const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' })
            const { csrfToken } = await csrfRes.json();

            const response = await fetch(`${API_BASE}expapi/v1/user/set-password`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-Token': csrfToken,
                            },
                            credentials: 'include',
                            body: JSON.stringify({ newPassword:password }),
                        })

            if (response.ok) {
                onSuccess?.();
                return;
            }

            const { message } = await parseApiError(response, statusFallbackMessage(response.status));
            setError(message);
        } catch (err) {
            console.error("Erro ao definir senha:", err);
            setError(
                isNetworkError(err)
                    ? t("membersArea.setPassword.connectionError")
                    : t("membersArea.setPassword.unexpectedError")
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t("membersArea.setPassword.title")}</h3>
                <p className="text-sm text-gray-600 mb-4">
                    {t("membersArea.setPassword.desc")}
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        placeholder={t("membersArea.setPassword.newPassword")}
                        value={password}
                        maxLength={72}
                        disabled={isLoading}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:opacity-50"
                    />
                    <input
                        type="password"
                        placeholder={t("membersArea.setPassword.confirmPassword")}
                        value={confirmPassword}
                        maxLength={72}
                        disabled={isLoading}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:opacity-50"
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onSkip}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                        >
                            {t("membersArea.setPassword.notNow")}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500 disabled:opacity-60"
                        >
                            {isLoading ? t("membersArea.setPassword.saving") : t("membersArea.setPassword.save")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
