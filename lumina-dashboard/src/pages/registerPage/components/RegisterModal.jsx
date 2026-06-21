import { useState, useEffect } from "react";
import { redirect } from "react-router-dom";
import WarningAlert from "./WarningAlert.jsx";

export default function RegisterModal() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [showWarning, setShowWarning] = useState(false); // Estado para controlar a visibilidade do alerta
    const [warningMessage, setWarningMessage] = useState(""); // Estado para a mensagem de alerta
    const [csrfToken, setCsrfToken] = useState(""); // Estado para armazenar o CSRF token

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
        
        fetchCsrfToken();
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();
        
        // Validação no frontend
        if (!email || !password || !firstName || !lastName) {
            setWarningMessage("Todos os campos são obrigatórios.");
            setShowWarning(true);
            return;
        }
        
        // Validação de força da senha
        if (password.length < 8) {
            setWarningMessage("A senha deve ter pelo menos 8 caracteres.");
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
        const submitButton = document.getElementById("submitButton");
        submitButton.disabled = true;

        const timeoutId = setTimeout(() => {
            submitButton.disabled = false;
            setWarningMessage("Erro ao se comunicar com o servidor. Tente novamente.");
            setShowWarning(true);
        }, 15000);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken, // Incluir o CSRF token no header
                },
                credentials: "include", // Importante para incluir cookies
                body: JSON.stringify(formData),
            });

            clearTimeout(timeoutId);
            submitButton.disabled = false;

            if (response.ok) {
                console.log("Usuário cadastrado com sucesso!");
                redirect("/login");
            } else {
                const errorText = await response.text();
                console.error("Erro ao cadastrar usuário!");
                setWarningMessage(errorText || "Erro interno. Tente novamente.");
                setShowWarning(true);
            }
        } catch (error) {
            console.error("Error:", error);
            submitButton.disabled = false;
            setWarningMessage("Erro ao se comunicar com o servidor. Tente novamente.");
            setShowWarning(true);
        }
    }

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
                    <form className="mt-8 space-y-6">
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
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 hover:border-gray-500 hover:border-1"
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
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 hover:border-gray-500 hover:border-1"
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
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 hover:border-gray-500 hover:border-1"
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
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 hover:border-gray-500 hover:border-1"
                                    onChange={(e) => setPassword(e.target.value)}
                                    value={password}
                                    placeholder="Sua Senha"
                                />
                            </div>
                        </div>
                        <button
                            id="submitButton"
                            onClick={handleSubmit}
                            type="submit"
                            form="form"
                            className="w-full bg-indigo-600 text-white rounded-lg px-3 py-2 mt-6 disabled:opacity-70 hover:bg-indigo-500"
                        >
                            Cadastrar
                        </button>
                    </form>
                    {showWarning && <WarningAlert message={warningMessage} />}{" "}
                </div>
            </div>
        </div>
    );
}