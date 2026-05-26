// ── DISH MAP SHEET ────────────────────────────────────
let _dmMap = null, _dmNavLat = null, _dmNavLng = null, _dmMarkers = [];

function openDishMap() {
  const dish = activeDish;
  if (!dish) return;

  const titleEl  = document.getElementById('dishmap-title');
  const popupEl  = document.getElementById('dishmap-popup');
  const backdropEl = document.getElementById('dishmap-backdrop');
  if (!backdropEl) return;

  titleEl.textContent = dish.name_en || dish.name;
  popupEl.style.display = 'none';
  backdropEl.classList.add('open');

  setTimeout(() => _loadAndRender(dish), 350);
}

async function _loadAndRender(dish) {
  // Load curated spots + community check-ins with coords
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

  // Place curated pins
  const goldIcon = L.divIcon({ className:'', iconSize:[36,36], iconAnchor:[18,36],
    html:'<div class="dm-pin dm-pin--curated">📍</div>' });
  curated.forEach(loc => {
    const m = L.marker([loc.lat, loc.lng], { icon: goldIcon }).addTo(_dmMap);
    m.on('click', () => _showPopup('⭐ ' + loc.name, loc.address || '', null, loc.lat, loc.lng));
    _dmMarkers.push(m);
  });

  // Place community check-in pins
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
      null, exp.lat, exp.lng
    ));
    _dmMarkers.push(m);
  });

  // Fit bounds or fallback to GPS / country center
  if (_dmMarkers.length > 0) {
    _dmMap.fitBounds(L.latLngBounds(_dmMarkers.map(m => m.getLatLng())), { padding:[40,40], maxZoom:16 });
  } else {
    _locateAndSearch(dish);
  }
}

function _initMap() {
  // Clear old markers
  _dmMarkers.forEach(m => m.remove());
  _dmMarkers = [];

  if (!_dmMap) {
    _dmMap = L.map('dishmap-map', { zoomControl:true, attributionControl:false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(_dmMap);
  }
  _dmMap.invalidateSize();
}

// When no curated/community spots: locate user and show nearby food venues
function _locateAndSearch(dish) {
  const fallbackCoords = _countryCenter();
  if (!navigator.geolocation) {
    _dmMap.setView(fallbackCoords, 13);
    _searchNearby(fallbackCoords[0], fallbackCoords[1], dish.name);
    return;
  }
  _dmMap.setView(fallbackCoords, 5);
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      _dmMap.setView([lat, lng], 14);
      _searchNearby(lat, lng, dish.name);
    },
    () => {
      _dmMap.setView(fallbackCoords, 13);
      _searchNearby(fallbackCoords[0], fallbackCoords[1], dish.name);
    },
    { timeout: 6000 }
  );
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

async function _searchNearby(lat, lng, dishName) {
  const statusEl = document.getElementById('dishmap-status');
  if (statusEl) statusEl.textContent = 'Searching nearby restaurants…';
  const q = '[out:json][timeout:10];(node["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]["name"](around:800,' + lat + ',' + lng + '););out body;';
  try {
    const r    = await fetch('https://overpass-api.de/api/interpreter', { method:'POST', body:q });
    const data = await r.json();
    const els  = (data.elements || []).filter(e => e.lat && e.lon && e.tags?.name);
    if (statusEl) statusEl.textContent = els.length ? els.length + ' restaurants nearby' : 'No restaurants found nearby';
    els.forEach(el => {
      const icon = L.divIcon({ className:'', iconSize:[28,28], iconAnchor:[14,28],
        html:'<div class="dm-pin dm-pin--venue">🍽️</div>' });
      const m = L.marker([el.lat, el.lon], { icon }).addTo(_dmMap);
      m.on('click', () => _showPopup('🍽️ ' + el.tags.name, el.tags.cuisine || el.tags.amenity || '', null, el.lat, el.lon));
      _dmMarkers.push(m);
    });
    if (els.length > 0) {
      const bounds = L.latLngBounds(els.map(e => [e.lat, e.lon]));
      _dmMap.fitBounds(bounds, { padding:[30,30], maxZoom:16 });
    }
  } catch(e) {
    if (statusEl) statusEl.textContent = '';
  }
}

function _showPopup(name, meta, _unused, lat, lng) {
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
