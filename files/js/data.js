// ── LOCAL STORAGE ─────────────────────────────────────
function saveLocal() {
  try { localStorage.setItem('sb_dishes', JSON.stringify([...userDishes])); } catch(e) {}
}
function loadLocal() {
  try { const d = JSON.parse(localStorage.getItem('sb_dishes') || '[]'); d.forEach(id => userDishes.add(id)); } catch(e) {}
}

// ── LOAD USER DISHES ──────────────────────────────────
async function loadUserDishes() {
  loadLocal(); if (!uid) return;
  try {
    const ud = await api(`user_dishes?user_id=eq.${uid}&select=dish_id,created_at&order=created_at.desc`);
    (ud||[]).forEach(r => userDishes.add(r.dish_id));
    recentDishIds = (ud||[]).slice(0,8).map(r => r.dish_id);
    saveLocal();
    collections.forEach(col => { col.collected = col.dishes.filter(d => userDishes.has(d.id)).length; });
  } catch(e) { console.log('loadUserDishes:', e.message); }
}

// ── LOAD COUNTRIES + COUNTRY DATA ────────────────────
async function load() {
  allCountries = await api('countries?select=id,name,hero_image_url,tagline&order=name');
  if (!allCountries?.length) throw new Error('No countries found');
  const savedId = localStorage.getItem('sb_country');
  const vn = allCountries.find(c => c.name === 'Vietnam');
  currentCountry = allCountries.find(c => c.id === savedId) || vn || allCountries[0];
  countryId = currentCountry.id;
  await loadCountryData();
}

async function loadCountryData() {
  const cols = await api(`collections?country_id=eq.${countryId}&order=order_index&select=id,name,unlock_type,unlock_requirement,order_index`);
  const cids = cols.map(c => c.id).join(',');
  allDishes = cids.length > 0
    ? await api(`dishes?collection_id=in.(${cids})&select=id,collection_id,name,name_en,rarity,image_url,description,description_long,price_range,first_bite_order,sort_order&order=sort_order.asc.nullslast,name.asc`)
    : [];
  loadLocal();
  if (uid) {
    try {
      const ud = await api(`user_dishes?user_id=eq.${uid}&select=dish_id,created_at&order=created_at.desc`);
      (ud||[]).forEach(r => userDishes.add(r.dish_id));
      recentDishIds = (ud||[]).slice(0,8).map(r => r.dish_id);
      saveLocal();
    } catch(e) { console.log('user_dishes load:', e.message); }
  }
  collections = cols.map(col => {
    const dishes = allDishes.filter(d => d.collection_id === col.id);
    const collected = dishes.filter(d => userDishes.has(d.id)).length;
    return { ...col, dishes, collected };
  });
}
