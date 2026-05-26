// ── DISH MAP SHEET ────────────────────────────────────
let _dmMap = null, _dmNavLat = null, _dmNavLng = null;

async function openDishMap() {
  const dish = activeDish;
  if (!dish) return;

  $('dishmap-title').textContent = dish.name_en || dish.name;
  $('dishmap-popup').style.display = 'none';
  $('dishmap-backdrop').classList.add('open');

  // Load curated locations + community check-ins with coords in parallel
  let curated = [], community = [];
  try {
    [curated, community] = await Promise.all([
      api(`locations?dish_id=eq.${dish.id}&select=*`),
      api(`experiences?dish_id=eq.${dish.id}&lat=not.is.null&select=id,lat,lng,location_text,user_display_name,user_avatar_url,rating`)
    ]);
    curated   = curated   || [];
    community = community || [];
  } catch(e) { console.log('dishmap load:', e); }

  setTimeout(() => _initDishMap(curated, community), 350);
}

function _initDishMap(curated, community) {
  const allSpots = [
    ...curated.map(l => ({ lat: l.lat, lng: l.lng })),
    ...community.map(e => ({ lat: e.lat, lng: e.lng }))
  ];

  if (!_dmMap) {
    _dmMap = L.map('dishmap-map', { zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_dmMap);
  } else {
    _dmMap.eachLayer(l => { if (!(l instanceof L.TileLayer)) _dmMap.removeLayer(l); });
  }

  _dmMap.invalidateSize();

  // Center map
  if (allSpots.length > 0) {
    const bounds = L.latLngBounds(allSpots.map(s => [s.lat, s.lng]));
    _dmMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  } else {
    _dmMap.setView([13.75, 100.5], 5);
  }

  // Curated pins — gold star
  const curatedIcon = L.divIcon({
    className: '', iconSize: [36, 36], iconAnchor: [18, 18],
    html: `<div class="dm-pin dm-pin--curated">⭐</div>`
  });
  curated.forEach(loc => {
    L.marker([loc.lat, loc.lng], { icon: curatedIcon })
      .addTo(_dmMap)
      .on('click', () => _dmShowPopup(loc.name, loc.address || null, null, null, loc.lat, loc.lng, true));
  });

  // Community pins — orange dot with initial
  community.forEach(exp => {
    const initial = (exp.user_display_name || '?').charAt(0).toUpperCase();
    const communityIcon = L.divIcon({
      className: '', iconSize: [32, 32], iconAnchor: [16, 16],
      html: `<div class="dm-pin dm-pin--community">${exp.user_avatar_url
        ? `<img src="${exp.user_avatar_url}" alt="">`
        : initial}</div>`
    });
    L.marker([exp.lat, exp.lng], { icon: communityIcon })
      .addTo(_dmMap)
      .on('click', () => _dmShowPopup(
        exp.location_text || 'Community check-in',
        exp.user_display_name || 'Anonymous',
        exp.rating, exp.user_avatar_url,
        exp.lat, exp.lng, false
      ));
  });
}

function _dmShowPopup(name, sub, rating, avatarUrl, lat, lng, isCurated) {
  _dmNavLat = lat; _dmNavLng = lng;
  $('dishmap-popup-name').textContent = (isCurated ? '⭐ ' : '🟠 ') + name;
  const stars = rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : '';
  $('dishmap-popup-meta').textContent = [sub, stars].filter(Boolean).join(' · ');
  $('dishmap-popup').style.display = 'flex';
}

function dishMapNavigate() {
  if (_dmNavLat == null) return;
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${_dmNavLat},${_dmNavLng}`, '_blank');
}

function closeDishMap() {
  $('dishmap-backdrop').classList.remove('open');
  $('dishmap-popup').style.display = 'none';
}
