// ── SOCIAL FEED ───────────────────────────────────────
const REACTION_EMOJIS = { thumbs_up:'👍', love:'😍', fire:'🔥', sick:'🤢', shocked:'😱' };
const REACTION_TYPES  = ['thumbs_up','love','fire','sick','shocked'];

let feedPage      = 0;
let feedLoading   = false;
let feedAllLoaded = false;
let feedReactions = {};   // { exp_id: { type: [uid,...] } }
let feedMyReactions = {}; // { exp_id: reaction_type | null }
let myFollowing   = new Set(); // user_ids ik volg

async function loadMyFollows() {
  if (!uid) return;
  try {
    const rows = await api(`follows?follower_id=eq.${uid}&select=following_id`);
    myFollowing = new Set((rows || []).map(r => r.following_id));
  } catch(e) { myFollowing = new Set(); }
}

async function toggleFollow(event, targetUserId) {
  event.stopPropagation();
  if (!uid || uid === targetUserId) return;
  if (myFollowing.has(targetUserId)) {
    myFollowing.delete(targetUserId);
    try { await api(`follows?follower_id=eq.${uid}&following_id=eq.${targetUserId}`, { method:'DELETE' }); } catch(e) {}
  } else {
    myFollowing.add(targetUserId);
    try {
      await api('follows', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ follower_id: uid, following_id: targetUserId })
      });
    } catch(e) {}
  }
  // Herrender follow knoppen voor deze gebruiker
  document.querySelectorAll(`.feed-follow-btn[data-uid="${targetUserId}"]`).forEach(btn => {
    const following = myFollowing.has(targetUserId);
    btn.textContent = following ? 'Following' : 'Follow';
    btn.classList.toggle('following', following);
  });
}

async function openFeed() {
  feedPage = 0; feedAllLoaded = false; feedReactions = {}; feedMyReactions = {};
  $('feed-list').innerHTML = `<div class="feed-loading"><div class="spin"></div></div>`;
  $('feed-load-more').style.display = 'none';
  $('s-feed').scrollTop = 0;
  await loadMyFollows();
  await loadFeedPage();
}

async function loadFeedPage() {
  if (feedLoading || feedAllLoaded) return;
  feedLoading = true;
  const limit = 20;
  try {
    const SOFT_FOLLOWS_THRESHOLD = 3;
    const useFollowFilter = uid && myFollowing.size >= SOFT_FOLLOWS_THRESHOLD;
    let url = `experiences?select=*,dishes(name,image_url,collections(name))&order=created_at.desc&limit=${limit}&offset=${feedPage * limit}`;
    if (uid) url += `&user_id=neq.${uid}`;
    if (useFollowFilter) {
      url += `&user_id=in.(${[...myFollowing].join(',')})`;
    }
    const exps = await api(url);
    if (!exps || exps.length < limit) feedAllLoaded = true;
    if (feedPage === 0) $('feed-list').innerHTML = '';
    if (!exps || exps.length === 0) {
      if (feedPage === 0) $('feed-list').innerHTML = `<div class="feed-empty">Nog geen check-ins. Wees de eerste! 🍽️</div>`;
      $('feed-load-more').style.display = 'none';
      return;
    }
    await loadReactionsForIds(exps.map(e => e.id));
    exps.forEach(exp => {
      const el = document.createElement('div');
      el.innerHTML = renderFeedCard(exp);
      $('feed-list').appendChild(el.firstElementChild);
    });
    feedPage++;
    $('feed-load-more').style.display = feedAllLoaded ? 'none' : 'block';
  } catch(e) {
    if (feedPage === 0) $('feed-list').innerHTML = `<div class="feed-empty">Feed kon niet geladen worden.</div>`;
  } finally {
    feedLoading = false;
  }
}

async function loadReactionsForIds(ids) {
  if (!ids.length) return;
  try {
    const rows = await api(`experience_reactions?experience_id=in.(${ids.join(',')})&select=experience_id,reaction_type,user_id`);
    (rows || []).forEach(r => {
      if (!feedReactions[r.experience_id]) feedReactions[r.experience_id] = {};
      if (!feedReactions[r.experience_id][r.reaction_type]) feedReactions[r.experience_id][r.reaction_type] = [];
      feedReactions[r.experience_id][r.reaction_type].push(r.user_id);
      if (r.user_id === uid) feedMyReactions[r.experience_id] = r.reaction_type;
    });
  } catch(e) {}
}

