import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_TRACK = {
  title: 'GTA VI — Love Is A Long Road',
  subtitle: 'Vice City Radio • Leonida FM',
  url: '/gta6-theme.mp3',
};

const AUTO_HIDE_MS = 5500;

/* Built-in Calm Vice City Synthwave Engine (fallback if /gta6-theme.mp3 is not added yet) */
function createViceSynth() {
  let ctx = null;
  let master = null;
  let loopId = null;
  let running = false;
  let step = 0;

  // Calm twilight Vice City chord progression (Dm9 -> Bbmaj7 -> Fmaj7 -> C6)
  const chords = [
    [146.83, 220.0, 261.63, 329.63],
    [116.54, 174.61, 220.0, 293.66],
    [174.61, 220.0, 261.63, 329.63],
    [130.81, 196.0, 220.0, 293.66],
  ];
  const arpNotes = [293.66, 329.63, 349.23, 440.0, 523.25, 440.0, 349.23, 329.63];

  const playTick = () => {
    if (!ctx || !master || !running) return;
    const now = ctx.currentTime;

    // Warm analog pad every 4 beats
    if (step % 4 === 0) {
      const chord = chords[Math.floor(step / 4) % chords.length];
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(620, now);
        filter.frequency.exponentialRampToValueAtTime(340, now + 2.2);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.045, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.35);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 2.4);
      });
    }

    // Soft retro twilight pluck arpeggio
    const arpFreq = arpNotes[step % arpNotes.length];
    const pluck = ctx.createOscillator();
    const pluckGain = ctx.createGain();
    pluck.type = 'triangle';
    pluck.frequency.setValueAtTime(arpFreq, now);

    pluckGain.gain.setValueAtTime(0.0001, now);
    pluckGain.gain.linearRampToValueAtTime(0.05, now + 0.04);
    pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);

    pluck.connect(pluckGain);
    pluckGain.connect(master);
    pluck.start(now);
    pluck.stop(now + 0.55);

    step += 1;
  };

  return {
    async start(volume = 0.45) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      if (!ctx) {
        ctx = new AudioCtx();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (ctx.state !== 'running') return false;
      if (!running) {
        running = true;
        playTick();
        loopId = setInterval(playTick, 560);
      }
      return true;
    },
    pause() {
      running = false;
      if (loopId) {
        clearInterval(loopId);
        loopId = null;
      }
    },
    setVolume(v) {
      if (master && ctx) {
        master.gain.setTargetAtTime(v, ctx.currentTime, 0.08);
      }
    },
    destroy() {
      this.pause();
      if (ctx) {
        ctx.close().catch(() => {});
        ctx = null;
        master = null;
      }
    },
  };
}

function MusicNoteIcon({ className = 'size-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 18V5l12-2v13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function SingleNoteIcon({ className = 'size-3' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 17V4l7 2v3l-4-1v9" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="17" r="3" />
    </svg>
  );
}

function VinylArt({ isPlaying, size = 'md' }) {
  const outer = size === 'sm' ? 'size-10' : 'size-12';
  const label = size === 'sm' ? 'size-4 text-[7px]' : 'size-5 text-[8px]';
  const spindle = size === 'sm' ? 'size-1' : 'size-1.5';

  return (
    <div className="relative flex shrink-0 items-center justify-center">
      {/* Orbiting Note Ring around the Vinyl */}
      <div
        className={`pointer-events-none absolute -inset-1.5 animate-note-orbit ${
          !isPlaying ? 'anim-paused opacity-40' : 'opacity-100'
        }`}
        aria-hidden="true"
      >
        <SingleNoteIcon className="absolute -top-1 left-1/2 size-3 -translate-x-1/2 text-vice-peach drop-shadow" />
        <MusicNoteIcon className="absolute -bottom-1 left-1/2 size-3 -translate-x-1/2 text-vice-soft drop-shadow" />
      </div>

      {/* Floating Rising Notes */}
      {isPlaying && size === 'md' && (
        <div className="pointer-events-none absolute -right-1 -top-1" aria-hidden="true">
          <MusicNoteIcon className="animate-note-a absolute size-3.5 text-vice-rose" />
          <SingleNoteIcon className="animate-note-b absolute size-3 text-vice-peach" />
        </div>
      )}

      {/* Spinning Vinyl Disc */}
      <div
        className={`${outer} vinyl-grooves animate-vinyl relative flex items-center justify-center rounded-full border border-vice-soft/35 shadow-lg shadow-black/50 ${
          !isPlaying ? 'anim-paused' : ''
        }`}
      >
        <div
          className={`${label} flex items-center justify-center rounded-full bg-gradient-to-br from-vice-soft via-vice-rose to-vice-peach font-display font-extrabold text-vice-deep`}
        >
          VI
        </div>
        <span className={`${spindle} absolute rounded-full bg-vice-deep ring-1 ring-white/40`} />
      </div>
    </div>
  );
}

