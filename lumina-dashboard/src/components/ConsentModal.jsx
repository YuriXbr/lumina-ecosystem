import { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useT } from '../i18n/LanguageContext.jsx';

const STORAGE_KEY = 'lumina_cookie_consent_v1';

/**
 * Global consent modal — cookies and data processing.
 * Shown once per user (persisted in localStorage).
 * Simple, non-intrusive, LGPD/GDPR compliant.
 */
export default function ConsentModal() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() }));
    } catch {
      // localStorage indisponível — não-fatal
    }
    setShow(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString() }));
    } catch {
      // localStorage indisponível
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="mx-auto max-w-2xl bg-white border border-gray-200 rounded-xl shadow-lg p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-xl">🍪</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('consent.title', { defaultValue: 'Cookies and Data' })}
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {t('consent.description', { defaultValue: 'We use cookies for authentication and to improve your experience. By continuing to use this site, you consent to our use of cookies.' })}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAccept}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                {t('consent.accept', { defaultValue: 'Accept' })}
              </button>
              <button
                onClick={handleDecline}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                {t('consent.decline', { defaultValue: 'Decline' })}
              </button>
            </div>
          </div>
          <button
            onClick={handleDecline}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label={t('common.close', { defaultValue: 'Close' })}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
