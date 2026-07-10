import { useState, useEffect } from 'react';

const STORAGE_KEY = 'lumina_consent_v1';

/**
 * Banner simples de aviso de cookies.
 * Inline (não bloqueia render), usa CSS inline para evitar conflito com ad blockers.
 */
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setVisible(true), 2000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      display: 'flex', justifyContent: 'center', padding: '16px',
      pointerEvents: 'none',
    }}>
      <div style={{
        maxWidth: '600px', width: '100%', pointerEvents: 'auto',
        background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}>
        <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
          <strong>🍪 Aviso:</strong> Este site usa cookies essenciais para autenticação e segurança.
          O cookie de sessão é <code style={{ background: '#f3f4f6', padding: '2px 4px', borderRadius: '4px', fontSize: '11px' }}>httpOnly</code> (não acessível por JavaScript).
          Não usamos cookies de rastreamento.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={accept}
            style={{
              padding: '8px 20px', fontSize: '13px', fontWeight: 600,
              color: 'white', background: '#7c3aed', border: 'none',
              borderRadius: '6px', cursor: 'pointer',
            }}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
