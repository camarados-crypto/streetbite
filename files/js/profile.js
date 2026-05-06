function renderProfile() {
  const isAnon     = !sbUser || sbUser.is_anonymous;
  const name       = sbUser?.user_metadata?.full_name || sbUser?.user_metadata?.name || null;
  const email      = sbUser?.email || null;
  const avatarUrl  = sbUser?.user_metadata?.avatar_url || null;
  const collected  = userDishes.size;
  const claimedBadges   = loadClaimedBadges();
  const badgeCount      = claimedBadges.size;
  const visitedCountries = passportData ? passportData.filter(c => c.tried > 0).length : 0;

  const previewStamps = allCountries.slice(0,3).map(c => {
    const flag = COUNTRY_FLAGS[c.name] || '🌏';
    const pd   = passportData?.find(p => p.id === c.id);
    const cls  = pd?.pct === 100 ? 'complete' : pd?.tried > 0 ? '' : 'unvisited';
    return `<div class="prof-passport-stamp-mini ${cls}">${flag}</div>`;
  }).join('');

  const badgeChips = [...claimedBadges].map(id => {
    const b = BADGES[id]; if (!b) return '';
    return `<span class="prof-badge-chip" onclick="openPassport()">🏅 ${b.title.replace('First Bites ','')}</span>`;
  }).join('');

  $('prof-content').innerHTML = `
    <div class="prof-hero">
      <div class="prof-av ${isAnon ? 'anon' : ''}">
        ${avatarUrl ? `<img src="${avatarUrl}" alt="${name}">` : isAnon
          ? `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(28,18,8,.3)" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
          : `<span style="font-size:28px;font-weight:700;color:#9E8E7A">${(name||'?')[0].toUpperCase()}</span>`}
      </div>
      <div class="prof-name-txt">${name || 'Anonymous'}</div>
      ${email ? `<div class="prof-email">${email}</div>` : '<div class="prof-email">Not logged in</div>'}
    </div>
    <div class="prof-stats">
      <div class="prof-stat"><div class="prof-stat-v">${collected}</div><div class="prof-stat-l">Tried</div></div>
      <div class="prof-stat"><div class="prof-stat-v">${visitedCountries||'—'}</div><div class="prof-stat-l">Countries</div></div>
      <div class="prof-stat"><div class="prof-stat-v">${badgeCount||'—'}</div><div class="prof-stat-l">Badges</div></div>
    </div>
    <div class="prof-section">
      <div class="prof-section-title">Food Passport</div>
      <div class="prof-passport-preview" onclick="openPassport()">
        <div class="prof-passport-stamps">${previewStamps}</div>
        <div class="prof-passport-txt">
          <div class="prof-passport-label">Your journey</div>
          <div class="prof-passport-title">${visitedCountries} countr${visitedCountries===1?'y':'ies'} visited</div>
          <div class="prof-passport-sub">${collected} dishes tried worldwide</div>
        </div>
        <div class="prof-passport-chev">›</div>
      </div>
    </div>
    ${badgeCount > 0 ? `<div class="prof-section"><div class="prof-section-title">Your badges</div><div style="padding:0 18px">${badgeChips}</div></div>` : ''}
    ${isAnon ? `
      <div class="prof-section">
        <div class="prof-section-title">Save your progress</div>
        <div class="prof-card"><div class="prof-row" style="cursor:default"><div class="prof-row-icon">☁️</div><div class="prof-row-txt"><div class="prof-row-label">Sync to cloud</div><div class="prof-row-sub">Log in to save your collection</div></div></div></div>
        <button class="google-btn" onclick="signInWithGoogle()">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
      </div>
    ` : `
      <div class="prof-section">
        <div class="prof-section-title">Account</div>
        <div class="prof-card"><div class="prof-row"><div class="prof-row-icon">☁️</div><div class="prof-row-txt"><div class="prof-row-label">Progress synced</div><div class="prof-row-sub">${collected} dishes saved</div></div><span class="prof-row-chev" style="color:#2A7A2A">✓</span></div></div>
        <button class="sign-out-btn" onclick="signOut()">Sign out</button>
      </div>
    `}
    <div style="height:8px"></div>
  `;
}
