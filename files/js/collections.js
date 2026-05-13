// ── SCREEN NAVIGATION ─────────────────────────────────
function showScreen(id) {
  ['s-home','s-journeys','s-coll','s-feed','s-profile'].forEach(s => $(s).classList.add('gone'));
  $(id).classList.remove('gone');
}
function showTab(tab) {
  ['nb-explore','nb-feed','nb-coll','nb-profile'].forEach(b => $(b).classList.remove('on'));
  const hdr = $('app-header');
  if (tab === 'home') {
    hdr.classList.add('app-header-hidden');
    document.body.classList.remove('with-app-header');
    showScreen('s-home'); $('nb-explore').classList.add('on');
    setTimeout(initScrollReveal, 80);
  } else if (tab === 'feed') {
    hdr.classList.remove('app-header-hidden');
    document.body.classList.add('with-app-header');
    showScreen('s-feed'); $('nb-feed').classList.add('on');
    openFeed();
  } else if (tab === 'coll') {
    hdr.classList.remove('app-header-hidden');
    document.body.classList.add('with-app-header');
    renderJourneys(); showScreen('s-journeys');
    $('nb-coll').classList.add('on');
  } else if (tab === 'profile') {
    hdr.classList.remove('app-header-hidden');
    document.body.classList.add('with-app-header');
    renderProfile(); showScreen('s-profile');
    $('nb-profile').classList.add('on'); $('s-profile').scrollTop = 0;
  }
}
function openColl(col) {
  $('app-header').classList.remove('app-header-hidden');
  document.body.classList.add('with-app-header');
  renderColl(col); showScreen('s-coll'); $('s-coll').scrollTop = 0;
  $('nb-coll').classList.add('on'); $('nb-explore').classList.remove('on');
}
function goHome() {
  $('app-header').classList.add('app-header-hidden');
  document.body.classList.remove('with-app-header');
  renderHome(); showScreen('s-home');
  $('nb-explore').classList.add('on'); $('nb-coll').classList.remove('on');
  setTimeout(initScrollReveal, 80);
}
function goJourneys() {
  $('app-header').classList.remove('app-header-hidden');
  document.body.classList.add('with-app-header');
  renderJourneys(); showScreen('s-journeys');
  $('nb-coll').classList.add('on'); $('nb-explore').classList.remove('on');
  setTimeout(initScrollReveal, 80);
}
function openColl_byId(id) { const col = collections.find(c => c.id === id); if (col) openColl(col); }

// ── QUEST RARITY ──────────────────────────────────────
function questRarity(col) {
  const n = col.name.toLowerCase();
  if (n.includes('daredevil')) return { label:'LEGENDARY', accent:'#FF4D6D', glow:'rgba(255,77,109,.35)', grade:'legendary' };
  if (n.includes('essential')) return { label:'COMMON',    accent:'#74C69D', glow:'rgba(116,198,157,.3)', grade:'common' };
  if (n.includes('classic') || n.includes('night market') || n.includes('streets') || n.includes('nights')) {
    return { label:'RARE', accent:'#F0A030', glow:'rgba(240,160,48,.35)', grade:'rare' };
  }
  return { label:'UNCOMMON', accent:'#6EB4F0', glow:'rgba(110,180,240,.3)', grade:'uncommon' };
}

function questBadgeReward(col) {
  const n = col.name.toLowerCase();
  if (n.includes('essential')) return { id:'tourist_no_more', label:'Tourist No More' };
  if (n.includes('classic'))   return { id:'street_certified', label:'Street Certified' };
  if (n.includes('daredevil')) return { id:'fearless_eater',  label:'Fearless Eater' };
  return null;
}

