// ── XP LEVEL SYSTEM ───────────────────────────────────
const LEVEL_TITLES = ['Tourist','Wanderer','Explorer','Taster','Adventurer','Hunter','Regular','Insider','Collector','Local','Legend','Tourist No More'];
function getXPLevel(xp) {
  const t = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000];
  let lv = 1;
  for (let i = 0; i < t.length; i++) { if (xp >= t[i]) lv = i + 1; else break; }
  const next = t[lv] || t[t.length - 1] + 5000;
  const prev = t[lv - 1] || 0;
  const pct  = Math.min(100, Math.round((xp - prev) / (next - prev) * 100));
  const title = LEVEL_TITLES[lv - 1] || LEVEL_TITLES[LEVEL_TITLES.length - 1];
  return { level: lv, xp, next, prev, pct, title };
}

// ── CURRENT QUEST ─────────────────────────────────────
function getProfileQuest() {
  if (!collections?.length || !userDishes) return null;
  let best = null, bestDone = 0;
  for (const col of collections) {
    const dishes = col.dishes || [];
    if (!dishes.length) continue;
    const done = dishes.filter(d => userDishes.has(d.id)).length;
    if (done === 0 || done === dishes.length) continue;
    if (done > bestDone) { bestDone = done; best = { col, done, total: dishes.length, left: dishes.length - done }; }
  }
  return best;
}

