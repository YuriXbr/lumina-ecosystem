import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../contexts/UserContext";
import WarningAlert from "./WarningAlert";
import { parseApiError, statusFallbackMessage, isNetworkError } from "../../../utils/apiError";
import { apiFetch, getCsrfToken } from "../../../utils/apiFetch";

export default function LoginModal() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { onLoginSuccess, user, loading } = useUser();
  const navigate = useNavigate();

  // Se já está logado (sessão válida via cookie), redireciona para /members
  useEffect(() => {
    if (!loading && user) {
      navigate("/members", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setShowWarning(false);
    setErrorMessage("");

    try {
      const csrfToken = await getCsrfToken();

      // O backend seta o cookie httpOnly na resposta — não precisamos mais
      // salvar o token no localStorage (vulnerabilidade XSS eliminada).
      const response = await apiFetch("expapi/v1/login", {
        method: "POST",
        headers: { "X-CSRF-Token": csrfToken },
        body: { email, password },
      });

      if (response.ok) {
        // Cookie já foi setado pelo backend. Apenas carrega o user no contexto.
        await onLoginSuccess();
        navigate("/members");
        return;
      }

      const { message } = await parseApiError(response, statusFallbackMessage(response.status));
      setErrorMessage(message);
      setShowWarning(true);
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage(
        isNetworkError(error)
          ? "Erro de conexão. Verifique sua internet e tente novamente."
          : "Ocorreu um erro inesperado. Tente novamente."
      );
      setShowWarning(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscordLogin = () => {
    const origin = window.location.origin;
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/'}expapi/oauth2/discord/auth/start?origin=${encodeURIComponent(origin)}&intent=login`;
  };

  return (
    <div className="pt-6">
      <div className="flex min-h-full flex-1 flex-col justify-center pt-16 py-12 lg:px-8">
        <div className="bg-gray-100 shadow-lg rounded-lg p-8">
          <a href="/#" className="block w-fit text-gray-500 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition ease-in-out duration-150">
            <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M15 19l-7-7 7-7"></path>
            </svg>
          </a>

          <div className="sm:mx-auto px-3 sm:w-full sm:max-w-sm">
            <img src="/new-purple.svg" className="mx-auto h-20 w-auto" alt="Logo" />
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
              Entre na <span className="text-indigo-500 underline underline-offset-4">Área de Membros</span>!
            </h2>

            <button
              type="button"
              onClick={handleDiscordLogin}
              disabled={isLoading}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
                <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3a13.6 13.6 0 0 0-.612 1.244 18.27 18.27 0 0 0-5.487 0A13.6 13.6 0 0 0 9.174 3a19.74 19.74 0 0 0-4.432 1.369C1.578 9.046.838 13.58 1.207 18.057a19.9 19.9 0 0 0 5.993 3.05 14.5 14.5 0 0 0 1.286-2.078 12.9 12.9 0 0 1-2.027-.98c.17-.123.338-.252.5-.385a14.21 14.21 0 0 0 12.083 0c.162.133.33.262.5.385a12.9 12.9 0 0 1-2.028.98 14.5 14.5 0 0 0 1.286 2.078 19.86 19.86 0 0 0 5.994-3.05c.43-5.187-.764-9.673-3.477-13.688ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.336.955-2.421 2.157-2.421 1.21 0 2.176 1.094 2.157 2.42 0 1.336-.946 2.421-2.157 2.421Zm7.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.336.955-2.421 2.157-2.421 1.21 0 2.176 1.094 2.157 2.42 0 1.336-.946 2.421-2.157 2.421Z" />
              </svg>
              Continuar com Discord
            </button>

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-300" />
              <span className="text-xs text-gray-500">ou entre com email</span>
              <div className="h-px flex-1 bg-gray-300" />
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="on"
                  required
                  disabled={isLoading}
                  className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Entrando...
                    </>
                  ) : 'Entrar'}
                </button>
                <h3 className="mt-4 text-center text-sm text-gray-500">
                  <a className="font-medium text-indigo-600 hover:text-indigo-500" href="/register">
                    Não tem uma conta? <span className="underline">Registre-se</span>
                  </a>
                </h3>
              </div>
            </form>
            {showWarning && (
              <WarningAlert message={errorMessage} onClose={() => setShowWarning(false)} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
