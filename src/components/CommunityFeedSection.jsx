import { useState, useEffect, useMemo } from 'react';
import {
  INITIAL_COMMUNITY_POSTS,
  hydrateCommunityPosts,
  translateTextClient,
  fetchCommunityPostsRemote,
  createCommunityPostRemote,
  likeCommunityPostRemote,
  addCommunityCommentRemote,
  togglePinPostAdminRemote,
  deletePostAdminRemote,
  deleteCommentAdminRemote,
} from '../lib/communityApi';
import { isSupabaseReady } from '../lib/supabase';

const POST_TAGS = [
  { key: 'all', idLabel: 'Semua', enLabel: 'All' },
  { key: 'diskusi', idLabel: 'Diskusi', enLabel: 'Discussion' },
  { key: 'teori', idLabel: 'Teori', enLabel: 'Theory' },
  { key: 'tips', idLabel: 'Tips & Trik', enLabel: 'Tips & Tricks' },
  { key: 'screenshot', idLabel: 'Screenshot', enLabel: 'Screenshot' },
  { key: 'berita', idLabel: 'Berita', enLabel: 'News' },
];

const TAG_STYLE = {
  diskusi: 'bg-vice-lavender/15 text-vice-soft border-vice-lavender/25',
  teori: 'bg-vice-rose/15 text-vice-rose border-vice-rose/25',
  tips: 'bg-vice-mint/15 text-vice-mint border-vice-mint/25',
  screenshot: 'bg-vice-peach/15 text-vice-peach border-vice-peach/25',
  berita: 'bg-sky-400/15 text-sky-200 border-sky-400/25',
};