// ── RENDER PROFILE ────────────────────────────────────
async function renderProfile() {
  await loadMyProfile();
  const isAnon     = !sbUser || sbUser.is_anonymous;
  const name       = sbUser?.user_metadata?.full_name || sbUser?.user_metadata?.name || null;
  const avatarUrl  = sbUser?.user_metadata?.avatar_url || null;
  const collected  = userDishes.size;
  const xp         = collected * 10;
  const lvl        = getXPLevel(xp);
  const claimedSet = loadClaimedBadges();
  const badgeCount = claimedSet.size;

  // ── Avatar ──
  const avatarHtml = avatarUrl
    ? `<img src="${avatarUrl}" alt="${name || ''}">`
    : isAnon
      ? `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
      : `<span class="prof-av-letter">${(name || '?')[0].toUpperCase()}</span>`;

  // ── Settings / auth button icon ──
  const settingsIcon = isAnon
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2" stroke-linecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;

  // ── Countries visited ──
  const visitedCountries = allCountries.filter(c => {
    const pd = passportData?.find(p => p.id === c.id);
    return pd && pd.tried > 0;
  });
  const countriesCount = visitedCountries.length;

  const countryCardsHtml = visitedCountries.map(c => {
    const pd     = passportData.find(p => p.id === c.id);
    const flag   = COUNTRY_FLAGS[c.name] || '🌏';
    const imgUrl = COUNTRY_DATA[c.name]?.bg || '';
    const pct    = pd.pct || 0;
    return `<div class="prof-country-card">
      <div class="prof-country-img-wrap">
        ${imgUrl
          ? `<img src="${imgUrl}" alt="${c.name}" loading="lazy">`
          : `<div class="prof-country-img-fb">${flag}</div>`}
        <div class="prof-country-overlay"></div>
        <div class="prof-country-content">
          <div class="prof-country-flag">${flag}</div>
          <div class="prof-country-name">${c.name}</div>
          <div class="prof-country-tried">${pd.tried} dishes tried</div>
          <div class="prof-country-prog"><div class="prof-country-prog-fill" style="width:${pct}%"></div></div>
        </div>
      </div>
    </div>`;
  }).join('');

  // ── Badges (earned only) ──
  const earnedIds = [...claimedSet].filter(id => BADGES[id]);
  const shownBadges = earnedIds.slice(0, 3);
  const extraCount  = earnedIds.length - shownBadges.length;
  const badgesHtml  = shownBadges.map(id => {
    const b = BADGES[id];
    return `<div class="prof-badge-item earned" onclick="openBadgeSheet('${id}')">
      <div class="prof-badge-icon">${b.icon}</div>
      <div class="prof-badge-name">${b.title.replace('First Bites ', '')}</div>
    </div>`;
  }).join('');
  const seeAllHtml = extraCount > 0
    ? `<div class="prof-badge-seeall" onclick="profShowAllBadges()">+${extraCount} more</div>`
    : !earnedIds.length
      ? `<div class="prof-badge-empty">Collect dishes to earn badges</div>`
      : '';

  // ── Current quest ──
  const quest = getProfileQuest();
  const questHtml = quest
    ? `<div class="prof-quest-line">🎯 ${quest.left} more dish${quest.left === 1 ? '' : 'es'} to go for <strong>${quest.col.name}</strong></div>`
    : '';

  // ── Recent check-ins ──
  const recentHtml = recentDishIds.slice(0, 5).map(id => {
    const dish = allDishes.find(d => d.id === id); if (!dish) return '';
    const col  = collections.find(c => c.dishes.some(d => d.id === id));
    return `<div class="prof-checkin-item" onclick="openCardFromHome('${id}')">
      <div class="prof-checkin-img">
        ${dish.image_url ? `<img src="${dish.image_url}" alt="${dish.name}" loading="lazy">` : '<div class="prof-checkin-ph">🍽️</div>'}
        <div class="prof-checkin-check">✓</div>
      </div>
      <div class="prof-checkin-info">
        <div class="prof-checkin-name">${dish.name_en || dish.name}</div>
        <div class="prof-checkin-meta">${col?.name?.split(' ')[0] || currentCountry?.name || ''}</div>
      </div>
      <div class="prof-checkin-chev">›</div>
    </div>`;
  }).filter(Boolean).join('');

  $('prof-content').innerHTML = `
    <div class="prof-hero-dark">
      <div class="prof-hero-topbar">
        <div class="hero-logo">Street<span>Bite</span></div>
        <button class="prof-settings-btn" onclick="${isAnon ? 'signInWithGoogle()' : 'signOut()'}">
          ${settingsIcon}
        </button>
      </div>
      <div class="prof-av-wrap">
        <div class="prof-av-ring"><div class="prof-av">${avatarHtml}</div></div>
      </div>
      <div class="prof-hero-name">${isAnon ? 'Guest' : (name || 'Anonymous')}</div>
      ${myProfile ? `<div class="prof-hero-username">@${myProfile.username}</div>` : isAnon ? '' : `<div class="prof-hero-username prof-hero-username-cta" onclick="openUsernameModal(()=>renderProfile())">+ Set username</div>`}

      ${isAnon ? `
        <div class="prof-hero-sub">Save your progress & join friends</div>
        <button class="prof-login-hero-btn" onclick="signInWithGoogle()">
          <svg width="16" height="16" viewBox="0 0 24 24" style="flex-shrink:0"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
      ` : `
        <div class="prof-level-display">
          <span class="prof-level-num">${lvl.level}</span>
          <div class="prof-level-divider"></div>
          <span class="prof-level-title">${lvl.title}</span>
        </div>
        <div class="prof-xp-wrap">
          <div class="prof-xp-row">
            <span class="prof-xp-label">${lvl.xp.toLocaleString()} XP</span>
            <span class="prof-xp-nums">Next level at ${lvl.next.toLocaleString()} XP</span>
          </div>
          <div class="prof-xp-bar"><div class="prof-xp-fill" style="width:${lvl.pct}%"></div></div>
        </div>
        <button class="prof-friends-btn" onclick="openFriendsModal()">👥 Friends${myFriends.length > 0 ? ` · ${myFriends.length}` : ''}</button>
      `}

      <div class="prof-stats-row">
        <div class="prof-stat-item">
          <div class="prof-stat-v">${countriesCount || '—'}</div>
          <div class="prof-stat-l">Countries</div>
        </div>
        <div class="prof-stat-div"></div>
        <div class="prof-stat-item">
          <div class="prof-stat-v">${collected}</div>
          <div class="prof-stat-l">Dishes</div>
        </div>
        <div class="prof-stat-div"></div>
        <div class="prof-stat-item">
          <div class="prof-stat-v">${badgeCount || '—'}</div>
          <div class="prof-stat-l">Badges</div>
        </div>
        <div class="prof-stat-div"></div>
        <div class="prof-stat-item">
          <div class="prof-stat-v">${xp.toLocaleString()}</div>
          <div class="prof-stat-l">XP</div>
        </div>
      </div>
    </div>

    <div class="prof-body">

      ${questHtml}

      ${visitedCountries.length > 0 ? `
        <div class="prof-section-row">
          <div class="prof-section-hd">Countries visited</div>
          <div class="prof-section-action" onclick="openPassport()">Passport ›</div>
        </div>
        <div class="prof-countries-scroll">${countryCardsHtml}</div>
      ` : `
        <div class="prof-section-row">
          <div class="prof-section-hd">Food Passport</div>
        </div>
        <div style="padding:0 14px 4px">
          <div class="prof-passport-cta" onclick="openPassport()">
            <div class="prof-passport-cta-icon">🗺️</div>
            <div class="prof-passport-cta-txt">
              <div class="prof-passport-cta-title">View your food passport</div>
              <div class="prof-passport-cta-sub">Track your journey across countries</div>
            </div>
            <div class="prof-passport-cta-chev">›</div>
          </div>
        </div>
      `}

      <div class="prof-section-row" style="margin-top:8px">
        <div class="prof-section-hd">Achievements</div>
      </div>
      <div class="prof-badges-scroll">${badgesHtml}${seeAllHtml}</div>

      ${recentHtml ? `
        <div class="prof-section-hd" style="margin-top:8px">Recent activity</div>
        <div class="prof-checkins-list">${recentHtml}</div>
      ` : ''}

      <div class="prof-section-hd" style="margin-top:8px">Account</div>
      <div class="prof-account-card">
        ${isAnon ? `
          <div class="prof-account-txt">Log in to save your collection across devices.</div>
          <button class="prof-google-btn" onclick="signInWithGoogle()">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
        ` : `
          <div class="prof-account-synced">☁️ Progress synced — ${collected} dishes saved</div>
          <button class="prof-google-btn" onclick="shareMyProfile()" style="margin-bottom:8px">🔗 Share my profile</button>
          <button class="prof-signout-btn" onclick="signOut()">Sign out</button>
        `}
      </div>

      <div style="height:12px"></div>
      <div style="text-align:center;font-size:11px;color:#C0B0A0;padding-bottom:20px">StreetBite v${APP_VERSION}</div>
    </div>
  `;
}

function profShowAllBadges() {
  const claimedSet = loadClaimedBadges();
  const earnedIds  = [...claimedSet].filter(id => BADGES[id]);
  const scroll = document.querySelector('.prof-badges-scroll');
  if (!scroll) return;
  scroll.innerHTML = earnedIds.map(id => {
    const b = BADGES[id];
    return `<div class="prof-badge-item earned" onclick="openBadgeSheet('${id}')">
      <div class="prof-badge-icon">${b.icon}</div>
      <div class="prof-badge-name">${b.title.replace('First Bites ', '')}</div>
    </div>`;
  }).join('');
}
