const GRADIENT_STOPS = {
  'from-vice-soft via-vice-rose to-vice-peach': ['#c4b5fd', '#df8fa3', '#ebb79f'],
  'from-[#b6a6ff] via-[#8d74e8] to-[#c996d8]': ['#b6a6ff', '#8d74e8', '#c996d8'],
  'from-[#e5a8bc] via-[#c782a6] to-[#9b84e6]': ['#e5a8bc', '#c782a6', '#9b84e6'],
  'from-[#94d5e3] via-[#a78bfa] to-[#df8fa3]': ['#94d5e3', '#a78bfa', '#df8fa3'],
};

function setFaviconTags(href, type = 'image/png') {
  if (typeof document === 'undefined' || !href) return;
  const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];

  rels.forEach((rel) => {
    let link = document.querySelector(`link[rel="${rel}"][data-dynamic-favicon="true"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      link.setAttribute('data-dynamic-favicon', 'true');
      document.head.appendChild(link);
    }
    if (rel !== 'apple-touch-icon') {
      link.type = type;
    }
    link.href = href;
  });
}

function buildMonogramSvgDataUrl(logo) {
  const text = String(logo?.text || 'VI').slice(0, 3).toUpperCase();
  const safeText = text.replace(/[<>&"']/g, '');
  const stops = GRADIENT_STOPS[logo?.gradient] || GRADIENT_STOPS['from-vice-soft via-vice-rose to-vice-peach'];
  const radius = logo?.shape === 'rounded-full' ? 64 : 26;
  const fontSize = safeText.length >= 3 ? 44 : 56;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${stops[0]}" />
          <stop offset="52%" stop-color="${stops[1]}" />
          <stop offset="100%" stop-color="${stops[2]}" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="${radius}" fill="url(#g)" />
      <text x="64" y="82" text-anchor="middle" font-family="Outfit, system-ui, sans-serif" font-size="${fontSize}" font-weight="800" fill="#151221">${safeText}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function syncDocumentFavicon(brandLogo) {
  if (typeof document === 'undefined' || !brandLogo) return;

  if (brandLogo.type === 'image' && brandLogo.url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const radius = brandLogo.shape === 'rounded-full' ? size / 2 : 26;

        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.arcTo(size, 0, size, size, radius);
        ctx.arcTo(size, size, 0, size, radius);
        ctx.arcTo(0, size, 0, 0, radius);
        ctx.arcTo(0, 0, size, 0, radius);
        ctx.closePath();
        ctx.clip();

        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

        setFaviconTags(canvas.toDataURL('image/png'), 'image/png');
      } catch {
        setFaviconTags(brandLogo.url, 'image/png');
      }
    };
    img.onerror = () => {
      setFaviconTags('/logo.png?v=3', 'image/png');
    };
    img.src = brandLogo.url;
    return;
  }

  // Jika masih monogram default, biarkan /logo.png statis tampil jika tersedia;
  // jika admin mengganti teks/warna monogram, sinkronkan ke tab browser.
  const isDefaultVi =
    (!brandLogo.text || brandLogo.text === 'VI') &&
    (!brandLogo.gradient || brandLogo.gradient === 'from-vice-soft via-vice-rose to-vice-peach') &&
    (!brandLogo.shape || brandLogo.shape === 'rounded-xl');

  if (!isDefaultVi) {
    setFaviconTags(buildMonogramSvgDataUrl(brandLogo), 'image/svg+xml');
  }
}
