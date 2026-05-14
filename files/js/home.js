// ── EXPERIENCE SHEET ──────────────────────────────────
let faExps = {}; // { expId: expObject }

function openExpSheet(expId) {
  const exp  = faExps[expId]; if (!exp) return;
  const dish = exp.dishes || {};
  const heroImg = exp.photo_url || dish.image_url || '';
  const name    = exp.user_display_name || 'Anonymous';
  const initials = name.charAt(0).toUpperCase();
  const date    = exp.created_at ? new Date(exp.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}) : '';
  const stars   = exp.rating ? '★'.repeat(exp.rating) + `<span style="opacity:.25">${'★'.repeat(5 - exp.rating)}</span>` : '';

  $('exp-sheet-hero').style.display   = heroImg ? 'block' : 'none';
  if (heroImg) $('exp-sheet-hero-img').src = heroImg;
  $('exp-sheet-avatar').innerHTML     = exp.user_avatar_url ? `<img src="${exp.user_avatar_url}" alt="">` : initials;
  $('exp-sheet-name').textContent     = name;
  $('exp-sheet-date').textContent     = date;
  $('exp-sheet-dish').textContent     = dish.name || '';
  $('exp-sheet-stars').innerHTML      = stars;
  $('exp-sheet-stars').style.display  = stars ? 'block' : 'none';
  const meta = [
    exp.location_text ? `<span class="exp-sheet-chip">📍 ${exp.location_text}</span>` : '',
    exp.price && exp.price > 0 ? `<span class="exp-sheet-chip">💰 ${formatPrice(exp.price, exp.currency)}</span>` : '',
  ].join('');
  $('exp-sheet-meta').innerHTML       = meta;
  $('exp-sheet-meta').style.display   = meta ? 'flex' : 'none';
  $('exp-sheet-note').textContent     = exp.note ? `"${exp.note}"` : '';
  $('exp-sheet-note').style.display   = exp.note ? 'block' : 'none';
  $('exp-sheet-reactions').innerHTML  = renderActionBar(expId);
  $('exp-sheet-dish-btn').dataset.dishId = exp.dish_id || '';
  $('exp-sheet-backdrop').dataset.expId  = expId;
  $('exp-sheet-backdrop').classList.add('open');
}

function closeExpSheet() {
  $('exp-sheet-backdrop').classList.remove('open');
}

function expSheetOpenDish() {
  const dishId = $('exp-sheet-dish-btn').dataset.dishId;
  if (dishId) { closeExpSheet(); setTimeout(() => openDishFromFeed(dishId), 200); }
}

// ── STREAK ────────────────────────────────────────────
function getStreak() {
  const today = new Date().toDateString();
  const last = localStorage.getItem('sb_last_visit');
  const streak = parseInt(localStorage.getItem('sb_streak') || '1');
  if (!last) { localStorage.setItem('sb_last_visit', today); localStorage.setItem('sb_streak', '1'); return 1; }
  if (last === today) return streak;
  const diff = (new Date(today) - new Date(last)) / 86400000;
  localStorage.setItem('sb_last_visit', today);
  const next = diff === 1 ? streak + 1 : 1;
  localStorage.setItem('sb_streak', String(next));
  return next;
}

// ── WELCOME AVATAR + GREETING ─────────────────────────
function updateWelcome() {
  const av = $('welcome-avatar');
  if (!av) return;
  const avatarUrl = sbUser?.user_metadata?.avatar_url;
  const name = sbUser?.user_metadata?.full_name?.split(' ')[0] || sbUser?.user_metadata?.name?.split(' ')[0] || null;
  if (avatarUrl) {
    av.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
  } else if (name) {
    av.innerHTML = `<span style="font-size:13px;font-weight:700;color:#fff">${name[0].toUpperCase()}</span>`;
  } else {
    av.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }
  const greet = $('home-greet');
  if (greet) {
    const hr = new Date().getHours();
    const timeWord = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    greet.textContent = name
      ? `${timeWord}, ${name} — what are we eating? 🌏`
      : `${timeWord}! What are we eating today? 🌏`;
  }
}

// ── RECENT CHECK-INS ── (verwijderd)
function buildRecentHtml() { return ''; }