// ── RENDER JOURNEYS ────────────────────────────────────
function renderJourneys() {
  const jc = $('journeys-country');
  if (jc) jc.textContent = currentCountry?.name || '';
  const list = $('journeys-list');
  if (!list) return;

  const almostDone = collections.filter(c => {
    const pct = c.dishes.length > 0 ? c.collected / c.dishes.length : 0;
    return isUnlocked(c) && pct >= 0.6 && pct < 1;
  }).sort((a,b) => (b.collected/b.dishes.length) - (a.collected/a.dishes.length));

  const almostHtml = almostDone.length ? `
    <div class="qc-almost-wrap">
      <div class="qc-almost-label">⚡ Almost there</div>
      ${almostDone.map(c => {
        const left = c.dishes.length - c.collected;
        const r    = questRarity(c);
        return `<div class="qc-almost-row" onclick="openColl_byId('${c.id}')">
          <div class="qc-almost-dot" style="background:${r.accent}"></div>
          <div class="qc-almost-name">${c.name}</div>
          <div class="qc-almost-left" style="color:${r.accent}">${left} left</div>
        </div>`;
      }).join('')}
    </div>` : '';

  const cards = collections.map(col => {
    const unlocked = isUnlocked(col);
    const pct      = col.dishes.length > 0 ? Math.round(col.collected / col.dishes.length * 100) : 0;
    const left     = col.dishes.length - col.collected;
    const complete  = left === 0 && col.dishes.length > 0;
    const r        = questRarity(col);
    const badge    = questBadgeReward(col);
    const info     = COL_ICONS[col.name] || { emoji:'🍽️' };
    const desc     = COL_DESCRIPTIONS?.[col.name] || '';
    const heroImg  = (col.dishes || []).find(d => d.image_url)?.image_url || '';
    const toTry    = (col.dishes || []).filter(d => !userDishes.has(d.id)).slice(0, 2);

    const toTryHtml = !complete && toTry.length ? `
      <div class="qc-totry-label">Still to discover</div>
      <div class="qc-totry-list">
        ${toTry.map(d => `
          <div class="qc-totry-row" onclick="event.stopPropagation();openCardFromHome('${d.id}')">
            <div class="qc-totry-thumb">${d.image_url ? `<img src="${d.image_url}" alt="">` : '🍽️'}</div>
            <div class="qc-totry-name">${d.name_en || d.name}</div>
            <div class="qc-totry-arrow">›</div>
          </div>`).join('')}
      </div>` : '';

    if (!unlocked) {
      return `<div class="qc-card qc-locked">
        <div class="qc-content">
          <div class="qc-rarity-pill" style="color:#9E8E7A;border-color:rgba(158,142,122,.3)">🔒 LOCKED</div>
          <div class="qc-title" style="color:rgba(255,255,255,.35)">${col.name}</div>
          <div class="qc-sub">Complete more dishes to unlock</div>
        </div>
      </div>`;
    }

    return `<div class="qc-card${complete ? ' qc-complete' : ''}" onclick="openColl_byId('${col.id}')" style="--accent:${r.accent};--glow:${r.glow}">
      <div class="qc-accent-bar" style="background:linear-gradient(90deg,${r.accent},${r.accent}88)"></div>
      ${heroImg ? `<div class="qc-photo-panel">
        <img src="${heroImg}" alt="" loading="lazy">
        <div class="qc-photo-fade" style="background:linear-gradient(to right,#12100E 30%,transparent 100%)"></div>
      </div>` : ''}
      <div class="qc-content">
        <div class="qc-header">
          <div class="qc-rarity-pill" style="color:${r.accent};border-color:${r.accent}50;background:${r.accent}18">${r.label}</div>
          ${complete ? `<div class="qc-complete-chip">✓ Complete</div>` : ''}
        </div>
        <div class="qc-title">${info.emoji} ${col.name}</div>
        ${desc ? `<div class="qc-sub">${desc}</div>` : ''}
        <div class="qc-progress-row">
          <div class="qc-prog-bar-bg">
            <div class="qc-prog-bar-fill" style="width:${pct}%;background:${r.accent};box-shadow:0 0 8px ${r.accent}80"></div>
          </div>
          <div class="qc-prog-frac" style="color:${r.accent}">${col.collected}<span>/${col.dishes.length}</span></div>
        </div>
        ${toTryHtml}
        ${badge && !isBadgeClaimed(badge.id) ? `
          <div class="qc-reward-row">
            <span class="qc-reward-icon">🏆</span>
            <span class="qc-reward-text">Unlock: <strong>${badge.label}</strong></span>
          </div>` : ''}
        ${complete ? `<div class="qc-complete-note" style="color:${r.accent}">🎉 All dishes discovered!</div>` : ''}
      </div>
    </div>`;
  }).join('');

  list.innerHTML = `<div class="qc-list">${almostHtml}${cards}</div>`;
  setTimeout(initScrollReveal, 80);
}
function toggleJourney() {} // kept for backwards compat
function openCardFromHome(dishId) {
  const dish = allDishes.find(d => d.id === dishId); if (!dish) return;
  const col = collections.find(c => c.dishes.some(d => d.id === dishId));
  if (col) activeColl = col;
  const dishes = col ? col.dishes : [dish];
  openCard(dish, dishes.findIndex(d => d.id === dishId) + 1);
}

