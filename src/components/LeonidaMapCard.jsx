import { useState, useEffect } from 'react';

const MAP_REGIONS = [
  {
    id: 'lummox',
    x: 50,
    y: 19,
    name: 'Lummox County',
    nameEn: 'Lummox County',
    tag: 'WILAYAH UTARA',
    tagEn: 'NORTHERN REGION',
    desc: 'Kawasan pegunungan, taman nasional, kota kecil Bonanza dan Millport, serta jalan lintas utara State of Leonida.',
    descEn: 'Northern highlands, national park trails, rural towns like Bonanza and Millport, and interstate routes across northern Leonida.',
  },
  {
    id: 'gellhorn',
    x: 31,
    y: 35,
    name: 'Port Gellhorn',
    nameEn: 'Port Gellhorn',
    tag: 'PESISIR BARAT',
    tagEn: 'WEST COAST',
    desc: 'Kota pelabuhan kelas pekerja yang terkenal dengan motel pinggir jalan, lintasan balap, dan jalur cepat Interstate 404.',
    descEn: 'Working-class coastal city known for roadside motels, racing circuits, and Interstate 404 corridors.',
  },
  {
    id: 'kelly',
    x: 42,
    y: 39,
    name: 'Kelly County',
    nameEn: 'Kelly County',
    tag: 'PEDALAMAN TENGAH',
    tagEn: 'CENTRAL HEARTLAND',
    desc: 'Dataran pedalaman hijau dengan jalur penghubung utama menuju Ambrosia, Danau Leonida, dan pesisir barat.',
    descEn: 'Green inland plains linking Port Gellhorn, Ambrosia, Lake Leonida, and western highways.',
  },
  {
    id: 'leonard',
    x: 69,
    y: 35,
    name: 'Leonard County',
    nameEn: 'Leonard County',
    tag: 'PESISIR TIMUR LAUT',
    tagEn: 'NORTHEAST COAST',
    desc: 'Wilayah tepi Danau Leonida dan pesisir Atlantik yang mencakup Waning Sands, Belville, serta jalur pantai timur.',
    descEn: 'Eastern lakefront and Atlantic stretch featuring Waning Sands, Belville, and scenic coastal highways.',
  },
  {
    id: 'vice-city',
    x: 72,
    y: 51,
    name: 'Vice City & Vice Beach',
    nameEn: 'Vice City & Vice Beach',
    tag: 'METROPOLIS UTAMA',
    tagEn: 'MAIN METROPOLIS',
    desc: 'Jantung kota neon dan pantai Art Deco di Vice-Dale County—pusat kehidupan malam, hotel pastel, dan budaya media sosial.',
    descEn: 'The vibrant neon skyline and Art Deco beachfront of Vice-Dale County—hub of nightlife, pastel hotels, and street culture.',
  },
  {
    id: 'vcia',
    x: 57,
    y: 57,
    name: 'VCIA • Vice-Dale County',
    nameEn: 'VCIA • Vice-Dale County',
    tag: 'BANDARA & TRANSIT',
    tagEn: 'AIRPORT & TRANSIT',
    desc: 'Bandara Internasional Vice City (VCIA) dan jaringan tol padat yang menghubungkan pusat kota dengan wilayah selatan.',
    descEn: 'Vice City International Airport (VCIA) and dense highway interchanges connecting downtown with southern districts.',
  },
  {
    id: 'grassrivers',
    x: 46,
    y: 67,
    name: 'Grassrivers',
    nameEn: 'Grassrivers',
    tag: 'RAWA LIAR',
    tagEn: 'WILD WETLANDS',
    desc: 'Rawa bakau dan perairan dangkal habitat buaya—tempat terbaik memakai Airboat 09 dan memburu misteri cahaya malam.',
    descEn: 'Mangrove swamps and shallow waterways teeming with wildlife—prime territory for Airboat 09 runs and night mysteries.',
  },
  {
    id: 'mariana',
    x: 50,
    y: 72,
    name: 'Mariana County & Hamlet',
    nameEn: 'Mariana County & Hamlet',
    tag: 'TELUK SELATAN',
    tagEn: 'SOUTHERN BAY',
    desc: 'Wilayah pesisir selatan meliputi Hamlet dan Watson Bay yang menjadi gerbang menuju kepulauan Leonida Keys.',
    descEn: 'Southern bay region spanning Hamlet and Watson Bay, acting as the gateway down to the Leonida Keys.',
  },
  {
    id: 'keys',
    x: 49,
    y: 86,
    name: 'Key Lento & Southwind',
    nameEn: 'Key Lento & Southwind',
    tag: 'KEPULAUAN SELATAN',
    tagEn: 'SOUTHERN KEYS',
    desc: 'Rangkaian pulau tropis hingga Mile Zero Air Station yang dihubungkan jembatan samudra di perairan toska selatan.',
    descEn: 'Tropical island chain stretching to Mile Zero Air Station, linked by sweeping ocean bridges over turquoise water.',
  },
];

