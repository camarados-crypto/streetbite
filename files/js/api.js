// ── API ───────────────────────────────────────────────
async function api(path, opts = {}) {
  const t = token || KEY;
  const hdrs = { 'apikey':KEY, 'Authorization':`Bearer ${t}`, 'Content-Type':'application/json', ...(opts.headers||{}) };
  const r = await fetch(`${SB}/rest/v1/${path}`, {...opts, headers:hdrs});
  if (r.status === 204) return null;
  if (!r.ok) { const txt = await r.text(); throw new Error(`${r.status}: ${txt.slice(0,120)}`); }
  return r.json();
}

// ── AUTH ──────────────────────────────────────────────
async function initAuth() {
  if (!sbClient) {
    uid = localStorage.getItem('sb_uid') || crypto.randomUUID();
    localStorage.setItem('sb_uid', uid); token = KEY; return;
  }
  sbClient.auth.onAuthStateChange(async (event, session) => {
    const wasAnon = !sbUser || sbUser.is_anonymous;
    sbUser = session?.user || null; uid = sbUser?.id || uid; token = session?.access_token || token;
    if (event === 'SIGNED_IN' && wasAnon && sbUser && !sbUser.is_anonymous) await migrateLocalToCloud();
    if (event === 'SIGNED_IN' && sbUser && !sbUser.is_anonymous) {
      await upsertProfile();
      await loadUserDishes();
      if (_initDone) { renderHome(); setTimeout(initScrollReveal, 100); }
    }
    updateWelcome();
    if (!$('s-profile').classList.contains('gone')) renderProfile();
  });
  const { data: { session } } = await sbClient.auth.getSession();
  if (session) { sbUser = session.user; uid = session.user.id; token = session.access_token; return; }
  try {
    const { data } = await sbClient.auth.signInAnonymously();
    if (data?.user) { sbUser = data.user; uid = data.user.id; token = data.session?.access_token; }
  } catch(e) {
    uid = localStorage.getItem('sb_uid') || crypto.randomUUID();
    localStorage.setItem('sb_uid', uid);
  }
}

async function signInWithGoogle() {
  const redirectTo = window.location.origin + window.location.pathname;
  await sbClient.auth.signInWithOAuth({ provider:'google', options:{ redirectTo } });
}

async function signOut() {
  await sbClient.auth.signOut();
  sbUser = null; uid = null; token = null;
  userDishes = new Set(); recentDishIds = [];
  collections.forEach(c => c.collected = 0);
  renderHome(); setTimeout(initScrollReveal, 100); updateWelcome();
  // Re-create anonymous session so app stays functional
  try {
    const { data } = await sbClient.auth.signInAnonymously();
    if (data?.user) { sbUser = data.user; uid = data.user.id; token = data.session?.access_token; }
  } catch(e) {}
  renderProfile();
}

async function upsertProfile() {
  if (!sbUser || sbUser.is_anonymous) return;
  const display_name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || null;
  const avatar_url   = sbUser.user_metadata?.avatar_url || null;
  try {
    await api('profiles', { method:'POST', headers:{'Prefer':'resolution=merge-duplicates,return=minimal'}, body:JSON.stringify({ user_id:sbUser.id, display_name, avatar_url }) });
  } catch(e) {}
}

async function migrateLocalToCloud() {
  if (!sbUser || sbUser.is_anonymous || userDishes.size === 0) return;
  const rows = [...userDishes].map(dish_id => ({ user_id:sbUser.id, dish_id, collected_at:new Date().toISOString() }));
  try { await api('user_dishes', { method:'POST', headers:{'Prefer':'resolution=merge-duplicates,return=minimal'}, body:JSON.stringify(rows) }); } catch(e) {}
}
