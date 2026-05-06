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

  const exploreRowsHtml = collections.map(col => {
    const unlocked = isUnlocked(col);
    const info = COL_ICONS[col.name] || { emoji:'🍽️', bg:'#F5F0EA', color:'#9E8E7A' };
    const desc = COL_DESCRIPTIONS[col.name] || 'Discover local favorites';
    return `<div class="explore-row${!unlocked ? ' locked' : ''}" ${unlocked ? `onclick="openColl_byId('${col.id}')"` : ''}>
      <div class="explore-icon" style="background:${info.bg}">${info.emoji}</div>
      <div class="explore-info"><div class="explore-name">${col.name}</div><div class="explore-desc">${desc}</div></div>
      <div class="explore-meta">
        ${!unlocked ? '<span style="font-size:13px">🔒</span>' : ''}
        <span class="explore-count" style="color:${info.color}">${col.collected}/${col.dishes.length}</span>
        <span class="explore-chev">›</span>
      </div>
    </div>`;
  }).join('');

  const recentHtml = buildRecentHtml();

  if (allDone) {
    const badgeId = `first_bites_${currentCountry?.name}`;
    const claimed = isBadgeClaimed(badgeId);
    const doneThumbs = firstBites.map(dish => `
      <div class="completion-done-thumb">
        ${dish.image_url ? `<img src="${dish.image_url}" alt="${dish.name}" loading="lazy">` : ''}
        <div class="completion-done-thumb-check">✓</div>
      </div>`).join('');
    const njImg  = nextColl?.dishes.find(d => d.image_url);
    const njInfo = COL_ICONS[nextColl?.name] || { emoji:'🍜', bg:'#FFF8E1', color:'#B07800' };
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
          <div class="completion-sub">You've tasted the soul of ${currentCountry?.name}. Ready to go deeper?</div>
          <div class="completion-done-thumbs">${doneThumbs}</div>
        </div>`;
    $('home-dynamic').innerHTML = `
      ${topBanner}
      <div class="next-journey-wrap">
        <div class="next-journey-card" onclick="openColl_byId('${nextColl?.id}')">
          ${njImg ? `<img class="next-journey-img" src="${njImg.image_url}" alt="${nextColl?.name}" loading="lazy">` : '<div style="height:140px;background:linear-gradient(135deg,#2D6A4F,#1A2B22)"></div>'}
          <div class="next-journey-content">
            <div class="next-journey-eyebrow">${njInfo.emoji} Next stop</div>
            <div class="next-journey-title">${nextColl?.name || ''}</div>
            <div class="next-journey-sub">${COL_DESCRIPTIONS[nextColl?.name] || 'Discover what comes next'}</div>
            <div class="next-journey-meta">
              <span class="next-journey-count">${nextColl?.collected || 0} / ${nextColl?.dishes.length || 0} dishes</span>
              <button class="next-journey-cta" onclick="event.stopPropagation();openColl_byId('${nextColl?.id}')">Continue →</button>
            </div>
          </div>
        </div>
      </div>
      <div class="explore-header scroll-reveal">Explore more</div>
      <div class="explore-list scroll-reveal">${exploreRowsHtml}</div>
      ${recentHtml}
      <div style="height:8px"></div>
    `;
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
      <div class="explore-header scroll-reveal">Explore more</div>
      <div class="explore-list scroll-reveal">${exploreRowsHtml}</div>
      ${recentHtml}
      <div style="height:8px"></div>
    `;
  }
  updateWelcome();
}
