// ── SOCIAL STATE ──────────────────────────────────────
let myProfile     = null; // { user_id, username, display_name, avatar_url }
let myFriends     = [];   // accepted friendships with profile data
let pendingIn     = [];   // incoming pending requests

// ── LOAD MY PROFILE ───────────────────────────────────
async function loadMyProfile() {
  if (!uid) return null;
  try {
    const rows = await api(`profiles?user_id=eq.${uid}&limit=1`);
    myProfile = rows?.[0] || null;
  } catch(e) { myProfile = null; }
  return myProfile;
}

// ── LOAD FRIENDS ──────────────────────────────────────
async function loadFriends() {
  if (!uid) return;
  try {
    // friendships where I am either side and status = accepted
    const rows = await api(`friendships?or=(user_id.eq.${uid},friend_id.eq.${uid})&status=eq.accepted`);
    if (!rows?.length) { myFriends = []; return; }
    const friendIds = rows.map(r => r.user_id === uid ? r.friend_id : r.user_id);
    const profiles  = await api(`profiles?user_id=in.(${friendIds.join(',')})`);
    myFriends = profiles || [];
  } catch(e) { myFriends = []; }
}

async function loadPendingRequests() {
  if (!uid) return;
  try {
    const rows = await api(`friendships?friend_id=eq.${uid}&status=eq.pending`);
    if (!rows?.length) { pendingIn = []; return; }
    const ids      = rows.map(r => r.user_id);
    const profiles = await api(`profiles?user_id=in.(${ids.join(',')})`);
    pendingIn = (profiles || []).map(p => ({ ...p, friendship: rows.find(r => r.user_id === p.user_id) }));
  } catch(e) { pendingIn = []; }
}

// ── USERNAME SETUP ────────────────────────────────────
function openUsernameModal(onDone) {
  const modal = $('username-modal');
  if (!modal) return;
  $('username-input').value = '';
  $('username-error').textContent = '';
  $('username-submit').onclick = () => submitUsername(onDone);
  modal.classList.add('open');
}
function closeUsernameModal() {
  $('username-modal')?.classList.remove('open');
}

async function submitUsername(onDone) {
  const input = $('username-input');
  const err   = $('username-error');
  const val   = input.value.trim().toLowerCase().replace(/\s+/g, '_');
  input.value = val;

  if (!/^[a-z0-9_]{3,20}$/.test(val)) {
    err.textContent = '3–20 characters, only letters, numbers and underscores.';
    return;
  }
  err.textContent = '';
  $('username-submit').disabled = true;
  $('username-submit').textContent = 'Saving…';

  try {
    await api('profiles', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        user_id:      uid,
        username:     val,
        display_name: sbUser?.user_metadata?.full_name || sbUser?.user_metadata?.name || val,
        avatar_url:   sbUser?.user_metadata?.avatar_url || null,
      }),
    });
    myProfile = { user_id: uid, username: val };
    closeUsernameModal();
    if (onDone) onDone();
  } catch(e) {
    const msg = e.message?.includes('unique') ? 'Username already taken — try another.' : 'Could not save. Try again.';
    err.textContent = msg;
  } finally {
    $('username-submit').disabled = false;
    $('username-submit').textContent = 'Claim username';
  }
}

// ── FRIEND SEARCH ─────────────────────────────────────
function openFriendsModal() {
  const modal = $('friends-modal');
  if (!modal) return;
  $('friends-search-input').value = '';
  $('friends-search-results').innerHTML = '';
  $('friends-pending-list').innerHTML   = '';
  $('friends-list-wrap').innerHTML      = '';
  renderFriendsModal();
  modal.classList.add('open');
}
function closeFriendsModal() {
  $('friends-modal')?.classList.remove('open');
}

async function renderFriendsModal() {
  // Pending incoming
  await loadPendingRequests();
  const pendingEl = $('friends-pending-list');
  if (pendingIn.length > 0) {
    $('friends-pending-section').style.display = 'block';
    pendingEl.innerHTML = pendingIn.map(p => `
      <div class="fm-friend-row">
        <div class="fm-avatar">${p.username[0].toUpperCase()}</div>
        <div class="fm-info">
          <div class="fm-name">@${p.username}</div>
          <div class="fm-sub">${p.display_name || ''}</div>
        </div>
        <button class="fm-accept-btn" onclick="acceptFriend('${p.friendship.id}')">Accept</button>
      </div>`).join('');
  } else {
    $('friends-pending-section').style.display = 'none';
  }

  // Current friends
  await loadFriends();
  const listEl = $('friends-list-wrap');
  if (myFriends.length > 0) {
    listEl.innerHTML = `<div class="fm-section-title">Your travel buddies</div>` +
      myFriends.map(p => `
        <div class="fm-friend-row" onclick="closeFriendsModal();openBuddyProfile('${p.user_id}')" style="cursor:pointer">
          <div class="fm-avatar" style="background:#2D6A4F">${p.username[0].toUpperCase()}</div>
          <div class="fm-info">
            <div class="fm-name">@${p.username}</div>
            <div class="fm-sub">${p.display_name || ''}</div>
          </div>
          <span class="fm-buddy-tag">🍜 Buddy ›</span>
        </div>`).join('');
  } else {
    listEl.innerHTML = `<div class="fm-empty">No travel buddies yet.<br>Search by username to add someone.</div>`;
  }
}

