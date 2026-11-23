import { supabase, isSupabaseReady } from './supabase';

export const INITIAL_COMMUNITY_POSTS = [
  {
    id: 'post-welcome-vi',
    author: "LemonKeyS' VI Admin",
    region: 'Indonesia',
    tag: 'berita',
    title: "Selamat Datang di Board Komunitas LemonKeyS' VI!",
    body: 'Ruang diskusi global untuk berbagi teori cerita Lucia & Jason, temuan lokasi rahasia di State of Leonida, tips gameplay, hingga tangkapan layar favoritmu. Jaga diskusi tetap seru dan saling menghargai!',
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
    body: 'Kalau lihat peta Leonida di atas, rute dari Vice Beach lurus ke selatan menuju rangkaian pulau Key Lento terlihat sangat menarik untuk balapan speedboat dan berburu Easter Egg bawah laut. Kalian bakal mampir ke mana dulu?',
    imageUrl: '',
    likes: 7,
    pinned: false,
    isAdminPost: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    comments: [],
  },
];

const toCommentApp = (row) => ({
  id: row.id,
  postId: row.post_id,
  author: row.author || 'Player VI',
  body: row.body,
  isAdmin: Boolean(row.is_admin),
  createdAt: row.created_at || new Date().toISOString(),
});

const toPostApp = (row, commentsByPost) => ({
  id: row.id,
  author: row.author || 'Player VI',
  region: row.region || 'Worldwide',
  tag: row.tag || 'diskusi',
  title: row.title,
  body: row.body,
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

  return postsData.map((row) => toPostApp(row, commentsByPost));
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
