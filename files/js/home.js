// ── EXPERIENCE SHEET ──────────────────────────────────
let faExps = {};

// ── TODAY FOR YOU ─────────────────────────────────────
function pickTodayDishes() {
  const uncollected = allDishes.filter(d => !userDishes.has(d.id));
  if (!uncollected.length) return [];
  const today = new Date().toDateString();
  const seeded = [...uncollected].sort((a, b) => _dayHash(a.id + today) - _dayHash(b.id + today));
  const easy        = seeded.find(d => d.rarity === 'common') || seeded.find(d => d.rarity === 'uncommon') || seeded[0];
  const popPool     = seeded.filter(d => d !== easy);
  const popular     = popPool.find(d => d.rarity === 'uncommon') || popPool.find(d => d.rarity === 'common') || popPool[0];
  const advPool     = seeded.filter(d => d !== easy && d !== popular);
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
        <div class="fb-list-num" style="${done ? '' : 'background:rgba(0,0,0,.35);color:#fff'}">${emoji}</div>
      </div>
      <div class="fb-list-info">
        <div class="fb-list-name">${dish.name}</div>
        ${dish.name_en ? `<div class="fb-list-en">${dish.name_en}</div>` : ''}
        <div class="fb-list-status" style="color:${accent}">${label.split(' ').slice(1).join(' ')}</div>
      </div>
      ${done ? checkIcon : lockIcon}
    </div>`;
  }).join('');
  return `<div class="fb-list-section">
    <div class="fb-list-header">
      <div class="fb-list-title">✨ Tips for today</div>
      <div class="fb-list-viewall">${currentCountry?.name || ''}</div>
    </div>
    ${rows}
  </div>`;
}

// ── SWIPEABLE JOURNEYS ────────────────────────────────
let _journeyIdx = 0, _journeyCountryId = null, _jnyBusy = false;

function _jnyArrows(journeys) {
  return { atStart: _journeyIdx === 0, atEnd: _journeyIdx === journeys.length - 1 };
}

function jnyNav(dir) {
  if (_jnyBusy) return;
  const journeys = collections.filter(c => isUnlocked(c));
  const newIdx = Math.max(0, Math.min(_journeyIdx + dir, journeys.length - 1));
  if (newIdx === _journeyIdx) return;
  _journeyIdx = newIdx;
  _jnyBusy = true;

  const slide = $('jny-slide');
  if (!slide) { _jnyBusy = false; return; }

  const newHtml = buildNextChallenge(journeys[_journeyIdx], _jnyArrows(journeys));
  const DUR = 280, ease = 'cubic-bezier(.4,0,.2,1)';
  const outX = dir > 0 ? '-100%' : '100%';
  const inX  = dir > 0 ?  '100%' : '-100%';

  slide.style.cssText = `height:${slide.offsetHeight}px;overflow:hidden;position:relative`;
  const old = slide.firstElementChild;
  if (old) old.style.cssText = 'position:absolute;top:0;left:0;right:0;will-change:transform';

  const tmp = document.createElement('div');
  tmp.innerHTML = newHtml;
  const next = tmp.firstElementChild;
  next.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateX(${inX});will-change:transform`;
  slide.appendChild(next);

  requestAnimationFrame(() => {
    const t = `transform ${DUR}ms ${ease}`;
    if (old) { old.style.transition = t; old.style.transform = `translateX(${outX})`; }
    next.style.transition = t;
    next.style.transform = 'translateX(0)';
  });

  setTimeout(() => { slide.style.cssText = ''; slide.innerHTML = newHtml; _jnyBusy = false; }, DUR + 20);
}

function buildSwipeableJourneys() {
  const journeys = collections.filter(c => isUnlocked(c));
  if (!journeys.length) return '';
  if (_journeyCountryId !== countryId) { _journeyIdx = 0; _journeyCountryId = countryId; }
  _journeyIdx = Math.min(_journeyIdx, journeys.length - 1);
  return `<div id="home-swipe-wrap"><div id="jny-slide">${buildNextChallenge(journeys[_journeyIdx], _jnyArrows(journeys))}</div></div>`;
}

function buildNextChallenge(coll, navArrows = null) {
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
  const leftArrow  = navArrows ? `<span class="jny-arrow${navArrows.atStart ? ' disabled' : ''}" onclick="jnyNav(-1)">‹</span>` : '';
  const rightArrow = navArrows ? `<span class="jny-arrow${navArrows.atEnd ? ' disabled' : ''}" onclick="jnyNav(1)">›</span>` : '';
  return `<div class="fb-list-section">
    <div class="fb-list-header">
      ${leftArrow}
      <div class="fb-list-title" style="${navArrows ? 'flex:1' : ''}">${info.emoji} ${coll.name}</div>
      <div class="fb-list-viewall">${collDone} / ${dishes.length}</div>
      ${rightArrow}
    </div>
    ${rows}
  </div>`;
}