async function searchFriend() {
  const q   = $('friends-search-input').value.trim().toLowerCase();
  const res = $('friends-search-results');
  if (q.length < 2) { res.innerHTML = ''; return; }
  res.innerHTML = '<div class="fm-searching">Searching…</div>';
  try {
    const rows = await api(`profiles?username=ilike.${q}*&limit=5`);
    const filtered = (rows || []).filter(p => p.user_id !== uid);
    if (!filtered.length) { res.innerHTML = '<div class="fm-empty">No users found.</div>'; return; }

    // Check existing friendship status
    const friendIds = myFriends.map(f => f.user_id);
    res.innerHTML = filtered.map(p => {
      const isFriend  = friendIds.includes(p.user_id);
      const isPending = pendingIn.some(r => r.user_id === p.user_id);
      const btn = isFriend
        ? `<span class="fm-buddy-tag">🍜 Buddy</span>`
        : isPending
          ? `<span class="fm-pending-tag">Pending</span>`
          : `<button class="fm-add-btn" onclick="sendFriendRequest('${p.user_id}', this)">+ Add</button>`;
      return `<div class="fm-friend-row">
        <div class="fm-avatar">${p.username[0].toUpperCase()}</div>
        <div class="fm-info">
          <div class="fm-name">@${p.username}</div>
          <div class="fm-sub">${p.display_name || ''}</div>
        </div>
        ${btn}
      </div>`;
    }).join('');
  } catch(e) { res.innerHTML = '<div class="fm-empty">Search failed.</div>'; }
}

async function sendFriendRequest(friendId, btn) {
  btn.disabled = true;
  btn.textContent = '…';
  try {
    await api('friendships', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ user_id: uid, friend_id: friendId, status: 'pending' }),
    });
    btn.textContent = '✓ Request sent';
    btn.className = 'fm-sent-tag';
  } catch(e) {
    btn.disabled = false;
    btn.textContent = '+ Add';
    const errEl = document.createElement('div');
    errEl.className = 'fm-req-error';
    errEl.textContent = e.message?.includes('unique') ? 'Already sent.' : 'Could not send — try again.';
    btn.parentNode.appendChild(errEl);
    setTimeout(() => errEl.remove(), 3000);
  }
}

async function acceptFriend(friendshipId) {
  try {
    await api(`friendships?id=eq.${friendshipId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'accepted' }),
    });
    renderFriendsModal();
  } catch(e) {}
}

// ── FRIENDS ACTIVITY (real data) ──────────────────────
async function loadFriendsActivity() {
  if (!myFriends.length) return [];
  const ids = myFriends.map(f => f.user_id);
  try {
    const exps = await api(
      `experiences?select=id,user_id,dish_id,user_display_name,user_avatar_url,created_at,rating,location_text,note,photo_url,dish:dishes(name,name_en,collection:collections(country:countries(name)))&user_id=in.(${ids.join(',')})&order=created_at.desc&limit=20`
    );
    return exps || [];
  } catch(e) { return []; }
}

async function loadMyLikes(expIds) {
  if (!uid || !expIds.length) return new Set();
  try {
    const rows = await api(`experience_likes?user_id=eq.${uid}&experience_id=in.(${expIds.join(',')})`);
    return new Set((rows || []).map(r => r.experience_id));
  } catch(e) { return new Set(); }
}

async function loadLikeCounts(expIds) {
  if (!expIds.length) return {};
  try {
    const rows = await api(`experience_likes?experience_id=in.(${expIds.join(',')})&select=experience_id`);
    const counts = {};
    (rows || []).forEach(r => { counts[r.experience_id] = (counts[r.experience_id] || 0) + 1; });
    return counts;
  } catch(e) { return {}; }
}

async function toggleLike(expId, btn) {
  if (!uid) return;
  const liked = btn.classList.contains('liked');
  btn.disabled = true;
  try {
    if (liked) {
      await api(`experience_likes?user_id=eq.${uid}&experience_id=eq.${expId}`, { method:'DELETE' });
      btn.classList.remove('liked');
      const n = Math.max(0, parseInt(btn.dataset.count || 0) - 1);
      btn.dataset.count = n;
      btn.innerHTML = n > 0 ? `♥ ${n}` : '♡';
    } else {
      await api('experience_likes', { method:'POST', headers:{'Prefer':'return=minimal'}, body:JSON.stringify({ user_id:uid, experience_id:expId }) });
      btn.classList.add('liked');
      const n = parseInt(btn.dataset.count || 0) + 1;
      btn.dataset.count = n;
      btn.innerHTML = `♥ ${n}`;
    }
  } catch(e) { console.log('like:', e?.message); }
  btn.disabled = false;
}

// ── ENSURE PROFILE EXISTS ─────────────────────────────
// Call after login — if no profile, prompt for username
async function ensureProfile() {
  if (!uid || !sbUser || sbUser.is_anonymous) return;
  await loadMyProfile();
  if (!myProfile) {
    // Small delay so the UI settles first
    setTimeout(() => openUsernameModal(() => renderProfile()), 800);
  }
}
