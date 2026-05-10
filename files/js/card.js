// ── MEMORY REACTIONS ──────────────────────────────────
const MEMORY_REACTIONS = [
  { id:'loved',   emoji:'😍', label:'Loved it' },
  { id:'comfort', emoji:'🏠', label:'Comfort food' },
  { id:'spicy',   emoji:'🌶️', label:'Too spicy' },
  { id:'again',   emoji:'🔄', label:'Had it again' },
];
function renderMemoryChips(dishId) {
  const el = $('cb-memory'); if (!el) return;
  const active = JSON.parse(localStorage.getItem(`sb_react_${dishId}`) || '[]');
  el.innerHTML = MEMORY_REACTIONS.map(r =>
    `<button class="cb-memory-chip${active.includes(r.id) ? ' active' : ''}"
      onclick="toggleReaction('${dishId}','${r.id}');event.stopPropagation()">
      ${r.emoji} ${r.label}
    </button>`
  ).join('');
}
function toggleReaction(dishId, reaction) {
  const key = `sb_react_${dishId}`;
  let active = JSON.parse(localStorage.getItem(key) || '[]');
  active = active.includes(reaction) ? active.filter(r => r !== reaction) : [...active, reaction];
  localStorage.setItem(key, JSON.stringify(active));
  renderMemoryChips(dishId);
}

// ── OPEN CARD ─────────────────────────────────────────
async function openCard(dish, num) {
  activeDish = dish; activeDishNum = num; flipped = false;
  const rc   = RARITY_COLOR[dish.rarity] || '#888780';
  const done = userDishes.has(dish.id);
  const flag = COUNTRY_FLAGS[currentCountry?.name] || '🌏';
  $('card-modal').style.setProperty('--rc', rc);
  $('card-front').style.setProperty('--rc', rc);
  $('card-back').style.setProperty('--rc', rc);

  // Image
  if (dish.image_url) { $('cf-img').src = dish.image_url; $('cf-img').style.display = 'block'; $('cf-noimg').style.display = 'none'; }
  else { $('cf-img').style.display = 'none'; $('cf-noimg').style.display = 'flex'; }

  // Front card
  $('cf-rar').textContent     = dish.rarity;
  $('cf-num').textContent     = `#${String(num).padStart(3,'0')}`;
  $('cf-name').textContent    = dish.name;
  $('cf-country').textContent = `${flag} ${currentCountry?.name || ''} · ${activeColl?.name || ''}`;
  $('cf-desc').textContent    = dish.description || DESCRIPTIONS[dish.name] || 'An authentic street food — try it at the first opportunity!';
  $('cf-price').textContent   = `💰 ${dish.price_range || '—'}`;
  $('cf-rating').textContent  = '⭐ —';
  $('cf-tried').textContent   = `${mockTravelerCount(dish.id)} travelers`;

  // Back card
  $('cb-name').textContent = dish.name;
  $('cb-num').textContent  = `#${String(num).padStart(3,'0')}`;
  $('cb-desc').textContent = dish.description_long || dish.description || DESCRIPTIONS[dish.name] || `An authentic dish from ${activeColl?.name || 'this collection'}.`;
  $('cb-reactions').innerHTML = '';
  renderMemoryChips(dish.id);
  updateCollectBtn(done);

  // Animate open
  const inner = $('flip-inner');
  inner.classList.remove('flipped', 'entering');
  $('card-modal').classList.add('open');
  requestAnimationFrame(() => requestAnimationFrame(() => inner.classList.add('entering')));
  inner.addEventListener('animationend', () => inner.classList.remove('entering'), { once: true });

  // Fetch rating + traveler reactions async
  try {
    const exps = await api(`experiences?dish_id=eq.${dish.id}&rating=not.is.null&select=rating,note,user_display_name&limit=5`);
    if (exps?.length > 0) {
      const avg = exps.reduce((s, e) => s + e.rating, 0) / exps.length;
      $('cf-rating').textContent = `⭐ ${avg.toFixed(1)}`;
      const withNotes = exps.filter(e => e.note?.trim()).slice(0, 2);
      if (withNotes.length > 0) {
        $('cb-reactions').innerHTML = withNotes.map(e => {
          const short = e.note.length > 65 ? e.note.slice(0, 62) + '…' : e.note;
          const who   = e.user_display_name?.split(' ')[0] || 'Traveler';
          return `<div class="cb-reaction"><span class="cb-reaction-quote">"${short}"</span> <span class="cb-reaction-name">— ${who}</span></div>`;
        }).join('');
      }
    }
  } catch(e) {}
}

function flipCard() { flipped = !flipped; $('flip-inner').classList.toggle('flipped', flipped); }
function closeCard() { $('card-modal').classList.remove('open'); setTimeout(() => { flipped = false; $('flip-inner').classList.remove('flipped'); }, 300); }
function bgClick(e) { if (e.target === $('card-modal')) closeCard(); }

function updateCollectBtn(done) {
  const btn = $('cb-btn');
  btn.className = `cb-btn ${done ? 'repeat' : 'todo'}`;
  btn.textContent = done ? '✓ Check in again' : "+ I've tried this!";
  const fbtn = $('cf-collect-btn');
  if (fbtn) {
    fbtn.className = `cf-collect-btn${done ? ' done' : ''}`;
    fbtn.textContent = done ? '✓ Again' : '+ Check in';
  }
}
function updateCardStatus(done) {
  updateCollectBtn(done);
}

function collectFromFront(e) {
  e.stopPropagation();
  collectDish();
}

async function collectDish() {
  if (!activeDish) return;
  openCheckin();
}
