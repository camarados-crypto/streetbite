let passportData = null;

async function openPassport() {
  $('passport-backdrop').classList.add('open');
  if (!passportData) await loadPassportData();
  renderPassport();
}
function closePassport() { $('passport-backdrop').classList.remove('open'); }

async function loadPassportData() {
  try {
    const allCols    = await api('collections?select=id,country_id');
    const colIds     = allCols.map(c => c.id).join(',');
    const allDishRows = colIds
      ? await api(`dishes?collection_id=in.(${colIds})&select=id,collection_id`)
      : [];
    passportData = allCountries.map(country => {
      const colSet = new Set(allCols.filter(c => c.country_id === country.id).map(c => c.id));
      const dishes = allDishRows.filter(d => colSet.has(d.collection_id));
      const tried  = dishes.filter(d => userDishes.has(d.id)).length;
      const total  = dishes.length;
      const pct    = total > 0 ? Math.round(tried / total * 100) : 0;
      return { ...country, tried, total, pct };
    });
  } catch(e) {
    console.log('passport load:', e.message);
    passportData = allCountries.map(c => ({ ...c, tried:0, total:0, pct:0 }));
  }
}

function renderPassport() {
  if (!passportData) return;
  const visited      = passportData.filter(c => c.tried > 0).length;
  const claimedBadges = loadClaimedBadges();
  const badgeCount   = claimedBadges.size;

  $('pp-countries').textContent = visited;
  $('pp-dishes').textContent    = userDishes.size;
  $('pp-badges').textContent    = badgeCount;

  // Stamps
  $('passport-stamp-grid').innerHTML = passportData.map(c => {
    const flag    = COUNTRY_FLAGS[c.name] || '🌏';
    const badgeId = `first_bites_${c.name}`;
    const hasBadge = claimedBadges.has(badgeId);
    let state = 'unvisited';
    if (c.pct === 100)    state = 'complete';
    else if (c.pct >= 50) state = 'halfway';
    else if (c.tried > 0) state = 'started';
    const label = c.total === 0        ? 'No dishes yet'
      : state === 'unvisited'          ? 'Not visited yet'
      : `${c.tried} / ${c.total} dishes`;
    return `<div class="stamp ${state}" onclick="goToCountry('${c.id}')">
      ${hasBadge ? '<div class="stamp-badge-icon">🏅</div>' : ''}
      <div class="stamp-flag">${flag}</div>
      <div class="stamp-name">${c.name}</div>
      <div class="stamp-count">${label}</div>
      ${c.total > 0 ? `<div class="stamp-prog"><div class="stamp-prog-fill" style="width:${c.pct}%"></div></div>` : ''}
    </div>`;
  }).join('');

  // Badges grid
  const comingSoon = BADGES_COMING.map(b => ({ ...b, coming: true }));
  $('passport-badges-grid').innerHTML = [
    ...Object.entries(BADGES).map(([id, b]) => {
      const earned = claimedBadges.has(id);
      return `<div class="passport-badge-card ${earned ? 'earned' : 'locked'}" onclick="${earned ? `openBadgeSheet('${id}')` : ''}">
        <div class="passport-badge-icon-wrap">${b.icon}</div>
        <div class="passport-badge-name">${b.title}</div>
        <div class="passport-badge-sub">${b.sub}</div>
        <div class="passport-badge-status">${earned ? '✓ Claimed' : `${b.flag} ${b.country}`}</div>
      </div>`;
    }),
    ...comingSoon.map(b => `<div class="passport-badge-card locked">
      <div class="passport-badge-icon-wrap">${b.icon}</div>
      <div class="passport-badge-name">${b.name}</div>
      <div class="passport-badge-sub">${b.hint}</div>
      <div class="passport-badge-status">Coming soon</div>
    </div>`)
  ].join('');
}

function goToCountry(id) {
  closePassport();
  const country = allCountries.find(c => c.id === id);
  if (!country || country.id === currentCountry?.id) { showTab('home'); return; }
  selectCountry(id);
}
