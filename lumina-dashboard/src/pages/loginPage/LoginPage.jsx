import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRightIcon, EyeIcon, EyeSlashIcon, ExclamationTriangleIcon,
  KeyIcon, SparklesIcon
} from '@heroicons/react/24/outline';
import Header from '../../components/Header';
import { useUser } from '../../contexts/UserContext';
import { parseApiError, statusFallbackMessage, isNetworkError } from '../../utils/apiError';
import { getCsrfToken } from '../../utils/apiFetch';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function LoginPage() {
  const navigate = useNavigate();
  const { onLoginSuccess, user, loading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Se já está logado, redireciona
  useEffect(() => {
    if (!loading && user) {
      navigate('/members', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(`${API_BASE}expapi/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // Cookie httpOnly já foi setado pelo backend.
        // A resposta inclui o objeto user — não precisamos chamar /session.
        const data = await response.json();
        if (data.user) {
          // Usa o user retornado diretamente pelo login
          await onLoginSuccess(data.user);
        } else {
          // Fallback: se a API não retornou user, busca via /session
          await onLoginSuccess();
        }
        navigate('/members');
        return;
      }

      const { message } = await parseApiError(response, statusFallbackMessage(response.status));
      setError(message);
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Erro de conexão. Verifique sua internet e tente novamente.'
          : 'Ocorreu um erro inesperado. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscordLogin = () => {
    const origin = window.location.origin;
    window.location.href = `${API_BASE}expapi/oauth2/discord/auth/start?origin=${encodeURIComponent(origin)}&intent=login`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Logo + título */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium mb-4">
              <SparklesIcon className="h-3.5 w-3.5" />
              Bem-vindo de volta
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Entrar</h1>
            <p className="text-sm text-gray-500 mt-2">
              Acesse sua Área de Membros e gerencie seus servidores
            </p>
          </div>

          {/* Card principal */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
            {/* Discord login */}
            <button
              type="button"
              onClick={handleDiscordLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#5865F2] rounded-md hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3a13.6 13.6 0 0 0-.612 1.244 18.27 18.27 0 0 0-5.487 0A13.6 13.6 0 0 0 9.174 3a19.74 19.74 0 0 0-4.432 1.369C1.578 9.046.838 13.58 1.207 18.057a19.9 19.9 0 0 0 5.993 3.05 14.5 14.5 0 0 0 1.286-2.078 12.9 12.9 0 0 1-2.027-.98c.17-.123.338-.252.5-.385a14.21 14.21 0 0 0 12.083 0c.162.133.33.262.5.385a12.9 12.9 0 0 1-2.028.98 14.5 14.5 0 0 0 1.286 2.078 19.86 19.86 0 0 0 5.994-3.05c.43-5.187-.764-9.673-3.477-13.688ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.336.955-2.421 2.157-2.421 1.21 0 2.176 1.094 2.157 2.42 0 1.336-.946 2.421-2.157 2.421Zm7.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.336.955-2.421 2.157-2.421 1.21 0 2.176 1.094 2.157 2.42 0 1.336-.946 2.421-2.157 2.421Z" />
              </svg>
              Continuar com Discord
            </button>

            {/* Divider */}
            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">ou entre com email</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 flex items-start gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <KeyIcon className="h-4 w-4" />
                    Entrar
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-6">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-purple-600 hover:text-purple-700 font-medium">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
