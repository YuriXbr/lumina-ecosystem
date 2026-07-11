import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon, ArrowRightIcon, CheckIcon, EyeIcon, EyeSlashIcon,
  ExclamationTriangleIcon, SparklesIcon, UserIcon, KeyIcon, IdentificationIcon
} from '@heroicons/react/24/outline';
import Header from '../../components/Header';
import { parseApiError, statusFallbackMessage, isNetworkError } from '../../utils/apiError';
import { getCsrfToken } from '../../utils/apiFetch';
import { useT } from '../../i18n/LanguageContext.jsx';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const TOTAL_STEPS = 4; // 1: conta, 2: username, 3: revisão, 4: done

export default function RegisterPage() {
  const t = useT();
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
    if (!form.firstName.trim()) e.firstName = t('auth.register.firstNameRequired');
    if (!form.lastName.trim()) e.lastName = t('auth.register.lastNameRequired', { defaultValue: 'Last name is required.' });
    if (!form.email.trim()) e.email = t('auth.register.emailRequired', { defaultValue: 'Email is required.' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('auth.register.emailInvalid');
    if (!form.password) e.password = t('auth.register.passwordRequired');
    else if (form.password.length < 8) e.password = t('auth.register.passwordMin');
    else if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password))
      e.password = t('auth.register.passwordComplex');
    if (form.password !== form.confirmPassword) e.confirmPassword = t('auth.register.passwordsDontMatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.username) e.username = t('auth.register.usernameRequired', { defaultValue: 'Username is required.' });
    else if (form.username.length < 4 || form.username.length > 16) e.username = t('auth.register.usernameLength');
    else if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(form.username)) e.username = t('auth.register.usernameFormat', { defaultValue: 'Letters, numbers, and _. Must start with a letter.' });
    else if (form.username.includes('__')) e.username = t('auth.register.usernameNoUnderscore', { defaultValue: 'Cannot contain __ .' });
    else if (usernameStatus !== 'available') e.username = t('auth.register.usernameUnavailable');
    if (!form.displayName.trim()) e.displayName = t('auth.register.displayNameRequired');
    else if (form.displayName.length > 32) e.displayName = t('auth.register.displayNameMax');
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
          ? t('auth.register.connectionError')
          : t('auth.register.unexpectedError'),
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
      {/* Language switcher — canto superior direito, para usuários não-logados */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher compact />
      </div>
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Header do form */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{t("auth.register.createTitle")}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {step < 4 ? t('auth.register.step', { current: step, total: TOTAL_STEPS - 1 }) : t('auth.register.allReady')}
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
                    {t('common.back')}
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
                      {t('auth.register.creating')}
                    </>
                  ) : step === 3 ? (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      {t('auth.register.create')}
                    </>
                  ) : (
                    <>
                      {t('common.continue')}
                      <ArrowRightIcon className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {step < 4 && (
            <p className="text-center text-xs text-gray-500 mt-4">
              {t('auth.register.hasAccount')}{' '}
              <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                {t('auth.register.loginButton')}
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
    const t = useT();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <KeyIcon className="h-5 w-5 text-purple-600" />
        <h2 className="text-base font-semibold text-gray-900">{t("auth.register.accessData")}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={t("auth.register.firstName")}
          value={form.firstName}
          onChange={v => updateField('firstName', v)}
          error={errors.firstName}
          placeholder={t('auth.register.firstNamePlaceholder')}
          autoComplete="given-name"
          required
        />
        <Field
          label={t("auth.register.firstName")}
          value={form.lastName}
          onChange={v => updateField('lastName', v)}
          error={errors.lastName}
          placeholder={t('auth.register.lastNamePlaceholder')}
          autoComplete="family-name"
          required
        />
      </div>

      <Field
        label={t("auth.register.email")}
        type="email"
        value={form.email}
        onChange={v => updateField('email', v)}
        error={errors.email}
        placeholder={t('auth.register.emailPlaceholder')}
        autoComplete="email"
        required
      />

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">{t('common.password')}</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            className={`w-full px-3 py-2 pr-10 text-sm border rounded-md focus:ring-2 focus:outline-none ${
              errors.password ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'
            }`}
            placeholder={t('auth.register.passwordPlaceholder')}
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
        <p className="text-xs text-gray-500 mt-1">{t('auth.register.passwordHint')}</p>
      </div>

      <Field
        label={t("auth.register.confirmPassword")}
        type={showPassword ? 'text' : 'password'}
        value={form.confirmPassword}
        onChange={v => updateField('confirmPassword', v)}
        error={errors.confirmPassword}
        placeholder={t('auth.register.confirmPasswordPlaceholder')}
        autoComplete="new-password"
        required
      />
    </div>
  );
}

// ─── Step 2: Username + displayName ──────────────────────────────────────────
function Step2Username({ form, errors, updateField, usernameStatus }) {
    const t = useT();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <IdentificationIcon className="h-5 w-5 text-purple-600" />
        <h2 className="text-base font-semibold text-gray-900">{t('auth.register.identityTitle')}</h2>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
        <div className="flex items-start gap-2">
          <SparklesIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            {t('auth.register.usernameInfo')}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">{t('common.username')}</label>
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
            placeholder={t('settings.account.usernamePlaceholder')}
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
        <p className="text-xs text-gray-500 mt-1">{t('auth.register.usernameFormat')}</p>
      </div>

      <Field
        label={t('settings.identity.displayName')}
        value={form.displayName}
        onChange={v => updateField('displayName', v)}
        error={errors.displayName}
        placeholder={t("settings.account.displayNamePlaceholder")}
        maxLength={32}
        required
      />
      <p className="text-xs text-gray-500 -mt-2">{t('auth.register.displayNameShortHint')}</p>
    </div>
  );
}

// ─── Step 3: Revisão ─────────────────────────────────────────────────────────
function Step3Review({ form }) {
    const t = useT();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <UserIcon className="h-5 w-5 text-purple-600" />
        <h2 className="text-base font-semibold text-gray-900">{t('auth.register.reviewTitle')}</h2>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-200">
        <ReviewRow label={t("auth.register.firstName")} value={`${form.firstName} ${form.lastName}`} />
        <ReviewRow label={t("auth.register.email")} value={form.email} />
        <ReviewRow label={t('common.username')} value={`@${form.username}`} />
        <ReviewRow label={t('settings.identity.displayName')} value={form.displayName} />
      </div>

      <p className="text-xs text-gray-500">
        {t('auth.register.termsAgreement')}
      </p>
    </div>
  );
}

// ─── Step 4: Sucesso ─────────────────────────────────────────────────────────
function Step4Done({ form, navigate }) {
    const t = useT();
  return (
    <div className="text-center py-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <CheckIcon className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">{t("auth.register.accountCreated")}</h2>
      <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto">
        {t('auth.register.welcomeTo', { name: form.displayName })}{' '}
        {t('auth.register.welcomeDesc', { username: form.username })}
      </p>
      <button
        onClick={() => navigate('/login')}
        className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
      >
        {t('auth.register.loginButton')}
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