function initJourneySwipe() {
  const wrap = $('home-swipe-wrap');
  if (!wrap) return;
  let tx = 0, ty = 0;
  wrap.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, {passive:true});
  wrap.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    jnyNav(dx < 0 ? 1 : -1);
  }, {passive:true});
}

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

function closeExpSheet() { $('exp-sheet-backdrop').classList.remove('open'); }

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

// ── RECENT CHECK-INS ──────────────────────────────────
function buildRecentHtml() {
  const recent = recentDishIds
    .map(id => allDishes.find(d => d.id === id))
    .filter(Boolean)
    .slice(0, 8);
  if (recent.length === 0) return '';
  const cards = recent.map(dish => {
    const col = collections.find(c => c.dishes.some(d => d.id === dish.id));
    return `<div class="recent-card" onclick="openCardFromHome('${dish.id}')">
      <div class="recent-img-wrap">
        ${dish.image_url
          ? `<img src="${dish.image_url}" alt="${dish.name}" loading="lazy">`
          : `<div class="recent-img-placeholder">🍽️</div>`}
        <div class="recent-check-badge">✓</div>
      </div>
      <div class="recent-card-name">${dish.name}</div>
      <div class="recent-card-coll">${col?.name?.split(' ')[0] || ''}</div>
    </div>`;
  }).join('');
  return `
    <div class="recent-section scroll-reveal">
      <div class="recent-title">Recent check-ins</div>
    </div>
    <div class="recent-scroll scroll-reveal">${cards}</div>
  `;
}

// ── FRIENDS ACTIVITY ──────────────────────────────────
function buildFriendsActivity() {
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

function _dayHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0x7FFFFFFF;
  return h;
}
function mockTravelerCount(id) {
  return 80 + (_dayHash(id) % 350);
}

async function refreshFriendsActivity() {
  const wrap = $('home-friends-wrap');
  if (!wrap) return;
  try {
    await loadFriends();
    if (!myFriends.length) return;
    const ids = myFriends.map(f => f.user_id);

    const [exps, badgeRows] = await Promise.all([
      api(`experiences?select=id,user_id,dish_id,user_display_name,user_avatar_url,created_at,rating,location_text,note,photo_url,dishes:dishes(name,image_url,collections(name))&user_id=in.(${ids.join(',')})&order=created_at.desc&limit=5`),
      api(`user_badges?user_id=in.(${ids.join(',')})&select=badge_id,user_id,created_at,profiles!user_badges_user_id_fkey(display_name,avatar_url)&order=created_at.desc&limit=4`).catch(() => [])
    ]);

    if (!exps?.length && !badgeRows?.length) {
      wrap.innerHTML = `
        <div class="section-header scroll-reveal"><div class="section-title">Friends activity</div></div>
        <div style="padding:0 14px 14px"><div style="background:#fff;border-radius:14px;border:1px solid #EAE0D5;padding:16px;font-size:13px;color:#9E8E7A;text-align:center">Your buddies haven't checked in yet. 👀</div></div>`;
      setTimeout(initScrollReveal, 80);
      return;
    }

    if (exps?.length) {
      const ids2 = exps.map(e => e.id);
      await loadLikesForIds(ids2);
      await loadCommentCountsForIds(ids2);
      exps.forEach(e => { faExps[e.id] = e; });
    }

    const checkInItems = (exps || []).map(e => ({ _type: 'checkin', _date: e.created_at, data: e }));
    const badgeItems   = (badgeRows || []).filter(b => BADGES[b.badge_id]).map(b => ({ _type: 'badge', _date: b.created_at, data: b }));
    const merged = [...checkInItems, ...badgeItems]
      .sort((a, b) => new Date(b._date || 0) - new Date(a._date || 0))
      .slice(0, 7);

    const cards = merged.map(item =>
      item._type === 'badge' ? renderBadgeEvent(item.data) : renderFeedCardCompact(item.data)
    ).join('');

    wrap.innerHTML = `
      <div class="section-header scroll-reveal"><div class="section-title">Friends activity</div></div>
      <div class="fa-compact-list scroll-reveal">${cards}</div>`;
    setTimeout(initScrollReveal, 80);
  } catch(e) { console.log('friendsActivity:', e?.message); }
}