// ── UNLOCK CHECK ──────────────────────────────────────
function isUnlocked(col) {
  if (col.unlock_type !== 'progress') return true;
  const total = collections.reduce((s,c) => s + c.dishes.length, 0);
  const pct = total > 0 ? Math.round(userDishes.size / total * 100) : 0;
  return pct >= (col.unlock_requirement || 100);
}

// ── RENDER COLLECTION ─────────────────────────────────
function renderColl(col) {
  activeColl = col;
  $('cd-title').textContent = col.name;
  const pct = col.dishes.length > 0 ? Math.round(col.collected / col.dishes.length * 100) : 0;
  $('cd-prog-label').textContent = col.name;
  $('cd-prog-frac').textContent  = `${col.collected} / ${col.dishes.length}`;
  $('cd-prog-fill').style.width  = pct + '%';
  $('cd-prog-sub').textContent   = `${pct}% complete`;

  const sorted = [...col.dishes].sort((a,b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
  const checkIcon = `<div class="fb-list-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D2318" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`;
  const lockIcon  = `<div class="fb-list-lock"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>`;

  const rows = sorted.map((dish, i) => {
    const done = userDishes.has(dish.id);
    return `<div class="fb-list-row ${done ? 'tried' : ''}" onclick="openCardFromHome('${dish.id}')">
      <div class="fb-list-img-wrap">
        ${dish.image_url ? `<img src="${dish.image_url}" alt="${dish.name}" loading="lazy">` : '<div class="fb-list-placeholder">🍽️</div>'}
        <div class="fb-list-num">${i + 1}</div>
      </div>
      <div class="fb-list-info">
        <div class="fb-list-name">${dish.name_en || dish.name}</div>
        ${dish.name_en ? `<div class="fb-list-en">${dish.name}</div>` : ''}
        <div class="fb-list-status">${done ? 'Collected' : 'Not collected'}</div>
      </div>
      ${done ? checkIcon : lockIcon}
    </div>`;
  }).join('');

  $('dish-grid').innerHTML = `<div class="fb-list-section" style="margin:0;border-radius:0">${rows}</div>`;
}

// ── COUNTRY PICKER ────────────────────────────────────
function openCountryPicker() {
  const list = $('cp-list');
  list.innerHTML = allCountries.map(c => {
    const flag   = COUNTRY_FLAGS[c.name] || '🌏';
    const active = c.id === countryId;
    return `<div class="cp-item ${active ? 'active' : ''}" onclick="selectCountry('${c.id}')">
      <span class="cp-flag">${flag}</span><span class="cp-cname">${c.name}</span>${active ? '<span class="cp-check">✓</span>' : ''}
    </div>`;
  }).join('');
  $('cp-overlay').classList.add('open');
}
async function selectCountry(id) {
  $('cp-overlay').classList.remove('open');
  if (id === countryId) return;
  currentCountry = allCountries.find(c => c.id === id);
  countryId = id;
  localStorage.setItem('sb_country', id);
  try {
    await loadCountryData();
    unlockShown = false; renderHome(); showScreen('s-home');
    setTimeout(initScrollReveal, 100);
    $('nb-explore').classList.add('on'); $('nb-coll').classList.remove('on');
  } catch(e) { console.error(e); }
}
