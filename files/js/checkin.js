// ── OPEN / CLOSE ──────────────────────────────────────
function openCheckin(preloadFile, preloadDataUrl) {
  const dish    = activeDish;
  const coll    = activeColl;
  const country = currentCountry;
  if (!dish) return;

  ciRating = 0;
  ciPhotoFile = preloadFile || null;
  ciPhotoDataUrl = preloadDataUrl || null;

  $('ci-dish-name').textContent = dish.name;
  $('ci-dish-coll').textContent = coll?.name || '';
  if (dish.image_url) {
    $('ci-dish-img').innerHTML = `<img src="${dish.image_url}" alt="${dish.name}">`;
  } else {
    $('ci-dish-img').innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;background:#F0EBE4">🍽️</div>`;
  }

  $('ci-price').value    = '';
  $('ci-location').value = '';
  $('ci-note').value     = '';
  $('ci-details').style.display = 'none';
  $('ci-details-toggle').textContent = '+ Add details (price, location, note)';
  $('ci-uploading').style.display = 'none';
  $('ci-save').disabled = false;
  updateStars(0);

  // Foto: preloaded of leeg
  if (ciPhotoDataUrl) {
    $('ci-photo-preview').src = ciPhotoDataUrl;
    $('ci-photo-preview').style.display = 'block';
    $('ci-photo-placeholder').style.display = 'none';
  } else {
    $('ci-photo-preview').style.display = 'none';
    $('ci-photo-preview').src = '';
    $('ci-photo-placeholder').style.display = 'flex';
  }

  $('ci-currency').value = COUNTRY_CURRENCY[country?.name] || 'USD';
  $('ci-backdrop').classList.add('open');
}

function ciToggleDetails() {
  const d = $('ci-details');
  const open = d.style.display === 'none';
  d.style.display = open ? '' : 'none';
  $('ci-details-toggle').textContent = open ? '− Hide details' : '+ Add details (price, location, note)';
}

function closeCheckin()     { $('ci-backdrop').classList.remove('open'); }
function ciBackdropClick(e) { if (e.target === $('ci-backdrop')) closeCheckin(); }

function setRating(n) {
  ciRating = n;
  updateStars(n);
}
function updateStars(n) {
  $('ci-stars').querySelectorAll('.ci-star').forEach((s, i) => s.classList.toggle('on', i < n));
}

