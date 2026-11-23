import { supabase, isSupabaseReady } from './supabase';

const STARTER_POST_TRANSLATIONS = {
  'post-welcome-vi': {
    titleEn: "Welcome to the LemonKeyS' VI Community Board!",
    bodyEn:
      'A global discussion space to share Lucia & Jason story theories, hidden locations across the State of Leonida, gameplay tips, and your favorite screenshots. Keep discussions fun and respectful!',
  },
  'post-theory-keys': {
    titleEn: 'Which region on the Leonida Map are you exploring first?',
    bodyEn:
      'Looking at the Leonida map above, the route heading straight south from Vice Beach toward the Key Lento islands looks amazing for speedboat races and hunting underwater Easter Eggs. Where are you heading first?',
  },
};

const STARTER_COMMENT_TRANSLATIONS = {
  'cmt-welcome-1': {
    bodyEn: 'Finally a clean, fast GTA 6 community hangout that feels smooth on mobile!',
  },
};

export const INITIAL_COMMUNITY_POSTS = [
  {
    id: 'post-welcome-vi',
    author: "LemonKeyS' VI Admin",
    region: 'Indonesia',
    tag: 'berita',
    title: "Selamat Datang di Board Komunitas LemonKeyS' VI!",
    titleEn: STARTER_POST_TRANSLATIONS['post-welcome-vi'].titleEn,
    body: 'Ruang diskusi global untuk berbagi teori cerita Lucia & Jason, temuan lokasi rahasia di State of Leonida, tips gameplay, hingga tangkapan layar favoritmu. Jaga diskusi tetap seru dan saling menghargai!',
    bodyEn: STARTER_POST_TRANSLATIONS['post-welcome-vi'].bodyEn,
    imageUrl: '',
    likes: 12,
    pinned: true,
    isAdminPost: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    comments: [
      {
        id: 'cmt-welcome-1',
        postId: 'post-welcome-vi',
        author: 'ViceExplorer',
        body: 'Akhirnya ada tempat nongkrong komunitas GTA 6 yang bersih dan kencang di HP!',
        bodyEn: STARTER_COMMENT_TRANSLATIONS['cmt-welcome-1'].bodyEn,
        isAdmin: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      },
    ],
  },
  {
    id: 'post-theory-keys',
    author: 'LeonidaScout',
    region: 'Global',
    tag: 'teori',
    title: 'Wilayah mana di Peta Leonida yang paling wajib dijelajahi pertama kali?',
    titleEn: STARTER_POST_TRANSLATIONS['post-theory-keys'].titleEn,
    body: 'Kalau lihat peta Leonida di atas, rute dari Vice Beach lurus ke selatan menuju rangkaian pulau Key Lento terlihat sangat menarik untuk balapan speedboat dan berburu Easter Egg bawah laut. Kalian bakal mampir ke mana dulu?',
    bodyEn: STARTER_POST_TRANSLATIONS['post-theory-keys'].bodyEn,
    imageUrl: '',
    likes: 7,
    pinned: false,
    isAdminPost: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    comments: [],
  },
];

export function hydrateCommunityPosts(list) {
  if (!Array.isArray(list)) return INITIAL_COMMUNITY_POSTS;
  return list.map((post) => {
    const starterPost = STARTER_POST_TRANSLATIONS[post.id];
    const comments = Array.isArray(post.comments)
      ? post.comments.map((cmt) => {
          const starterCmt = STARTER_COMMENT_TRANSLATIONS[cmt.id];
          return {
            ...cmt,
            bodyEn: cmt.bodyEn || starterCmt?.bodyEn || '',
          };
        })
      : [];

    return {
      ...post,
      titleEn: post.titleEn || starterPost?.titleEn || '',
      bodyEn: post.bodyEn || starterPost?.bodyEn || '',
      comments,
    };
  });
}

