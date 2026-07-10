import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import WarningAlert from "./WarningAlert.jsx";
import { parseApiError, statusFallbackMessage, isNetworkError } from "../../../utils/apiError";

export default function RegisterModal() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [showWarning, setShowWarning] = useState(false); // Estado para controlar a visibilidade do alerta
    const [warningMessage, setWarningMessage] = useState(""); // Estado para a mensagem de alerta
    const [csrfToken, setCsrfToken] = useState(""); // Estado para armazenar o CSRF token
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCsrfToken = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/'}expapi/v1/csrf-token`, { credentials: 'include' })

                if (response.ok) {
                    const data = await response.json();
                    setCsrfToken(data.csrfToken);
                }
            } catch (error) {
                console.error("Erro ao obter CSRF token:", error);
            }
        };

        fetchCsrfToken();

        // Verifica se o backend redirecionou com erro do fluxo OAuth2
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get("oauthError");
        if (oauthError === "email_exists") {
            setWarningMessage("Este email já possui uma conta. Faça login e conecte o Discord no painel.");
            setShowWarning(true);
            window.history.replaceState(null, "", "/register");
        }
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();

        // Validação no frontend
        if (!email || !password || !firstName || !lastName) {
            setWarningMessage("Todos os campos são obrigatórios.");
            setShowWarning(true);
            return;
        }

        // Validação de força/tamanho da senha
        // ALTERADO: também valida o limite máximo, igual ao backend
        if (password.length < 8 || password.length > 128) {
            setWarningMessage("A senha deve ter entre 8 e 128 caracteres.");
            setShowWarning(true);
            return;
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            setWarningMessage("A senha deve conter letras maiúsculas, minúsculas e números.");
            setShowWarning(true);
            return;
        }

        // Validação de email
        const emailRegex = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            setWarningMessage("Por favor, insira um email válido.");
            setShowWarning(true);
            return;
        }

        const formData = {
            email: email.trim(),
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim()
        };

        setIsLoading(true);
        setShowWarning(false);
        setWarningMessage("");

        // Timeout de segurança: se a requisição travar (sem responder), avisa o
        // usuário em vez de deixar o botão "carregando" pra sempre.
        const timeoutId = setTimeout(() => {
            setIsLoading(false);
            setWarningMessage("O servidor demorou para responder. Tente novamente.");
            setShowWarning(true);
        }, 15000);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/'}expapi/v1/register`, {

            clearTimeout(timeoutId);
            setIsLoading(false);

            if (response.ok) {
                // CORRIGIDO: `redirect()` do react-router-dom só funciona dentro de
                // loaders/actions — chamado aqui dentro de um handler de evento ele
                // não navega pra lugar nenhum (bug silencioso). Trocado por useNavigate.
                navigate("/login?registered=1");
                return;
            }

            // CORRIGIDO: antes lia só response.text(), mas agora o backend responde
            // JSON ({ error, code }) — parseApiError entende os dois formatos.
            const { message } = await parseApiError(response, statusFallbackMessage(response.status));
            console.error("Erro ao cadastrar usuário:", message);
            setWarningMessage(message);
            setShowWarning(true);
        } catch (error) {
            clearTimeout(timeoutId);
            setIsLoading(false);
            console.error("Error:", error);
            // CORRIGIDO: distingue falha de rede de qualquer outro erro inesperado,
            // em vez de sempre culpar "a internet".
            setWarningMessage(
                isNetworkError(error)
                    ? "Erro de conexão. Verifique sua internet e tente novamente."
                    : "Ocorreu um erro inesperado. Tente novamente."
            );
            setShowWarning(true);
        }
    }

    const handleDiscordRegister = () => {
        const origin = window.location.origin;
        window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/'}expapi/oauth2/discord/auth/start?origin=${encodeURIComponent(origin)}&intent=register`;
    };

    return (
        <div className="pt-6 mx-6">
            <div className="flex min-h-full flex-1 flex-col justify-center pt-16 py-12 lg:px-8">
                <div className="bg-gray-100 shadow-lg rounded-lg p-8 max-w-4xl mx-auto">
                    <a href="/#" className="mb-3 block w-fit text-gray-500 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition ease-in-out duration-150">
                        <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M15 19l-7-7 7-7"></path>
                        </svg>
                    </a>
                    <div className="sm:mx-auto px-3 sm:w-full sm:max-w-4xl">
                        <img src="/new-purple.svg" className="mx-auto h-28 w-auto" alt="Logo" />
                        <h2 className="pt-3 text-2xl font-bold text-center text-gray-800 mb-4">
                            Cadastre-se!
                        </h2>
                    </div>

                    {/* NOVO: cadastro automático via Discord OAuth2 — cria a conta já
                        vinculada ao Discord, sem precisar definir senha agora. */}
                    <button
                        type="button"
                        onClick={handleDiscordRegister}
                        disabled={isLoading}
                        className="mx-auto flex max-w-sm w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
                            <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3a13.6 13.6 0 0 0-.612 1.244 18.27 18.27 0 0 0-5.487 0A13.6 13.6 0 0 0 9.174 3a19.74 19.74 0 0 0-4.432 1.369C1.578 9.046.838 13.58 1.207 18.057a19.9 19.9 0 0 0 5.993 3.05 14.5 14.5 0 0 0 1.286-2.078 12.9 12.9 0 0 1-2.027-.98c.17-.123.338-.252.5-.385a14.21 14.21 0 0 0 12.083 0c.162.133.33.262.5.385a12.9 12.9 0 0 1-2.028.98 14.5 14.5 0 0 0 1.286 2.078 19.86 19.86 0 0 0 5.994-3.05c.43-5.187-.764-9.673-3.477-13.688ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.336.955-2.421 2.157-2.421 1.21 0 2.176 1.094 2.157 2.42 0 1.336-.946 2.421-2.157 2.421Zm7.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.336.955-2.421 2.157-2.421 1.21 0 2.176 1.094 2.157 2.42 0 1.336-.946 2.421-2.157 2.421Z" />
                        </svg>
                        Cadastrar com Discord
                    </button>

                    <div className="mx-auto max-w-sm flex items-center gap-3 mt-6">
                        <div className="h-px flex-1 bg-gray-300" />
                        <span className="text-xs text-gray-500">ou cadastre-se com email</span>
                        <div className="h-px flex-1 bg-gray-300" />
                    </div>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                        <div className="md:grid md:grid-cols-2 md:gap-6">
                            <div className="md:w-80">
                                <label htmlFor="firstName" className="block text-gray-700">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    required
                                    id="firstName"
                                    name="firstName"
                                    disabled={isLoading}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 hover:border-gray-500 hover:border-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onChange={(e) => setFirstName(e.target.value)}
                                    value={firstName}
                                    placeholder="Seu Nome"
                                />
                                <label htmlFor="lastName" className="block text-gray-700 mt-4">
                                    Sobrenome
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    required
                                    disabled={isLoading}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 hover:border-gray-500 hover:border-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onChange={(e) => setLastName(e.target.value)}
                                    value={lastName}
                                    placeholder="Seu Sobrenome"
                                />
                            </div>
                            <div className="md:border-l border-gray-300 md:pl-6">
                                <label htmlFor="email" className="block text-gray-700">
                                    E-mail
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    disabled={isLoading}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 hover:border-gray-500 hover:border-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onChange={(e) => setEmail(e.target.value)}
                                    value={email}
                                    placeholder="Seu E-mail"
                                />
                                <label htmlFor="password" className="block text-gray-700 mt-4">
                                    Senha
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    required
                                    name="password"
                                    disabled={isLoading}
                                    maxLength={128}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 hover:border-gray-500 hover:border-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onChange={(e) => setPassword(e.target.value)}
                                    value={password}
                                    placeholder="Sua Senha"
                                />
                            </div>
                        </div>
                        <button
                            id="submitButton"
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 text-white rounded-lg px-3 py-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed hover:bg-indigo-500"
                        >
                            {isLoading ? "Cadastrando..." : "Cadastrar"}
                        </button>
                    </form>
                    {showWarning && (
                        <WarningAlert message={warningMessage} onClose={() => setShowWarning(false)} />
                    )}
                </div>
            </div>
        </div>
    );
}
