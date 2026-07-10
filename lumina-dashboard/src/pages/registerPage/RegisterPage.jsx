import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon, ArrowRightIcon, CheckIcon, EyeIcon, EyeSlashIcon,
  ExclamationTriangleIcon, SparklesIcon, UserIcon, KeyIcon, IdentificationIcon
} from '@heroicons/react/24/outline';
import Header from '../../components/Header';
import { parseApiError, statusFallbackMessage, isNetworkError } from '../../utils/apiError';
import { getCsrfToken } from '../../utils/apiFetch';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/';
const TOTAL_STEPS = 4; // 1: conta, 2: username, 3: revisão, 4: done

export default function RegisterPage() {
  const navigate = useNavigate();

  // ─── Estado global do formulário ─────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    displayName: '',
  });
  const [errors, setErrors] = useState({});
  const [csrfToken, setCsrfToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ─── Username availability check ─────────────────────────────────────────
  const [usernameStatus, setUsernameStatus] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => data?.csrfToken && setCsrfToken(data.csrfToken))
      .catch(() => {});
  }, []);

  // Debounced username availability check
  useEffect(() => {
    if (step !== 2 || !form.username || form.username.length < 4) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}expapi/v1/user/check-username?username=${encodeURIComponent(form.username)}`, {
          headers: {},
          credentials: 'include',
        });
        if (res.status === 401) {
          // Não logado ainda — ok, vamos confiar na validação server-side no submit
          setUsernameStatus(null);
          return;
        }
        const data = await res.json();
        setUsernameStatus(data.available ? 'available' : (data.reason === 'invalid' ? 'invalid' : 'taken'));
      } catch {
        setUsernameStatus(null);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form.username, step]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined, _form: undefined }));
  };

  // Pré-preenche displayName quando entra no step 2
  useEffect(() => {
    if (step === 2 && !form.displayName && form.firstName) {
      setForm(prev => ({ ...prev, displayName: `${prev.firstName} ${prev.lastName || ''}`.trim().slice(0, 32) }));
    }
  }, [step, form.firstName, form.lastName, form.displayName]);

  // ─── Validação por step ──────────────────────────────────────────────────
  const validateStep1 = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Nome é obrigatório.';
    if (!form.lastName.trim()) e.lastName = 'Sobrenome é obrigatório.';
    if (!form.email.trim()) e.email = 'Email é obrigatório.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido.';
    if (!form.password) e.password = 'Senha é obrigatória.';
    else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres.';
    else if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password))
      e.password = 'Precisa de maiúscula, minúscula e número.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'As senhas não coincidem.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.username) e.username = 'Username é obrigatório.';
    else if (form.username.length < 4 || form.username.length > 16) e.username = '4-16 caracteres.';
    else if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(form.username)) e.username = 'Letras, números e _. Deve começar com letra.';
    else if (form.username.includes('__')) e.username = 'Não pode conter __ .';
    else if (usernameStatus !== 'available') e.username = 'Username indisponível.';
    if (!form.displayName.trim()) e.displayName = 'Display name é obrigatório.';
    else if (form.displayName.length > 32) e.displayName = 'Máx 32 caracteres.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit final ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors({});
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`${API_BASE}expapi/v1/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          username: form.username,
          displayName: form.displayName.trim(),
        }),
      });

      if (res.ok) {
        setStep(4); // done
        return;
      }

      const { message } = await parseApiError(res, statusFallbackMessage(res.status));
      // Tenta mapear o erro para um campo específico
      if (message.toLowerCase().includes('username')) {
        setStep(2);
        setErrors({ username: message });
      } else if (message.toLowerCase().includes('email')) {
        setStep(1);
        setErrors({ email: message });
      } else {
        setErrors({ _form: message });
      }
    } catch (err) {
      setErrors({
        _form: isNetworkError(err)
          ? 'Erro de conexão. Verifique sua internet.'
          : 'Erro inesperado. Tente novamente.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3) handleSubmit();
  };

  const prevStep = () => setStep(s => Math.max(1, s - 1));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Header do form */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Criar sua conta</h1>
            <p className="text-sm text-gray-500 mt-1">
              {step < 4 ? `Passo ${step} de ${TOTAL_STEPS - 1}` : 'Tudo pronto!'}
            </p>
          </div>

          {/* Progress bar */}
          {step < 4 && (
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    s <= step ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Card principal */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
            {step === 1 && (
              <Step1Account
                form={form}
                errors={errors}
                updateField={updateField}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />
            )}

            {step === 2 && (
              <Step2Username
                form={form}
                errors={errors}
                updateField={updateField}
                usernameStatus={usernameStatus}
              />
            )}

            {step === 3 && (
              <Step3Review form={form} />
            )}

            {step === 4 && (
              <Step4Done form={form} navigate={navigate} />
            )}

            {/* Erro global */}
            {errors._form && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 flex items-start gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{errors._form}</span>
              </div>
            )}

            {/* Navegação entre steps */}
            {step < 4 && (
              <div className="mt-6 flex gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Voltar
                  </button>
                )}
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Criando conta...
                    </>
                  ) : step === 3 ? (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      Criar conta
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRightIcon className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {step < 4 && (
            <p className="text-center text-xs text-gray-500 mt-4">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                Entrar
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Conta (email + senha + nome) ────────────────────────────────────
function Step1Account({ form, errors, updateField, showPassword, setShowPassword }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <KeyIcon className="h-5 w-5 text-purple-600" />
        <h2 className="text-base font-semibold text-gray-900">Dados de acesso</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Nome"
          value={form.firstName}
          onChange={v => updateField('firstName', v)}
          error={errors.firstName}
          placeholder="João"
          autoComplete="given-name"
          required
        />
        <Field
          label="Sobrenome"
          value={form.lastName}
          onChange={v => updateField('lastName', v)}
          error={errors.lastName}
          placeholder="Silva"
          autoComplete="family-name"
          required
        />
      </div>

      <Field
        label="Email"
        type="email"
        value={form.email}
        onChange={v => updateField('email', v)}
        error={errors.email}
        placeholder="voce@email.com"
        autoComplete="email"
        required
      />

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Senha</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            className={`w-full px-3 py-2 pr-10 text-sm border rounded-md focus:ring-2 focus:outline-none ${
              errors.password ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'
            }`}
            placeholder="Mín. 8 caracteres"
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
        <p className="text-xs text-gray-500 mt-1">Maiúscula, minúscula e número. Mínimo 8 caracteres.</p>
      </div>

      <Field
        label="Confirmar senha"
        type={showPassword ? 'text' : 'password'}
        value={form.confirmPassword}
        onChange={v => updateField('confirmPassword', v)}
        error={errors.confirmPassword}
        placeholder="Repita a senha"
        autoComplete="new-password"
        required
      />
    </div>
  );
}

// ─── Step 2: Username + displayName ──────────────────────────────────────────
function Step2Username({ form, errors, updateField, usernameStatus }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <IdentificationIcon className="h-5 w-5 text-purple-600" />
        <h2 className="text-base font-semibold text-gray-900">Sua identidade</h2>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
        <div className="flex items-start gap-2">
          <SparklesIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Seu username será o endereço do seu perfil público: <code className="bg-purple-100 px-1 rounded">/u/seu_username</code>.
            Escolha com cuidado — só pode ser alterado a cada 30 dias.
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
          <input
            type="text"
            value={form.username}
            onChange={(e) => updateField('username', e.target.value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 16))}
            className={`w-full pl-7 pr-10 py-2 text-sm border rounded-md focus:ring-2 focus:outline-none ${
              errors.username ? 'border-red-400 focus:ring-red-500' :
              usernameStatus === 'available' ? 'border-green-400 focus:ring-green-500' :
              'border-gray-300 focus:ring-purple-500'
            }`}
            placeholder="seu_username"
            minLength={4}
            maxLength={16}
            required
            autoFocus
          />
          {usernameStatus === 'available' && <CheckIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
          {usernameStatus === 'checking' && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />}
          {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <ExclamationTriangleIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />}
        </div>
        {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username}</p>}
        <p className="text-xs text-gray-500 mt-1">4-16 caracteres. Letras, números e _. Deve começar com letra.</p>
      </div>

      <Field
        label="Nome de exibição"
        value={form.displayName}
        onChange={v => updateField('displayName', v)}
        error={errors.displayName}
        placeholder="Como você quer ser chamado"
        maxLength={32}
        required
      />
      <p className="text-xs text-gray-500 -mt-2">Pode conter espaços e acentos. Alterável a cada 24h.</p>
    </div>
  );
}

// ─── Step 3: Revisão ─────────────────────────────────────────────────────────
function Step3Review({ form }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <UserIcon className="h-5 w-5 text-purple-600" />
        <h2 className="text-base font-semibold text-gray-900">Revise seus dados</h2>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-200">
        <ReviewRow label="Nome" value={`${form.firstName} ${form.lastName}`} />
        <ReviewRow label="Email" value={form.email} />
        <ReviewRow label="Username" value={`@${form.username}`} />
        <ReviewRow label="Nome de exibição" value={form.displayName} />
      </div>

      <p className="text-xs text-gray-500">
        Ao continuar, você concorda com os termos de uso e a política de privacidade do Lumina Bot.
      </p>
    </div>
  );
}

// ─── Step 4: Sucesso ─────────────────────────────────────────────────────────
function Step4Done({ form, navigate }) {
  return (
    <div className="text-center py-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <CheckIcon className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Conta criada!</h2>
      <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto">
        Bem-vindo ao Lumina, <strong>{form.displayName}</strong>!
        Seu perfil está acessível em <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/u/{form.username}</code>.
      </p>
      <button
        onClick={() => navigate('/login')}
        className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
      >
        Fazer login
        <ArrowRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────
function Field({ label, value, onChange, error, type = 'text', placeholder, required, autoComplete, maxLength, minLength }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}{required && <span className="text-purple-600"> *</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        maxLength={maxLength}
        minLength={minLength}
        className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:outline-none ${
          error ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'
        }`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 truncate">{value}</span>
    </div>
  );
}
