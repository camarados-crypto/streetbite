// ── OPEN CARD ─────────────────────────────────────────
async function openCard(dish, num) {
  activeDish = dish; activeDishNum = num; flipped = false;
  const rc   = RARITY_COLOR[dish.rarity] || '#888780';
  const done = userDishes.has(dish.id);
  const flag = COUNTRY_FLAGS[currentCountry?.name] || '🌏';
  $('card-modal').style.setProperty('--rc', rc);
  $('card-front').style.setProperty('--rc', rc);
  $('card-back').style.setProperty('--rc', rc);
  if (dish.image_url) { $('cf-img').src = dish.image_url; $('cf-img').style.display = 'block'; $('cf-noimg').style.display = 'none'; }
  else { $('cf-img').style.display = 'none'; $('cf-noimg').style.display = 'flex'; }
  $('cf-rar').textContent    = dish.rarity;
  $('cf-num').textContent    = `#${String(num).padStart(3,'0')}`;
  $('cf-name').textContent   = dish.name;
  $('cf-country').textContent = `${flag} ${currentCountry?.name || ''} · ${activeColl?.name || ''}`;
  $('cf-desc').textContent   = dish.description || DESCRIPTIONS[dish.name] || 'An authentic street food — try it at the first opportunity!';
  $('cf-price').textContent  = `💰 ${dish.price_range || '—'}`;
  $('cf-rating').textContent = `⭐ —`;
  $('cb-name').textContent   = dish.name;
  $('cb-num').textContent    = `#${String(num).padStart(3,'0')}`;
  $('cb-desc').textContent   = dish.description || DESCRIPTIONS[dish.name] || `An authentic dish from the ${activeColl?.name || 'collection'}.`;
  $('cb-stats').innerHTML = `
    <div class="cb-stat"><div class="cb-sl">Rarity</div><div class="cb-sv" style="color:${rc}">${dish.rarity}</div></div>
    <div class="cb-stat"><div class="cb-sl">Price</div><div class="cb-sv">${dish.price_range || '—'}</div></div>
    <div class="cb-stat"><div class="cb-sl">Country</div><div class="cb-sv">${flag} ${currentCountry?.name||''}</div></div>
    <div class="cb-stat"><div class="cb-sl">Status</div><div class="cb-sv" style="color:${done?'#2A7A2A':'#B0A090'}">${done?'✓ Tried':'Not yet'}</div></div>`;
  updateCollectBtn(done);
  const inner = $('flip-inner');
  inner.classList.remove('flipped','entering');
  $('card-modal').classList.add('open');
  requestAnimationFrame(() => requestAnimationFrame(() => inner.classList.add('entering')));
  inner.addEventListener('animationend', () => inner.classList.remove('entering'), {once:true});
  try {
    const exps = await api(`experiences?dish_id=eq.${dish.id}&rating=not.is.null&select=rating`);
    if (exps?.length > 0) { const avg = exps.reduce((s,e) => s + e.rating, 0) / exps.length; $('cf-rating').textContent = `⭐ ${avg.toFixed(1)}`; }
  } catch(e) {}
}

function flipCard() { flipped = !flipped; $('flip-inner').classList.toggle('flipped', flipped); }
function closeCard() { $('card-modal').classList.remove('open'); setTimeout(() => { flipped = false; $('flip-inner').classList.remove('flipped'); }, 300); }
function bgClick(e) { if (e.target === $('card-modal')) closeCard(); }

function updateCollectBtn(done) {
  const btn = $('cb-btn');
  btn.className = `cb-btn ${done ? 'done' : 'todo'}`;
  btn.textContent = done ? "✓ Already tried!" : "+ I've tried this!";
}
function updateCardStatus(done) {
  const statCells = $('cb-stats')?.querySelectorAll('.cb-stat');
  if (statCells?.[3]) {
    statCells[3].querySelector('.cb-sv').style.color = done ? '#2A7A2A' : '#B0A090';
    statCells[3].querySelector('.cb-sv').textContent = done ? '✓ Tried' : 'Not yet';
  }
}

async function collectDish() {
  if (!activeDish) return;
  const isCollected = userDishes.has(activeDish.id);
  if (isCollected) {
    userDishes.delete(activeDish.id); saveLocal();
    try { await api(`user_dishes?user_id=eq.${uid}&dish_id=eq.${activeDish.id}`, { method:'DELETE' }); } catch(e) {}
    if (activeColl) { const col = collections.find(c => c.id === activeColl.id); if (col) col.collected = col.dishes.filter(d => userDishes.has(d.id)).length; }
    updateCollectBtn(false); updateCardStatus(false);
    if (!$('s-coll').classList.contains('gone') && activeColl) renderColl(activeColl);
  } else { openCheckin(); }
}
