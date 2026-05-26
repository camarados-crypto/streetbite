// ── DISH MAP SHEET ────────────────────────────────────
let _dmMap = null, _dmNavLat = null, _dmNavLng = null, _dmMarkers = [];

function openDishMap() {
  const dish = activeDish;
  if (!dish) return;

  const titleEl    = document.getElementById('dishmap-title');
  const popupEl    = document.getElementById('dishmap-popup');
  const backdropEl = document.getElementById('dishmap-backdrop');
  if (!backdropEl) return;

  titleEl.textContent = dish.name_en || dish.name;
  popupEl.style.display = 'none';
  backdropEl.classList.add('open');

  setTimeout(() => _loadAndRender(dish), 500);
}

async function _loadAndRender(dish) {
  let curated = [], community = [];
  try {
    const [c, e] = await Promise.all([
      api('locations?dish_id=eq.' + dish.id + '&select=*'),
      api('experiences?dish_id=eq.' + dish.id + '&select=id,lat,lng,location_text,user_display_name,user_avatar_url,rating')
    ]);
    curated   = (c || []);
    community = (e || []).filter(x => x.lat != null && x.lng != null);
  } catch(err) { console.log('dishmap load error:', err); }

  _initMap();

  // Curated spots (admin-added)
  const goldIcon = L.divIcon({ className:'', iconSize:[36,36], iconAnchor:[18,36],
    html:'<div class="dm-pin dm-pin--curated">📍</div>' });
  curated.forEach(loc => {
    const m = L.marker([loc.lat, loc.lng], { icon: goldIcon }).addTo(_dmMap);
    m.on('click', () => _showPopup('📍 ' + loc.name, loc.address || '', loc.lat, loc.lng));
    _dmMarkers.push(m);
  });

  // Community check-in pins
  community.forEach(exp => {
    const initial = (exp.user_display_name || '?').charAt(0).toUpperCase();
    const icon = L.divIcon({ className:'', iconSize:[32,32], iconAnchor:[16,32],
      html: '<div class="dm-pin dm-pin--community">' +
        (exp.user_avatar_url ? '<img src="' + exp.user_avatar_url + '" alt="">' : initial) +
        '</div>' });
    const m = L.marker([exp.lat, exp.lng], { icon }).addTo(_dmMap);
    const stars = exp.rating ? '★'.repeat(exp.rating) + '☆'.repeat(5 - exp.rating) : '';
    m.on('click', () => _showPopup(
      '🟠 ' + (exp.location_text || 'Community check-in'),
      [exp.user_display_name || 'Anonymous', stars].filter(Boolean).join(' · '),
      exp.lat, exp.lng
    ));
    _dmMarkers.push(m);
  });

  const statusEl = document.getElementById('dishmap-status');
  if (_dmMarkers.length > 0) {
    _dmMap.fitBounds(L.latLngBounds(_dmMarkers.map(m => m.getLatLng())), { padding:[40,40], maxZoom:16 });
    if (statusEl) statusEl.textContent = '';
  } else {
    const fallback = _countryCenter();
    _dmMap.setView(fallback, 13);
    if (statusEl) statusEl.textContent = 'No known spots yet — be the first to check in!';
  }
}

function _initMap() {
  _dmMarkers.forEach(m => m.remove());
  _dmMarkers = [];

  try {
    const container = document.getElementById('dishmap-map');
    if (!container) return;

    if (_dmMap) {
      _dmMap.invalidateSize();
      return;
    }

    _dmMap = L.map(container, { zoomControl:true, attributionControl:false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(_dmMap);
    setTimeout(() => { if (_dmMap) _dmMap.invalidateSize(); }, 200);
  } catch(err) {
    console.error('dishmap init error:', err);
    _dmMap = null;
  }
}

function _countryCenter() {
  const centers = {
    'Vietnam':     [16.0, 108.0],
    'Thailand':    [13.7, 100.5],
    'Japan':       [35.7, 139.7],
    'Netherlands': [52.3, 4.9],
  };
  return centers[currentCountry?.name] || [13.7, 100.5];
}

function openDishOnGoogleMaps() {
  const dish = activeDish;
  if (!dish) return;
  const query = encodeURIComponent((dish.name_en || dish.name) + ' restaurant');

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        window.open(`https://www.google.com/maps/search/${query}/@${lat},${lng},14z`, '_blank');
      },
      () => _openGoogleMapsQuery(query),
      { timeout: 4000 }
    );
  } else {
    _openGoogleMapsQuery(query);
  }
}

function _openGoogleMapsQuery(query) {
  const country = currentCountry?.name ? '+' + encodeURIComponent(currentCountry.name) : '';
  window.open(`https://www.google.com/maps/search/${query}${country}`, '_blank');
}

function _showPopup(name, meta, lat, lng) {
  _dmNavLat = lat; _dmNavLng = lng;
  document.getElementById('dishmap-popup-name').textContent = name;
  document.getElementById('dishmap-popup-meta').textContent = meta;
  document.getElementById('dishmap-popup').style.display = 'flex';
}

function dishMapNavigate() {
  if (_dmNavLat == null) return;
  window.open('https://www.google.com/maps/dir/?api=1&destination=' + _dmNavLat + ',' + _dmNavLng, '_blank');
}

function closeDishMap() {
  const el = document.getElementById('dishmap-backdrop');
  if (el) el.classList.remove('open');
  document.getElementById('dishmap-popup').style.display = 'none';
}
