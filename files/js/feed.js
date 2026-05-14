// ── SOCIAL FEED ───────────────────────────────────────
let feedPage        = 0;
let feedLoading     = false;
let feedAllLoaded   = false;
let feedLikes       = {};    // { exp_id: [uid, ...] }
let feedMyLikes     = {};    // { exp_id: true|false }
let feedCommentCounts = {};  // { exp_id: number }
let myFollowing     = new Set();
let currentFeedTab  = 'friends'; // 'mine' | 'friends'

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
  document.querySelectorAll(`.feed-follow-btn[data-uid="${targetUserId}"]`).forEach(btn => {
    const following = myFollowing.has(targetUserId);
    btn.textContent = following ? 'Following' : 'Follow';
    btn.classList.toggle('following', following);
  });
}

async function switchFeedTab(tab) {
  currentFeedTab = tab;
  $('tab-mine').classList.toggle('active', tab === 'mine');
  $('tab-friends').classList.toggle('active', tab === 'friends');
  feedPage = 0; feedAllLoaded = false; feedLikes = {}; feedMyLikes = {}; feedCommentCounts = {};
  $('feed-list').innerHTML = `<div class="feed-loading"><div class="spin"></div></div>`;
  $('feed-load-more').style.display = 'none';
  $('s-feed').scrollTop = 0;
  if (tab === 'friends' && myFollowing.size === 0) await loadMyFollows();
  loadFeedPage();
}

async function openFeed() {
  currentFeedTab = 'friends';
  $('tab-mine').classList.remove('active');
  $('tab-friends').classList.add('active');
  feedPage = 0; feedAllLoaded = false; feedLikes = {}; feedMyLikes = {}; feedCommentCounts = {};
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
    let url = `experiences?select=*,dishes(name,image_url,collections(name))&order=created_at.desc&limit=${limit}&offset=${feedPage * limit}`;

    if (currentFeedTab === 'mine') {
      if (!uid) {
        $('feed-list').innerHTML = `<div class="feed-empty">Log in to see your own check-ins.</div>`;
        feedLoading = false;
        return;
      }
      url += `&user_id=eq.${uid}`;
    } else {
      if (uid) url += `&user_id=neq.${uid}`;
      const SOFT_FOLLOWS_THRESHOLD = 3;
      if (uid && myFollowing.size >= SOFT_FOLLOWS_THRESHOLD) {
        url += `&user_id=in.(${[...myFollowing].join(',')})`;
      }
    }

    const exps = await api(url);
    if (!exps || exps.length < limit) feedAllLoaded = true;
    if (feedPage === 0) $('feed-list').innerHTML = '';
    if (!exps || exps.length === 0) {
      if (feedPage === 0) {
        const emptyMsg = currentFeedTab === 'mine'
          ? 'No check-ins yet. Try your first dish! 🍽️'
          : 'No activity yet. Be the first! 🌏';
        $('feed-list').innerHTML = `<div class="feed-empty">${emptyMsg}</div>`;
      }
      $('feed-load-more').style.display = 'none';
      return;
    }

    const ids = exps.map(e => e.id);
    await loadLikesForIds(ids);
    await loadCommentCountsForIds(ids);

    exps.forEach(exp => {
      const el = document.createElement('div');
      el.innerHTML = renderFeedCard(exp);
      $('feed-list').appendChild(el.firstElementChild);
    });
    feedPage++;
    $('feed-load-more').style.display = feedAllLoaded ? 'none' : 'block';
  } catch(e) {
    if (feedPage === 0) $('feed-list').innerHTML = `<div class="feed-empty">Feed could not be loaded.</div>`;
  } finally {
    feedLoading = false;
  }
}

async function loadLikesForIds(ids) {
  if (!ids.length) return;
  try {
    const rows = await api(`experience_reactions?experience_id=in.(${ids.join(',')})&reaction_type=eq.like&select=experience_id,user_id`);
    (rows || []).forEach(r => {
      if (!feedLikes[r.experience_id]) feedLikes[r.experience_id] = [];
      feedLikes[r.experience_id].push(r.user_id);
      if (r.user_id === uid) feedMyLikes[r.experience_id] = true;
    });
  } catch(e) {}
}

