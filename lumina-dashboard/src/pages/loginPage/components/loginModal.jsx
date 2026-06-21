import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../contexts/UserContext";
import WarningAlert from "./WarningAlert";

export default function LoginModal() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showWarning, setShowWarning] = useState(false); // Estado para controlar a visibilidade do alerta
  const [errorMessage, setErrorMessage] = useState(""); // Estado para mensagem de erro específica
  const [isLoading, setIsLoading] = useState(false); // Estado de carregamento
  const [csrfToken, setCsrfToken] = useState(""); // Estado para armazenar o CSRF token
  const { onLoginSuccess } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/csrf-token`, {
          method: "GET",
          credentials: "include", // Importante para incluir cookies
        });
        
        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.csrfToken);
        }
      } catch (error) {
        console.error("Erro ao obter CSRF token:", error);
      }
    };
    
    const checkToken = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}expapi/v1/validate-token`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            navigate("/dashboard");
          }
        } catch (error) {
          console.error("Error:", error);
        }
      }
    };
    
    fetchCsrfToken();
    checkToken();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setShowWarning(false);
    setErrorMessage("");
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}expapi/v1/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken, // Incluir o CSRF token no header
          },
          credentials: "include", // Importante para incluir cookies
          body: JSON.stringify({ email, password }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token);
        
        // Trigger user data loading in context
        await onLoginSuccess();
        
        navigate("/dashboard");
      } else {
        const errorData = await response.json();
        let message = "Credenciais inválidas";
        
        switch (response.status) {
          case 401:
            message = "Email ou senha incorretos";
            break;
          case 403:
            message = "Conta bloqueada ou inativa";
            break;
          case 429:
            message = "Muitas tentativas. Tente novamente em alguns minutos";
            break;
          case 500:
            message = "Erro interno do servidor. Tente novamente mais tarde";
            break;
          default:
            message = errorData.error || "Erro ao fazer login";
        }
        
        setErrorMessage(message);
        setShowWarning(true);
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("Erro de conexão. Verifique sua internet e tente novamente");
      setShowWarning(true);
    } finally {
      setIsLoading(false);
    }
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
                Entre no <span className="text-indigo-500 underline underline-offset-4">painel de controle</span>!
              </h2>
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="on"
                    required
                    disabled={isLoading}
                    className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <h3 className="mt-1 text-right text-sm text-gray-500">
                    <a
                      href="/"
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Esqueceu sua senha?
                    </a>
                  </h3>
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
                    ) : (
                      'Entrar'
                    )}
                  </button>
                  <h3 className="mt-4 text-center text-sm text-gray-500">
                    <a
                        className="font-medium text-indigo-600 hover:text-indigo-500"
                        href="/register"
                    >
                      Não tem uma conta? <span className="underline" href="/register">Registre-se</span>
                    </a>
                  </h3>
                </div>
              </form>
              {showWarning && (
                <WarningAlert 
                  message={errorMessage} 
                  onClose={() => setShowWarning(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    )
}