// ── TODAY FOR YOU ─────────────────────────────────────
function _dayHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0x7FFFFFFF;
  return h;
}
function mockTravelerCount(id) {
  return 80 + (_dayHash(id) % 350);
}
function pickTodayDishes() {
  const uncollected = allDishes.filter(d => !userDishes.has(d.id));
  if (!uncollected.length) return [];
  const today = new Date().toDateString();
  const seeded = [...uncollected].sort((a, b) => _dayHash(a.id + today) - _dayHash(b.id + today));
  const easy = seeded.find(d => d.rarity === 'common') || seeded.find(d => d.rarity === 'uncommon') || seeded[0];
  const popPool = seeded.filter(d => d !== easy);
  const popular = popPool.find(d => d.rarity === 'uncommon') || popPool.find(d => d.rarity === 'common') || popPool[0];
  const advPool = seeded.filter(d => d !== easy && d !== popular);
  const adventurous = advPool.find(d => ['rare','epic','legendary'].includes(d.rarity)) || advPool[0];
  return [
    easy        && { dish: easy,        label: '😌 Easy choice',  accent: '#74C69D' },
    popular     && { dish: popular,     label: '🔥 Popular now',   accent: '#D4692A' },
    adventurous && { dish: adventurous, label: '🤯 Adventurous',   accent: '#F4B942' },
  ].filter(Boolean);
}
function buildTodayForYou() {
  const picks = pickTodayDishes();
  if (!picks.length) return '';
  const checkIcon = `<div class="fb-list-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D2318" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`;
  const lockIcon  = `<div class="fb-list-lock"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>`;
  const rows = picks.map(({ dish, label, accent }) => {
    const done  = userDishes.has(dish.id);
    const emoji = label.split(' ')[0];
    return `<div class="fb-list-row ${done ? 'tried' : ''}" onclick="openCardFromHome('${dish.id}')">
      <div class="fb-list-img-wrap">
        ${dish.image_url ? `<img src="${dish.image_url}" alt="${dish.name}" loading="lazy">` : '<div class="fb-list-placeholder">🍽️</div>'}
        <div class="fb-list-num" style="${done ? '' : `background:rgba(0,0,0,.35);color:#fff`}">${emoji}</div>
      </div>
      <div class="fb-list-info">
        <div class="fb-list-name">${dish.name}</div>
        ${dish.name_en ? `<div class="fb-list-en">${dish.name_en}</div>` : ''}
        <div class="fb-list-status" style="color:${accent}">${label.split(' ').slice(1).join(' ')}</div>
      </div>
      ${done ? checkIcon : lockIcon}
    </div>`;
  }).join('');
  return `
    <div class="fb-list-section">
      <div class="fb-list-header">
        <div class="fb-list-title">✨ Today for you</div>
        <div class="fb-list-viewall">${currentCountry?.name || ''}</div>
      </div>
      ${rows}
    </div>`;
}
function buildTrendingNow() {
  const rarityScore = { legendary:5, epic:4, rare:3, uncommon:2, common:1 };
  const today = new Date().toDateString();
  const trending = [...allDishes].sort((a, b) => {
    const rs = (rarityScore[b.rarity] || 0) - (rarityScore[a.rarity] || 0);
    return rs !== 0 ? rs : _dayHash(a.id + today + 't') - _dayHash(b.id + today + 't');
  }).slice(0, 8);
  if (!trending.length) return '';
  const cards = trending.map(dish => {
    const count = mockTravelerCount(dish.id);
    const done = userDishes.has(dish.id);
    return `<div class="trend-card" onclick="openCardFromHome('${dish.id}')">
      <div class="trend-img-wrap">
        ${dish.image_url ? `<img src="${dish.image_url}" alt="${dish.name}" loading="lazy">` : '<div class="trend-img-ph">🍽️</div>'}
        <div class="trend-count">${count}+</div>
        ${done ? '<div class="trend-done">✓</div>' : ''}
      </div>
      <div class="trend-name">${dish.name_en || dish.name}</div>
    </div>`;
  }).join('');
  return `
    <div class="section-header scroll-reveal"><div class="section-title">Trending now</div></div>
    <div class="trend-scroll scroll-reveal">${cards}</div>`;
}
function buildFriendsActivity() {
  // always render the container so refreshFriendsActivity() can populate it
  return `<div id="home-friends-wrap"></div>`;
}

function _timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

async function refreshFriendsActivity() {
  const wrap = $('home-friends-wrap');
  if (!wrap) return;
  try {
    await loadFriends();
    if (!myFriends.length) return;
    // fetch with image_url included
    const ids  = myFriends.map(f => f.user_id);
    const exps = await api(
      `experiences?select=id,user_id,dish_id,user_display_name,user_avatar_url,created_at,rating,location_text,note,photo_url,dishes:dishes(name,image_url,collections(name))&user_id=in.(${ids.join(',')})&order=created_at.desc&limit=5`
    );
    if (!exps?.length) {
      wrap.innerHTML = `
        <div class="section-header scroll-reveal"><div class="section-title">Friends activity</div></div>
        <div style="padding:0 14px 14px"><div style="background:#fff;border-radius:14px;border:1px solid #EAE0D5;padding:16px;font-size:13px;color:#9E8E7A;text-align:center">Your buddies haven't checked in yet. 👀</div></div>`;
      setTimeout(initScrollReveal, 80);
      return;
    }
    const ids2 = exps.map(e => e.id);
    await loadLikesForIds(ids2);
    await loadCommentCountsForIds(ids2);
    exps.forEach(e => { faExps[e.id] = e; });
    const cards = exps.map(e => renderFeedCardCompact(e)).join('');
    wrap.innerHTML = `
      <div class="section-header scroll-reveal"><div class="section-title">Friends activity</div></div>
      <div class="fa-compact-list scroll-reveal">${cards}</div>`;
    setTimeout(initScrollReveal, 80);
  } catch(e) { console.log('friendsActivity:', e?.message); }
}