function readCache(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function formatRelativeTime(isoString, isId) {
  const ts = new Date(isoString).getTime();
  if (!Number.isFinite(ts)) return isId ? 'Baru saja' : 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return isId ? 'Baru saja' : 'Just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return isId ? `${mins} menit lalu` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isId ? `${hrs} jam lalu` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return isId ? `${days} hari lalu` : `${days}d ago`;
  return new Date(ts).toLocaleDateString(isId ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name) {
  const parts = String(name || 'VI')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'VI';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function compressImageFile(file, maxWidth = 960, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CommunityFeedSection({
  lang,
  isAdmin,
  adminSessionPin,
  onNotify,
}) {
  const isId = lang === 'id';

  const [posts, setPosts] = useState(() =>
    hydrateCommunityPosts(readCache('lkvi_community_posts_v1', INITIAL_COMMUNITY_POSTS))
  );
  const [likedIds, setLikedIds] = useState(() =>
    readCache('lkvi_liked_posts_v1', [])
  );
  const [loading, setLoading] = useState(isSupabaseReady);

  /* Filter & Sort States */
  const [activeTag, setActiveTag] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  /* Interactive UI States */
  const [composerOpen, setComposerOpen] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [submittingCommentId, setSubmittingCommentId] = useState('');
  const [confirmDeletePostId, setConfirmDeletePostId] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);

  /* On-Demand Post Translation Cache */
  const [translatedPosts, setTranslatedPosts] = useState({});
  const [translatingId, setTranslatingId] = useState('');

  /* Saved Author Identity */
  const savedProfile = useMemo(
    () => readCache('lkvi_author_profile', { author: '', region: 'Indonesia' }),
    []
  );

  /* Composer Form States */
  const [author, setAuthor] = useState(savedProfile.author || '');
  const [region, setRegion] = useState(savedProfile.region || 'Indonesia');
  const [tag, setTag] = useState('diskusi');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [formError, setFormError] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  /* Fetch Live Community Posts from Supabase */
  useEffect(() => {
    if (!isSupabaseReady) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const remote = await fetchCommunityPostsRemote();
        if (active && Array.isArray(remote)) {
          setPosts(hydrateCommunityPosts(remote));
        }
      } catch (err) {
        console.error('Failed loading community posts:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /* Persist Local Cache */
  useEffect(() => {
    try {
      localStorage.setItem('lkvi_community_posts_v1', JSON.stringify(posts));
    } catch {
      // ignore localStorage quota limits when posts include images
    }
  }, [posts]);

  useEffect(() => {
    try {
      localStorage.setItem('lkvi_liked_posts_v1', JSON.stringify(likedIds));
    } catch {
      // ignore
    }
  }, [likedIds]);

  /* Close Lightbox or Composer on Escape */
  useEffect(() => {
    if (!composerOpen && !lightboxImage) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (lightboxImage) setLightboxImage(null);
        else setComposerOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [composerOpen, lightboxImage]);

  const handleCardPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  const getTagLabel = (key) => {
    const found = POST_TAGS.find((item) => item.key === key);
    if (!found) return key;
    return isId ? found.idLabel : found.enLabel;
  };

  const handleToggleTranslatePost = async (post) => {
    const cacheKey = `${post.id}:${lang}`;
    const existing = translatedPosts[cacheKey];

    if (existing) {
      setTranslatedPosts((prev) => ({
        ...prev,
        [cacheKey]: { ...existing, active: !existing.active },
      }));
      return;
    }

    setTranslatingId(post.id);
    try {
      const [trTitle, trBody] = await Promise.all([
        translateTextClient(post.title, lang),
        translateTextClient(post.body, lang),
      ]);
      setTranslatedPosts((prev) => ({
        ...prev,
        [cacheKey]: {
          title: trTitle || post.title,
          body: trBody || post.body,
          active: true,
        },
      }));
    } catch {
      onNotify(
        isId
          ? 'Gagal menerjemahkan postingan saat ini.'
          : 'Could not translate this post right now.'
      );
    } finally {
      setTranslatingId('');
    }
  };

  const handlePickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError(isId ? 'File harus berupa gambar (JPG/PNG/WebP).' : 'File must be an image.');
      return;
    }
    try {
      const compressed = await compressImageFile(file);
      setImageUrl(compressed);
      setImagePreview(compressed);
      setFormError('');
    } catch {
      setFormError(isId ? 'Gagal memproses gambar.' : 'Failed to process image.');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const cleanAuthor =
      author.trim() || (isAdmin ? "LemonKeyS' VI Admin" : isId ? 'Player Leonida' : 'Leonida Player');
    const cleanRegion = region.trim() || 'Worldwide';

    if (cleanTitle.length < 4) {
      setFormError(
        isId ? 'Judul postingan minimal 4 karakter.' : 'Post title must be at least 4 characters.'
      );
      return;
    }
    if (cleanBody.length < 8) {
      setFormError(
        isId ? 'Isi postingan minimal 8 karakter.' : 'Post content must be at least 8 characters.'
      );
      return;
    }

    setSubmittingPost(true);
    setFormError('');

    const newPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: cleanAuthor,
      region: cleanRegion,
      tag,
      title: cleanTitle,
      titleEn: '',
      body: cleanBody,
      bodyEn: '',
      imageUrl: imageUrl.trim(),
      likes: 0,
      pinned: false,
      isAdminPost: isAdmin,
      createdAt: new Date().toISOString(),
      comments: [],
    };

    try {
      localStorage.setItem(
        'lkvi_author_profile',
        JSON.stringify({ author: author.trim(), region: cleanRegion })
      );
    } catch {
      // ignore
    }

    try {
      await createCommunityPostRemote(newPost);
      setPosts((prev) => {
        const pinned = prev.filter((p) => p.pinned);
        const rest = prev.filter((p) => !p.pinned);
        return [...pinned, newPost, ...rest];
      });
      setTitle('');
      setBody('');
      setImageUrl('');
      setImagePreview('');
      setComposerOpen(false);
      onNotify(
        isId
          ? 'Postingan komunitas berhasil dipublikasikan!'
          : 'Community post published globally!'
      );
    } catch {
      setFormError(
        isId
          ? 'Gagal mengirim ke database. Pastikan SQL tabel community_posts sudah dijalankan di Supabase.'
          : 'Failed to publish to database. Ensure community_posts SQL has been executed in Supabase.'
      );
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleLikePost = async (postId) => {
    if (likedIds.includes(postId)) {
      onNotify(isId ? 'Kamu sudah menyukai postingan ini.' : 'You already liked this post.');
      return;
    }

    setLikedIds((prev) => [...prev, postId]);
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    );

    try {
      const serverLikes = await likeCommunityPostRemote(postId);
      if (typeof serverLikes === 'number' && serverLikes > 0) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likes: serverLikes } : p))
        );
      }
    } catch {
      // keep optimistic state
    }
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const draft = (commentDrafts[postId] || '').trim();
    if (draft.length < 2) return;

    setSubmittingCommentId(postId);
    const commenterName =
      author.trim() || (isAdmin ? "LemonKeyS' VI Admin" : 'Player VI');

    const newComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      postId,
      author: commenterName,
      body: draft,
      bodyEn: '',
      isAdmin,
      createdAt: new Date().toISOString(),
    };

    try {
      await addCommunityCommentRemote(newComment);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: [...(p.comments || []), newComment] }
            : p
        )
      );
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      onNotify(isId ? 'Komentar terkirim!' : 'Comment posted!');
    } catch {
      onNotify(
        isId ? 'Gagal mengirim komentar ke server.' : 'Failed to post comment to server.'
      );
    } finally {
      setSubmittingCommentId('');
    }
  };

  const handleTogglePin = async (post) => {
    if (!isAdmin) return;
    const nextPinned = !post.pinned;
    try {
      const ok = await togglePinPostAdminRemote(adminSessionPin, post.id, nextPinned);
      if (!ok) {
        onNotify(isId ? 'Akses admin ditolak.' : 'Admin authorization failed.');
        return;
      }
      setPosts((prev) =>
        prev
          .map((p) => (p.id === post.id ? { ...p, pinned: nextPinned } : p))
          .sort((a, b) => Number(b.pinned) - Number(a.pinned))
      );
      onNotify(
        nextPinned
          ? isId
            ? 'Postingan disematkan di atas!'
            : 'Post pinned to top!'
          : isId
          ? 'Sematkan dilepas.'
          : 'Post unpinned.'
      );
    } catch {
      onNotify(isId ? 'Gagal memperbarui status pin.' : 'Failed to update pin status.');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!isAdmin) return;
    try {
      const ok = await deletePostAdminRemote(adminSessionPin, postId);
      if (!ok) {
        onNotify(isId ? 'Akses admin ditolak.' : 'Admin authorization failed.');
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setConfirmDeletePostId('');
      onNotify(isId ? 'Postingan dihapus dari database.' : 'Post deleted from database.');
    } catch {
      onNotify(isId ? 'Gagal menghapus postingan.' : 'Failed to delete post.');
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!isAdmin) return;
    try {
      const ok = await deleteCommentAdminRemote(adminSessionPin, commentId);
      if (!ok) {
        onNotify(isId ? 'Akses admin ditolak.' : 'Admin authorization failed.');
        return;
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: (p.comments || []).filter((c) => c.id !== commentId) }
            : p
        )
      );
      onNotify(isId ? 'Komentar dihapus.' : 'Comment removed.');
    } catch {
      onNotify(isId ? 'Gagal menghapus komentar.' : 'Failed to delete comment.');
    }
  };

  const handleSharePost = async (post, shownTitle, shownBody) => {
    const shareUrl = `${window.location.origin}/#komunitas`;
    const shareText = `${shownTitle} — LemonKeyS' VI Community\n${shareUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: shownTitle,
          text: shownBody.slice(0, 120),
          url: shareUrl,
        });
        return;
      }
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareText);
      }
      onNotify(isId ? 'Link postingan disalin!' : 'Post link copied!');
    } catch {
      // user cancelled native share
    }
  };

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = posts.filter((p) => {
      const matchTag = activeTag === 'all' || p.tag === activeTag;
      const haystack = [p.title, p.titleEn, p.body, p.bodyEn, p.author, p.region]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchSearch = !q || haystack.includes(q);
      return matchTag && matchSearch;
    });

    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
      if (sortBy === 'popular') return b.likes - a.likes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts, activeTag, search, sortBy]);

  return (
    <section id="komunitas" className="py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="reveal-item mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-vice-rose">
              {isId ? 'FORUM PEMAIN GLOBAL' : 'GLOBAL PLAYER BOARD'}
            </span>
            <h2 className="mt-1.5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {isId ? 'Community Post' : 'Community Posts'}
            </h2>
            <p className="mt-2 text-sm text-vice-sub sm:text-base">
              {isId
                ? 'Bagikan teori GTA 6, tips bermain, screenshot Leonida, atau ajak pemain seluruh dunia berdiskusi langsung.'
                : 'Share GTA 6 theories, gameplay tips, Leonida screenshots, and discuss live with players worldwide.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="inline-flex min-h-11 shrink-0 touch-manipulation items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-5 text-sm font-bold text-vice-deep shadow-lg shadow-vice-lavender/20 transition hover:-translate-y-0.5 active:scale-95"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>{isId ? 'Buat Postingan' : 'Create Post'}</span>
          </button>
        </div>

        {/* Filter, Search & Sort Bar */}
        <div className="reveal-item mb-6 space-y-4 rounded-3xl border border-vice-soft/15 bg-vice-card/75 p-4 backdrop-blur-md sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <svg
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-vice-muted"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isId
                    ? 'Cari topik diskusi, teori, atau nama pemain...'
                    : 'Search discussions, theories, or player name...'
                }
                aria-label={isId ? 'Cari postingan komunitas' : 'Search community posts'}
                className="min-h-12 w-full rounded-2xl border border-vice-soft/15 bg-vice-deep/80 pl-11 pr-4 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none sm:text-base"
              />
            </div>

            {/* Sort Toggle */}
            <div
              className="inline-flex shrink-0 rounded-xl border border-vice-soft/15 bg-vice-deep/65 p-1"
              role="group"
              aria-label={isId ? 'Urutkan postingan' : 'Sort posts'}
            >
              {[
                { key: 'latest', label: isId ? 'Terbaru' : 'Latest' },
                { key: 'popular', label: isId ? 'Populer' : 'Top Liked' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSortBy(opt.key)}
                  aria-pressed={sortBy === opt.key}
                  className={`min-h-10 touch-manipulation rounded-lg px-3.5 text-xs font-semibold transition active:scale-95 ${
                    sortBy === opt.key
                      ? 'bg-gradient-to-r from-vice-soft to-vice-rose text-vice-deep'
                      : 'text-vice-sub hover:text-vice-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={isId ? 'Filter topik postingan' : 'Filter post topics'}
            >
              {POST_TAGS.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setActiveTag(chip.key)}
                  aria-pressed={activeTag === chip.key}
                  className={`min-h-10 touch-manipulation rounded-full border px-4 text-xs font-semibold transition active:scale-95 sm:text-sm ${
                    activeTag === chip.key
                      ? 'border-vice-lavender bg-vice-lavender/25 text-vice-text shadow-sm'
                      : 'border-vice-soft/15 bg-vice-lavender/10 text-vice-sub hover:border-vice-soft/35 hover:text-vice-text'
                  }`}
                >
                  {isId ? chip.idLabel : chip.enLabel}
                </button>
              ))}
            </div>

            <p className="font-mono text-xs font-semibold text-vice-soft" role="status" aria-live="polite">
              {isId
                ? `${filteredPosts.length} dari ${posts.length} postingan`
                : `${filteredPosts.length} of ${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`}
            </p>
          </div>
        </div>

        {/* Skeleton Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-busy="true">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="animate-pulse space-y-4 rounded-3xl border border-vice-soft/15 bg-vice-card/60 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-white/10" />
                  <div className="space-y-2">
                    <div className="h-3 w-32 rounded bg-white/10" />
                    <div className="h-2.5 w-24 rounded bg-white/5" />
                  </div>
                </div>
                <div className="h-5 w-3/4 rounded bg-white/10" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-white/5" />
                  <div className="h-3 w-5/6 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="animate-card-in flex flex-col items-center gap-3 rounded-3xl border border-vice-soft/15 bg-vice-card/70 px-6 py-12 text-center">
            <h3 className="font-display text-lg font-bold text-vice-text">
              {isId ? 'Belum ada postingan di topik ini' : 'No posts match your filter'}
            </h3>
            <p className="max-w-md text-sm text-vice-sub">
              {isId
                ? 'Jadilah pemain pertama yang memulai diskusi atau reset filter pencarian.'
                : 'Be the first player to start a conversation or reset your search filters.'}
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTag('all');
                  setSearch('');
                }}
                className="min-h-11 rounded-full border border-vice-soft/30 bg-vice-elevated px-5 text-sm font-semibold text-vice-text hover:bg-vice-lavender/20"
              >
                {isId ? 'Reset Filter' : 'Reset Filters'}
              </button>
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="min-h-11 rounded-full bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-5 text-sm font-bold text-vice-deep"
              >
                {isId ? 'Tulis Post Pertama' : 'Write First Post'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            {filteredPosts.map((post, idx) => {
              const isLiked = likedIds.includes(post.id);
              const commentsOpen = Boolean(expandedComments[post.id]);
              const commentsList = post.comments || [];
              const tagClass =
                TAG_STYLE[post.tag] || 'bg-vice-lavender/15 text-vice-soft border-vice-lavender/25';

              const hasBuiltInBilingual = Boolean(post.titleEn && post.bodyEn);
              const cacheKey = `${post.id}:${lang}`;
              const trEntry = translatedPosts[cacheKey];
              const isShowingTranslation = !hasBuiltInBilingual && Boolean(trEntry?.active);
              const isTranslating = translatingId === post.id;

              const displayTitle = isShowingTranslation
                ? trEntry.title
                : !isId && post.titleEn
                ? post.titleEn
                : post.title;
              const displayBody = isShowingTranslation
                ? trEntry.body
                : !isId && post.bodyEn
                ? post.bodyEn
                : post.body;

              const commentWord = isId
                ? 'Komentar'
                : commentsList.length === 1
                ? 'Comment'
                : 'Comments';

              return (
                <article
                  key={`${post.id}-${lang}`}
                  onMouseMove={handleCardPointerMove}
                  style={{ animationDelay: `${Math.min(idx * 35, 220)}ms` }}
                  className={`spotlight-card animate-card-in flex flex-col gap-4 rounded-3xl border bg-vice-card/80 p-5 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 ${
                    post.pinned
                      ? 'border-vice-peach/45 ring-1 ring-vice-peach/20'
                      : 'border-vice-soft/15 hover:border-vice-soft/35'
                  }`}
                >
                  {/* Author Header & Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-2xl font-display text-xs font-extrabold ${
                          post.isAdminPost
                            ? 'bg-gradient-to-br from-vice-soft via-vice-rose to-vice-peach text-vice-deep shadow-md shadow-vice-rose/20'
                            : 'border border-vice-soft/25 bg-vice-deep/85 text-vice-soft'
                        }`}
                        aria-hidden="true"
                      >
                        {getInitials(post.author)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-vice-text">
                            {post.author}
                          </span>
                          {post.isAdminPost && (
                            <span className="rounded-full bg-vice-mint/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-vice-mint">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-vice-muted">
                          {post.region} &bull; {formatRelativeTime(post.createdAt, isId)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      {post.pinned && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-vice-peach/35 bg-vice-peach/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-vice-peach">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M16 3l5 5-3 3-1-1-4 4v5l-2 2-3-3-5 5-1-1 5-5-3-3 2-2h5l4-4-1-1 3-3z" />
                          </svg>
                          <span>{isId ? 'Disematkan' : 'Pinned'}</span>
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase ${tagClass}`}
                      >
                        {getTagLabel(post.tag)}
                      </span>
                    </div>
                  </div>

                  {/* Content Body */}
                  <div className="space-y-2.5">
                    {isShowingTranslation && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-vice-lavender/30 bg-vice-lavender/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-vice-soft">
                        {isId ? 'Diterjemahkan ke ID' : 'Translated to EN'}
                      </span>
                    )}

                    <h3 className="break-words font-display text-lg font-bold leading-snug text-vice-text">
                      {displayTitle}
                    </h3>
                    <p className="whitespace-pre-line break-words text-sm leading-relaxed text-vice-sub">
                      {displayBody}
                    </p>

                    {post.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setLightboxImage({ src: post.imageUrl, title: displayTitle })}
                        className="group relative block w-full overflow-hidden rounded-2xl border border-vice-soft/20 bg-vice-deep/80 text-left focus:outline-none focus:ring-2 focus:ring-vice-lavender"
                      >
                        <img
                          src={post.imageUrl}
                          alt={displayTitle}
                          loading="lazy"
                          className="aspect-[16/9] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-vice-deep/80 px-2.5 py-1 font-mono text-[10px] font-semibold text-vice-text backdrop-blur-md">
                          {isId ? 'Perbesar' : 'Expand'}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Interactive Footer Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-vice-soft/15 pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Like Button */}
                      <button
                        type="button"
                        onClick={() => handleLikePost(post.id)}
                        aria-pressed={isLiked}
                        aria-label={isId ? `Sukai postingan (${post.likes})` : `Like post (${post.likes})`}
                        className={`inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition active:scale-90 ${
                          isLiked
                            ? 'border-vice-rose bg-vice-rose/20 text-rose-100'
                            : 'border-vice-soft/15 bg-vice-deep/65 text-vice-sub hover:border-vice-rose/45 hover:text-vice-text'
                        }`}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill={isLiked ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span className="tabular-nums">{post.likes}</span>
                      </button>

                      {/* Comments Toggle */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedComments((prev) => ({
                            ...prev,
                            [post.id]: !prev[post.id],
                          }))
                        }
                        aria-expanded={commentsOpen}
                        className={`inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition active:scale-95 ${
                          commentsOpen
                            ? 'border-vice-lavender bg-vice-lavender/20 text-vice-text'
                            : 'border-vice-soft/15 bg-vice-deep/65 text-vice-sub hover:border-vice-soft/35 hover:text-vice-text'
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="tabular-nums">{commentsList.length}</span>
                        <span className="hidden sm:inline">{commentWord}</span>
                      </button>

                      {/* On-Demand Translate Button for Community-Submitted Posts */}
                      {!hasBuiltInBilingual && (
                        <button
                          type="button"
                          onClick={() => handleToggleTranslatePost(post)}
                          disabled={isTranslating}
                          aria-pressed={isShowingTranslation}
                          className={`inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition active:scale-95 disabled:opacity-60 ${
                            isShowingTranslation
                              ? 'border-vice-soft/45 bg-vice-lavender/20 text-vice-soft'
                              : 'border-vice-soft/15 bg-vice-deep/65 text-vice-sub hover:border-vice-soft/35 hover:text-vice-text'
                          }`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 8l6 6" />
                            <path d="M4 14l6-6 2-3" />
                            <path d="M2 5h12" />
                            <path d="M7 2h1" />
                            <path d="M22 22l-5-10-5 10" />
                            <path d="M14 18h6" />
                          </svg>
                          <span>
                            {isTranslating
                              ? isId
                                ? 'Menerjemahkan...'
                                : 'Translating...'
                              : isShowingTranslation
                              ? isId
                                ? 'Asli'
                                : 'Original'
                              : isId
                              ? 'Terjemahkan'
                              : 'Translate'}
                          </span>
                        </button>
                      )}

                      {/* Share Button */}
                      <button
                        type="button"
                        onClick={() => handleSharePost(post, displayTitle, displayBody)}
                        aria-label={isId ? 'Bagikan postingan' : 'Share post'}
                        className="inline-flex size-11 touch-manipulation items-center justify-center rounded-xl border border-vice-soft/15 bg-vice-deep/65 text-vice-sub transition hover:border-vice-soft/35 hover:text-vice-text active:scale-90"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                      </button>
                    </div>

                    {/* Admin Moderation Controls */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(post)}
                          className="min-h-10 rounded-xl border border-vice-peach/30 bg-vice-peach/10 px-2.5 text-xs font-semibold text-vice-peach hover:bg-vice-peach/20"
                        >
                          {post.pinned ? (isId ? 'Lepas Pin' : 'Unpin') : 'Pin'}
                        </button>

                        {confirmDeletePostId === post.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              className="min-h-10 rounded-xl bg-red-500/85 px-2.5 text-xs font-bold text-white hover:bg-red-500"
                            >
                              {isId ? 'Yakin Hapus' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeletePostId('')}
                              className="min-h-10 rounded-xl border border-vice-soft/20 px-2.5 text-xs text-vice-sub"
                            >
                              {isId ? 'Batal' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePostId(post.id)}
                            className="min-h-10 rounded-xl border border-red-400/25 bg-red-500/10 px-2.5 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                          >
                            {isId ? 'Hapus' : 'Delete'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expandable Comments Drawer */}
                  {commentsOpen && (
                    <div className="animate-drawer space-y-3 border-t border-vice-soft/15 pt-3">
                      {commentsList.length === 0 ? (
                        <p className="text-xs text-vice-muted">
                          {isId
                            ? 'Belum ada komentar. Mulai balasan pertama!'
                            : 'No comments yet. Start the discussion!'}
                        </p>
                      ) : (
                        <ul className="space-y-2.5">
                          {commentsList.map((cmt) => {
                            const cmtBody = !isId && cmt.bodyEn ? cmt.bodyEn : cmt.body;
                            return (
                              <li
                                key={cmt.id}
                                className="rounded-2xl border border-vice-soft/10 bg-vice-deep/70 p-3"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="font-bold text-vice-text">{cmt.author}</span>
                                    {cmt.isAdmin && (
                                      <span className="rounded-full bg-vice-mint/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-vice-mint">
                                        Admin
                                      </span>
                                    )}
                                    <span className="text-[11px] text-vice-muted">
                                      &bull; {formatRelativeTime(cmt.createdAt, isId)}
                                    </span>
                                  </div>

                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(post.id, cmt.id)}
                                      className="text-[11px] font-semibold text-red-300 hover:text-red-200"
                                    >
                                      {isId ? 'Hapus' : 'Delete'}
                                    </button>
                                  )}
                                </div>
                                <p className="mt-1 break-words text-xs leading-relaxed text-vice-sub">
                                  {cmtBody}
                                </p>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {/* Inline Reply Form */}
                      <form
                        onSubmit={(e) => handleAddComment(e, post.id)}
                        className="flex flex-col gap-2 sm:flex-row"
                      >
                        <input
                          type="text"
                          value={commentDrafts[post.id] || ''}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          placeholder={
                            isId ? 'Tulis komentar atau balasan...' : 'Write a reply...'
                          }
                          aria-label={isId ? 'Tulis komentar' : 'Write a comment'}
                          className="min-h-11 flex-1 rounded-xl border border-vice-soft/20 bg-vice-deep/85 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={
                            submittingCommentId === post.id ||
                            !(commentDrafts[post.id] || '').trim()
                          }
                          className="min-h-11 shrink-0 rounded-xl bg-vice-lavender/25 px-4 text-xs font-bold text-vice-text transition hover:bg-vice-lavender/35 active:scale-95 disabled:opacity-45"
                        >
                          {submittingCommentId === post.id
                            ? isId
                              ? 'Mengirim...'
                              : 'Sending...'
                            : isId
                            ? 'Kirim'
                            : 'Reply'}
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {composerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="createPostModalTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget) setComposerOpen(false);
          }}
        >
          <div className="animate-modal max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-vice-soft/25 bg-[#1f1a33] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-vice-rose">
                  {isId ? 'POSTINGAN BARU KOMUNITAS' : 'NEW COMMUNITY POST'}
                </span>
                <h3
                  id="createPostModalTitle"
                  className="mt-1 font-display text-xl font-bold text-vice-text"
                >
                  {isId ? 'Bagikan ke Pemain GTA 6' : 'Share with GTA 6 Players'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                aria-label={isId ? 'Tutup form' : 'Close dialog'}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-vice-soft/15 bg-white/5 text-vice-text hover:bg-white/10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-vice-rose/40 bg-vice-rose/15 px-3.5 py-2.5 text-sm text-rose-100"
                >
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="postAuthor"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-vice-sub"
                  >
                    {isId ? 'Nama / Nickname' : 'Name / Nickname'}
                  </label>
                  <input
                    id="postAuthor"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={isAdmin ? "LemonKeyS' VI Admin" : 'ViceRider99'}
                    className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep/85 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="postRegion"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-vice-sub"
                  >
                    {isId ? 'Asal / Negara' : 'Region / Country'}
                  </label>
                  <input
                    id="postRegion"
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Indonesia / Global"
                    className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep/85 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-vice-sub">
                  {isId ? 'Kategori Topik *' : 'Topic Category *'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {POST_TAGS.filter((t) => t.key !== 'all').map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTag(t.key)}
                      aria-pressed={tag === t.key}
                      className={`min-h-10 rounded-full border px-3.5 text-xs font-semibold transition active:scale-95 ${
                        tag === t.key
                          ? 'border-vice-lavender bg-vice-lavender/25 text-vice-text'
                          : 'border-vice-soft/15 bg-vice-deep/65 text-vice-sub hover:text-vice-text'
                      }`}
                    >
                      {isId ? t.idLabel : t.enLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="postTitle"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-vice-sub"
                >
                  {isId ? 'Judul Postingan *' : 'Post Title *'}
                </label>
                <input
                  id="postTitle"
                  type="text"
                  required
                  maxLength={120}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFormError('');
                  }}
                  placeholder={
                    isId
                      ? 'Contoh: Teori lokasi tersembunyi di Vice Beach...'
                      : 'Example: Hidden detail spotted near Vice Beach...'
                  }
                  className="min-h-11 w-full rounded-xl border border-vice-soft/20 bg-vice-deep/85 px-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="postBody"
                    className="text-xs font-semibold uppercase tracking-wider text-vice-sub"
                  >
                    {isId ? 'Isi Postingan *' : 'Post Body *'}
                  </label>
                  <span className="font-mono text-[11px] text-vice-muted">{body.length}/1000</span>
                </div>
                <textarea
                  id="postBody"
                  rows={4}
                  required
                  maxLength={1000}
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    setFormError('');
                  }}
                  placeholder={
                    isId
                      ? 'Tulis teori, pengalaman, atau pertanyaanmu di sini...'
                      : 'Write your thoughts, theories, or tips here...'
                  }
                  className="w-full rounded-xl border border-vice-soft/20 bg-vice-deep/85 p-3.5 text-sm text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
                />
              </div>

              {/* Optional Image Attachment */}
              <div className="space-y-2.5 rounded-2xl border border-vice-soft/15 bg-vice-deep/60 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-vice-sub">
                    {isId ? 'Lampiran Gambar (Opsional)' : 'Image Attachment (Optional)'}
                  </span>
                  <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-vice-peach/35 bg-vice-peach/15 px-3 text-xs font-semibold text-vice-peach hover:bg-vice-peach/25">
                    <span>{isId ? 'Pilih dari Galeri' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePickPhoto}
                      className="sr-only"
                    />
                  </label>
                </div>

                <input
                  type="url"
                  value={imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImagePreview(e.target.value);
                  }}
                  placeholder={
                    isId ? 'Atau tempel URL gambar https://...' : 'Or paste image URL https://...'
                  }
                  aria-label={isId ? 'URL gambar opsional' : 'Optional image URL'}
                  className="min-h-10 w-full rounded-xl border border-vice-soft/15 bg-vice-deep px-3 text-xs text-vice-text placeholder:text-vice-muted focus:border-vice-lavender focus:outline-none"
                />

                {imagePreview && (
                  <div className="relative overflow-hidden rounded-xl border border-vice-soft/20">
                    <img
                      src={imagePreview}
                      alt={isId ? 'Pratinjau gambar' : 'Image preview'}
                      className="max-h-44 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        setImagePreview('');
                      }}
                      className="absolute right-2 top-2 rounded-lg bg-black/75 px-2.5 py-1 text-xs font-semibold text-white hover:bg-black"
                    >
                      {isId ? 'Hapus Foto' : 'Remove'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="min-h-11 rounded-xl border border-vice-soft/20 px-4 text-sm font-semibold text-vice-sub hover:bg-white/5"
                >
                  {isId ? 'Batal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="min-h-11 rounded-xl bg-gradient-to-r from-vice-soft via-vice-rose to-vice-peach px-5 text-sm font-bold text-vice-deep shadow-lg transition hover:opacity-95 disabled:opacity-50"
                >
                  {submittingPost
                    ? isId
                      ? 'Menerbitkan...'
                      : 'Publishing...'
                    : isId
                    ? 'Terbitkan Post'
                    : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxImage(null)}
        >
          <div className="animate-modal relative max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              aria-label={isId ? 'Tutup gambar' : 'Close image'}
              className="absolute -top-12 right-0 inline-flex min-h-10 items-center rounded-xl border border-white/20 bg-vice-card/90 px-3.5 text-xs font-bold text-vice-text hover:bg-vice-elevated"
            >
              {isId ? 'Tutup' : 'Close'}
            </button>
            <img
              src={lightboxImage.src}
              alt={lightboxImage.title}
              className="max-h-[82dvh] w-auto rounded-2xl border border-vice-soft/25 shadow-2xl"
            />
          </div>
        </div>
      )}
    </section>
  );
}
