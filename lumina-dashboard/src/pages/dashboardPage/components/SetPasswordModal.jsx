import { useState } from "react";
import { parseApiError, statusFallbackMessage, isNetworkError } from "../../../utils/apiError";

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
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password.length < 8 || password.length > 128) {
            setError("A senha deve ter entre 8 e 128 caracteres.");
            return;
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
            setError("A senha deve conter maiúscula, minúscula e número.");
            return;
        }
        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }

        setIsLoading(true);
        try {
            const csrfRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/csrf-token`, {
                credentials: "include",
            });
            const { csrfToken } = await csrfRes.json();

            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/user/set-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "X-CSRF-Token": csrfToken,
                },
                credentials: "include",
                body: JSON.stringify({ newPassword: password }),
            });

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
                    ? "Erro de conexão. Verifique sua internet e tente novamente."
                    : "Erro inesperado. Tente novamente."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Defina uma senha para sua conta</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Sua conta foi criada com Discord. Defina uma senha para também poder
                    entrar com email e senha, além do Discord.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        placeholder="Nova senha"
                        value={password}
                        maxLength={128}
                        disabled={isLoading}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:opacity-50"
                    />
                    <input
                        type="password"
                        placeholder="Confirme a senha"
                        value={confirmPassword}
                        maxLength={128}
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
                            Agora não
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 disabled:opacity-60"
                        >
                            {isLoading ? "Salvando..." : "Salvar senha"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
