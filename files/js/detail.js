// ── DISH DETAIL SHEET ─────────────────────────────────
async function openDetail() {
  if (!activeDish) return;
  const dish = activeDish;
  const rc   = RARITY_COLOR[dish.rarity] || '#888780';
  if (dish.image_url) { $('detail-hero-img').src = dish.image_url; $('detail-hero-img').style.display = 'block'; }
  else { $('detail-hero-img').style.display = 'none'; $('detail-hero').style.background = '#2A1808'; }
  $('detail-hero-rar').textContent    = dish.rarity;
  $('detail-hero-rar').style.background = rc;
  $('detail-hero-name').textContent   = dish.name;
  $('ds-checkins').textContent = '—'; $('ds-price').textContent = '—'; $('ds-rating').textContent = '—';
  $('detail-exps').innerHTML   = '<div class="exp-empty"><div class="spin" style="margin:0 auto 10px"></div>Loading...</div>';
  $('detail-photos-section').style.display = 'none';
  $('detail-backdrop').classList.add('open');
  $('detail-sheet').scrollTop = 0;
  try {
    const exps = await api(`experiences?dish_id=eq.${dish.id}&order=created_at.desc&select=*`);
    renderDetailExperiences(dish, exps || []);
  } catch(e) { $('detail-exps').innerHTML = `<div class="exp-empty">Could not load experiences.</div>`; }
}

function renderDetailExperiences(dish, exps) {
  $('ds-checkins').textContent = exps.length || '0';
  const withPrice  = exps.filter(e => e.price && e.price > 0);
  if (withPrice.length > 0) { const avg = withPrice.reduce((s,e) => s + parseFloat(e.price), 0) / withPrice.length; $('ds-price').textContent = formatPrice(avg, withPrice[0].currency || ''); }
  const withRating = exps.filter(e => e.rating && e.rating > 0);
  if (withRating.length > 0) { const avg = withRating.reduce((s,e) => s + e.rating, 0) / withRating.length; $('ds-rating').textContent = '★ ' + avg.toFixed(1); }
  const photos = exps.filter(e => e.photo_url);
  if (photos.length > 0) {
    $('detail-photos-section').style.display = 'block';
    $('detail-photo-grid').innerHTML = photos.map(e => `<div class="photo-thumb" onclick="openPhotoViewer('${e.photo_url}')"><img src="${e.photo_url}" alt="" loading="lazy"><div class="photo-overlay">🔍</div></div>`).join('');
  }
  const mine      = exps.filter(e => e.user_id === uid);
  const community = exps.filter(e => e.user_id !== uid);
  let html = '';
  if (mine.length > 0)      { html += `<div class="detail-sec-title" style="margin-bottom:10px">Your check-ins (${mine.length})</div>`; html += mine.map(e => renderExpCard(e, true)).join(''); }
  if (community.length > 0) { html += `<div class="detail-sec-title" style="margin:${mine.length?'16px':'0'} 0 10px">Community (${community.length})</div>`; html += community.map(e => renderExpCard(e, false)).join(''); }
  if (exps.length === 0)    html = `<div class="exp-empty">No check-ins for this dish yet.<br>Be the first! 🍽️</div>`;
  $('detail-exps').innerHTML = html;
  $('detail-exps-wrap').querySelector('.detail-sec-title').style.display = 'none';
}

function renderExpCard(exp, isOwn) {
  const stars    = exp.rating ? '★'.repeat(exp.rating) + '☆'.repeat(5 - exp.rating) : '';
  const date     = exp.created_at ? new Date(exp.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}) : '';
  const initials = (exp.user_display_name || (isOwn ? 'You' : '?')).charAt(0).toUpperCase();
  const name     = exp.user_display_name || (isOwn ? 'You' : 'Anonymous');
  return `<div class="exp-card">
    ${exp.photo_url ? `<div class="exp-card-photo" onclick="openPhotoViewer('${exp.photo_url}')"><img src="${exp.photo_url}" alt="" loading="lazy"></div>` : ''}
    <div class="exp-card-body">
      <div class="exp-card-top">
        <div class="exp-avatar">${exp.user_avatar_url ? `<img src="${exp.user_avatar_url}" alt="${name}">` : initials}</div>
        <span class="exp-name">${name}${isOwn ? ' <span style="color:#D4692A;font-size:10px">(you)</span>' : ''}</span>
        <span class="exp-date">${date}</span>
      </div>
      ${stars ? `<div class="exp-stars">${stars}</div>` : ''}
      <div class="exp-meta">
        ${exp.location_text ? `<span class="exp-chip">📍 ${exp.location_text}</span>` : ''}
        ${exp.price && exp.price > 0 ? `<span class="exp-chip">💰 ${formatPrice(exp.price, exp.currency)}</span>` : ''}
      </div>
      ${exp.note ? `<div class="exp-note">"${exp.note}"</div>` : ''}
    </div>
  </div>`;
}

function closeDetail()           { $('detail-backdrop').classList.remove('open'); }
function detailBackdropClick(e)  { if (e.target === $('detail-backdrop')) closeDetail(); }
function openPhotoViewer(url)    { $('pv-img').src = url; $('photo-viewer').classList.add('open'); }
function closePhotoViewer()      { $('photo-viewer').classList.remove('open'); }