function renderBadgeEvent(b) {
  const profile  = b.profiles || {};
  const name     = profile.display_name || 'Someone';
  const initials = name[0].toUpperCase();
  const badge    = BADGES[b.badge_id] || {};
  const time     = b.created_at ? _timeAgo(b.created_at) : '';
  return `<div class="fa-compact-card fa-event-card">
    <div class="fa-compact-body" style="padding:12px 14px">
      <div class="fa-compact-top">
        <div class="fa-compact-avatar">${profile.avatar_url ? `<img src="${profile.avatar_url}" alt="">` : initials}</div>
        <div class="fa-compact-meta">
          <span class="fa-compact-name">${name}</span>
          <span class="fa-compact-dish"> unlocked ${badge.icon || '🏅'} <strong>${badge.title || b.badge_id}</strong></span>
        </div>
        ${time ? `<span class="fa-compact-time">${time}</span>` : ''}
      </div>
    </div>
  </div>`;
}

function toggleFaExpand(expId) {}

async function openDishFromFeed(dishId) {
  let dish = allDishes.find(d => d.id === dishId);
  if (!dish) {
    try { const rows = await api(`dishes?id=eq.${dishId}&select=*`); dish = rows?.[0]; } catch(e) {}
  }
  if (dish) openCard(dish, null);
}

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

// ── RENDER HOME ───────────────────────────────────────
function renderHome() {
  const countryInfo = COUNTRY_DATA[currentCountry?.name] || { tagline:'Discover the flavors of the streets.', bg:'' };
  const heroBg = currentCountry?.hero_image_url || countryInfo.bg || '';

  const heroImg = $('hero-bg-img');
  if (heroBg) { heroImg.src = heroBg; heroImg.style.display = 'block'; }
  else { heroImg.style.display = 'none'; }
  $('hero-country-name').textContent = currentCountry?.name || '';
  $('hero-country-flag').textContent = COUNTRY_FLAGS[currentCountry?.name] || '🌏';
  $('hero-tagline').textContent = countryInfo.tagline;

  const totalDishes = allDishes.length;
  const totalCollected = userDishes.size;
  const totalPct = totalDishes > 0 ? Math.round(totalCollected / totalDishes * 100) : 0;
  const hpf = $('hero-prog-fill'); if (hpf) hpf.style.width = totalPct + '%';
  const hpfrac = $('hero-prog-frac'); if (hpfrac) hpfrac.textContent = `${totalCollected} / ${totalDishes}`;

  const xp = userDishes.size * 10;
  const streak = getStreak();
  const hxp = $('h-xp'); if (hxp) hxp.textContent = xp.toLocaleString();
  const hstr = $('h-streak'); if (hstr) hstr.textContent = streak + (streak === 1 ? ' day' : ' days');

  const firstBites = allDishes.filter(d => d.first_bite_order != null).sort((a,b) => a.first_bite_order - b.first_bite_order);
  const fbDone  = firstBites.filter(d => userDishes.has(d.id)).length;
  const fbTotal = firstBites.length;
  const allDone = fbTotal > 0 && fbDone >= fbTotal;

  const recentHtml = buildRecentHtml();

  if (allDone) {
    const badgeId = `first_bites_${currentCountry?.name}`;
    const claimed = isBadgeClaimed(badgeId);

    if (claimed) {
      // Badge already claimed — toon collecties + tips, geen melding meer
      $('home-dynamic').innerHTML = `
        ${buildSwipeableJourneys()}
        ${buildTodayForYou()}
        ${buildFriendsActivity()}
        ${recentHtml}
        <div style="height:8px"></div>
      `;
    } else {
      // Nog niet geclaimd — toon completion banner + collecties + tips
      const doneThumbs = firstBites.map(dish => `
        <div class="completion-done-thumb">
          ${dish.image_url ? `<img src="${dish.image_url}" alt="${dish.name}" loading="lazy">` : ''}
          <div class="completion-done-thumb-check">✓</div>
        </div>`).join('');
      $('home-dynamic').innerHTML = `
        <div class="completion-banner" onclick="openBadgeSheet('${badgeId}')" style="cursor:pointer">
          <div class="completion-sparkles"><span class="completion-sparkle">✦</span><span class="completion-sparkle">✦</span><span class="completion-sparkle">✦</span></div>
          <div class="completion-badge-row"><div class="completion-medal">🏅</div><div class="completion-badge-label">Achievement unlocked — tap to claim</div></div>
          <div class="completion-title">First Bites Complete!</div>
          <div class="completion-sub">You've tasted the soul of ${currentCountry?.name}. Ready to go deeper?</div>
          <div class="completion-done-thumbs">${doneThumbs}</div>
        </div>
        ${buildSwipeableJourneys()}
        ${buildTodayForYou()}
        ${buildFriendsActivity()}
        ${recentHtml}
        <div style="height:8px"></div>
      `;
    }
  } else {
    // First Bites nog niet klaar — alleen First Bites, geen collecties
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
      ${buildFriendsActivity()}
      ${recentHtml}
      <div style="height:8px"></div>
    `;
  }
  updateWelcome();
  setTimeout(initJourneySwipe, 50);
  setTimeout(refreshFriendsActivity, 50);
}