export async function translateTextClient(text, targetLang) {
  const clean = String(text || '').trim();
  if (!clean) return '';

  // Primary: fast client-side Google Translate GTX endpoint
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      targetLang
    )}&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.[0])) {
        const joined = data[0].map((part) => (Array.isArray(part) ? part[0] : '')).join('');
        if (joined.trim()) return joined.trim();
      }
    }
  } catch {
    // fallback below
  }

  // Fallback: MyMemory public translation API
  const sourceLang = targetLang === 'en' ? 'id' : 'en';
  const fallbackUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    clean.slice(0, 480)
  )}&langpair=${sourceLang}|${targetLang}`;
  const res = await fetch(fallbackUrl);
  if (!res.ok) throw new Error('Translation request failed');
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error('Empty translation result');
  return translated.trim();
}

const toCommentApp = (row) => ({
  id: row.id,
  postId: row.post_id,
  author: row.author || 'Player VI',
  body: row.body,
  bodyEn: STARTER_COMMENT_TRANSLATIONS[row.id]?.bodyEn || '',
  isAdmin: Boolean(row.is_admin),
  createdAt: row.created_at || new Date().toISOString(),
});

const toPostApp = (row, commentsByPost) => ({
  id: row.id,
  author: row.author || 'Player VI',
  region: row.region || 'Worldwide',
  tag: row.tag || 'diskusi',
  title: row.title,
  titleEn: STARTER_POST_TRANSLATIONS[row.id]?.titleEn || '',
  body: row.body,
  bodyEn: STARTER_POST_TRANSLATIONS[row.id]?.bodyEn || '',
  imageUrl: row.image_url || '',
  likes: Number(row.likes) || 0,
  pinned: Boolean(row.pinned),
  isAdminPost: Boolean(row.is_admin_post),
  createdAt: row.created_at || new Date().toISOString(),
  comments: commentsByPost[row.id] || [],
});

const toPostRow = (post) => ({
  id: post.id,
  author: post.author || 'Player VI',
  region: post.region || 'Worldwide',
  tag: post.tag || 'diskusi',
  title: post.title,
  body: post.body,
  image_url: post.imageUrl || null,
  likes: Number(post.likes) || 0,
  pinned: Boolean(post.pinned),
  is_admin_post: Boolean(post.isAdminPost),
});

export async function fetchCommunityPostsRemote() {
  if (!isSupabaseReady || !supabase) return null;

  const [postsRes, commentsRes] = await Promise.all([
    supabase
      .from('community_posts')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('community_comments')
      .select('*')
      .order('created_at', { ascending: true }),
  ]);

  if (postsRes.error) throw postsRes.error;
  if (commentsRes.error) throw commentsRes.error;

  const postsData = postsRes.data || [];
  const commentsData = commentsRes.data || [];

  // Auto-seed 2 post pembuka saat tabel pertama kali kosong
  if (postsData.length === 0) {
    const seedPosts = INITIAL_COMMUNITY_POSTS.map(toPostRow);
    const { error: seedPostErr } = await supabase
      .from('community_posts')
      .upsert(seedPosts, { onConflict: 'id' });
    if (seedPostErr) throw seedPostErr;

    const starterComments = INITIAL_COMMUNITY_POSTS.flatMap((p) =>
      (p.comments || []).map((c) => ({
        id: c.id,
        post_id: p.id,
        author: c.author,
        body: c.body,
        is_admin: Boolean(c.isAdmin),
      }))
    );

    if (starterComments.length > 0) {
      await supabase
        .from('community_comments')
        .upsert(starterComments, { onConflict: 'id' });
    }
    return INITIAL_COMMUNITY_POSTS;
  }

  const commentsByPost = {};
  commentsData.forEach((row) => {
    const mapped = toCommentApp(row);
    if (!commentsByPost[mapped.postId]) {
      commentsByPost[mapped.postId] = [];
    }
    commentsByPost[mapped.postId].push(mapped);
  });

  return hydrateCommunityPosts(
    postsData.map((row) => toPostApp(row, commentsByPost))
  );
}

export async function createCommunityPostRemote(post) {
  if (!isSupabaseReady || !supabase) return true;
  const { error } = await supabase.from('community_posts').insert(toPostRow(post));
  if (error) throw error;
  return true;
}

export async function likeCommunityPostRemote(postId) {
  if (!isSupabaseReady || !supabase) return null;
  const { data, error } = await supabase.rpc('like_community_post', {
    target_id: postId,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : null;
}

export async function addCommunityCommentRemote(comment) {
  if (!isSupabaseReady || !supabase) return true;
  const { error } = await supabase.from('community_comments').insert({
    id: comment.id,
    post_id: comment.postId,
    author: comment.author,
    body: comment.body,
    is_admin: Boolean(comment.isAdmin),
  });
  if (error) throw error;
  return true;
}

export async function togglePinPostAdminRemote(pin, postId, nextPinned) {
  if (!isSupabaseReady || !supabase) return true;
  const { data, error } = await supabase.rpc('admin_toggle_pin_post', {
    input_pin: pin,
    target_id: postId,
    next_pinned: nextPinned,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function deletePostAdminRemote(pin, postId) {
  if (!isSupabaseReady || !supabase) return true;
  const { data, error } = await supabase.rpc('admin_delete_post', {
    input_pin: pin,
    target_id: postId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function deleteCommentAdminRemote(pin, commentId) {
  if (!isSupabaseReady || !supabase) return true;
  const { data, error } = await supabase.rpc('admin_delete_comment', {
    input_pin: pin,
    target_id: commentId,
  });
  if (error) throw error;
  return Boolean(data);
}