export default function MusicPlayerBanner({ lang, isAdmin, onNotify }) {
  const isId = lang === 'id';

  const [track, setTrack] = useState(() => {
    try {
      const saved = localStorage.getItem('lkvi_music_track');
      return saved ? { ...DEFAULT_TRACK, ...JSON.parse(saved) } : DEFAULT_TRACK;
    } catch {
      return DEFAULT_TRACK;
    }
  });

  const [volume, setVolume] = useState(() => {
    try {
      const v = Number(localStorage.getItem('lkvi_music_vol'));
      return Number.isFinite(v) && v >= 0.05 && v <= 1 ? v : 0.45;
    } catch {
      return 0.45;
    }
  });

  const [bannerOpen, setBannerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useSynthFallback, setUseSynthFallback] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [drainKey, setDrainKey] = useState(0);

  // Admin quick edit fields
  const [editTitle, setEditTitle] = useState(track.title);
  const [editUrl, setEditUrl] = useState(track.url);

  const audioRef = useRef(null);
  const synthRef = useRef(null);
  const hideTimerRef = useRef(null);
  const hoveredRef = useRef(false);
  const objectUrlRef = useRef(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleAutoHide = useCallback(() => {
    clearHideTimer();
    setDrainKey((k) => k + 1);
    hideTimerRef.current = setTimeout(() => {
      if (!hoveredRef.current) {
        setBannerOpen(false);
        setShowControls(false);
      }
    }, AUTO_HIDE_MS);
  }, [clearHideTimer]);

  const startPlayback = useCallback(
    async ({ revealBanner = true } = {}) => {
      if (revealBanner) setBannerOpen(true);

      if (!synthRef.current) {
        synthRef.current = createViceSynth();
      }

      // 1. Try playing MP3 file if not already switched to synth fallback
      if (!useSynthFallback && audioRef.current) {
        try {
          audioRef.current.volume = volume;
          await audioRef.current.play();
          setIsPlaying(true);
          setNeedsGesture(false);
          if (revealBanner) scheduleAutoHide();
          return true;
        } catch (err) {
          if (err?.name === 'NotAllowedError') {
            setNeedsGesture(true);
            setIsPlaying(false);
            clearHideTimer();
            return false;
          }
          // Missing MP3 or unsupported format -> fallback smoothly to Vice Synth
          setUseSynthFallback(true);
        }
      }

      // 2. Built-in Vice City Synthwave fallback
      try {
        const started = await synthRef.current.start(volume);
        if (started) {
          setIsPlaying(true);
          setNeedsGesture(false);
          if (revealBanner) scheduleAutoHide();
          return true;
        }
        setNeedsGesture(true);
        return false;
      } catch {
        setNeedsGesture(true);
        return false;
      }
    },
    [useSynthFallback, volume, scheduleAutoHide, clearHideTimer]
  );

  const pausePlayback = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (synthRef.current) synthRef.current.pause();
    setIsPlaying(false);
    clearHideTimer();
  }, [clearHideTimer]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback({ revealBanner: true });
    }
  }, [isPlaying, pausePlayback, startPlayback]);

  // Initial Entrance: slide notification down & attempt immediate GTA 6 soundtrack playback
  useEffect(() => {
    const enterTimer = setTimeout(() => {
      setBannerOpen(true);
      startPlayback({ revealBanner: true });
    }, 180);

    return () => {
      clearTimeout(enterTimer);
      clearHideTimer();
    };
    // Run once on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unlock audio automatically on first tap/click/key anywhere if mobile browser blocked autoplay
  useEffect(() => {
    if (!needsGesture) return;
    const unlock = () => {
      startPlayback({ revealBanner: true });
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [needsGesture, startPlayback]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (synthRef.current) synthRef.current.setVolume(volume);
    try {
      localStorage.setItem('lkvi_music_vol', String(volume));
    } catch {
      // ignore storage quota errors
    }
  }, [volume]);

  // Cleanup audio & synth on unmount
  useEffect(() => {
    const audioEl = audioRef.current;
    return () => {
      clearHideTimer();
      if (audioEl) audioEl.pause();
      if (synthRef.current) synthRef.current.destroy();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [clearHideTimer]);

  const handleAudioError = () => {
    setUseSynthFallback(true);
  };

  const handleSaveTrackMeta = (e) => {
    e.preventDefault();
    const next = {
      title: editTitle.trim() || DEFAULT_TRACK.title,
      subtitle: DEFAULT_TRACK.subtitle,
      url: editUrl.trim() || DEFAULT_TRACK.url,
    };
    setTrack(next);
    setUseSynthFallback(false);
    try {
      localStorage.setItem('lkvi_music_track', JSON.stringify(next));
    } catch {
      // ignore
    }
    if (synthRef.current) synthRef.current.pause();
    onNotify(isId ? 'Pengaturan lagu GTA 6 disimpan!' : 'GTA 6 soundtrack updated!');
    setTimeout(() => startPlayback({ revealBanner: true }), 120);
  };

  const handlePreviewLocalMp3 = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const blobUrl = URL.createObjectURL(file);
    objectUrlRef.current = blobUrl;

    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setTrack((prev) => ({ ...prev, title: cleanName, url: blobUrl }));
    setEditTitle(cleanName);
    setUseSynthFallback(false);
    if (synthRef.current) synthRef.current.pause();
    onNotify(
      isId
        ? `Memutar "${cleanName}" (untuk permanen salin ke public/gta6-theme.mp3)`
        : `Playing "${cleanName}" (copy to public/gta6-theme.mp3 to persist)`
    );
    setTimeout(() => startPlayback({ revealBanner: true }), 120);
  };

  const displayTitle = useSynthFallback
    ? isId
      ? 'Vice City Twilight (Synth Mode)'
      : 'Vice City Twilight (Synth Mode)'
    : track.title;

  const statusText = needsGesture
    ? isId
      ? 'KETUK LAYAR / PUTAR MUSIK'
      : 'TAP SCREEN OR PLAY MUSIC'
    : isPlaying
    ? isId
      ? 'SEDANG DIPUTAR • VICE RADIO'
      : 'NOW PLAYING • VICE RADIO'
    : isId
    ? 'MUSIK DIJEDA • VICE RADIO'
    : 'PAUSED • VICE RADIO';

  return (
    <>
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={track.url}
        loop
        preload="auto"
        onError={handleAudioError}
      />

      {/* Top Floating Dynamic Music Notification */}
      <div
        role="region"
        aria-label={isId ? 'Notifikasi Musik GTA 6' : 'GTA 6 Music Notification'}
        aria-live="polite"
        onMouseEnter={() => {
          hoveredRef.current = true;
          clearHideTimer();
        }}
        onMouseLeave={() => {
          hoveredRef.current = false;
          if (isPlaying && !showControls) scheduleAutoHide();
        }}
        className={`fixed left-1/2 top-3 z-50 w-[calc(100%-24px)] max-w-md -translate-x-1/2 will-change-transform ${
          bannerOpen
            ? 'pointer-events-auto translate-y-0 opacity-100 transition-all duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]'
            : 'pointer-events-none -translate-y-32 opacity-0 transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,1,1)]'
        }`}
      >
        <div className="relative overflow-hidden rounded-3xl border border-vice-soft/30 bg-[#1f1933]/92 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            {/* Spinning Vinyl + Swirling Notes */}
            <VinylArt isPlaying={isPlaying} size="md" />

            {/* Track Meta & Live Equalizer */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-vice-peach">
                  {statusText}
                </span>
                {/* Equalizer Bars */}
                <span className="inline-flex h-3 items-end gap-[2px]" aria-hidden="true">
                  <span className={`w-[2.5px] rounded-full bg-vice-soft ${isPlaying ? 'h-full animate-eq-1' : 'h-1'}`} />
                  <span className={`w-[2.5px] rounded-full bg-vice-rose ${isPlaying ? 'h-full animate-eq-2' : 'h-1.5'}`} />
                  <span className={`w-[2.5px] rounded-full bg-vice-peach ${isPlaying ? 'h-full animate-eq-3' : 'h-1'}`} />
                  <span className={`w-[2.5px] rounded-full bg-vice-lavender ${isPlaying ? 'h-full animate-eq-4' : 'h-1.5'}`} />
                </span>
              </div>

              <p className="mt-0.5 truncate font-display text-sm font-bold text-vice-text">
                {displayTitle}
              </p>
              <p className="truncate text-[11px] text-vice-muted">
                {needsGesture
                  ? isId
                    ? 'Sentuh mana saja untuk menyalakan soundtrack'
                    : 'Touch anywhere to start the soundtrack'
                  : track.subtitle}
              </p>
            </div>

            {/* Action Buttons (Min 44px touch targets) */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={isPlaying ? (isId ? 'Jeda musik' : 'Pause music') : isId ? 'Putar musik' : 'Play music'}
                className="inline-flex size-11 touch-manipulation items-center justify-center rounded-2xl bg-gradient-to-br from-vice-soft via-vice-rose to-vice-peach text-vice-deep shadow-md shadow-vice-rose/25 transition hover:opacity-95 active:scale-90"
              >
                {isPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="5" width="4" height="14" rx="1.5" />
                    <rect x="14" y="5" width="4" height="14" rx="1.5" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7 5.5v13l11-6.5-11-6.5z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowControls((v) => !v);
                  clearHideTimer();
                }}
                aria-expanded={showControls}
                aria-label={isId ? 'Atur volume & lagu' : 'Audio & volume settings'}
                className="inline-flex size-10 touch-manipulation items-center justify-center rounded-xl border border-vice-soft/20 bg-white/5 text-vice-sub transition hover:bg-white/10 hover:text-vice-text"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBannerOpen(false);
                  setShowControls(false);
                  clearHideTimer();
                }}
                aria-label={isId ? 'Sembunyikan notifikasi ke atas' : 'Hide notification upward'}
                className="inline-flex size-10 touch-manipulation items-center justify-center rounded-xl border border-vice-soft/15 bg-white/5 text-vice-sub transition hover:bg-white/10 hover:text-vice-text"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Expandable Volume & Admin Track Controls */}
          {showControls && (
            <div className="animate-drawer mt-3 space-y-3 border-t border-vice-soft/15 pt-3">
              <div className="flex items-center gap-3">
                <label htmlFor="musicVolRange" className="font-mono text-[11px] font-semibold uppercase text-vice-sub">
                  Vol
                </label>
                <input
                  id="musicVolRange"
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="h-2 flex-1 accent-vice-lavender"
                />
                <span className="w-9 text-right font-mono text-xs text-vice-peach">
                  {Math.round(volume * 100)}%
                </span>
              </div>

              {isAdmin && (
                <form onSubmit={handleSaveTrackMeta} className="space-y-2 rounded-2xl border border-vice-soft/15 bg-vice-deep/75 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-vice-rose">
                      {isId ? 'Admin • Ganti Lagu GTA 6' : 'Admin • Change Soundtrack'}
                    </span>
                    <label className="cursor-pointer rounded-lg border border-vice-peach/35 bg-vice-peach/15 px-2.5 py-1 text-[11px] font-semibold text-vice-peach hover:bg-vice-peach/25">
                      <span>{isId ? 'Tes MP3 HP' : 'Test Local MP3'}</span>
                      <input type="file" accept="audio/*" className="sr-only" onChange={handlePreviewLocalMp3} />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={isId ? 'Judul lagu...' : 'Track title...'}
                    className="min-h-9 w-full rounded-xl border border-vice-soft/20 bg-vice-deep px-3 text-xs text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="/gta6-theme.mp3 atau URL MP3"
                      className="min-h-9 flex-1 rounded-xl border border-vice-soft/20 bg-vice-deep px-3 font-mono text-[11px] text-vice-sub placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="min-h-9 rounded-xl bg-vice-lavender/25 px-3 text-xs font-semibold text-vice-text hover:bg-vice-lavender/35"
                    >
                      {isId ? 'Simpan' : 'Save'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Auto-retract progress bar (visible when playing and banner about to slide up) */}
          {bannerOpen && isPlaying && !showControls && !needsGesture && (
            <div className="absolute inset-x-0 bottom-0 h-[2.5px] bg-white/10" aria-hidden="true">
              <div
                key={drainKey}
                className="animate-drain h-full bg-gradient-to-r from-vice-lavender via-vice-rose to-vice-peach"
              />
            </div>
          )}
        </div>
      </div>

      {/* Compact Spinning Vinyl Dock (Bottom-Left) once Top Notification Slides Back Up */}
      <button
        type="button"
        onClick={() => {
          setBannerOpen(true);
          if (isPlaying) {
            scheduleAutoHide();
          } else {
            startPlayback({ revealBanner: true });
          }
        }}
        aria-label={
          isPlaying
            ? isId
              ? 'Tampilkan notifikasi musik GTA 6'
              : 'Show GTA 6 music player'
            : isId
            ? 'Putar musik GTA 6'
            : 'Play GTA 6 soundtrack'
        }
        className={`fixed bottom-6 left-5 z-40 inline-flex items-center gap-2 rounded-full border border-vice-soft/30 bg-vice-card/90 p-1.5 pr-3.5 shadow-xl shadow-black/50 backdrop-blur-md transition-all duration-300 hover:border-vice-peach active:scale-95 ${
          !bannerOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        <VinylArt isPlaying={isPlaying} size="sm" />
        <div className="text-left leading-tight">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-vice-peach">
            {isPlaying ? 'VI FM' : isId ? 'Putar' : 'Play'}
          </div>
          <div className="max-w-[92px] truncate text-[11px] font-medium text-vice-sub">
            {isPlaying ? (isId ? 'Berputar' : 'Playing') : isId ? 'Dijeda' : 'Paused'}
          </div>
        </div>
      </button>
    </>
  );
}
