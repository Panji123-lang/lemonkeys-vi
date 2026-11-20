import { useState, useEffect } from 'react';
import { HERO_PRESETS, getLocalizedField } from '../data/initialData';
import { DEFAULT_BRAND_LOGO, LOGO_GRADIENTS } from '../data/translations';

const DIRECTIONS = [
  { key: 'UP', label: '↑ UP' },
  { key: 'DOWN', label: '↓ DOWN' },
  { key: 'LEFT', label: '← LEFT' },
  { key: 'RIGHT', label: '→ RIGHT' },
];

function ModalShell({ title, kicker, onClose, children }) {
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
      <div className="animate-modal max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-vice-soft/25 bg-[#1f1a33] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {kicker && (
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-vice-rose">
                {kicker}
              </span>
            )}
            <h3 className="mt-1 font-display text-xl font-bold text-vice-text">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-vice-soft/15 bg-white/5 text-vice-text transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-vice-peach"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

/* 1. Modal Login Admin Pemilik Website */
export function AdminLoginModal({ currentPin, lang, onSuccess, onClose }) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const isId = lang === 'id';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.trim() === currentPin) {
      onSuccess();
      onClose();
    } else {
      setError(
        isId
          ? 'PIN Admin salah. Pastikan kamu pemilik website ini.'
          : 'Incorrect Admin PIN. Owner access only.'
      );
    }
  };

  return (
    <ModalShell
      title={isId ? 'Masuk Mode Admin Pemilik' : 'Owner Admin Login'}
      kicker={isId ? 'AKSES TERBATAS PEMILIK' : 'RESTRICTED OWNER ACCESS'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-vice-sub">
          {isId
            ? "Fitur Ganti Latar Hero dan Ganti Logo LemonKeyS' VI hanya dapat diakses oleh pemilik website."
            : "Changing the Hero Wallpaper and LemonKeyS' VI Brand Logo is restricted to the site owner."}
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
            className="min-h-11 rounded-xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-5 text-sm font-bold text-vice-deep shadow-lg transition hover:opacity-95 active:scale-95"
          >
            {isId ? 'Buka Akses Admin' : 'Unlock Admin'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* 2. Modal Ubah PIN Admin */
export function ChangePinModal({ currentPin, lang, onSavePin, onClose, onNotify }) {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const isId = lang === 'id';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (oldPin.trim() !== currentPin) {
      setError(isId ? 'PIN lama tidak cocok.' : 'Current PIN does not match.');
      return;
    }
    if (newPin.trim().length < 4) {
      setError(isId ? 'PIN baru minimal 4 karakter.' : 'New PIN must be at least 4 characters.');
      return;
    }
    onSavePin(newPin.trim());
    onNotify(isId ? 'PIN Admin berhasil diperbarui!' : 'Admin PIN updated successfully!');
    onClose();
  };

  return (
    <ModalShell
      title={isId ? 'Ubah PIN Admin' : 'Change Admin PIN'}
      kicker={isId ? 'KEAMANAN PEMILIK' : 'OWNER SECURITY'}
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
          <button type="submit" className="min-h-11 rounded-xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-5 text-sm font-bold text-vice-deep">
            {isId ? 'Simpan PIN' : 'Save PIN'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* 3. Modal Ganti Logo Brand (Admin Only) */
export function BrandLogoModal({ brandLogo, lang, onSave, onClose, onNotify }) {
  const [text, setText] = useState(brandLogo.text || 'VI');
  const [shape, setShape] = useState(brandLogo.shape || 'rounded-xl');
  const [gradient, setGradient] = useState(brandLogo.gradient || DEFAULT_BRAND_LOGO.gradient);
  const [urlInput, setUrlInput] = useState(
    brandLogo.type === 'image' && brandLogo.url?.startsWith('http') ? brandLogo.url : ''
  );
  const [uploading, setUploading] = useState(false);
  const isId = lang === 'id';

  const handleUploadLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/png');

        onSave({
          ...brandLogo,
          type: 'image',
          url: dataUrl,
          shape,
        });
        setUploading(false);
        onNotify(isId ? "Logo LemonKeyS' VI berhasil diganti dari galeri!" : 'Brand logo updated from device!');
        onClose();
      };
      img.onerror = () => {
        setUploading(false);
        onNotify(isId ? 'Gagal membaca gambar logo.' : 'Failed to load logo image.');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const applyLogoUrl = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    onSave({
      ...brandLogo,
      type: 'image',
      url: urlInput.trim(),
      shape,
    });
    onNotify(isId ? 'Logo dari URL berhasil diterapkan!' : 'Logo URL applied!');
    onClose();
  };

  const applyMonogram = () => {
    onSave({
      type: 'monogram',
      text: (text.trim() || 'VI').slice(0, 3).toUpperCase(),
      shape,
      gradient,
      url: '',
    });
    onNotify(isId ? 'Logo monogram berhasil diperbarui!' : 'Monogram logo updated!');
    onClose();
  };

  return (
    <ModalShell
      title={isId ? "Ganti Logo LemonKeyS' VI" : "Customize LemonKeyS' VI Logo"}
      kicker={isId ? 'ADMIN STUDIO • IDENTITAS BRAND' : 'ADMIN STUDIO • BRAND IDENTITY'}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-2xl border border-vice-soft/20 bg-vice-deep/75 p-4">
          <div className="flex items-center gap-3">
            {brandLogo.type === 'image' && brandLogo.url ? (
              <img
                src={brandLogo.url}
                alt="Preview logo"
                className={`size-11 object-cover ring-2 ring-vice-soft/30 ${shape}`}
              />
            ) : (
              <span
                className={`inline-flex size-11 items-center justify-center bg-gradient-to-br ${gradient} font-display text-sm font-extrabold text-vice-deep shadow-md ${shape}`}
              >
                {(text.trim() || 'VI').slice(0, 3).toUpperCase()}
              </span>
            )}
            <div>
              <div className="font-display text-base font-bold text-vice-text">
                LemonKeyS&apos; <span className="text-vice-peach">VI</span>
              </div>
              <div className="text-xs text-vice-muted">
                {isId ? 'Otomatis berubah di Navbar & Footer' : 'Updates in both Navbar & Footer'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onSave(DEFAULT_BRAND_LOGO);
              setText('VI');
              setShape('rounded-xl');
              setGradient(DEFAULT_BRAND_LOGO.gradient);
              onNotify(isId ? 'Logo dikembalikan ke default VI.' : 'Logo reset to default VI.');
            }}
            className="rounded-xl border border-vice-soft/20 px-3 py-2 text-xs font-semibold text-vice-sub hover:bg-white/10"
          >
            Reset
          </button>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-vice-sub">
            {isId ? 'Bentuk Bingkai Logo' : 'Logo Frame Shape'}
          </p>
          <div className="flex gap-2">
            {[
              { id: 'rounded-xl', label: isId ? 'Kotak Halus' : 'Rounded Square' },
              { id: 'rounded-full', label: isId ? 'Lingkaran' : 'Circle' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setShape(item.id);
                  if (brandLogo.type === 'image') {
                    onSave({ ...brandLogo, shape: item.id });
                  }
                }}
                className={`min-h-10 flex-1 rounded-xl border text-xs font-semibold transition ${
                  shape === item.id
                    ? 'border-vice-peach bg-vice-peach/15 text-vice-peach'
                    : 'border-vice-soft/15 bg-vice-deep/50 text-vice-sub hover:text-vice-text'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-vice-soft/15 bg-vice-deep/60 p-4">
          <p className="mb-1 text-sm font-semibold text-vice-text">
            {isId ? 'Upload Gambar Logo Sendiri (PNG/JPG)' : 'Upload Custom Logo Image (PNG/JPG)'}
          </p>
          <p className="mb-3 text-xs text-vice-muted">
            {isId
              ? "Otomatis dipotong persegi (1:1) agar tampil rapi di sebelah tulisan LemonKeyS' VI."
              : "Auto-cropped to 1:1 square so it stays crisp beside LemonKeyS' VI."}
          </p>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-vice-lavender/40 bg-vice-lavender/15 px-4 text-sm font-semibold text-vice-text transition hover:bg-vice-lavender/25">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>
              {uploading
                ? isId
                  ? 'Memproses...'
                  : 'Processing...'
                : isId
                ? 'Pilih Logo dari Galeri'
                : 'Choose Logo Image'}
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={handleUploadLogo} disabled={uploading} />
          </label>
        </div>

        <form onSubmit={applyLogoUrl} className="space-y-2">
          <label htmlFor="logoUrl" className="block text-sm font-semibold text-vice-text">
            {isId ? 'Atau Tempel URL Gambar Logo' : 'Or Paste Logo Image URL'}
          </label>
          <div className="flex gap-2">
            <input
              id="logoUrl"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/logo-lemonkeys.png"
              className="min-h-11 flex-1 rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
            />
            <button type="submit" className="min-h-11 rounded-xl bg-vice-lavender/25 px-4 text-sm font-semibold text-vice-text hover:bg-vice-lavender/35">
              {isId ? 'Pakai' : 'Apply'}
            </button>
          </div>
        </form>

        <div className="space-y-3 rounded-2xl border border-vice-soft/15 bg-vice-deep/60 p-4">
          <p className="text-sm font-semibold text-vice-text">
            {isId ? 'Atau Kustomisasi Monogram Teks (1–3 Huruf)' : 'Or Customize Text Monogram (1–3 Chars)'}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="VI / LK"
              className="min-h-11 w-28 rounded-xl border border-vice-soft/20 bg-vice-deep px-3 text-center font-display text-sm font-bold uppercase text-vice-text focus:border-vice-lavender focus:outline-none"
            />
            <div className="flex flex-1 flex-wrap gap-2">
              {LOGO_GRADIENTS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGradient(g.value)}
                  title={g.label}
                  className={`size-10 rounded-xl bg-gradient-to-br ${g.value} transition ${
                    gradient === g.value ? 'ring-2 ring-white ring-offset-2 ring-offset-vice-deep' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={applyMonogram}
            className="min-h-10 w-full rounded-xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach text-sm font-bold text-vice-deep transition hover:opacity-95"
          >
            {isId ? 'Simpan Logo Monogram' : 'Save Monogram Logo'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* 4. Modal Ganti Background Hero Vice City (Admin Only) */
export function HeroBgModal({ heroBg, lang, onSave, onClose, onNotify }) {
  const [urlInput, setUrlInput] = useState(heroBg.type === 'custom-url' ? heroBg.url : '');
  const [overlay, setOverlay] = useState(heroBg.overlay ?? 0.62);
  const [uploading, setUploading] = useState(false);
  const isId = lang === 'id';

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1280;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);

        onSave({
          id: 'custom-upload',
          type: 'image',
          url: compressed,
          overlay,
          name: file.name,
        });
        setUploading(false);
        onNotify(isId ? 'Latar belakang berhasil diganti dari galeri!' : 'Wallpaper updated from gallery!');
        onClose();
      };
      img.onerror = () => {
        setUploading(false);
        onNotify(isId ? 'Gagal membaca gambar, coba file JPG/PNG lain.' : 'Could not read image file.');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const applyCustomUrl = (e) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onSave({
      id: 'custom-url',
      type: 'custom-url',
      url: trimmed,
      overlay,
      name: 'Custom URL',
    });
    onNotify(isId ? 'Latar belakang URL berhasil diterapkan!' : 'Custom URL wallpaper applied!');
    onClose();
  };

  return (
    <ModalShell
      title={isId ? 'Ganti Latar Selamat Datang' : 'Change Hero Wallpaper'}
      kicker={isId ? 'ADMIN STUDIO • LATAR VICE CITY' : 'ADMIN STUDIO • VICE CITY SCENERY'}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2.5 text-sm font-medium text-vice-sub">
            {isId ? 'Pilih Preset Pemandangan Vice City' : 'Choose a Vice City Preset'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {HERO_PRESETS.map((preset) => {
              const active = heroBg.id === preset.id;
              const presetTitle = getLocalizedField(preset, 'name', lang);
              const presetDesc = getLocalizedField(preset, 'desc', lang);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onSave({ ...preset, overlay });
                    onNotify(isId ? `Latar diganti ke "${presetTitle}"` : `Wallpaper set to "${presetTitle}"`);
                  }}
                  className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition ${
                    active
                      ? 'border-vice-peach ring-2 ring-vice-peach/40'
                      : 'border-vice-soft/15 hover:border-vice-soft/40'
                  }`}
                >
                  <div
                    className="mb-2 h-20 w-full rounded-xl bg-cover bg-center transition duration-300 group-hover:scale-105"
                    style={
                      preset.type === 'gradient'
                        ? { background: preset.background }
                        : { backgroundImage: `url(${preset.url})` }
                    }
                  />
                  <div className="text-sm font-semibold text-vice-text">{presetTitle}</div>
                  <div className="line-clamp-1 text-xs text-vice-muted">{presetDesc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-vice-soft/15 bg-vice-deep/60 p-4">
          <label className="mb-2 block text-sm font-semibold text-vice-text">
            {isId ? 'Upload Gambar Sendiri (Dari Galeri HP / PC)' : 'Upload Own Wallpaper (Phone / PC)'}
          </label>
          <p className="mb-3 text-xs text-vice-muted">
            {isId
              ? 'Otomatis dikompres agar ringan dan tetap tersimpan di browser.'
              : 'Auto-compressed so it loads fast and persists in your browser.'}
          </p>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-vice-lavender/40 bg-vice-lavender/15 px-4 py-2.5 text-sm font-semibold text-vice-text transition hover:bg-vice-lavender/25">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>
              {uploading
                ? isId
                  ? 'Memproses gambar...'
                  : 'Processing...'
                : isId
                ? 'Pilih Foto Vice City'
                : 'Pick Vice City Photo'}
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>

        <form onSubmit={applyCustomUrl} className="space-y-2.5">
          <label htmlFor="bgUrlInput" className="block text-sm font-semibold text-vice-text">
            {isId ? 'Atau Tempel Link Gambar (URL)' : 'Or Paste Image URL'}
          </label>
          <div className="flex gap-2">
            <input
              id="bgUrlInput"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/vice-city-sunset.jpg"
              className="min-h-11 flex-1 rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-11 shrink-0 rounded-xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-4 text-sm font-bold text-vice-deep transition hover:opacity-95"
            >
              {isId ? 'Pakai' : 'Apply'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-vice-soft/15 bg-vice-deep/50 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <label htmlFor="overlayRange" className="font-semibold text-vice-text">
              {isId ? 'Nuansa Ungu Gelap Overlay' : 'Calm Twilight Purple Overlay'}
            </label>
            <span className="font-mono text-xs text-vice-peach">{Math.round(overlay * 100)}%</span>
          </div>
          <input
            id="overlayRange"
            type="range"
            min="0.25"
            max="0.88"
            step="0.03"
            value={overlay}
            onChange={(e) => {
              const val = Number(e.target.value);
              setOverlay(val);
              onSave({ ...heroBg, overlay: val });
            }}
            className="w-full accent-vice-lavender"
          />
        </div>
      </div>
    </ModalShell>
  );
}

/* 5. Modal Tambah / Lengkapi Cheat Komunitas */
export function AddCheatModal({ editingCheat, lang, onSubmit, onClose }) {
  const isId = lang === 'id';
  const [name, setName] = useState(
    editingCheat ? getLocalizedField(editingCheat, 'name', lang) : ''
  );
  const [category, setCategory] = useState(editingCheat?.category || 'umum');
  const [requirement, setRequirement] = useState(
    editingCheat ? getLocalizedField(editingCheat, 'requirement', lang) : ''
  );
  const [comingSoon, setComingSoon] = useState(editingCheat ? !editingCheat.code : false);
  const [codeText, setCodeText] = useState(editingCheat?.code ? editingCheat.code.join(', ') : '');
  const [author, setAuthor] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');

  const appendDirection = (dir) => {
    setComingSoon(false);
    setCodeText((prev) => (prev.trim() ? `${prev.trim().replace(/,\s*$/, '')}, ${dir}` : dir));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !requirement.trim()) {
      setError(
        isId
          ? 'Nama cheat dan syarat membuka cheat wajib diisi.'
          : 'Cheat name and unlock requirement are required.'
      );
      return;
    }

    const parsedCode = comingSoon
      ? null
      : codeText
          .split(/[\s,→>-]+/)
          .map((token) => token.trim().toUpperCase())
          .filter(Boolean);

    if (!comingSoon && parsedCode.length === 0) {
      setError(
        isId
          ? 'Masukkan kombinasi kode cheat atau centang status Coming Soon.'
          : 'Enter a button sequence or check Coming Soon.'
      );
      return;
    }

    const trimmedName = name.trim();
    const trimmedReq = requirement.trim();
    const nextAuthor = author.trim() || 'Player Global';

    onSubmit({
      ...(editingCheat || {}),
      id: editingCheat?.id || `comm-cheat-${Date.now()}`,
      name: isId ? trimmedName : editingCheat?.name || trimmedName,
      nameEn: !isId ? trimmedName : editingCheat?.nameEn || trimmedName,
      category,
      requirement: isId ? trimmedReq : editingCheat?.requirement || trimmedReq,
      requirementEn: !isId ? trimmedReq : editingCheat?.requirementEn || trimmedReq,
      code: parsedCode,
      author: nextAuthor,
      authorEn: nextAuthor,
      region: region.trim() || 'Worldwide',
      isCommunity: editingCheat ? editingCheat.isCommunity : true,
      updatedByCommunity: Boolean(editingCheat),
    });
    onClose();
  };

  return (
    <ModalShell
      title={
        editingCheat
          ? isId
            ? 'Lengkapi Kode Cheat'
            : 'Complete Cheat Sequence'
          : isId
          ? 'Tambah Cheat GTA 6 Baru'
          : 'Submit New GTA 6 Cheat'
      }
      kicker={isId ? 'KONTRIBUSI KOMUNITAS GLOBAL' : 'GLOBAL COMMUNITY CONTRIBUTION'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-vice-rose/40 bg-vice-rose/15 px-3.5 py-2.5 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="cheatName" className="mb-1.5 block text-sm font-semibold text-vice-text">
            {isId ? 'Nama Cheat' : 'Cheat Name'} <span className="text-vice-rose">*</span>
          </label>
          <input
            id="cheatName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isId ? 'Contoh: Spawn Helikopter VCPD' : 'Example: Spawn VCPD Helicopter'}
            className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="cheatCat" className="mb-1.5 block text-sm font-semibold text-vice-text">
              {isId ? 'Kategori' : 'Category'}
            </label>
            <select
              id="cheatCat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep px-3.5 text-sm text-vice-text focus:border-vice-lavender focus:outline-none"
            >
              <option value="umum">{isId ? 'Pemain & Umum' : 'Player & General'}</option>
              <option value="senjata">{isId ? 'Cheat Senjata' : 'Weapons'}</option>
              <option value="kendaraan">{isId ? 'Cheat Kendaraan' : 'Vehicles'}</option>
            </select>
          </div>
          <div>
            <label htmlFor="cheatAuthor" className="mb-1.5 block text-sm font-semibold text-vice-text">
              {isId ? 'Nama & Negara Kontributor' : 'Contributor & Country'}
            </label>
            <div className="flex gap-2">
              <input
                id="cheatAuthor"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={isId ? 'Nama' : 'Name'}
                className="min-h-11 w-1/2 rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
              />
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder={isId ? 'Negara' : 'Country'}
                aria-label="Country"
                className="min-h-11 w-1/2 rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="cheatReq" className="mb-1.5 block text-sm font-semibold text-vice-text">
            {isId ? 'Syarat Membuka Cheat' : 'Unlock Requirement'} <span className="text-vice-rose">*</span>
          </label>
          <textarea
            id="cheatReq"
            rows={2}
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder={
              isId
                ? 'Contoh: Selesaikan Main Story atau Menangkan 25x Shooting Ranges'
                : 'Example: Complete Main Story or Win 25x Shooting Ranges'
            }
            className="w-full rounded-xl border border-vice-soft/20 bg-vice-deep/80 p-3 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
          />
        </div>

        <div className="rounded-2xl border border-vice-soft/15 bg-vice-deep/60 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="cheatCode" className="text-sm font-semibold text-vice-text">
              {isId ? 'Kombinasi Kode Cheat' : 'Cheat Code Sequence'}
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-vice-sub">
              <input
                type="checkbox"
                checked={comingSoon}
                onChange={(e) => setComingSoon(e.target.checked)}
                className="size-4 rounded accent-vice-lavender"
              />
              <span>{isId ? 'Tandai Coming Soon' : 'Mark as Coming Soon'}</span>
            </label>
          </div>

          {!comingSoon && (
            <>
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {DIRECTIONS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => appendDirection(d.key)}
                    className="min-h-9 rounded-lg border border-vice-soft/25 bg-vice-lavender/15 px-3 font-mono text-xs font-semibold text-vice-text transition hover:bg-vice-lavender/30 active:scale-95"
                  >
                    {d.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCodeText('')}
                  className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-vice-muted hover:text-vice-text"
                >
                  {isId ? 'Bersihkan' : 'Clear'}
                </button>
              </div>
              <input
                id="cheatCode"
                type="text"
                value={codeText}
                onChange={(e) => setCodeText(e.target.value)}
                placeholder="UP, RIGHT, DOWN, LEFT..."
                className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep px-3.5 font-mono text-xs text-vice-peach placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
              />
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-vice-soft/20 px-4 text-sm font-semibold text-vice-sub hover:bg-white/5">
            {isId ? 'Batal' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-5 text-sm font-bold text-vice-deep shadow-lg transition hover:opacity-95 active:scale-95"
          >
            {editingCheat
              ? isId
                ? 'Simpan Pembaruan'
                : 'Save Update'
              : isId
              ? 'Publikasikan Cheat'
              : 'Publish Cheat'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* 6. Modal Tambah Misteri / Easter Egg Komunitas */
export function AddMysteryModal({ lang, onSubmit, onClose }) {
  const [type, setType] = useState('misteri');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [coord, setCoord] = useState('');
  const [level, setLevel] = useState(4);
  const [story, setStory] = useState('');
  const [cluesText, setCluesText] = useState('');
  const [author, setAuthor] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');
  const isId = lang === 'id';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !story.trim()) {
      setError(
        isId
          ? 'Judul, lokasi, dan penjelasan misteri/easter egg wajib diisi.'
          : 'Title, location, and story are required.'
      );
      return;
    }

    const clues = cluesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const fallbackClue = isId
      ? 'Kunjungi lokasi yang disebut dan amati sekitar saat senja/malam.'
      : 'Visit the location at dusk or night and inspect the area carefully.';

    const trimmedTitle = title.trim();
    const trimmedLoc = location.trim();
    const trimmedCoord = coord.trim() || (isId ? 'Laporan Lapangan Komunitas' : 'Community Field Report');
    const trimmedStory = story.trim();
    const excerpt = trimmedStory.length > 130 ? `${trimmedStory.slice(0, 127)}...` : trimmedStory;
    const finalClues = clues.length > 0 ? clues : [fallbackClue];

    onSubmit({
      id: `comm-mys-${Date.now()}`,
      type,
      level: Number(level),
      title: trimmedTitle,
      titleEn: trimmedTitle,
      location: trimmedLoc,
      locationEn: trimmedLoc,
      coord: trimmedCoord,
      coordEn: trimmedCoord,
      excerpt,
      excerptEn: excerpt,
      story: trimmedStory,
      storyEn: trimmedStory,
      clues: finalClues,
      cluesEn: finalClues,
      author: author.trim() || 'Explorer VI',
      region: region.trim() || 'Worldwide',
      votes: 1,
      isCommunity: true,
    });
    onClose();
  };

  return (
    <ModalShell
      title={isId ? 'Bagikan Easter Egg atau Misteri' : 'Share an Easter Egg or Mystery'}
      kicker={isId ? 'ARSIP KOMUNITAS DUNIA' : 'GLOBAL COMMUNITY ARCHIVE'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-vice-rose/40 bg-vice-rose/15 px-3.5 py-2.5 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="mysType" className="mb-1.5 block text-sm font-semibold text-vice-text">
              {isId ? 'Jenis Berkas' : 'Entry Type'}
            </label>
            <select
              id="mysType"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep px-3.5 text-sm text-vice-text focus:border-vice-lavender focus:outline-none"
            >
              <option value="easter-egg">Easter Egg</option>
              <option value="misteri">{isId ? 'Misteri & Urban Legend' : 'Mystery & Legend'}</option>
            </select>
          </div>

          <div>
            <label htmlFor="mysLevel" className="mb-1.5 block text-sm font-semibold text-vice-text">
              {isId ? 'Tingkat Misteri (1–5)' : 'Mystery Level (1–5)'}
            </label>
            <select
              id="mysLevel"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep px-3.5 text-sm text-vice-text focus:border-vice-lavender focus:outline-none"
            >
              <option value={1}>Level 1</option>
              <option value={2}>Level 2</option>
              <option value={3}>Level 3</option>
              <option value={4}>Level 4</option>
              <option value={5}>Level 5</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="mysTitle" className="mb-1.5 block text-sm font-semibold text-vice-text">
            {isId ? 'Judul Temuan' : 'Discovery Title'} <span className="text-vice-rose">*</span>
          </label>
          <input
            id="mysTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isId ? 'Contoh: Kapal Hantu di Dermaga Leonida Keys' : 'Example: Ghost Ship at Leonida Keys Pier'}
            className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="mysLoc" className="mb-1.5 block text-sm font-semibold text-vice-text">
              {isId ? 'Lokasi Distrik' : 'District Location'} <span className="text-vice-rose">*</span>
            </label>
            <input
              id="mysLoc"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Grassrivers / Vice Beach"
              className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="mysCoord" className="mb-1.5 block text-sm font-semibold text-vice-text">
              {isId ? 'Koordinat / Jam Muncul' : 'Sector / Time Window'}
            </label>
            <input
              id="mysCoord"
              type="text"
              value={coord}
              onChange={(e) => setCoord(e.target.value)}
              placeholder="GR-08 • 03:00 AM"
              className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="mysStory" className="mb-1.5 block text-sm font-semibold text-vice-text">
            {isId ? 'Cerita / Penjelasan Lengkap' : 'Full Story / Details'} <span className="text-vice-rose">*</span>
          </label>
          <textarea
            id="mysStory"
            rows={3}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder={isId ? 'Ceritakan apa yang kamu temukan...' : 'Describe what you discovered in-game...'}
            className="w-full rounded-xl border border-vice-soft/20 bg-vice-deep/80 p-3 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="mysClues" className="mb-1.5 block text-sm font-semibold text-vice-text">
            {isId ? 'Petunjuk Cara Menemukan (1 langkah per baris)' : 'How to Find It (1 clue per line)'}
          </label>
          <textarea
            id="mysClues"
            rows={3}
            value={cluesText}
            onChange={(e) => setCluesText(e.target.value)}
            className="w-full rounded-xl border border-vice-soft/20 bg-vice-deep/80 p-3 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={isId ? 'Nama kamu' : 'Your name'}
            className="min-h-11 rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
          />
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder={isId ? 'Negara' : 'Country'}
            className="min-h-11 rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-vice-soft/20 px-4 text-sm font-semibold text-vice-sub hover:bg-white/5">
            {isId ? 'Batal' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-5 text-sm font-bold text-vice-deep shadow-lg transition hover:opacity-95 active:scale-95"
          >
            {isId ? 'Kirim ke Arsip' : 'Submit Entry'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* 7. Modal Detail Misteri */
export function MysteryDetailModal({ mystery, lang, onClose, onCopyCoord, onVote, onDelete }) {
  if (!mystery) return null;
  const isId = lang === 'id';
  const title = getLocalizedField(mystery, 'title', lang);
  const location = getLocalizedField(mystery, 'location', lang);
  const coord = getLocalizedField(mystery, 'coord', lang);
  const story = getLocalizedField(mystery, 'story', lang);
  const clues =
    lang === 'en' && Array.isArray(mystery.cluesEn) && mystery.cluesEn.length > 0
      ? mystery.cluesEn
      : mystery.clues || [];

  return (
    <ModalShell
      title={title}
      kicker={mystery.type === 'easter-egg' ? 'EASTER EGG' : isId ? 'MISTERI & URBAN LEGEND' : 'MYSTERY & LEGEND'}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-vice-peach">
          <span>{location}</span>
          <span>&bull;</span>
          <span>Level {mystery.level}/5</span>
          <span>&bull;</span>
          <span className="text-vice-soft">
            {isId ? 'Oleh' : 'By'} {mystery.author} ({mystery.region})
          </span>
        </div>

        <p className="text-sm leading-relaxed text-vice-sub">{story}</p>

        <div className="rounded-2xl border border-vice-soft/15 bg-vice-deep/70 p-4">
          <h4 className="mb-2.5 font-display text-sm font-bold text-vice-soft">
            {isId ? 'Petunjuk & Cara Menemukan' : 'Clues & How to Find'}
          </h4>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-vice-sub">
            {clues.map((clue, idx) => (
              <li key={idx}>{clue}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-vice-soft/15 pt-4">
          <span className="font-mono text-xs text-vice-muted">{coord}</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onVote(mystery.id)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-vice-rose/35 bg-vice-rose/15 px-3.5 text-xs font-semibold text-vice-text transition hover:bg-vice-rose/25 active:scale-95"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              <span>{isId ? 'Valid' : 'Verified'} ({mystery.votes})</span>
            </button>
            <button
              type="button"
              onClick={() => onCopyCoord(`${location} (${coord})`)}
              className="min-h-10 rounded-xl border border-vice-soft/25 bg-vice-lavender/15 px-3.5 text-xs font-semibold text-vice-text transition hover:bg-vice-lavender/25"
            >
              {isId ? 'Salin Lokasi' : 'Copy Location'}
            </button>
            {mystery.isCommunity && (
              <button
                type="button"
                onClick={() => {
                  onDelete(mystery.id);
                  onClose();
                }}
                className="min-h-10 rounded-xl border border-red-400/30 bg-red-500/10 px-3 text-xs font-semibold text-red-200 hover:bg-red-500/20"
              >
                {isId ? 'Hapus' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