export default function LeonidaMapCard({ lang, isAdmin, onNotify }) {
  const isId = lang === 'id';
  const [customMapUrl, setCustomMapUrl] = useState(() => {
    try {
      return localStorage.getItem('lkvi_custom_map') || '';
    } catch {
      return '';
    }
  });
  const [imgError, setImgError] = useState(false);
  const [selectedId, setSelectedId] = useState('vice-city');
  const [showPins, setShowPins] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [fsZoom, setFsZoom] = useState(1.15);

  const mapSrc = customMapUrl || '/leonida-map.jpg';
  const selectedRegion = MAP_REGIONS.find((r) => r.id === selectedId) || MAP_REGIONS[4];

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [fullscreen]);

  const handleUploadMap = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1400;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setCustomMapUrl(compressed);
        setImgError(false);
        try {
          localStorage.setItem('lkvi_custom_map', compressed);
          onNotify(isId ? 'Gambar peta Leonida berhasil diperbarui!' : 'Leonida map image updated!');
        } catch {
          onNotify(
            isId
              ? 'Peta aktif di sesi ini (simpan ke public/leonida-map.jpg agar permanen).'
              : 'Map active for this session (save to public/leonida-map.jpg to persist).'
          );
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const resetCustomMap = () => {
    setCustomMapUrl('');
    setImgError(false);
    localStorage.removeItem('lkvi_custom_map');
    onNotify(isId ? 'Kembali ke file peta bawaan.' : 'Restored default map file.');
  };

  const adjustZoom = (delta) => {
    setZoom((z) => Number(Math.min(2.4, Math.max(1, z + delta)).toFixed(2)));
  };

  const adjustFsZoom = (delta) => {
    setFsZoom((z) => Number(Math.min(2.8, Math.max(1, z + delta)).toFixed(2)));
  };

  return (
    <>
      <div className="reveal-item mb-6 overflow-hidden rounded-3xl border border-vice-soft/20 bg-vice-card/80 p-4 backdrop-blur-md sm:p-6">
        {/* Top Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-vice-peach">
              {isId ? 'PETA INTERAKTIF WILAYAH' : 'INTERACTIVE WORLD ATLAS'}
            </span>
            <h3 className="mt-0.5 font-display text-xl font-bold text-vice-text sm:text-2xl">
              {isId ? 'Peta State of Leonida' : 'The Great State of Leonida Map'}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPins((v) => !v)}
              aria-pressed={showPins}
              className={`min-h-10 rounded-xl border px-3 text-xs font-semibold transition active:scale-95 ${
                showPins
                  ? 'border-vice-lavender bg-vice-lavender/20 text-vice-text'
                  : 'border-vice-soft/15 bg-vice-deep/60 text-vice-sub hover:text-vice-text'
              }`}
            >
              {showPins ? (isId ? 'Pin Aktif' : 'Pins On') : isId ? 'Pin Mati' : 'Pins Off'}
            </button>

            <div className="inline-flex items-center rounded-xl border border-vice-soft/15 bg-vice-deep/75 p-0.5">
              <button
                type="button"
                onClick={() => adjustZoom(-0.3)}
                aria-label="Zoom out"
                className="inline-flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold text-vice-sub transition hover:bg-white/10 hover:text-vice-text"
              >
                &minus;
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="min-w-12 px-1.5 font-mono text-xs font-semibold text-vice-peach"
                title="Reset Zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => adjustZoom(0.3)}
                aria-label="Zoom in"
                className="inline-flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold text-vice-sub transition hover:bg-white/10 hover:text-vice-text"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-3.5 text-xs font-bold text-vice-deep shadow-md transition hover:opacity-95 active:scale-95"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
              <span>{isId ? 'Layar Penuh' : 'Fullscreen'}</span>
            </button>

            {isAdmin && (
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-vice-peach/40 bg-vice-peach/15 px-3 text-xs font-semibold text-vice-peach transition hover:bg-vice-peach/25">
                <span>{isId ? 'Ganti Peta' : 'Replace Map'}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleUploadMap} />
              </label>
            )}
          </div>
        </div>

        {/* Map Canvas + Region Inspector Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Interactive Map Viewport */}
          <div className="relative overflow-auto rounded-2xl border border-vice-soft/20 bg-[#0d4d66]/40 lg:col-span-7">
            {imgError ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-vice-lavender/15 text-vice-soft">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                    <line x1="8" y1="2" x2="8" y2="18" />
                    <line x1="16" y1="6" x2="16" y2="22" />
                  </svg>
                </div>
                <h4 className="font-display text-base font-bold text-vice-text">
                  {isId ? 'File peta belum diletakkan di public/leonida-map.jpg' : 'Map file not found at public/leonida-map.jpg'}
                </h4>
                <p className="max-w-sm text-xs leading-relaxed text-vice-sub">
                  {isId
                    ? 'Salin gambar peta ke folder public/leonida-map.jpg lewat Termux, atau pilih fotonya langsung lewat Mode Admin.'
                    : 'Copy your map image to public/leonida-map.jpg via Termux, or upload it directly in Admin Mode.'}
                </p>
                {isAdmin && (
                  <label className="mt-1 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-4 text-xs font-bold text-vice-deep">
                    <span>{isId ? 'Pilih Foto Peta dari Galeri' : 'Upload Map from Device'}</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={handleUploadMap} />
                  </label>
                )}
              </div>
            ) : (
              <div className="max-h-[520px] overflow-auto">
                <div
                  className="relative mx-auto origin-top-left transition-[width] duration-300 ease-out"
                  style={{ width: `${zoom * 100}%` }}
                >
                  <img
                    src={mapSrc}
                    alt={isId ? 'Peta State of Leonida GTA 6' : 'GTA 6 State of Leonida Map'}
                    onError={() => setImgError(true)}
                    className="block h-auto w-full select-none"
                    draggable={false}
                  />

                  {/* Subtle Twilight Vignette Edge */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ boxShadow: 'inset 0 0 36px rgba(21,18,33,0.45)' }}
                    aria-hidden="true"
                  />

                  {/* Interactive Region Pins */}
                  {showPins &&
                    MAP_REGIONS.map((region) => {
                      const active = region.id === selectedId;
                      return (
                        <button
                          key={region.id}
                          type="button"
                          onClick={() => setSelectedId(region.id)}
                          aria-label={isId ? region.name : region.nameEn}
                          style={{ left: `${region.x}%`, top: `${region.y}%` }}
                          className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                        >
                          <span
                            className={`absolute inset-0 rounded-full transition ${
                              active
                                ? 'animate-ping bg-vice-peach/75'
                                : 'bg-vice-lavender/40 group-hover:bg-vice-rose/60'
                            }`}
                          />
                          <span
                            className={`relative flex size-4 items-center justify-center rounded-full border-2 shadow-lg transition duration-200 ${
                              active
                                ? 'scale-125 border-white bg-gradient-to-br from-vice-rose to-vice-peach'
                                : 'border-vice-deep bg-vice-soft group-hover:scale-115 group-hover:bg-vice-peach'
                            }`}
                          />
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Selected Region Details & Quick District Picker */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-5">
            <div className="rounded-2xl border border-vice-soft/20 bg-vice-deep/80 p-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="rounded-full bg-vice-rose/15 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-vice-rose">
                  {isId ? selectedRegion.tag : selectedRegion.tagEn}
                </span>
                <span className="font-mono text-[11px] text-vice-muted">
                  {selectedRegion.x}°N &bull; {selectedRegion.y}°W
                </span>
              </div>

              <h4 className="font-display text-xl font-bold text-vice-text">
                {isId ? selectedRegion.name : selectedRegion.nameEn}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-vice-sub">
                {isId ? selectedRegion.desc : selectedRegion.descEn}
              </p>
            </div>

            <div>
              <p className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-vice-muted">
                {isId ? 'PILIH WILAYAH DI PETA' : 'JUMP TO REGION'}
              </p>
              <div className="flex flex-wrap gap-2">
                {MAP_REGIONS.map((region) => {
                  const active = region.id === selectedId;
                  return (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => setSelectedId(region.id)}
                      className={`min-h-9 rounded-xl border px-3 text-xs font-semibold transition active:scale-95 ${
                        active
                          ? 'border-vice-peach bg-vice-peach/20 text-vice-peach shadow-sm'
                          : 'border-vice-soft/15 bg-vice-deep/60 text-vice-sub hover:border-vice-soft/35 hover:text-vice-text'
                      }`}
                    >
                      {isId ? region.name : region.nameEn}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-vice-soft/10 pt-3 text-xs text-vice-muted">
              <span>
                {isId
                  ? 'Ketuk pin di peta atau buka Layar Penuh untuk zoom detail jalan.'
                  : 'Tap map pins or open Fullscreen to inspect highway routes up close.'}
              </span>
              {isAdmin && customMapUrl && (
                <button
                  type="button"
                  onClick={resetCustomMap}
                  className="font-semibold text-vice-rose hover:underline"
                >
                  {isId ? 'Reset Peta' : 'Reset Map'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Map Lightbox Modal */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#0d0a17]/95 backdrop-blur-lg"
          role="dialog"
          aria-modal="true"
          aria-label={isId ? 'Peta Leonida Layar Penuh' : 'Fullscreen Leonida Map'}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vice-soft/15 bg-vice-deep/90 px-4 py-3 sm:px-6">
            <div>
              <h3 className="font-display text-base font-bold text-vice-text sm:text-lg">
                {isId ? 'Peta State of Leonida (Layar Penuh)' : 'State of Leonida Atlas (Fullscreen)'}
              </h3>
              <p className="text-xs text-vice-muted">
                {isId ? selectedRegion.name : selectedRegion.nameEn} — {isId ? selectedRegion.tag : selectedRegion.tagEn}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-xl border border-vice-soft/20 bg-vice-card p-0.5">
                <button
                  type="button"
                  onClick={() => adjustFsZoom(-0.35)}
                  className="inline-flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold text-vice-sub hover:bg-white/10 hover:text-vice-text"
                >
                  &minus;
                </button>
                <button
                  type="button"
                  onClick={() => setFsZoom(1)}
                  className="min-w-12 px-1.5 font-mono text-xs font-semibold text-vice-peach"
                >
                  {Math.round(fsZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => adjustFsZoom(0.35)}
                  className="inline-flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold text-vice-sub hover:bg-white/10 hover:text-vice-text"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => setFullscreen(false)}
                aria-label="Close fullscreen map"
                className="inline-flex size-10 items-center justify-center rounded-xl border border-vice-soft/20 bg-white/5 text-vice-text hover:bg-white/15"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <div
              className="relative mx-auto transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, fsZoom * 100)}%`, maxWidth: `${fsZoom * 920}px`, minWidth: `${fsZoom * 100}%` }}
            >
              <img
                src={mapSrc}
                alt="State of Leonida Fullscreen Map"
                className="block h-auto w-full rounded-2xl border border-vice-soft/20 shadow-2xl"
              />
              {showPins &&
                MAP_REGIONS.map((region) => {
                  const active = region.id === selectedId;
                  return (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => setSelectedId(region.id)}
                      style={{ left: `${region.x}%`, top: `${region.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold shadow-lg transition ${
                          active
                            ? 'scale-105 border-white bg-vice-deep/95 text-vice-peach'
                            : 'border-vice-soft/35 bg-vice-deep/80 text-vice-text hover:border-vice-peach'
                        }`}
                      >
                        <span className={`size-2 rounded-full ${active ? 'bg-vice-peach' : 'bg-vice-lavender'}`} />
                        <span>{isId ? region.name : region.nameEn}</span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
