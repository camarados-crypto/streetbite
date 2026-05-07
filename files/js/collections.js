// ── SCREEN NAVIGATION ─────────────────────────────────
function showScreen(id) {
  ['s-home','s-coll','s-profile'].forEach(s => $(s).classList.add('gone'));
  $(id).classList.remove('gone');
}
function showTab(tab) {
  ['nb-explore','nb-coll','nb-profile'].forEach(b => $(b).classList.remove('on'));
  if (tab === 'home') {
    showScreen('s-home'); $('nb-explore').classList.add('on');
  } else if (tab === 'coll') {
    if (collections.length > 1) openColl(collections[1]);
    else if (collections.length > 0) openColl(collections[0]);
    $('nb-coll').classList.add('on');
  } else if (tab === 'profile') {
    renderProfile(); showScreen('s-profile');
    $('nb-profile').classList.add('on'); $('s-profile').scrollTop = 0;
  }
}
function openColl(col) {
  renderColl(col); showScreen('s-coll'); $('s-coll').scrollTop = 0;
  $('nb-coll').classList.add('on'); $('nb-explore').classList.remove('on');
}
function goHome() {
  renderHome(); showScreen('s-home');
  $('nb-explore').classList.add('on'); $('nb-coll').classList.remove('on');
  setTimeout(initScrollReveal, 80);
}
function openColl_byId(id) { const col = collections.find(c => c.id === id); if (col) openColl(col); }
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
  $('cd-prog-frac').textContent = `${col.collected} / ${col.dishes.length}`;
  $('cd-prog-fill').style.width = pct + '%';
  $('cd-prog-sub').textContent = `${pct}% complete`;
  const sorted = [...col.dishes].sort((a,b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
  const grid = $('dish-grid'); grid.innerHTML = '';
  sorted.forEach((dish, i) => {
    const done = userDishes.has(dish.id);
    const rc   = RARITY_COLOR[dish.rarity] || '#888780';
    const rbg  = RARITY_BG[dish.rarity]    || '#F1EFE8';
    const rtxt = RARITY_TXT[dish.rarity]   || '#5A5955';
    const el = document.createElement('div');
    el.className = 'dish-card';
    el.style.borderColor = done ? rc : 'transparent';
    el.innerHTML = `
      <div class="d-rbar" style="background:${rc}"></div>
      <div class="d-photo ${done ? '' : 'dim'}">
        ${dish.image_url ? `<img src="${dish.image_url}" alt="${dish.name}" loading="lazy">` : `<div class="no-img">🍽️</div>`}
        <div class="d-rtag" style="background:${rc}">${dish.rarity}</div>
        <div class="d-name-overlay">${dish.name}</div>
      </div>
      <div class="d-body">
        <div class="d-name ${done ? '' : 'muted'}">${dish.name_en || dish.name}</div>
        <div class="d-meta">
          <span class="d-rpill" style="background:${rbg};color:${rtxt}">${dish.rarity}</span>
          ${done ? '<span class="d-done">✓ tried</span>' : ''}
        </div>
      </div>`;
    el.onclick = () => openCard(dish, i + 1);
    grid.appendChild(el);
  });
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
