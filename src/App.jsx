import { useState, useEffect, useMemo, useRef } from 'react';
import {
  HERO_PRESETS,
  INITIAL_CHEATS,
  INITIAL_MYSTERIES,
  getLocalizedField,
  hydrateCheats,
  hydrateMysteries,
} from './data/initialData';
import {
  SITE_CONTACT,
  DEFAULT_ADMIN_PIN,
  DEFAULT_BRAND_LOGO,
  TRANSLATIONS,
  LEONIDA_FACTS_I18N,
} from './data/translations';
import {
  BrandLogoModal,
  HeroBgModal,
  AddCheatModal,
  AddMysteryModal,
  MysteryDetailModal,
} from './components/CommunityModals';
import { AdminLoginModal, ChangePinModal } from './components/AdminAuthModals';
import LeonidaMapCard from './components/LeonidaMapCard';
import MusicPlayerBanner from './components/MusicPlayerBanner';
import { syncDocumentFavicon } from './lib/favicon';
import {
  isSupabaseReady,
  fetchCheatsRemote,
  upsertCheatRemote,
  deleteCheatAdminRemote,
  fetchMysteriesRemote,
  insertMysteryRemote,
  upvoteMysteryRemote,
  deleteMysteryAdminRemote,
  fetchSiteSettingsRemote,
  verifyAdminPinRemote,
  updateAdminPinRemote,
  saveSiteSettingRemote,
} from './lib/supabase';

