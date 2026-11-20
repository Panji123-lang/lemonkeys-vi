import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseReady = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('GANTI_') &&
    !supabaseAnonKey.includes('GANTI_')
);

export const supabase = isSupabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/* Mapping Helpers (DB snake_case <-> App camelCase) */
const toCheatApp = (row) => ({
  id: row.id,
  name: row.name,
  nameEn: row.name_en || row.name,
  category: row.category,
  requirement: row.requirement,
  requirementEn: row.requirement_en || row.requirement,
  code: Array.isArray(row.code) ? row.code : null,
  author: row.author || 'Player Global',
  authorEn: row.author_en || row.author || 'Player Global',
  region: row.region || 'Worldwide',
  isCommunity: Boolean(row.is_community),
  updatedByCommunity: Boolean(row.updated_by_community),
});

const toCheatRow = (item) => ({
  id: item.id,
  name: item.name,
  name_en: item.nameEn || item.name,
  category: item.category || 'umum',
  requirement: item.requirement,
  requirement_en: item.requirementEn || item.requirement,
  code: Array.isArray(item.code) && item.code.length > 0 ? item.code : null,
  author: item.author || 'Player Global',
  author_en: item.authorEn || item.author || 'Player Global',
  region: item.region || 'Worldwide',
  is_community: Boolean(item.isCommunity),
  updated_by_community: Boolean(item.updatedByCommunity),
});

const toMysteryApp = (row) => ({
  id: row.id,
  type: row.type,
  level: Number(row.level) || 3,
  title: row.title,
  titleEn: row.title_en || row.title,
  location: row.location,
  locationEn: row.location_en || row.location,
  coord: row.coord || '',
  coordEn: row.coord_en || row.coord || '',
  excerpt: row.excerpt,
  excerptEn: row.excerpt_en || row.excerpt,
  story: row.story,
  storyEn: row.story_en || row.story,
  clues: Array.isArray(row.clues) ? row.clues : [],
  cluesEn: Array.isArray(row.clues_en) ? row.clues_en : row.clues || [],
  author: row.author || 'Explorer VI',
  region: row.region || 'Worldwide',
  votes: Number(row.votes) || 1,
  isCommunity: Boolean(row.is_community),
});

const toMysteryRow = (item) => ({
  id: item.id,
  type: item.type || 'misteri',
  level: Number(item.level) || 3,
  title: item.title,
  title_en: item.titleEn || item.title,
  location: item.location,
  location_en: item.locationEn || item.location,
  coord: item.coord || '',
  coord_en: item.coordEn || item.coord || '',
  excerpt: item.excerpt,
  excerpt_en: item.excerptEn || item.excerpt,
  story: item.story,
  story_en: item.storyEn || item.story,
  clues: Array.isArray(item.clues) ? item.clues : [],
  clues_en: Array.isArray(item.cluesEn) ? item.cluesEn : item.clues || [],
  author: item.author || 'Explorer VI',
  region: item.region || 'Worldwide',
  votes: Number(item.votes) || 1,
  is_community: Boolean(item.isCommunity),
});

/* Cheats API */
export async function fetchCheatsRemote(initialDefaults) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('cheats')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Auto-seed 34 cheat awal saat database pertama kali kosong
  if (!data || data.length === 0) {
    const seedRows = initialDefaults.map(toCheatRow);
    const { error: seedErr } = await supabase
      .from('cheats')
      .upsert(seedRows, { onConflict: 'id' });
    if (seedErr) throw seedErr;
    return initialDefaults;
  }
  return data.map(toCheatApp);
}

export async function upsertCheatRemote(cheat) {
  if (!supabase) return true;
  const { error } = await supabase
    .from('cheats')
    .upsert(toCheatRow(cheat), { onConflict: 'id' });
  if (error) throw error;
  return true;
}

export async function deleteCheatAdminRemote(pin, id) {
  if (!supabase) return true;
  const { data, error } = await supabase.rpc('admin_delete_cheat', {
    input_pin: pin,
    target_id: id,
  });
  if (error) throw error;
  return Boolean(data);
}

/* Mysteries API */
export async function fetchMysteriesRemote(initialDefaults) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mysteries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Auto-seed 6 misteri awal saat database pertama kali kosong
  if (!data || data.length === 0) {
    const seedRows = initialDefaults.map(toMysteryRow);
    const { error: seedErr } = await supabase
      .from('mysteries')
      .upsert(seedRows, { onConflict: 'id' });
    if (seedErr) throw seedErr;
    return initialDefaults;
  }
  return data.map(toMysteryApp);
}

export async function insertMysteryRemote(item) {
  if (!supabase) return true;
  const { error } = await supabase.from('mysteries').insert(toMysteryRow(item));
  if (error) throw error;
  return true;
}

export async function upvoteMysteryRemote(id) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('increment_mystery_vote', {
    target_id: id,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : null;
}

export async function deleteMysteryAdminRemote(pin, id) {
  if (!supabase) return true;
  const { data, error } = await supabase.rpc('admin_delete_mystery', {
    input_pin: pin,
    target_id: id,
  });
  if (error) throw error;
  return Boolean(data);
}

/* Global Site Settings & Admin Security RPC */
export async function fetchSiteSettingsRemote() {
  if (!supabase) return {};
  const { data, error } = await supabase.from('site_settings').select('key, value');
  if (error) throw error;
  const map = {};
  (data || []).forEach((row) => {
    map[row.key] = row.value;
  });
  return map;
}

export async function verifyAdminPinRemote(pin) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('verify_admin_pin', { input_pin: pin });
  if (error) throw error;
  return Boolean(data);
}

export async function updateAdminPinRemote(oldPin, newPin) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('update_admin_pin', {
    old_pin: oldPin,
    new_pin: newPin,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function saveSiteSettingRemote(pin, key, value) {
  if (!supabase) return true;
  const { data, error } = await supabase.rpc('update_site_setting', {
    input_pin: pin,
    setting_key: key,
    setting_value: value,
  });
  if (error) throw error;
  return Boolean(data);
}