// ── PHOTO SELECT ──────────────────────────────────────
function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  ciPhotoFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    ciPhotoDataUrl = ev.target.result;
    $('ci-photo-preview').src = ev.target.result;
    $('ci-photo-preview').style.display = 'block';
    $('ci-photo-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// ── LOCATION PICKER (map) ─────────────────────────────
let _locMap = null, _locUserMarker = null, _locMarkers = [], _locSelected = null, _locSelectedLat = null, _locSelectedLng = null, _locSearchTimer = null;

function openLocationPicker() {
  $('locpicker-overlay').classList.add('open');
  _locSelected = null; _locSelectedLat = null; _locSelectedLng = null;
  $('locpicker-bottom').style.display = 'none';
  $('locpicker-search').value = '';
  $('locpicker-status').textContent = 'Finding your location…';

  // Init map once
  if (!_locMap) {
    _locMap = L.map('locpicker-map', { zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_locMap);
    _locMap.on('click', e => _reverseGeocode(e.latlng.lat, e.latlng.lng, false));
  }

  // Invalidate after CSS transition
  setTimeout(() => _locMap.invalidateSize(), 350);

  if (!navigator.geolocation) {
    $('locpicker-status').textContent = 'Location unavailable — search for a place above.';
    _locMap.setView([13.75, 100.5], 14);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => _locGotPosition(pos.coords.latitude, pos.coords.longitude),
    ()  => { $('locpicker-status').textContent = 'Location unavailable — search for a place above.'; }
  );
}

function _locGotPosition(lat, lng) {
  _locMap.setView([lat, lng], 16);
  if (_locUserMarker) _locUserMarker.remove();
  _locUserMarker = L.marker([lat, lng], {
    icon: L.divIcon({ className:'loc-user-dot', iconSize:[18,18], iconAnchor:[9,9] }),
    zIndexOffset: 1000
  }).addTo(_locMap).bindTooltip('You', { permanent:true, direction:'top', offset:[0,-12], className:'loc-you-tip' });
  $('locpicker-status').textContent = 'Loading nearby places…';
  _loadNearbyPlaces(lat, lng);
}

async function _loadNearbyPlaces(lat, lng) {
  _locMarkers.forEach(m => m.remove()); _locMarkers = [];
  const q = `[out:json][timeout:15];(node["amenity"~"^(restaurant|cafe|fast_food|food_court|bar|bakery|pub|ice_cream)$"]["name"](around:600,${lat},${lng}););out body;`;
  try {
    const r    = await fetch('https://overpass-api.de/api/interpreter', { method:'POST', body:q });
    const data = await r.json();
    const els  = (data.elements || []).filter(e => e.lat && e.lon && e.tags?.name);
    $('locpicker-status').textContent = els.length ? `${els.length} places nearby — tap to select` : 'No places found nearby. Tap the map or search.';
    els.forEach(el => {
      const emoji = _placeEmoji(el.tags.amenity);
      const icon  = L.divIcon({ className:'loc-place-icon', html:emoji, iconSize:[28,28], iconAnchor:[14,14] });
      const m     = L.marker([el.lat, el.lon], { icon })
        .addTo(_locMap)
        .bindTooltip(el.tags.name, { direction:'top', offset:[0,-16], className:'loc-place-tip' })
        .on('click', () => _selectPlace(el.tags.name, m, el.lat, el.lon));
      _locMarkers.push(m);
    });
  } catch(e) {
    $('locpicker-status').textContent = 'Could not load places. Tap the map or search.';
  }
}

function _placeEmoji(amenity) {
  const map = { restaurant:'🍽️', cafe:'☕', fast_food:'🍟', food_court:'🏪', bar:'🍺', bakery:'🥐', pub:'🍺', ice_cream:'🍦' };
  return map[amenity] || '🍽️';
}

function _selectPlace(name, marker, lat, lng) {
  _locMarkers.forEach(m => {
    const el = m.getElement(); if (el) el.classList.remove('selected');
  });
  const el = marker?.getElement(); if (el) el.classList.add('selected');
  _locSelected = name;
  _locSelectedLat = lat ?? null;
  _locSelectedLng = lng ?? null;
  $('locpicker-sel-name').textContent = name;
  $('locpicker-bottom').style.display = 'flex';
}

async function _reverseGeocode(lat, lng, moveMap) {
  if (moveMap) _locMap.setView([lat, lng], 16);
  $('locpicker-status').textContent = 'Looking up location…';
  _locSelectedLat = lat; _locSelectedLng = lng;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const d = await r.json();
    const name = d.name || d.address?.road || d.address?.suburb || d.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    _locSelected = name;
    $('locpicker-sel-name').textContent = name;
    $('locpicker-bottom').style.display = 'flex';
    $('locpicker-status').textContent = 'Tap a place or use this location';
    if (moveMap) _loadNearbyPlaces(lat, lng);
  } catch(e) {
    const name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    _locSelected = name;
    $('locpicker-sel-name').textContent = name;
    $('locpicker-bottom').style.display = 'flex';
  }
}

function locSearchDebounce() {
  clearTimeout(_locSearchTimer);
  _locSearchTimer = setTimeout(_doLocSearch, 600);
}

async function _doLocSearch() {
  const q = $('locpicker-search').value.trim();
  if (q.length < 3) return;
  $('locpicker-status').textContent = 'Searching…';
  try {
    const r    = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1`);
    const data = await r.json();
    if (!data.length) { $('locpicker-status').textContent = 'No results found.'; return; }
    const place = data[0];
    const lat = parseFloat(place.lat), lng = parseFloat(place.lon);
    const name = place.name || place.display_name.split(',')[0];
    _locMap.setView([lat, lng], 17);
    _locSelected = name; _locSelectedLat = lat; _locSelectedLng = lng;
    $('locpicker-sel-name').textContent = name;
    $('locpicker-bottom').style.display = 'flex';
    _loadNearbyPlaces(lat, lng);
  } catch(e) { $('locpicker-status').textContent = 'Search failed.'; }
}

function confirmLocation() {
  if (_locSelected) $('ci-location').value = _locSelected;
  closeLocationPicker();
}

function closeLocationPicker() {
  $('locpicker-overlay').classList.remove('open');
}

// ── PHOTO UPLOAD ──────────────────────────────────────
async function uploadPhoto() {
  const file = ciPhotoFile;
  const dish = activeDish;
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
  const dish = activeDish;
  if (!dish) return;

  $('ci-save').disabled = true;
  let photoUrl = null;
  if (ciPhotoFile) {
    $('ci-uploading').style.display = 'flex';
    photoUrl = await uploadPhoto();
    $('ci-uploading').style.display = 'none';
  }

  const exp = {
    dish_id:           dish.id,
    user_id:           uid,
    rating:            ciRating || null,
    location_text:     $('ci-location').value.trim() || null,
    lat:               _locSelectedLat,
    lng:               _locSelectedLng,
    note:              $('ci-note').value.trim() || null,
    price:             parseFloat($('ci-price').value) || null,
    currency:          $('ci-currency').value || 'USD',
    photo_url:         photoUrl,
    user_display_name: sbUser?.user_metadata?.full_name || sbUser?.user_metadata?.name || null,
    user_avatar_url:   sbUser?.user_metadata?.avatar_url || null,
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
  const dish = activeDish;
  closeCheckin();
  await markCollected(dish.id, null);
  showCollectedFeedback();
}

// ── MARK COLLECTED ────────────────────────────────────
async function markCollected(dishId, expId) {
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

  render();

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