function toggleFaExpand(expId) {} // kept for backwards compat

async function openDishFromFeed(dishId) {
  let dish = allDishes.find(d => d.id === dishId);
  if (!dish) {
    try {
      const rows = await api(`dishes?id=eq.${dishId}&select=*`);
      dish = rows?.[0];
    } catch(e) {}
  }
  if (dish) openCard(dish, null);
}

// ── COMPACT FEED CARD (voor home screen) ──────────────
function renderFeedCardCompact(exp) {
  const dish     = exp.dishes || {};
  const heroImg  = exp.photo_url || dish.image_url || '';
  const stars    = exp.rating ? '★'.repeat(exp.rating) : '';
  const date     = exp.created_at ? _timeAgo(exp.created_at) : '';
  const initials = (exp.user_display_name || '?').charAt(0).toUpperCase();
  const name     = exp.user_display_name || 'Anonymous';

  return `<div class="fa-compact-card" data-exp-id="${exp.id}" onclick="openExpSheet('${exp.id}')">
    ${heroImg ? `<div class="fa-compact-thumb"><img src="${heroImg}" alt="" loading="lazy"></div>` : ''}
    <div class="fa-compact-body">
      <div class="fa-compact-top">
        <div class="fa-compact-avatar">${exp.user_avatar_url ? `<img src="${exp.user_avatar_url}" alt="">` : initials}</div>
        <div class="fa-compact-meta">
          <span class="fa-compact-name">${name}</span>
          <span class="fa-compact-dish"> · ${dish.name || ''}</span>
        </div>
        <span class="fa-compact-time">${date}</span>
      </div>
      ${exp.note ? `<div class="fa-compact-note">"${exp.note}"</div>` : ''}
      <div class="fa-compact-reactions" onclick="event.stopPropagation()">${renderActionBar(exp.id)}</div>
    </div>
  </div>`;
}