async function loadCommentCountsForIds(ids) {
  if (!ids.length) return;
  try {
    const rows = await api(`experience_comments?experience_id=in.(${ids.join(',')})&select=experience_id`);
    (rows || []).forEach(r => {
      feedCommentCounts[r.experience_id] = (feedCommentCounts[r.experience_id] || 0) + 1;
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
  const likes    = (feedLikes[exp.id] || []).length;
  const liked    = feedMyLikes[exp.id] || false;
  const comments = feedCommentCounts[exp.id] || 0;
  const heartFill   = liked ? '#E8445A' : 'none';
  const heartStroke = liked ? '#E8445A' : 'rgba(255,255,255,.9)';

  const heroHtml = heroImg
    ? `<div class="feed-hero" onclick="feedCardClick('${exp.dish_id}')">
         <img src="${heroImg}" alt="" loading="lazy">
         <div class="feed-hero-overlay">
           <span class="feed-dish-pill">${dish.name || ''}</span>
           ${collName ? `<span class="feed-coll-pill">${collName}</span>` : ''}
         </div>
         <button class="feed-hero-like${liked ? ' liked' : ''}" onclick="toggleLike(event,'${exp.id}')">
           <svg width="22" height="22" viewBox="0 0 24 24" fill="${heartFill}" stroke="${heartStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
           ${likes > 0 ? `<span class="feed-hero-like-count">${likes}</span>` : ''}
         </button>
         ${exp.price && exp.price > 0 ? `<div class="feed-hero-price">💰 ${formatPrice(exp.price, exp.currency)}</div>` : ''}
       </div>`
    : `<div class="feed-card-notitle" onclick="feedCardClick('${exp.dish_id}')">
         <span class="feed-dish-pill-plain">${dish.name || ''}</span>
         ${collName ? `<span class="feed-coll-pill-plain">${collName}</span>` : ''}
       </div>`;

  return `<div class="feed-card" data-exp-id="${exp.id}">
    ${heroHtml}
    <div class="feed-card-body">
      <div class="feed-user-row">
        <div class="feed-avatar" ${exp.user_id ? `onclick="feedProfileClick('${exp.user_id}')" style="cursor:pointer"` : ''}>${exp.user_avatar_url ? `<img src="${exp.user_avatar_url}" alt="">` : initials}</div>
        <div class="feed-user-info" ${exp.user_id ? `onclick="feedProfileClick('${exp.user_id}')" style="cursor:pointer"` : ''}>
          <div class="feed-user-name">${name}</div>
          <div class="feed-date">${date}</div>
        </div>
        ${stars ? `<div class="feed-stars">${stars}</div>` : ''}
        <button class="feed-comment-inline" onclick="openCommentSheet('${exp.id}')">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          ${comments > 0 ? `<span>${comments}</span>` : ''}
        </button>
      </div>
      ${exp.location_text ? `<div class="feed-meta"><span class="feed-chip">📍 ${exp.location_text}</span></div>` : ''}
      ${exp.note ? `<div class="feed-note">"${exp.note}"</div>` : ''}
    </div>
  </div>`;
}

function renderActionBar(expId) {
  const likes   = (feedLikes[expId] || []).length;
  const liked   = feedMyLikes[expId] || false;
  const comments = feedCommentCounts[expId] || 0;

  const heartColor = liked ? '#E8445A' : 'none';
  const heartStroke = liked ? '#E8445A' : 'currentColor';

  return `<button class="feed-like-btn${liked ? ' liked' : ''}" onclick="toggleLike(event,'${expId}')">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="${heartColor}" stroke="${heartStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    <span>${likes > 0 ? likes : ''}</span>
  </button>
  <button class="feed-comment-btn" onclick="openCommentSheet('${expId}')">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <span>${comments > 0 ? comments : ''}</span>
  </button>`;
}

async function toggleLike(event, expId) {
  event.stopPropagation();
  if (!uid) return;
  const liked = feedMyLikes[expId] || false;

  if (liked) {
    feedMyLikes[expId] = false;
    feedLikes[expId] = (feedLikes[expId] || []).filter(u => u !== uid);
    updateCardActionBar(expId);
    try { await api(`experience_reactions?experience_id=eq.${expId}&user_id=eq.${uid}&reaction_type=eq.like`, { method:'DELETE' }); } catch(e) {}
  } else {
    feedMyLikes[expId] = true;
    if (!feedLikes[expId]) feedLikes[expId] = [];
    feedLikes[expId].push(uid);
    updateCardActionBar(expId);
    try {
      await api('experience_reactions', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ experience_id: expId, user_id: uid, reaction_type: 'like' })
      });
    } catch(e) {}
  }
}