const ARROW_SYMBOL = {
  UP: '↑',
  DOWN: '↓',
  LEFT: '←',
  RIGHT: '→',
};

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 550;
    const stepTime = 24;
    const steps = Math.max(1, Math.round(duration / stepTime));
    const inc = value / steps;
    const timer = setInterval(() => {
      start += inc;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

function BrandBadge({ logo, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'size-8 text-xs' : 'size-9 text-sm';
  const shape = logo?.shape || 'rounded-xl';

  if (logo?.type === 'image' && logo.url) {
    return (
      <img
        src={logo.url}
        alt="Logo LemonKeyS' VI"
        className={`${sizeClass} ${shape} object-cover ring-1 ring-vice-soft/35 shadow-md shadow-vice-lavender/20 transition duration-300 group-hover:scale-105`}
      />
    );
  }

  return (
    <span
      className={`inline-flex ${sizeClass} ${shape} items-center justify-center bg-gradient-to-br ${
        logo?.gradient || DEFAULT_BRAND_LOGO.gradient
      } font-display font-extrabold text-vice-deep shadow-md shadow-vice-lavender/25 transition duration-300 group-hover:scale-105`}
    >
      {logo?.text || 'VI'}
    </span>
  );
}

export default function App() {
  /* Core Persistent States */
  const [lang, setLang] = useState(() => readStorage('lkvi_lang', 'id'));
  const [heroBg, setHeroBg] = useState(() =>
    readStorage('lkvi_hero_bg', { ...HERO_PRESETS[0], overlay: 0.62 })
  );
  const [brandLogo, setBrandLogo] = useState(() =>
    readStorage('lkvi_brand_logo', DEFAULT_BRAND_LOGO)
  );
  const [localPin, setLocalPin] = useState(() =>
    readStorage('lkvi_admin_pin', DEFAULT_ADMIN_PIN)
  );
  const [adminSessionPin, setAdminSessionPin] = useState(
    () => sessionStorage.getItem('lkvi_admin_session_pin') || ''
  );
  const isAdmin = Boolean(adminSessionPin);

  const [cheats, setCheats] = useState(() => hydrateCheats(readStorage('lkvi_cheats_v2', null)));
  const [mysteries, setMysteries] = useState(() =>
    hydrateMysteries(readStorage('lkvi_mysteries_v2', null))
  );
  const [favorites, setFavorites] = useState(() => readStorage('lkvi_favs_v2', []));
  const [cloudSynced, setCloudSynced] = useState(false);

  /* Interactive & Motion States */
  const [scrollProgress, setScrollProgress] = useState(0);
  const [heroParallax, setHeroParallax] = useState(0);
  const [showBackTop, setShowBackTop] = useState(false);

  /* Filter & UI States */
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [codeStatus, setCodeStatus] = useState('all');
  const [favOnly, setFavOnly] = useState(false);
  const [mysteryFilter, setMysteryFilter] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* Feedback Form States */
  const [fbName, setFbName] = useState('');
  const [fbTopicIndex, setFbTopicIndex] = useState(0);
  const [fbMessage, setFbMessage] = useState('');

  /* Modal States */
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showAddCheat, setShowAddCheat] = useState(false);
  const [editingCheat, setEditingCheat] = useState(null);
  const [showAddMystery, setShowAddMystery] = useState(false);
  const [activeMysteryId, setActiveMysteryId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState('');

  const logoTapRef = useRef({ count: 0, timer: null });

  const t = TRANSLATIONS[lang] || TRANSLATIONS.id;
  const leonidaFacts = LEONIDA_FACTS_I18N[lang] || LEONIDA_FACTS_I18N.id;

  const categoryLabels = useMemo(
    () => ({
      all: t.catAll,
      umum: t.catUmum,
      senjata: t.catSenjata,
      kendaraan: t.catKendaraan,
    }),
    [t]
  );

  /* Load Global Cloud Data from Supabase on Startup */
  useEffect(() => {
    if (!isSupabaseReady) return;
    let active = true;

    (async () => {
      try {
        const [remoteCheats, remoteMysteries, settings] = await Promise.all([
          fetchCheatsRemote(INITIAL_CHEATS),
          fetchMysteriesRemote(INITIAL_MYSTERIES),
          fetchSiteSettingsRemote(),
        ]);

        if (!active) return;
        if (remoteCheats) setCheats(hydrateCheats(remoteCheats));
        if (remoteMysteries) setMysteries(hydrateMysteries(remoteMysteries));
        if (settings?.hero_bg) setHeroBg(settings.hero_bg);
        if (settings?.brand_logo) setBrandLogo(settings.brand_logo);
        setCloudSynced(true);
      } catch (err) {
        console.error('Supabase sync failed, using local cache:', err);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  /* Sync Browser Tab Favicon with Active Brand Logo */
  useEffect(() => {
    syncDocumentFavicon(brandLogo);
  }, [brandLogo]);

  /* Sync Local Cache */
  useEffect(() => {
    localStorage.setItem('lkvi_lang', JSON.stringify(lang));
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem('lkvi_hero_bg', JSON.stringify(heroBg));
    } catch {
      // ignore quota error
    }
  }, [heroBg]);

  useEffect(() => {
    try {
      localStorage.setItem('lkvi_brand_logo', JSON.stringify(brandLogo));
    } catch {
      // ignore quota error
    }
  }, [brandLogo]);

  useEffect(() => {
    localStorage.setItem('lkvi_admin_pin', JSON.stringify(localPin));
  }, [localPin]);

  useEffect(() => {
    localStorage.setItem('lkvi_cheats_v2', JSON.stringify(cheats));
  }, [cheats]);

  useEffect(() => {
    localStorage.setItem('lkvi_mysteries_v2', JSON.stringify(mysteries));
  }, [mysteries]);

  useEffect(() => {
    localStorage.setItem('lkvi_favs_v2', JSON.stringify(favorites));
  }, [favorites]);

  /* Scroll Progress & Parallax */
  useEffect(() => {
    let rafId = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setScrollProgress(Math.min(100, (scrollTop / maxScroll) * 100));
        setHeroParallax(Math.min(48, scrollTop * 0.12));
        setShowBackTop(scrollTop > 380);
        rafId = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  /* Scroll Reveal Observer */
  useEffect(() => {
    const items = document.querySelectorAll('.reveal-item');
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            entry.target.style.transitionDelay = `${Math.min(i * 45, 220)}ms`;
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [lang]);

  const notify = (msg) => setToast(msg);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleCardPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  const handleSecretLogoTap = () => {
    logoTapRef.current.count += 1;
    clearTimeout(logoTapRef.current.timer);
    if (logoTapRef.current.count >= 5) {
      logoTapRef.current.count = 0;
      if (isAdmin) setShowLogoModal(true);
      else setShowAdminLogin(true);
      return;
    }
    logoTapRef.current.timer = setTimeout(() => {
      logoTapRef.current.count = 0;
    }, 1400);
  };

  /* Admin Auth & Global Branding Savers */
  const handleVerifyPin = async (enteredPin) => {
    if (isSupabaseReady) {
      const ok = await verifyAdminPinRemote(enteredPin);
      return Boolean(ok);
    }
    return enteredPin === localPin;
  };

  const handleAdminUnlock = (verifiedPin) => {
    setAdminSessionPin(verifiedPin);
    sessionStorage.setItem('lkvi_admin_session_pin', verifiedPin);
    notify(t.toastAdminOn);
  };

  const handleAdminLogout = () => {
    setAdminSessionPin('');
    sessionStorage.removeItem('lkvi_admin_session_pin');
    notify(t.toastAdminOff);
  };

  const handleUpdatePin = async (oldPin, newPin) => {
    if (isSupabaseReady) {
      const ok = await updateAdminPinRemote(oldPin, newPin);
      if (ok) {
        setAdminSessionPin(newPin);
        sessionStorage.setItem('lkvi_admin_session_pin', newPin);
      }
      return Boolean(ok);
    }
    if (oldPin !== localPin) return false;
    setLocalPin(newPin);
    setAdminSessionPin(newPin);
    sessionStorage.setItem('lkvi_admin_session_pin', newPin);
    return true;
  };

  const handleSaveHeroBg = async (nextBg) => {
    setHeroBg(nextBg);
    if (isSupabaseReady && adminSessionPin) {
      try {
        await saveSiteSettingRemote(adminSessionPin, 'hero_bg', nextBg);
      } catch {
        notify(lang === 'id' ? 'Gagal sinkron latar ke server.' : 'Failed to sync wallpaper to server.');
      }
    }
  };

  const handleSaveBrandLogo = async (nextLogo) => {
    setBrandLogo(nextLogo);
    syncDocumentFavicon(nextLogo);
    if (isSupabaseReady && adminSessionPin) {
      try {
        await saveSiteSettingRemote(adminSessionPin, 'brand_logo', nextLogo);
      } catch {
        notify(lang === 'id' ? 'Gagal sinkron logo ke server.' : 'Failed to sync logo to server.');
      }
    }
  };

  const toggleLanguage = (nextLang) => {
    if (nextLang === lang) return;
    setLang(nextLang);
    notify(TRANSLATIONS[nextLang].toastLangSwitched);
  };

  const copyToClipboard = async (text, feedback, idForBtn = null) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.className = 'fixed opacity-0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      if (idForBtn) {
        setCopiedId(idForBtn);
        setTimeout(() => setCopiedId(null), 1500);
      }
      notify(feedback);
    } catch {
      notify(lang === 'id' ? 'Gagal menyalin otomatis.' : 'Could not copy automatically.');
    }
  };

  const toggleFav = (id) => {
    setFavorites((prev) => {
      const exists = prev.includes(id);
      notify(
        exists
          ? lang === 'id'
            ? 'Dihapus dari favorit'
            : 'Removed from saved'
          : lang === 'id'
          ? 'Disimpan ke favorit'
          : 'Saved to favorites'
      );
      return exists ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  /* Community Data Actions (Synced Globally to Supabase) */
  const handleSaveCheat = async (newCheat) => {
    const label = getLocalizedField(newCheat, 'name', lang);
    setCheats((prev) => {
      const exists = prev.some((c) => c.id === newCheat.id);
      return exists ? prev.map((c) => (c.id === newCheat.id ? newCheat : c)) : [newCheat, ...prev];
    });

    try {
      await upsertCheatRemote(newCheat);
      notify(
        lang === 'id'
          ? `"${label}" tersimpan untuk komunitas global!`
          : `"${label}" published to the global archive!`
      );
    } catch {
      notify(lang === 'id' ? 'Tersimpan lokal (gagal kirim ke server).' : 'Saved locally (server sync failed).');
    }
  };

  const handleDeleteCheat = async (id) => {
    if (isSupabaseReady && !isAdmin) return;
    try {
      if (isSupabaseReady) {
        const ok = await deleteCheatAdminRemote(adminSessionPin, id);
        if (!ok) {
          notify(lang === 'id' ? 'Akses admin ditolak.' : 'Admin authorization failed.');
          return;
        }
      }
      setCheats((prev) => prev.filter((c) => c.id !== id));
      setFavorites((prev) => prev.filter((f) => f !== id));
      notify(lang === 'id' ? 'Cheat dihapus dari database.' : 'Cheat removed from database.');
    } catch {
      notify(lang === 'id' ? 'Gagal menghapus cheat di server.' : 'Failed to delete cheat on server.');
    }
  };

  const handleAddMystery = async (newItem) => {
    const title = getLocalizedField(newItem, 'title', lang);
    setMysteries((prev) => [newItem, ...prev]);
    try {
      await insertMysteryRemote(newItem);
      notify(
        lang === 'id'
          ? `Berkas "${title}" dipublikasikan secara global!`
          : `Entry "${title}" published globally!`
      );
    } catch {
      notify(lang === 'id' ? 'Tersimpan lokal (gagal kirim ke server).' : 'Saved locally (server sync failed).');
    }
  };

  const handleVoteMystery = async (id) => {
    setMysteries((prev) => prev.map((m) => (m.id === id ? { ...m, votes: m.votes + 1 } : m)));
    try {
      const updatedVotes = await upvoteMysteryRemote(id);
      if (typeof updatedVotes === 'number' && updatedVotes > 0) {
        setMysteries((prev) => prev.map((m) => (m.id === id ? { ...m, votes: updatedVotes } : m)));
      }
      notify(lang === 'id' ? 'Konfirmasi komunitas dicatat!' : 'Community verification recorded!');
    } catch {
      notify(lang === 'id' ? 'Konfirmasi dicatat secara lokal.' : 'Recorded locally.');
    }
  };

  const handleDeleteMystery = async (id) => {
    if (isSupabaseReady && !isAdmin) return;
    try {
      if (isSupabaseReady) {
        const ok = await deleteMysteryAdminRemote(adminSessionPin, id);
        if (!ok) {
          notify(lang === 'id' ? 'Akses admin ditolak.' : 'Admin authorization failed.');
          return;
        }
      }
      setMysteries((prev) => prev.filter((m) => m.id !== id));
      notify(lang === 'id' ? 'Berkas dihapus dari database.' : 'Entry removed from database.');
    } catch {
      notify(lang === 'id' ? 'Gagal menghapus berkas di server.' : 'Failed to delete entry on server.');
    }
  };

  /* Direct Feedback Handlers */
  const sendFeedbackViaWhatsApp = () => {
    if (!fbMessage.trim()) {
      notify(t.toastNeedFeedbackMsg);
      return;
    }
    const topic = t.fbTopics[fbTopicIndex] || t.fbTopics[0];
    const sender = fbName.trim() || 'GTA 6 Player';
    const text =
      lang === 'id'
        ? `Halo Admin LemonKeyS' VI!\nNama: ${sender}\nTopik: ${topic}\nMasukan: ${fbMessage.trim()}`
        : `Hello LemonKeyS' VI Admin!\nName: ${sender}\nTopic: ${topic}\nFeedback: ${fbMessage.trim()}`;
    window.open(
      `https://wa.me/${SITE_CONTACT.whatsappRaw}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const sendFeedbackViaEmail = () => {
    if (!fbMessage.trim()) {
      notify(t.toastNeedFeedbackMsg);
      return;
    }
    const topic = t.fbTopics[fbTopicIndex] || t.fbTopics[0];
    const sender = fbName.trim() || 'GTA 6 Player';
    const subject = `[LemonKeyS' VI Feedback] ${topic} - ${sender}`;
    const body =
      lang === 'id'
        ? `Halo Admin LemonKeyS' VI,\n\nNama: ${sender}\nTopik: ${topic}\n\nMasukan:\n${fbMessage.trim()}`
        : `Hello LemonKeyS' VI Admin,\n\nName: ${sender}\nTopic: ${topic}\n\nMessage:\n${fbMessage.trim()}`;
    window.location.href = `mailto:${SITE_CONTACT.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  const filteredCheats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cheats.filter((c) => {
      const matchCat = category === 'all' || c.category === category;
      const matchFav = !favOnly || favorites.includes(c.id);
      const hasCode = Array.isArray(c.code) && c.code.length > 0;
      const matchStatus = codeStatus === 'all' || (codeStatus === 'ready' ? hasCode : !hasCode);
      const codeStr = hasCode ? c.code.join(' ').toLowerCase() : 'coming soon';
      const searchable = [
        c.name,
        c.nameEn,
        c.requirement,
        c.requirementEn,
        c.author,
        c.authorEn,
        codeStr,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchSearch = !q || searchable.includes(q);
      return matchCat && matchFav && matchStatus && matchSearch;
    });
  }, [cheats, category, favOnly, favorites, codeStatus, search]);

  const filteredMysteries = useMemo(() => {
    return mysteries.filter((m) => {
      if (mysteryFilter === 'all') return true;
      if (mysteryFilter === 'community') return m.isCommunity;
      return m.type === mysteryFilter;
    });
  }, [mysteries, mysteryFilter]);

  const readyCheatsCount = useMemo(
    () => cheats.filter((c) => Array.isArray(c.code) && c.code.length > 0).length,
    [cheats]
  );

  const activeMystery = useMemo(
    () => mysteries.find((m) => m.id === activeMysteryId) || null,
    [mysteries, activeMysteryId]
  );

  const isCustomImageHero = heroBg.type === 'image' || heroBg.type === 'custom-url';

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-vice-deep text-vice-text">
      <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent" aria-hidden="true">
        <div
          className="h-full bg-gradient-to-r from-vice-lavender via-vice-rose to-vice-peach transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <MusicPlayerBanner lang={lang} isAdmin={isAdmin} onNotify={notify} />

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="animate-drift absolute -left-24 -top-28 size-[440px] rounded-full bg-vice-lavender/20 blur-[100px]" />
        <div className="animate-drift absolute -right-28 top-1/4 size-[400px] rounded-full bg-vice-rose/20 blur-[100px]" />
        <div className="animate-drift absolute -bottom-28 left-1/3 size-[360px] rounded-full bg-vice-peach/15 blur-[100px]" />
      </div>

      <header id="top" className="sticky top-0 z-40 border-b border-vice-soft/15 bg-vice-deep/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <a
            href="#top"
            onClick={handleSecretLogoTap}
            className="group inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight"
          >
            <BrandBadge logo={brandLogo} />
            <span>
              LemonKeyS&apos;{' '}
              <span className="animate-shimmer bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach bg-clip-text text-transparent">
                VI
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            <a href="#cheats" className="rounded-full px-3.5 py-2 text-sm font-medium text-vice-sub transition hover:bg-vice-lavender/15 hover:text-vice-text">
              {t.navCheats}
            </a>
            <a href="#seputar" className="rounded-full px-3.5 py-2 text-sm font-medium text-vice-sub transition hover:bg-vice-lavender/15 hover:text-vice-text">
              {t.navAbout}
            </a>
            <a href="#misteri" className="rounded-full px-3.5 py-2 text-sm font-medium text-vice-sub transition hover:bg-vice-lavender/15 hover:text-vice-text">
              {t.navMystery}
            </a>
            <a href="#feedback" className="rounded-full px-3.5 py-2 text-sm font-medium text-vice-sub transition hover:bg-vice-lavender/15 hover:text-vice-text">
              {t.navFeedback}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-vice-soft/20 bg-vice-card/80 p-0.5" role="group" aria-label="Language switcher">
              {['id', 'en'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleLanguage(code)}
                  aria-pressed={lang === code}
                  className={`min-h-9 rounded-full px-2.5 font-mono text-xs font-bold uppercase transition active:scale-95 ${
                    lang === code
                      ? 'bg-gradient-to-r from-vice-soft to-vice-rose text-vice-deep shadow-sm'
                      : 'text-vice-sub hover:text-vice-text'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setFavOnly((v) => !v);
                document.getElementById('cheats')?.scrollIntoView({ behavior: 'smooth' });
              }}
              aria-pressed={favOnly}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition active:scale-95 ${
                favOnly
                  ? 'border-vice-rose bg-vice-rose/20 text-rose-100'
                  : 'border-vice-soft/15 bg-vice-card/70 text-vice-text hover:border-vice-soft/35'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={favOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span className="hidden sm:inline">{t.favorites}</span>
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 font-mono text-xs">
                {favorites.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="inline-flex size-11 items-center justify-center rounded-xl border border-vice-soft/15 bg-vice-card/70 text-vice-text lg:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="animate-drawer border-t border-vice-peach/25 bg-[#231b3a]/95">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
              <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-vice-peach">
                <span className="size-2 animate-pulse rounded-full bg-vice-mint" />
                <span>{t.adminActive}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBgModal(true)}
                  className="min-h-9 rounded-xl border border-vice-soft/25 bg-vice-lavender/15 px-3 text-xs font-semibold text-vice-text transition hover:bg-vice-lavender/30 active:scale-95"
                >
                  {t.adminBgBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoModal(true)}
                  className="min-h-9 rounded-xl border border-vice-soft/25 bg-vice-rose/15 px-3 text-xs font-semibold text-vice-text transition hover:bg-vice-rose/30 active:scale-95"
                >
                  {t.adminLogoBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPinModal(true)}
                  className="min-h-9 rounded-xl border border-vice-soft/20 bg-white/5 px-3 text-xs font-semibold text-vice-sub transition hover:bg-white/10"
                >
                  {t.adminPinBtn}
                </button>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="min-h-9 rounded-xl border border-red-400/30 bg-red-500/10 px-3 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                >
                  {t.adminLogoutBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {mobileMenuOpen && (
          <div className="animate-drawer flex flex-col gap-1 border-t border-vice-soft/15 bg-vice-deep/95 px-4 py-3 lg:hidden">
            {[
              { href: '#cheats', label: t.navCheats },
              { href: '#seputar', label: t.navAbout },
              { href: '#misteri', label: t.navMystery },
              { href: '#feedback', label: t.navFeedback },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-3.5 text-sm font-medium text-vice-sub hover:bg-vice-lavender/15 hover:text-vice-text"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-vice-soft/15 py-16 md:py-24">
          <div
            className="absolute -inset-y-12 inset-x-0 bg-cover bg-center will-change-transform transition-[background-image] duration-500"
            style={{
              ...(isCustomImageHero
                ? { backgroundImage: `url(${heroBg.url})` }
                : { background: heroBg.background || HERO_PRESETS[0].background }),
              transform: `translate3d(0, ${heroParallax}px, 0) scale(1.04)`,
            }}
            aria-hidden="true"
          />

          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              background:
                'linear-gradient(180deg, rgba(21,18,33,0.72) 0%, rgba(36,24,58,0.68) 52%, rgba(21,18,33,0.98) 100%)',
              opacity: heroBg.overlay ?? 0.62,
            }}
            aria-hidden="true"
          />

          {!isCustomImageHero && (
            <svg
              className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-full opacity-80 md:h-60"
              viewBox="0 0 1440 280"
              preserveAspectRatio="xMidYMax slice"
              fill="none"
              aria-hidden="true"
            >
              <path d="M168 280C172 226 184 176 202 132" stroke="#201730" strokeWidth="12" strokeLinecap="round" />
              <path d="M202 132C168 106 122 108 86 128C122 122 162 124 202 132Z" fill="#201730" />
              <path d="M202 132C162 84 114 72 74 84C116 90 160 106 202 132Z" fill="#281D3D" />
              <path d="M202 132C242 96 292 94 330 116C290 110 248 114 202 132Z" fill="#201730" />
              <path d="M1248 280C1242 222 1228 168 1206 118" stroke="#201730" strokeWidth="13" strokeLinecap="round" />
              <path d="M1206 118C1246 92 1298 94 1338 118C1296 112 1252 112 1206 118Z" fill="#201730" />
              <path d="M1206 118C1242 74 1288 60 1330 70C1286 78 1246 92 1206 118Z" fill="#2A1F40" />
              <path d="M1206 118C1162 86 1110 88 1072 114C1114 106 1158 108 1206 118Z" fill="#201730" />
              <path d="M0 248Q360 226 720 244T1440 238V280H0V248Z" fill="#151221" />
            </svg>
          )}

          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal-item mb-6 inline-flex items-center gap-2.5 rounded-full border border-vice-soft/30 bg-vice-deep/75 px-3.5 py-1.5 text-xs font-semibold text-vice-soft backdrop-blur-md">
              <span className={`size-2 animate-pulse rounded-full ${cloudSynced ? 'bg-vice-mint' : 'bg-vice-peach'}`} />
              <span>{t.heroBadge}</span>
            </div>

            <div className="max-w-3xl">
              <h1 className="reveal-item max-w-2xl text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
                {t.heroWelcome}{' '}
                <span className="animate-shimmer bg-gradient-to-r from-[#dcd0ff] via-vice-rose to-vice-peach bg-clip-text text-transparent">
                  LemonKeyS&apos; VI
                </span>
              </h1>

              <p className="reveal-item mt-5 max-w-2xl text-base leading-relaxed text-vice-sub sm:text-lg">
                {t.heroDescStart}{' '}
                <strong className="font-semibold text-vice-text">{t.heroDescBold1}</strong>
                {t.heroDescMid}{' '}
                <strong className="font-semibold text-vice-text">{t.heroDescBold2}</strong>
                {t.heroDescMid2}{' '}
                <strong className="font-semibold text-vice-text">{t.heroDescBold3}</strong>.
              </p>

              <div className="reveal-item mt-7 flex flex-wrap gap-3">
                <a
                  href="#cheats"
                  className="animate-shimmer inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-6 py-3 text-sm font-bold text-vice-deep shadow-lg shadow-vice-lavender/25 transition hover:-translate-y-0.5 hover:shadow-vice-rose/30 active:scale-95"
                >
                  <span>{t.ctaExplore}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCheat(null);
                    setShowAddCheat(true);
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-vice-soft/30 bg-vice-deep/75 px-5 py-3 text-sm font-semibold text-vice-text backdrop-blur-md transition hover:-translate-y-0.5 hover:border-vice-peach/60 hover:bg-vice-elevated/90 active:scale-95"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>{t.ctaAddCheat}</span>
                </button>
              </div>

              <div className="reveal-item mt-9 grid max-w-2xl grid-cols-3 gap-3">
                <div onMouseMove={handleCardPointerMove} className="spotlight-card rounded-2xl border border-vice-soft/15 bg-vice-deep/75 p-3.5 backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-vice-soft/35">
                  <div className="font-display text-2xl font-bold tabular-nums text-vice-peach">
                    <AnimatedCounter value={cheats.length} />
                  </div>
                  <div className="mt-0.5 text-xs text-vice-sub">
                    {t.metricTotalCheat} ({readyCheatsCount} {t.metricActiveCode})
                  </div>
                </div>
                <div onMouseMove={handleCardPointerMove} className="spotlight-card rounded-2xl border border-vice-soft/15 bg-vice-deep/75 p-3.5 backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-vice-soft/35">
                  <div className="font-display text-2xl font-bold tabular-nums text-vice-peach">
                    <AnimatedCounter value={leonidaFacts.length} />
                  </div>
                  <div className="mt-0.5 text-xs text-vice-sub">{t.metricDistrict}</div>
                </div>
                <div onMouseMove={handleCardPointerMove} className="spotlight-card rounded-2xl border border-vice-soft/15 bg-vice-deep/75 p-3.5 backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-vice-soft/35">
                  <div className="font-display text-2xl font-bold tabular-nums text-vice-peach">
                    <AnimatedCounter value={mysteries.length} />
                  </div>
                  <div className="mt-0.5 text-xs text-vice-sub">{t.metricMystery}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Cheat GTA 6 */}
        <section id="cheats" className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal-item mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-vice-rose">
                  {t.cheatsKicker}
                </span>
                <h2 className="mt-1.5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  {t.cheatsTitle}
                </h2>
                <p className="mt-2 text-sm text-vice-sub sm:text-base">{t.cheatsDesc}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingCheat(null);
                  setShowAddCheat(true);
                }}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-5 text-sm font-bold text-vice-deep shadow-lg shadow-vice-lavender/20 transition hover:-translate-y-0.5 active:scale-95"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{t.addCheatBtn}</span>
              </button>
            </div>

            <div className="reveal-item mb-6 space-y-4 rounded-3xl border border-vice-soft/15 bg-vice-card/75 p-4 backdrop-blur-md sm:p-5">
              <div className="relative">
                <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-vice-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  aria-label={t.cheatsTitle}
                  className="min-h-12 w-full rounded-2xl border border-vice-soft/15 bg-vice-deep/80 pl-11 pr-4 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none sm:text-base"
                />
              </div>

              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Cheat category filter">
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      aria-pressed={category === key}
                      className={`min-h-10 rounded-full border px-4 text-xs font-semibold transition active:scale-95 sm:text-sm ${
                        category === key
                          ? 'border-vice-lavender bg-vice-lavender/25 text-vice-text shadow-sm'
                          : 'border-vice-soft/15 bg-vice-lavender/10 text-vice-sub hover:border-vice-soft/35 hover:text-vice-text'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="inline-flex rounded-xl border border-vice-soft/15 bg-vice-deep/65 p-1" role="group" aria-label="Code status filter">
                  {[
                    { key: 'all', label: t.statusAll },
                    { key: 'ready', label: t.statusReady },
                    { key: 'soon', label: t.statusSoon },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setCodeStatus(tab.key)}
                      aria-pressed={codeStatus === tab.key}
                      className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition active:scale-95 ${
                        codeStatus === tab.key
                          ? 'bg-gradient-to-r from-vice-soft to-vice-rose text-vice-deep'
                          : 'text-vice-sub hover:text-vice-text'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-vice-soft/10 pt-3 text-xs">
                <p className="font-semibold text-vice-soft" role="status" aria-live="polite">
                  {t.showingCheats(filteredCheats.length, cheats.length)} {favOnly ? t.favModeTag : ''}
                </p>
                <span className="text-vice-muted">{t.cheatTip}</span>
              </div>
            </div>

            {filteredCheats.length === 0 ? (
              <div className="animate-card-in flex flex-col items-center gap-3 rounded-3xl border border-vice-soft/15 bg-vice-card/70 px-6 py-12 text-center">
                <h3 className="font-display text-lg font-bold text-vice-text">{t.emptyTitle}</h3>
                <p className="max-w-md text-sm text-vice-sub">{t.emptyDesc}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCategory('all');
                    setCodeStatus('all');
                    setFavOnly(false);
                  }}
                  className="mt-1 min-h-11 rounded-full border border-vice-soft/30 bg-vice-elevated px-5 text-sm font-semibold text-vice-text hover:bg-vice-lavender/20"
                >
                  {t.resetFilter}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCheats.map((item, idx) => {
                  const hasCode = Array.isArray(item.code) && item.code.length > 0;
                  const isSaved = favorites.includes(item.id);
                  const isCopied = copiedId === item.id;
                  const cheatName = getLocalizedField(item, 'name', lang);
                  const cheatReq = getLocalizedField(item, 'requirement', lang);
                  const cheatAuthor = getLocalizedField(item, 'author', lang);
                  const canDelete = isSupabaseReady ? isAdmin : item.isCommunity;

                  return (
                    <article
                      key={`${item.id}-${lang}`}
                      onMouseMove={handleCardPointerMove}
                      style={{ animationDelay: `${Math.min(idx * 25, 240)}ms` }}
                      className="spotlight-card animate-card-in flex flex-col gap-3.5 rounded-3xl border border-vice-soft/15 bg-vice-card/75 p-5 backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-vice-soft/35 hover:shadow-xl hover:shadow-black/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-vice-lavender/15 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase text-vice-soft">
                            {categoryLabels[item.category] || item.category}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase ${
                              hasCode
                                ? 'bg-vice-mint/15 text-vice-mint'
                                : 'bg-vice-peach/15 text-vice-peach'
                            }`}
                          >
                            {hasCode ? t.badgeActive : t.badgeSoon}
                          </span>
                          {(item.isCommunity || item.updatedByCommunity) && (
                            <span className="rounded-full bg-vice-rose/15 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase text-vice-rose">
                              {t.badgeCommunity}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleFav(item.id)}
                          aria-pressed={isSaved}
                          aria-label={cheatName}
                          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border transition active:scale-90 ${
                            isSaved
                              ? 'border-vice-rose bg-vice-rose/20 text-vice-rose'
                              : 'border-vice-soft/15 bg-vice-deep/50 text-vice-muted hover:text-vice-rose'
                          }`}
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                      </div>

                      <h3 className="font-display text-lg font-bold leading-snug text-vice-text">
                        {cheatName}
                      </h3>

                      <div className="rounded-2xl border border-vice-peach/20 bg-vice-deep/65 p-3">
                        <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-vice-peach">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span>{t.reqLabel}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-vice-sub">{cheatReq}</p>
                      </div>

                      <div className="rounded-2xl border border-vice-soft/15 bg-vice-deep/85 p-3">
                        {hasCode ? (
                          <div className="flex flex-wrap gap-1.5">
                            {item.code.map((step, i) => (
                              <span
                                key={`${item.id}-${i}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-vice-soft/25 bg-vice-lavender/15 px-2 py-1 font-mono text-[11px] font-semibold text-vice-text transition hover:-translate-y-0.5 hover:border-vice-peach/50"
                              >
                                {ARROW_SYMBOL[step] && (
                                  <span className="text-vice-peach" aria-hidden="true">
                                    {ARROW_SYMBOL[step]}
                                  </span>
                                )}
                                <span>{step}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="font-mono text-xs italic text-vice-muted">{t.soonPlaceholder}</p>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        <span className="truncate text-[11px] text-vice-muted">
                          {cheatAuthor} &bull; {item.region}
                        </span>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCheat(item.id)}
                              className="inline-flex min-h-9 items-center rounded-xl border border-red-400/25 bg-red-500/10 px-2.5 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                            >
                              {t.deleteBtn}
                            </button>
                          )}

                          {hasCode ? (
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  item.code.join(', '),
                                  lang === 'id' ? `Kode "${cheatName}" disalin!` : `Copied "${cheatName}"!`,
                                  item.id
                                )
                              }
                              className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition active:scale-95 ${
                                isCopied
                                  ? 'border-vice-mint bg-vice-mint/20 text-vice-mint'
                                  : 'border-vice-soft/30 bg-vice-lavender/15 text-vice-text hover:bg-vice-lavender/25'
                              }`}
                            >
                              <span>{isCopied ? t.copied : t.copyCode}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCheat(item);
                                setShowAddCheat(true);
                              }}
                              className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-vice-peach/35 bg-vice-peach/15 px-3 text-xs font-semibold text-vice-peach transition hover:bg-vice-peach/25 active:scale-95"
                            >
                              <span>{t.completeCode}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Seputar GTA 6 & Leonida + Interactive Map */}
        <section id="seputar" className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal-item mb-8 max-w-2xl">
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-vice-rose">
                {t.aboutKicker}
              </span>
              <h2 className="mt-1.5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t.aboutTitle}
              </h2>
              <p className="mt-2 text-sm text-vice-sub sm:text-base">{t.aboutDesc}</p>
            </div>

            <LeonidaMapCard lang={lang} isAdmin={isAdmin} onNotify={notify} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {leonidaFacts.map((fact) => (
                <article
                  key={fact.title}
                  onMouseMove={handleCardPointerMove}
                  className={`spotlight-card reveal-item relative flex flex-col gap-3 rounded-3xl border border-vice-soft/15 bg-vice-card/75 p-6 backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-vice-soft/35 ${
                    fact.span ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-vice-lavender via-vice-rose to-vice-peach opacity-65" />
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-vice-peach">
                    {fact.tag}
                  </span>
                  <h3 className="font-display text-xl font-bold text-vice-text">{fact.title}</h3>
                  <p className="text-sm leading-relaxed text-vice-sub">{fact.body}</p>
                  <ul className="mt-auto flex flex-wrap gap-2 pt-2">
                    {fact.highlights.map((tag) => (
                      <li key={tag} className="rounded-full border border-vice-soft/15 bg-vice-deep/70 px-3 py-1 text-xs font-medium text-vice-soft">
                        {tag}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Easter Egg & Misteri */}
        <section id="misteri" className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal-item mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-vice-rose">
                  {t.mysteryKicker}
                </span>
                <h2 className="mt-1.5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  {t.mysteryTitle}
                </h2>
                <p className="mt-2 text-sm text-vice-sub sm:text-base">{t.mysteryDesc}</p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddMystery(true)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-5 text-sm font-bold text-vice-deep shadow-lg shadow-vice-lavender/20 transition hover:-translate-y-0.5 active:scale-95"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{t.addMysteryBtn}</span>
              </button>
            </div>

            <div className="reveal-item mb-5 flex flex-wrap gap-2" role="group" aria-label="Mystery filter">
              {[
                { key: 'all', label: t.mysAll },
                { key: 'easter-egg', label: t.mysEgg },
                { key: 'misteri', label: t.mysLegend },
                { key: 'community', label: t.mysCommunity },
              ].map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setMysteryFilter(chip.key)}
                  aria-pressed={mysteryFilter === chip.key}
                  className={`min-h-10 rounded-full border px-4 text-xs font-semibold transition active:scale-95 sm:text-sm ${
                    mysteryFilter === chip.key
                      ? 'border-vice-lavender bg-vice-lavender/25 text-vice-text'
                      : 'border-vice-soft/15 bg-vice-lavender/10 text-vice-sub hover:border-vice-soft/35 hover:text-vice-text'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {filteredMysteries.length === 0 ? (
              <div className="rounded-3xl border border-vice-soft/15 bg-vice-card/70 p-10 text-center">
                <p className="text-sm text-vice-sub">{t.mysEmpty}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMysteries.map((item, idx) => {
                  const mysTitle = getLocalizedField(item, 'title', lang);
                  const mysExcerpt = getLocalizedField(item, 'excerpt', lang);
                  const mysLoc = getLocalizedField(item, 'location', lang);

                  return (
                    <button
                      key={`${item.id}-${lang}`}
                      type="button"
                      onClick={() => setActiveMysteryId(item.id)}
                      onMouseMove={handleCardPointerMove}
                      style={{ animationDelay: `${Math.min(idx * 35, 220)}ms` }}
                      className="spotlight-card animate-card-in flex flex-col gap-3 rounded-3xl border border-vice-soft/15 bg-vice-card/75 p-5 text-left backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-vice-rose/60 hover:bg-vice-elevated/85 active:scale-[0.985]"
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-vice-lavender/15 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase text-vice-soft">
                            {item.type === 'easter-egg' ? 'Easter Egg' : lang === 'id' ? 'Misteri' : 'Mystery'}
                          </span>
                          {item.isCommunity && (
                            <span className="rounded-full bg-vice-rose/15 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase text-vice-rose">
                              {t.badgeCommunity}
                            </span>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-vice-muted">
                          <span>Lv</span>
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={`size-1.5 rounded-full ${i < item.level ? 'bg-vice-rose' : 'bg-white/15'}`} />
                          ))}
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-bold text-vice-text">{mysTitle}</h3>
                      <p className="text-sm leading-relaxed text-vice-sub">{mysExcerpt}</p>

                      <div className="mt-auto flex w-full items-center justify-between gap-2 border-t border-vice-soft/15 pt-3 text-xs">
                        <span className="truncate text-vice-muted">
                          {mysLoc} &bull; ▲ {item.votes}
                        </span>
                        <span className="shrink-0 font-semibold text-vice-soft">
                          {t.readDossier} &rarr;
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Feedback & Owner Contact */}
        <section id="feedback" className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal-item grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="rounded-3xl border border-vice-soft/20 bg-vice-card/80 p-6 backdrop-blur-md lg:col-span-3">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-vice-rose">
                  {t.feedbackKicker}
                </span>
                <h2 className="mt-1.5 font-display text-2xl font-bold text-vice-text sm:text-3xl">
                  {t.feedbackTitle}
                </h2>
                <p className="mt-2 text-sm text-vice-sub">{t.feedbackDesc}</p>

                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="fbName" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-vice-sub">
                        {t.fbNameLabel}
                      </label>
                      <input
                        id="fbName"
                        type="text"
                        value={fbName}
                        onChange={(e) => setFbName(e.target.value)}
                        placeholder={t.fbNamePlaceholder}
                        className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep/80 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="fbTopic" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-vice-sub">
                        {t.fbTopicLabel}
                      </label>
                      <select
                        id="fbTopic"
                        value={fbTopicIndex}
                        onChange={(e) => setFbTopicIndex(Number(e.target.value))}
                        className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep px-3.5 text-sm text-vice-text focus:border-vice-lavender focus:outline-none"
                      >
                        {t.fbTopics.map((topic, idx) => (
                          <option key={topic} value={idx}>
                            {topic}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="fbMsg" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-vice-sub">
                      {t.fbMsgLabel}
                    </label>
                    <textarea
                      id="fbMsg"
                      rows={3}
                      value={fbMessage}
                      onChange={(e) => setFbMessage(e.target.value)}
                      placeholder={t.fbMsgPlaceholder}
                      className="w-full rounded-xl border border-vice-soft/20 bg-vice-deep/80 p-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={sendFeedbackViaWhatsApp}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-5 text-sm font-bold text-vice-deep shadow-lg transition hover:-translate-y-0.5 active:scale-95"
                    >
                      <span>{t.fbSendWa}</span>
                    </button>
                    <button
                      type="button"
                      onClick={sendFeedbackViaEmail}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-vice-soft/30 bg-vice-deep/75 px-5 text-sm font-semibold text-vice-text transition hover:-translate-y-0.5 hover:border-vice-peach/60 hover:bg-vice-elevated active:scale-95"
                    >
                      <span>{t.fbSendEmail}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-3xl border border-vice-soft/20 bg-vice-card/80 p-6 backdrop-blur-md lg:col-span-2">
                <div>
                  <h3 className="font-display text-xl font-bold text-vice-text">{t.directContactTitle}</h3>
                  <p className="mt-1.5 text-sm text-vice-sub">{t.directContactSub}</p>
                </div>

                <div className="space-y-3">
                  <div onMouseMove={handleCardPointerMove} className="spotlight-card rounded-2xl border border-vice-soft/15 bg-vice-deep/75 p-4 transition hover:border-vice-lavender/45">
                    <div className="mb-1 font-mono text-xs font-semibold uppercase tracking-wider text-vice-soft">Email</div>
                    <p className="break-all font-mono text-sm font-semibold text-vice-text">{SITE_CONTACT.email}</p>
                    <div className="mt-3 flex gap-2">
                      <a href={`mailto:${SITE_CONTACT.email}`} className="inline-flex min-h-9 items-center rounded-lg bg-vice-lavender/20 px-3 text-xs font-semibold text-vice-text hover:bg-vice-lavender/30">
                        {t.openEmailBtn}
                      </a>
                      <button type="button" onClick={() => copyToClipboard(SITE_CONTACT.email, t.toastCopiedEmail)} className="inline-flex min-h-9 items-center rounded-lg border border-vice-soft/20 px-3 text-xs font-semibold text-vice-sub hover:text-vice-text">
                        {t.copyEmailBtn}
                      </button>
                    </div>
                  </div>

                  <div onMouseMove={handleCardPointerMove} className="spotlight-card rounded-2xl border border-vice-soft/15 bg-vice-deep/75 p-4 transition hover:border-vice-peach/45">
                    <div className="mb-1 font-mono text-xs font-semibold uppercase tracking-wider text-vice-peach">Contact / WhatsApp</div>
                    <p className="font-mono text-sm font-semibold text-vice-text">{SITE_CONTACT.whatsappDisplay}</p>
                    <div className="mt-3 flex gap-2">
                      <a href={`https://wa.me/${SITE_CONTACT.whatsappRaw}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-lg bg-vice-peach/20 px-3 text-xs font-semibold text-vice-peach hover:bg-vice-peach/30">
                        {t.openWaBtn}
                      </a>
                      <button type="button" onClick={() => copyToClipboard(SITE_CONTACT.whatsappRaw, t.toastCopiedWa)} className="inline-flex min-h-9 items-center rounded-lg border border-vice-soft/20 px-3 text-xs font-semibold text-vice-sub hover:text-vice-text">
                        {t.copyWaBtn}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-vice-soft/15 bg-[#100d1a]/85 py-10">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center">
          <div>
            <div className="group inline-flex items-center gap-2.5 font-display text-base font-bold">
              <BrandBadge logo={brandLogo} size="sm" />
              <span>LemonKeyS&apos; VI</span>
              <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${cloudSynced ? 'bg-vice-mint/15 text-vice-mint' : 'bg-white/10 text-vice-muted'}`}>
                {cloudSynced ? 'Cloud Live' : 'Local Mode'}
              </span>
            </div>
            <p className="mt-2 max-w-md text-xs text-vice-muted">{t.footerDesc}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-vice-sub">
              <a href={`mailto:${SITE_CONTACT.email}`} className="hover:text-vice-peach">{SITE_CONTACT.email}</a>
              <span aria-hidden="true">&bull;</span>
              <a href={`https://wa.me/${SITE_CONTACT.whatsappRaw}`} target="_blank" rel="noopener noreferrer" className="hover:text-vice-peach">
                {SITE_CONTACT.whatsappDisplay}
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-vice-sub">
            <a href="#cheats" className="hover:text-vice-peach">{t.navCheats}</a>
            <a href="#seputar" className="hover:text-vice-peach">{t.navAbout}</a>
            <a href="#misteri" className="hover:text-vice-peach">{t.navMystery}</a>
            <a href="#feedback" className="hover:text-vice-peach">{t.navFeedback}</a>

            {!isAdmin ? (
              <button
                type="button"
                onClick={() => setShowAdminLogin(true)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-vice-soft/15 bg-white/5 px-3 text-xs text-vice-muted transition hover:border-vice-soft/35 hover:text-vice-text"
              >
                <span>{t.adminLoginLink}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAdminLogout}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-vice-mint/30 bg-vice-mint/10 px-3 text-xs text-vice-mint"
              >
                <span>{t.adminLogoutBtn}</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label={t.backToTop}
        className={`animate-float fixed bottom-6 right-5 z-40 inline-flex size-12 items-center justify-center rounded-full border border-vice-soft/30 bg-vice-card/90 text-vice-peach shadow-xl backdrop-blur-md transition-all duration-300 hover:border-vice-peach hover:bg-vice-elevated active:scale-90 ${
          showBackTop ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* Modals */}
      {showAdminLogin && (
        <AdminLoginModal
          lang={lang}
          onVerifyPin={handleVerifyPin}
          onSuccess={handleAdminUnlock}
          onClose={() => setShowAdminLogin(false)}
        />
      )}

      {showPinModal && isAdmin && (
        <ChangePinModal
          lang={lang}
          onUpdatePin={handleUpdatePin}
          onClose={() => setShowPinModal(false)}
          onNotify={notify}
        />
      )}

      {showLogoModal && isAdmin && (
        <BrandLogoModal
          brandLogo={brandLogo}
          lang={lang}
          onSave={handleSaveBrandLogo}
          onClose={() => setShowLogoModal(false)}
          onNotify={notify}
        />
      )}

      {showBgModal && isAdmin && (
        <HeroBgModal
          heroBg={heroBg}
          lang={lang}
          onSave={handleSaveHeroBg}
          onClose={() => setShowBgModal(false)}
          onNotify={notify}
        />
      )}

      {showAddCheat && (
        <AddCheatModal
          editingCheat={editingCheat}
          lang={lang}
          onSubmit={handleSaveCheat}
          onClose={() => {
            setShowAddCheat(false);
            setEditingCheat(null);
          }}
        />
      )}

      {showAddMystery && (
        <AddMysteryModal
          lang={lang}
          onSubmit={handleAddMystery}
          onClose={() => setShowAddMystery(false)}
        />
      )}

      {activeMystery && (
        <MysteryDetailModal
          mystery={
            isSupabaseReady
              ? { ...activeMystery, isCommunity: isAdmin }
              : activeMystery
          }
          lang={lang}
          onClose={() => setActiveMysteryId(null)}
          onCopyCoord={(txt) =>
            copyToClipboard(txt, lang === 'id' ? 'Lokasi misteri disalin!' : 'Mystery location copied!')
          }
          onVote={handleVoteMystery}
          onDelete={handleDeleteMystery}
        />
      )}

      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-vice-soft/30 bg-[#27203e] px-5 py-2.5 text-sm font-semibold text-vice-text shadow-2xl transition-all duration-200 ${
          toast ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {toast}
      </div>
    </div>
  );
}
