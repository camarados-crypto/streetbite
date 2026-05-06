// ── OPEN / CLOSE ──────────────────────────────────────
function openCheckin() {
  const dish    = getState('ui.activeDish');
  const coll    = getState('ui.activeColl');
  const country = getState('app.currentCountry');
  if (!dish) return;

  // Reset checkin session state
  setState('ui.ciRating',       0);
  setState('ui.ciPhotoFile',    null);
  setState('ui.ciPhotoDataUrl', null);

  // Populate header
  $('ci-dish-name').textContent = dish.name;
  $('ci-dish-coll').textContent = coll?.name || '';
  if (dish.image_url) {
    $('ci-dish-img').innerHTML = `<img src="${dish.image_url}" alt="${dish.name}">`;
  } else {
    $('ci-dish-img').innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;background:#F0EBE4">🍽️</div>`;
  }

  // Reset form fields
  $('ci-price').value    = '';
  $('ci-location').value = '';
  $('ci-note').value     = '';
  $('ci-photo-preview').style.display = 'none';
  $('ci-photo-preview').src = '';
  $('ci-photo-area').querySelector('.ci-photo-icon').style.display = 'block';
  $('ci-photo-area').querySelector('.ci-photo-txt').style.display  = 'block';
  $('ci-uploading').style.display = 'none';
  $('ci-save').disabled = false;
  updateStars(0);

  $('ci-currency').value = COUNTRY_CURRENCY[country?.name] || 'USD';
  $('ci-backdrop').classList.add('open');
}

function closeCheckin()     { $('ci-backdrop').classList.remove('open'); }
function ciBackdropClick(e) { if (e.target === $('ci-backdrop')) closeCheckin(); }

function setRating(n) {
  setState('ui.ciRating', n);
  updateStars(n);
}
function updateStars(n) {
  $('ci-stars').querySelectorAll('.ci-star').forEach((s, i) => s.classList.toggle('on', i < n));
}

// ── PHOTO SELECT ──────────────────────────────────────
function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  setState('ui.ciPhotoFile', file);
  const reader = new FileReader();
  reader.onload = ev => {
    setState('ui.ciPhotoDataUrl', ev.target.result);
    $('ci-photo-preview').src = ev.target.result;
    $('ci-photo-preview').style.display = 'block';
    $('ci-photo-area').querySelector('.ci-photo-icon').style.display = 'none';
    $('ci-photo-area').querySelector('.ci-photo-txt').style.display  = 'none';
  };
  reader.readAsDataURL(file);
}

// ── GPS ───────────────────────────────────────────────
function useGPS() {
  if (!navigator.geolocation) { alert('Location not available'); return; }
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
      const d = await r.json();
      $('ci-location').value = d.address?.road || d.address?.suburb || d.display_name?.split(',')[0] || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch(e) {
      $('ci-location').value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }, () => alert('Could not get location'));
}

// ── PHOTO UPLOAD ──────────────────────────────────────
async function uploadPhoto() {
  const file = getState('ui.ciPhotoFile');
  const dish = getState('ui.activeDish');
  const uid  = getState('auth.uid');
  if (!file || !sbClient) return null;
  const ext  = file.name.split('.').pop() || 'jpg';
  const path = `${uid}/${dish.id}_${Date.now()}.${ext}`;
  const { error } = await sbClient.storage.from('checkin-photos').upload(path, file, { upsert:true, contentType:file.type });
  if (error) { console.error('Photo upload:', error); return null; }
  const { data: urlData } = sbClient.storage.from('checkin-photos').getPublicUrl(path);
  return urlData?.publicUrl || null;
}

// ── SAVE CHECK-IN ─────────────────────────────────────
async function saveCheckin() {
  const dish = getState('ui.activeDish');
  const uid  = getState('auth.uid');
  const user = getState('auth.user');
  if (!dish) return;

  $('ci-save').disabled = true;
  let photoUrl = null;
  if (getState('ui.ciPhotoFile')) {
    $('ci-uploading').style.display = 'flex';
    photoUrl = await uploadPhoto();
    $('ci-uploading').style.display = 'none';
  }

  const exp = {
    dish_id:           dish.id,
    user_id:           uid,
    rating:            getState('ui.ciRating') || null,
    location_text:     $('ci-location').value.trim() || null,
    note:              $('ci-note').value.trim() || null,
    price:             parseFloat($('ci-price').value) || null,
    currency:          $('ci-currency').value || 'USD',
    photo_url:         photoUrl,
    user_display_name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
    user_avatar_url:   user?.user_metadata?.avatar_url || null,
  };

  try {
    const result = await api('experiences', { method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(exp) });
    const expId  = Array.isArray(result) ? result[0]?.id : result?.id;
    await markCollected(dish.id, expId);
  } catch(e) {
    await markCollected(dish.id, null);
  }
  closeCheckin();
  showCollectedFeedback();
}

async function skipCheckin() {
  const dish = getState('ui.activeDish');
  closeCheckin();
  await markCollected(dish.id, null);
  showCollectedFeedback();
}

// ── MARK COLLECTED ────────────────────────────────────
async function markCollected(dishId, expId) {
  const userDishes  = getState('data.userDishes');
  const collections = getState('data.collections');
  const allDishes   = getState('data.allDishes');
  const activeColl  = getState('ui.activeColl');
  const uid         = getState('auth.uid');

  if (!userDishes.has(dishId)) {
    userDishes.add(dishId);
    saveLocal();
    try {
      const body = { user_id:uid, dish_id:dishId };
      if (expId) body.experience_id = expId;
      await api('user_dishes', { method:'POST', headers:{'Prefer':'resolution=merge-duplicates,return=minimal'}, body:JSON.stringify(body) });
    } catch(e) { console.log('markCollected:', e.message); }
  }

  // Update collection collected count
  if (activeColl) {
    const col = collections.find(c => c.id === activeColl.id);
    if (col) col.collected = col.dishes.filter(d => userDishes.has(d.id)).length;
  }

  // setState triggers render() — same Set reference, that's fine
  setState('data.userDishes', userDishes);

  // Unlock moment check
  const firstBites = allDishes.filter(d => d.first_bite_order != null);
  const fbDone     = firstBites.filter(d => userDishes.has(d.id)).length;
  if (fbDone === 3 && firstBites.length >= 3) setTimeout(showUnlockMoment, 600);

  setTimeout(initScrollReveal, 50);
}

// ── FEEDBACK TOAST ────────────────────────────────────
function showCollectedFeedback() {
  const dish = getState('ui.activeDish');
  updateCollectBtn(true);
  updateCardStatus(true);
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#1C1208;color:#fff;padding:10px 20px;border-radius:30px;font-size:13px;font-weight:600;z-index:300;animation:fadeInOut 2s ease forwards;font-family:'DM Sans',sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.3);white-space:nowrap`;
  toast.textContent = `✓ ${dish?.name} checked!`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}