// ── NEXT CHALLENGE SECTION ────────────────────────────
function buildNextChallenge(coll) {
  if (!coll) return '';
  const info = COL_ICONS[coll.name] || { emoji:'⭐', bg:'#FFF3E0', color:'#C85A00' };
  const dishes = coll.dishes || [];
  const collDone = dishes.filter(d => userDishes.has(d.id)).length;
  const checkIcon = `<div class="fb-list-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D2318" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`;
  const lockIcon  = `<div class="fb-list-lock"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>`;
  const rows = dishes.map(dish => {
    const done = userDishes.has(dish.id);
    return `<div class="fb-list-row ${done ? 'tried' : ''}" onclick="openCardFromHome('${dish.id}')">
      <div class="fb-list-img-wrap">
        ${dish.image_url ? `<img src="${dish.image_url}" alt="${dish.name}" loading="lazy">` : '<div class="fb-list-placeholder">🍽️</div>'}
      </div>
      <div class="fb-list-info">
        <div class="fb-list-name">${dish.name}</div>
        ${dish.name_en ? `<div class="fb-list-en">${dish.name_en}</div>` : ''}
        <div class="fb-list-status" style="color:${info.color}">${done ? 'Collected' : 'Not collected'}</div>
      </div>
      ${done ? checkIcon : lockIcon}
    </div>`;
  }).join('');
  return `
    <div class="fb-list-section">
      <div class="fb-list-header">
        <div class="fb-list-title">${info.emoji} ${coll.name}</div>
        <div class="fb-list-viewall">${collDone} / ${dishes.length}</div>
      </div>
      ${rows}
    </div>`;
}

