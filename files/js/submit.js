// ── SUBMIT SHEET ──────────────────────────────────────
let submitNameTimer  = null;
let submitPhotoFile  = null;
let submitMatchedDish = null; // geselecteerde bestaande dish

function openSubmitSheet() {
  submitPhotoFile   = null;
  submitMatchedDish = null;
  $('submit-photo-preview').style.display = 'none';
  $('submit-photo-placeholder').style.display = 'flex';
  $('submit-name').value = '';
  $('submit-desc').value = '';
  $('submit-matches').innerHTML = '';
  $('submit-save-btn').textContent = 'Add dish →';
  $('submit-uploading').style.display = 'none';
  $('submit-save-btn').disabled = false;
  $('submit-backdrop').classList.add('open');
}

function closeSubmitSheet() {
  $('submit-backdrop').classList.remove('open');
}

// ── FOTO ──────────────────────────────────────────────
function handleSubmitPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  submitPhotoFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = $('submit-photo-preview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    $('submit-photo-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// ── NAAM + SUGGESTIES ──────────────────────────────────
function submitNameDebounce() {
  submitMatchedDish = null;
  clearTimeout(submitNameTimer);
  const q = $('submit-name').value.trim();
  $('submit-matches').innerHTML = '';
  if (!q || q.length < 2) return;
  submitNameTimer = setTimeout(() => runSubmitSearch(q), 350);
}

async function runSubmitSearch(q) {
  try {
    const enc = encodeURIComponent(q);
    const results = await api(
      `dishes?or=(name.ilike.*${enc}*,name_en.ilike.*${enc}*)` +
      `&select=id,name,name_en,image_url,country_id,collections(name,countries(id,name))` +
      `&user_submitted=eq.false&limit=8`
    );
    renderSubmitMatches(results || []);
  } catch(e) {}
}

function renderSubmitMatches(dishes) {
  if (!dishes.length) { $('submit-matches').innerHTML = ''; return; }

  const local  = dishes.filter(d => (d.collections?.countries?.id || d.country_id) === countryId);
  const others = dishes.filter(d => (d.collections?.countries?.id || d.country_id) !== countryId);
  const sorted = [...local, ...others].slice(0, 5);

  let html = `<div class="submit-matches-label">Already in StreetBite?</div>`;
  html += sorted.map(d => {
    const countryName = d.collections?.countries?.name || '';
    const flag = COUNTRY_FLAGS[countryName] || '';
    const img = d.image_url ? `<img src="${d.image_url}" alt="">` : '🍽️';
    return `<div class="submit-match-row" onclick="submitPickMatch('${d.id}')">
      <div class="submit-dish-img">${img}</div>
      <div class="submit-dish-info">
        <div class="submit-dish-name">${d.name}</div>
        <div class="submit-dish-meta">${d.name_en ? d.name_en + ' · ' : ''}${flag} ${countryName}</div>
      </div>
      <div class="submit-match-tick" id="submit-tick-${d.id}"></div>
    </div>`;
  }).join('');

  $('submit-matches').innerHTML = html;
}

function submitPickMatch(dishId) {
  // Toggle selectie
  if (submitMatchedDish === dishId) {
    submitMatchedDish = null;
    document.querySelectorAll('.submit-match-row').forEach(r => r.classList.remove('selected'));
    document.querySelectorAll('.submit-match-tick').forEach(t => t.innerHTML = '');
    $('submit-save-btn').textContent = 'Add dish →';
  } else {
    submitMatchedDish = dishId;
    document.querySelectorAll('.submit-match-row').forEach(r => r.classList.remove('selected'));
    document.querySelectorAll('.submit-match-tick').forEach(t => t.innerHTML = '');
    const row = document.querySelector(`.submit-match-row[onclick="submitPickMatch('${dishId}')"]`);
    if (row) row.classList.add('selected');
    $(`submit-tick-${dishId}`).innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4692A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    $('submit-save-btn').textContent = 'Check in →';
  }
}

// ── OPSLAAN ────────────────────────────────────────────
async function saveSubmitDish() {
  const name = $('submit-name').value.trim();

  // Bestaand gerecht geselecteerd → direct naar check-in (met foto indien aanwezig)
  if (submitMatchedDish) {
    const file = submitPhotoFile;
    const dataUrl = file ? await readFileAsDataUrl(file) : null;
    closeSubmitSheet();
    setTimeout(() => {
      submitSelectDish(submitMatchedDish, file, dataUrl);
    }, 300);
    return;
  }

  if (!name) {
    $('submit-name').focus();
    return;
  }

  const btn = $('submit-save-btn');
  btn.disabled = true;
  $('submit-uploading').style.display = 'flex';

  try {
    let photo_url = null;
    if (submitPhotoFile) {
      const ext = submitPhotoFile.name.split('.').pop() || 'jpg';
      const path = `community/${uid}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('dish-images').upload(path, submitPhotoFile, { upsert: true });
      if (!error) {
        const { data: pub } = supabase.storage.from('dish-images').getPublicUrl(path);
        photo_url = pub.publicUrl;
      }
    }

    const result = await api('dishes', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        name,
        country_id: countryId,
        image_url: photo_url,
        description: $('submit-desc').value.trim() || null,
        user_submitted: true,
        submitted_by: uid,
        status: 'unverified'
      })
    });

    closeSubmitSheet();

    if (result && result[0]) {
      setTimeout(() => {
        activeDish = result[0];
        activeColl = null;
        openCheckin();
      }, 400);
    }
  } catch(e) {
    btn.disabled = false;
    $('submit-uploading').style.display = 'none';
    alert('Could not save. Please try again.');
  }
}

function submitSelectDish(dishId, preloadFile, preloadDataUrl) {
  const dish = allDishes.find(d => d.id === dishId);
  if (dish) {
    const col = collections.find(c => c.dishes.some(d => d.id === dishId));
    if (col) activeColl = col;
    activeDish = dish;
    // Als er een foto is → sla kaart over, ga direct naar check-in
    if (preloadFile) {
      openCheckin(preloadFile, preloadDataUrl);
    } else {
      const dishes = col ? col.dishes : [dish];
      openCard(dish, dishes.findIndex(d => d.id === dishId) + 1);
    }
  } else {
    // Gerecht niet in huidige data → ophalen en check-in openen
    openDishFromFeed(dishId).then(() => {
      if (preloadFile) openCheckin(preloadFile, preloadDataUrl);
    });
  }
}

function readFileAsDataUrl(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}
