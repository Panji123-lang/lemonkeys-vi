import { useState, useEffect } from 'react';

function AuthModalShell({ title, kicker, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-modal max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-vice-soft/25 bg-[#1f1a33] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-vice-rose">
              {kicker}
            </span>
            <h3 className="mt-1 font-display text-xl font-bold text-vice-text">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-vice-soft/15 bg-white/5 text-vice-text hover:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AdminLoginModal({ lang, onVerifyPin, onSuccess, onClose }) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isId = lang === 'id';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleaned = pin.trim();
    if (!cleaned) return;
    setLoading(true);
    setError('');
    try {
      const ok = await onVerifyPin(cleaned);
      if (ok) {
        onSuccess(cleaned);
        onClose();
      } else {
        setError(
          isId
            ? 'PIN Admin salah. Akses khusus pemilik website.'
            : 'Incorrect Admin PIN. Owner access only.'
        );
      }
    } catch {
      setError(
        isId
          ? 'Gagal memverifikasi ke server database. Coba lagi.'
          : 'Could not verify with database server. Please retry.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthModalShell
      title={isId ? 'Masuk Mode Admin Pemilik' : 'Owner Admin Login'}
      kicker={isId ? 'VERIFIKASI SERVER PEMILIK' : 'SERVER-VERIFIED OWNER ACCESS'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-vice-sub">
          {isId
            ? 'Perubahan Latar Hero, Logo Brand, dan moderasi hapus data akan langsung tersinkron ke seluruh pengunjung dunia.'
            : 'Hero Wallpaper, Brand Logo, and content moderation sync globally to every visitor worldwide.'}
        </p>

        {error && (
          <div role="alert" className="rounded-xl border border-vice-rose/40 bg-vice-rose/15 px-3.5 py-2.5 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="adminPinInput" className="mb-1.5 block text-sm font-semibold text-vice-text">
            {isId ? 'Masukkan PIN Admin' : 'Enter Admin PIN'}
          </label>
          <div className="relative">
            <input
              id="adminPinInput"
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              placeholder={isId ? 'Masukkan PIN rahasia...' : 'Enter secret PIN...'}
              autoFocus
              className="min-h-12 w-full rounded-xl border border-vice-soft/20 bg-vice-deep/85 pl-4 pr-20 font-mono text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-vice-soft hover:bg-white/10"
            >
              {showPin ? (isId ? 'Tutup' : 'Hide') : isId ? 'Lihat' : 'Show'}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-vice-soft/20 px-4 text-sm font-semibold text-vice-sub hover:bg-white/5"
          >
            {isId ? 'Batal' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 rounded-xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-5 text-sm font-bold text-vice-deep shadow-lg transition hover:opacity-95 disabled:opacity-60"
          >
            {loading
              ? isId
                ? 'Memeriksa...'
                : 'Verifying...'
              : isId
              ? 'Buka Akses Admin'
              : 'Unlock Admin'}
          </button>
        </div>
      </form>
    </AuthModalShell>
  );
}

export function ChangePinModal({ lang, onUpdatePin, onClose, onNotify }) {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isId = lang === 'id';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      setError(isId ? 'PIN baru minimal 4 karakter.' : 'New PIN must be at least 4 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ok = await onUpdatePin(oldPin.trim(), newPin.trim());
      if (ok) {
        onNotify(isId ? 'PIN Admin global berhasil diperbarui!' : 'Global Admin PIN updated!');
        onClose();
      } else {
        setError(isId ? 'PIN lama tidak cocok.' : 'Current PIN does not match.');
      }
    } catch {
      setError(isId ? 'Gagal menyimpan PIN ke server.' : 'Failed to update PIN on server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthModalShell
      title={isId ? 'Ubah PIN Admin' : 'Change Admin PIN'}
      kicker={isId ? 'KEAMANAN SERVER PEMILIK' : 'OWNER SERVER SECURITY'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-vice-rose/40 bg-vice-rose/15 px-3.5 py-2.5 text-sm text-rose-100">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="oldPin" className="mb-1.5 block text-sm font-semibold text-vice-text">
            {isId ? 'PIN Lama' : 'Current PIN'}
          </label>
          <input
            id="oldPin"
            type="password"
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3.5 font-mono text-sm text-vice-text focus:border-vice-lavender focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="newPin" className="mb-1.5 block text-sm font-semibold text-vice-text">
            {isId ? 'PIN Baru (min. 4 karakter)' : 'New PIN (min. 4 chars)'}
          </label>
          <input
            id="newPin"
            type="text"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="VICE2026"
            className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3.5 font-mono text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-vice-soft/20 px-4 text-sm font-semibold text-vice-sub hover:bg-white/5">
            {isId ? 'Batal' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 rounded-xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-5 text-sm font-bold text-vice-deep disabled:opacity-60"
          >
            {loading ? (isId ? 'Menyimpan...' : 'Saving...') : isId ? 'Simpan PIN' : 'Save PIN'}
          </button>
        </div>
      </form>
    </AuthModalShell>
  );
}
