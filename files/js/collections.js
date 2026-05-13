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

// ── JOURNEYS OVERVIEW ─────────────────────────────────
function journeyDiscoveryNote(col) {
  const left = col.dishes.length - col.collected;
  if (col.dishes.length === 0) return '';
  if (col.collected === 0) return 'Start your journey — try the first dish!';
  if (left === 0) return `Journey complete! All ${col.dishes.length} dishes discovered. 🎉`;
  if (left === 1) return 'Just 1 dish left in this journey.';
  return `You've discovered ${col.collected} local ${col.collected === 1 ? 'dish' : 'dishes'}.`;
}
function renderJourneys() {
  const jc = $('journeys-country');
  if (jc) jc.textContent = currentCountry?.name || '';
  const list = $('journeys-list');
  if (!list) return;
  const cells = collections.map(col => {
    const info     = COL_ICONS[col.name] || { emoji:'🍽️', bg:'#F5F0EA', color:'#9E8E7A' };
    const unlocked = isUnlocked(col);
    return `<div class="home-jny-cell scroll-reveal${!unlocked ? ' locked' : ''}" ${unlocked ? `onclick="openColl_byId('${col.id}')"` : ''}>
      <div class="home-jny-icon" style="background:${info.bg}">${unlocked ? info.emoji : '🔒'}</div>
      <div class="home-jny-name">${col.name}</div>
      <div class="home-jny-count" style="color:${info.color}">${col.collected}/${col.dishes.length}</div>
    </div>`;
  }).join('');
  list.innerHTML = `<div class="home-jny-grid" style="padding:14px 14px 8px">${cells}</div>`;
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
        <div class="fb-list-name">${dish.name}</div>
        ${dish.name_en ? `<div class="fb-list-en">${dish.name_en}</div>` : ''}
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