function renderFeedCard(exp) {
  const dish     = exp.dishes || {};
  const collName = dish.collections?.name || '';
  const heroImg  = exp.photo_url || dish.image_url || '';
  const stars    = exp.rating ? '★'.repeat(exp.rating) + `<span style="opacity:.3">${'★'.repeat(5 - exp.rating)}</span>` : '';
  const date     = exp.created_at ? new Date(exp.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short'}) : '';
  const initials = (exp.user_display_name || '?').charAt(0).toUpperCase();
  const name     = exp.user_display_name || 'Anonymous';

  const heroHtml = heroImg
    ? `<div class="feed-hero" onclick="feedCardClick('${exp.dish_id}')">
         <img src="${heroImg}" alt="" loading="lazy">
         <div class="feed-hero-overlay">
           <span class="feed-dish-pill">${dish.name || ''}</span>
           ${collName ? `<span class="feed-coll-pill">${collName}</span>` : ''}
         </div>
       </div>`
    : `<div class="feed-card-notitle" onclick="feedCardClick('${exp.dish_id}')">
         <span class="feed-dish-pill-plain">${dish.name || ''}</span>
         ${collName ? `<span class="feed-coll-pill-plain">${collName}</span>` : ''}
       </div>`;

  const isOwnPost = exp.user_id === uid;
  const isFollowing = myFollowing.has(exp.user_id);
  const followBtn = (!isOwnPost && exp.user_id)
    ? `<button class="feed-follow-btn${isFollowing ? ' following' : ''}" data-uid="${exp.user_id}" onclick="toggleFollow(event,'${exp.user_id}')">${isFollowing ? 'Following' : 'Follow'}</button>`
    : '';

  return `<div class="feed-card" data-exp-id="${exp.id}">
    ${heroHtml}
    <div class="feed-card-body">
      <div class="feed-user-row">
        <div class="feed-avatar" ${exp.user_id ? `onclick="openBuddyProfile('${exp.user_id}')" style="cursor:pointer"` : ''}>${exp.user_avatar_url ? `<img src="${exp.user_avatar_url}" alt="">` : initials}</div>
        <div class="feed-user-info" ${exp.user_id ? `onclick="openBuddyProfile('${exp.user_id}')" style="cursor:pointer"` : ''}>
          <div class="feed-user-name">${name}</div>
          <div class="feed-date">${date}</div>
        </div>
        ${stars ? `<div class="feed-stars">${stars}</div>` : ''}
        ${followBtn}
      </div>
      ${exp.location_text || (exp.price && exp.price > 0) ? `<div class="feed-meta">${exp.location_text ? `<span class="feed-chip">📍 ${exp.location_text}</span>` : ''}${exp.price && exp.price > 0 ? `<span class="feed-chip">💰 ${formatPrice(exp.price, exp.currency)}</span>` : ''}</div>` : ''}
      ${exp.note ? `<div class="feed-note">"${exp.note}"</div>` : ''}
      <div class="feed-reactions">${renderReactionButtons(exp.id)}</div>
    </div>
  </div>`;
}

function renderReactionButtons(expId) {
  return REACTION_TYPES.map(type => {
    const count = (feedReactions[expId]?.[type] || []).length;
    const mine  = feedMyReactions[expId] === type;
    return `<button class="feed-react${mine ? ' active' : ''}" onclick="toggleReaction(event,'${expId}','${type}')">
      ${REACTION_EMOJIS[type]}${count > 0 ? `<span>${count}</span>` : ''}
    </button>`;
  }).join('');
}

async function toggleReaction(event, expId, type) {
  event.stopPropagation();
  if (!uid) return;
  const current = feedMyReactions[expId];
  if (!feedReactions[expId]) feedReactions[expId] = {};

  if (current === type) {
    feedMyReactions[expId] = null;
    feedReactions[expId][type] = (feedReactions[expId][type] || []).filter(u => u !== uid);
    updateCardReactions(expId);
    try { await api(`experience_reactions?experience_id=eq.${expId}&user_id=eq.${uid}`, { method:'DELETE' }); } catch(e) {}
  } else {
    if (current) feedReactions[expId][current] = (feedReactions[expId][current] || []).filter(u => u !== uid);
    feedMyReactions[expId] = type;
    if (!feedReactions[expId][type]) feedReactions[expId][type] = [];
    feedReactions[expId][type].push(uid);
    updateCardReactions(expId);
    try {
      await api('experience_reactions', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ experience_id: expId, user_id: uid, reaction_type: type })
      });
    } catch(e) {}
  }
}

function updateCardReactions(expId) {
  const card = document.querySelector(`.feed-card[data-exp-id="${expId}"]`);
  if (!card) return;
  const el = card.querySelector('.feed-reactions');
  if (el) el.innerHTML = renderReactionButtons(expId);
}

function feedCardClick(dishId) {
  if (dishId) openCardFromHome(dishId);
}