function updateCardActionBar(expId) {
  const card = document.querySelector(`.feed-card[data-exp-id="${expId}"]`);
  if (!card) return;

  const likes   = (feedLikes[expId] || []).length;
  const liked   = feedMyLikes[expId] || false;
  const comments = feedCommentCounts[expId] || 0;
  const heartFill   = liked ? '#E8445A' : 'none';
  const heartStroke = liked ? '#E8445A' : 'rgba(255,255,255,.9)';

  const likeBtn = card.querySelector('.feed-hero-like');
  if (likeBtn) {
    likeBtn.classList.toggle('liked', liked);
    likeBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="${heartFill}" stroke="${heartStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${likes > 0 ? `<span class="feed-hero-like-count">${likes}</span>` : ''}`;
  }

  const commentBtn = card.querySelector('.feed-comment-inline');
  if (commentBtn) {
    const span = commentBtn.querySelector('span');
    if (comments > 0) {
      if (span) span.textContent = comments;
      else commentBtn.insertAdjacentHTML('beforeend', `<span>${comments}</span>`);
    } else if (span) span.remove();
  }

  // Home compact cards still use renderActionBar
  const actionsEl = card.querySelector('.feed-actions');
  if (actionsEl) actionsEl.innerHTML = renderActionBar(expId);
}

// ── COMMENT SHEET ─────────────────────────────────────
let activeCommentExpId = null;

async function openCommentSheet(expId) {
  activeCommentExpId = expId;
  const backdrop = $('comment-backdrop');
  if (!backdrop) return;
  const list = $('comment-list');
  list.innerHTML = `<div class="comment-loading"><div class="spin"></div></div>`;
  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  await renderCommentList(expId);
}

function closeCommentSheet() {
  const backdrop = $('comment-backdrop');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
  activeCommentExpId = null;
}

async function renderCommentList(expId) {
  const list = $('comment-list');
  try {
    const rows = await api(`experience_comments?experience_id=eq.${expId}&order=created_at.asc&select=*`);
    if (!rows || rows.length === 0) {
      list.innerHTML = `<div class="comment-empty">No comments yet. Be the first!</div>`;
      return;
    }
    list.innerHTML = rows.map(c => {
      const initials = (c.user_display_name || '?').charAt(0).toUpperCase();
      const date = c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short'}) : '';
      return `<div class="comment-row">
        <div class="comment-avatar">${c.user_avatar_url ? `<img src="${c.user_avatar_url}" alt="">` : initials}</div>
        <div class="comment-body">
          <div class="comment-name">${escHtml(c.user_display_name || 'Anonymous')} <span class="comment-date">${date}</span></div>
          <div class="comment-text">${escHtml(c.text || '')}</div>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    list.innerHTML = `<div class="comment-empty">Could not load comments.</div>`;
  }
}

async function submitComment() {
  if (!uid || !activeCommentExpId) return;
  const input = $('comment-input');
  const text = (input?.value || '').trim();
  if (!text) return;
  const btn = $('comment-send-btn');
  if (btn) btn.disabled = true;
  input.value = '';

  try {
    const profile = await api(`profiles?id=eq.${uid}&select=display_name,avatar_url`);
    const p = (profile || [])[0] || {};
    await api('experience_comments', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        experience_id: activeCommentExpId,
        user_id: uid,
        text,
        user_display_name: p.display_name || null,
        user_avatar_url: p.avatar_url || null
      })
    });
    feedCommentCounts[activeCommentExpId] = (feedCommentCounts[activeCommentExpId] || 0) + 1;
    updateCardActionBar(activeCommentExpId);
    await renderCommentList(activeCommentExpId);
  } catch(e) {
    input.value = text;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function feedCardClick(dishId) {
  if (dishId) openCardFromHome(dishId);
}

function feedProfileClick(userId) {
  if (!userId) return;
  if (userId === uid) { showTab('profile'); return; }
  openBuddyProfile(userId);
}