// ── RENDER HOME ───────────────────────────────────────
function renderHome() {
  const countryInfo = COUNTRY_DATA[currentCountry?.name] || { tagline:'Discover the flavors of the streets.', bg:'' };
  const heroBg = currentCountry?.hero_image_url || countryInfo.bg || '';

  // Update hero
  const heroImg = $('hero-bg-img');
  if (heroBg) { heroImg.src = heroBg; heroImg.style.display = 'block'; }
  else { heroImg.style.display = 'none'; }
  $('hero-country-name').textContent = currentCountry?.name || '';
  $('hero-country-flag').textContent = COUNTRY_FLAGS[currentCountry?.name] || '🌏';
  $('hero-tagline').textContent = countryInfo.tagline;

  // Hero total progress
  const totalDishes = allDishes.length;
  const totalCollected = userDishes.size;
  const totalPct = totalDishes > 0 ? Math.round(totalCollected / totalDishes * 100) : 0;
  const hpf = $('hero-prog-fill'); if (hpf) hpf.style.width = totalPct + '%';
  const hpfrac = $('hero-prog-frac'); if (hpfrac) hpfrac.textContent = `${totalCollected} / ${totalDishes}`;

  // XP + streak
  const xp = userDishes.size * 10;
  const streak = getStreak();
  const hxp = $('h-xp'); if (hxp) hxp.textContent = xp.toLocaleString();
  const hstr = $('h-streak'); if (hstr) hstr.textContent = streak + (streak === 1 ? ' day' : ' days');

  // First Bites
  const firstBites = allDishes.filter(d => d.first_bite_order != null).sort((a,b) => a.first_bite_order - b.first_bite_order);
  const fbDone  = firstBites.filter(d => userDishes.has(d.id)).length;
  const fbTotal = firstBites.length;
  const allDone = fbTotal > 0 && fbDone >= fbTotal;

  const nextColl = collections.find(c => c.name.toLowerCase().includes('classic'))
    || collections.find(c => !c.name.toLowerCase().includes('essential') && c.dishes.length > 3)
    || collections[1] || collections[0];

  const exploreGridHtml = collections.map(col => {
    const unlocked = isUnlocked(col);
    const info = COL_ICONS[col.name] || { emoji:'🍽️', bg:'#F5F0EA', color:'#9E8E7A' };
    return `<div class="home-jny-cell${!unlocked ? ' locked' : ''}" ${unlocked ? `onclick="openColl_byId('${col.id}')"` : ''}>
      <div class="home-jny-icon" style="background:${info.bg}">${unlocked ? info.emoji : '🔒'}</div>
      <div class="home-jny-name">${col.name}</div>
      <div class="home-jny-count" style="color:${info.color}">${col.collected}/${col.dishes.length}</div>
    </div>`;
  }).join('');

  if (allDone) {
    const badgeId = `first_bites_${currentCountry?.name}`;
    saveBadge(badgeId); // auto-save — no manual claim needed
    const claimed = isBadgeClaimed(badgeId);
    const fbDismissed = !!localStorage.getItem('sb_fb_dismissed_' + (currentCountry?.name || ''));

    if (fbDismissed) {
      // First Bites acknowledged — show Essentials as next challenge
      const essentialsColl = collections.find(c => c.name.toLowerCase().includes('essential'));
      $('home-dynamic').innerHTML = `
        ${buildNextChallenge(essentialsColl)}
        ${buildTodayForYou()}
        <div class="section-header scroll-reveal"><div class="section-title">Continue your journeys</div></div>
        <div class="home-jny-grid scroll-reveal">${exploreGridHtml}</div>
        ${buildFriendsActivity()}
        ${buildTrendingNow()}
        <div style="height:8px"></div>
      `;
    } else {
      const doneThumbs = firstBites.map(dish => `
        <div class="completion-done-thumb">
          ${dish.image_url ? `<img src="${dish.image_url}" alt="${dish.name}" loading="lazy">` : ''}
          <div class="completion-done-thumb-check">✓</div>
        </div>`).join('');
      const topBanner = claimed
        ? `<div class="claimed-pill" onclick="openBadgeSheet('${badgeId}')">
            <div class="claimed-pill-icon">🏅</div>
            <div class="claimed-pill-text"><div class="claimed-pill-title">First Bites Complete</div><div class="claimed-pill-sub">${currentCountry?.name} · Badge earned</div></div>
            <div class="claimed-pill-chev">›</div>
          </div>`
        : `<div class="completion-banner" onclick="openBadgeSheet('${badgeId}')" style="cursor:pointer">
            <div class="completion-sparkles"><span class="completion-sparkle">✦</span><span class="completion-sparkle">✦</span><span class="completion-sparkle">✦</span></div>
            <div class="completion-badge-row"><div class="completion-medal">🏅</div><div class="completion-badge-label">Achievement unlocked — tap to claim</div></div>
            <div class="completion-title">First Bites Complete!</div>
            <div class="completion-sub">You've experienced your first ${fbTotal} dishes in ${currentCountry?.name}. Ready to explore more local favorites?</div>
            <div class="completion-done-thumbs">${doneThumbs}</div>
          </div>`;
      const progressNote = claimed
        ? `<div class="progression-note scroll-reveal">You've experienced ${fbTotal} dishes in ${currentCountry?.name}. Ready to explore more local favorites?</div>`
        : '';
      $('home-dynamic').innerHTML = `
        ${topBanner}
        ${progressNote}
        ${buildTodayForYou()}
        <div class="section-header scroll-reveal"><div class="section-title">Continue your journeys</div></div>
        <div class="home-jny-grid scroll-reveal">${exploreGridHtml}</div>
        ${buildFriendsActivity()}
        ${buildTrendingNow()}
        <div style="height:8px"></div>
      `;
    }
  } else {
    const listRowsHtml = fbTotal === 0
      ? '<div style="padding:8px 4px;font-size:13px;color:rgba(255,255,255,.4)">No First Bites set for this country yet.</div>'
      : firstBites.map(dish => {
          const done = userDishes.has(dish.id);
          const nameEn = dish.name_en || '';
          const checkIcon = `<div class="fb-list-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D2318" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`;
          const lockIcon = `<div class="fb-list-lock"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>`;
          return `<div class="fb-list-row ${done ? 'tried' : ''}" onclick="openCardFromHome('${dish.id}')">
            <div class="fb-list-img-wrap">
              ${dish.image_url ? `<img src="${dish.image_url}" alt="${dish.name}" loading="lazy">` : '<div class="fb-list-placeholder">🍽️</div>'}
              <div class="fb-list-num">${dish.first_bite_order}</div>
            </div>
            <div class="fb-list-info">
              <div class="fb-list-name">${dish.name}</div>
              ${nameEn ? `<div class="fb-list-en">${nameEn}</div>` : ''}
              <div class="fb-list-status">${done ? 'Collected' : 'Not collected'}</div>
            </div>
            ${done ? checkIcon : lockIcon}
          </div>`;
        }).join('');

    $('home-dynamic').innerHTML = `
      <div class="fb-list-section">
        <div class="fb-list-header">
          <div class="fb-list-title">👑 First Bites</div>
          <div class="fb-list-viewall">${fbDone} / ${fbTotal}</div>
        </div>
        ${listRowsHtml}
      </div>
      <div class="section-header scroll-reveal"><div class="section-title">Continue your journeys</div></div>
      <div class="home-jny-grid scroll-reveal">${exploreGridHtml}</div>
      ${buildFriendsActivity()}
      ${buildTrendingNow()}
      <div style="height:8px"></div>
    `;
  }
  updateWelcome();
  setTimeout(refreshFriendsActivity, 50);
}
