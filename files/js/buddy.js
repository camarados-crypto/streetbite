// ── BUDDY PROFILE ─────────────────────────────────────
async function openBuddyProfile(userId) {
  $('buddy-backdrop').classList.add('open');
  $('buddy-inner').innerHTML = '<div style="padding:40px;text-align:center;color:#B0A090">Loading...</div>';
  try {
    const [profiles, userDishRows, badgeRows, recentExps] = await Promise.all([
      api(`profiles?user_id=eq.${userId}&select=display_name,avatar_url,username`),
      api(`user_dishes?user_id=eq.${userId}&select=dish_id,dishes(collections(country_id))`),
      api(`user_badges?user_id=eq.${userId}&select=badge_id`),
      api(`experiences?user_id=eq.${userId}&select=id,photo_url,rating,dish_id&order=created_at.desc&limit=6`)
    ]);

    const profile   = profiles?.[0] || {};
    const dishCount = userDishRows?.length || 0;
    const badges    = (badgeRows || []).map(r => r.badge_id);
    const name      = profile.display_name || profile.username || 'StreetBiter';
    const avatarUrl = profile.avatar_url || null;

    // ── Country data
    const countryIds = new Set(
      (userDishRows || []).map(r => r.dishes?.collections?.country_id).filter(Boolean)
    );
    const countryCount = countryIds.size;
    const visitedCountries = allCountries.filter(c => countryIds.has(c.id));

    // ── Avatar
    const avatarHtml = avatarUrl
      ? `<img src="${avatarUrl}" alt="${name}">`
      : `<span>${name[0].toUpperCase()}</span>`;

    // ── Country stamps
    const stampsHtml = visitedCountries.length > 0
      ? `<div class="buddy-section">
          <div class="buddy-section-title">Countries visited</div>
          <div class="buddy-stamps">
            ${visitedCountries.map(c => {
              const flag = COUNTRY_FLAGS[c.name] || '🌏';
              return `<div class="buddy-stamp"><span class="buddy-stamp-flag">${flag}</span><span class="buddy-stamp-name">${c.name}</span></div>`;
            }).join('')}
          </div>
        </div>`
      : '';

    // ── Recent check-ins
    const exps = recentExps || [];
    const checkinsHtml = exps.length > 0
      ? `<div class="buddy-section">
          <div class="buddy-section-title">Recent check-ins</div>
          <div class="buddy-checkins">
            ${exps.map(e => {
              const stars = e.rating ? '★'.repeat(e.rating) : '';
              return `<div class="buddy-checkin-thumb" onclick="feedCardClick('${e.dish_id}')">
                ${e.photo_url
                  ? `<img src="${e.photo_url}" alt="" loading="lazy">`
                  : `<div class="buddy-checkin-ph">🍽️</div>`}
                ${stars ? `<div class="buddy-checkin-stars">${stars}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>`
      : '';

    // ── Badges
    const badgeChips = badges.map(id => {
      const b = BADGES[id]; if (!b) return '';
      return `<span class="buddy-badge-chip">🏅 ${b.title.replace('First Bites ','')}</span>`;
    }).join('');

    const isOwnProfile = userId === uid;

    $('buddy-inner').innerHTML = `
      <div class="buddy-hero">
        <div class="buddy-av">${avatarHtml}</div>
        <div class="buddy-name">${name}</div>
        ${profile.username ? `<div class="buddy-sub">@${profile.username}</div>` : '<div class="buddy-sub">StreetBite explorer</div>'}
      </div>
      <div class="buddy-stats">
        <div class="buddy-stat"><div class="buddy-stat-v">${dishCount}</div><div class="buddy-stat-l">Tried</div></div>
        <div class="buddy-stat"><div class="buddy-stat-v">${countryCount || '—'}</div><div class="buddy-stat-l">Countries</div></div>
        <div class="buddy-stat"><div class="buddy-stat-v">${badges.length || '—'}</div><div class="buddy-stat-l">Badges</div></div>
      </div>
      ${checkinsHtml}
      ${stampsHtml}
      ${badgeChips ? `<div class="buddy-section"><div class="buddy-section-title">Badges</div><div style="padding-top:4px">${badgeChips}</div></div>` : ''}
      <button class="buddy-share-btn" onclick="${isOwnProfile ? 'shareMyProfile()' : `shareBuddyLink('${userId}')`}">
        🔗 ${isOwnProfile ? 'Share my profile' : 'Share this profile'}
      </button>
    `;
  } catch(e) {
    $('buddy-inner').innerHTML = '<div style="padding:40px;text-align:center;color:#C05030">Could not load profile.</div>';
  }
}

function closeBuddyProfile() { $('buddy-backdrop').classList.remove('open'); }

function shareMyProfile() {
  if (!uid) return;
  const url = `${location.origin}${location.pathname}?user=${uid}`;
  if (navigator.share) {
    navigator.share({ title:'My StreetBite profile', url });
  } else {
    navigator.clipboard?.writeText(url);
    alert('Profile link copied!');
  }
}

function shareBuddyLink(userId) {
  const url = `${location.origin}${location.pathname}?user=${userId}`;
  if (navigator.share) {
    navigator.share({ title:'StreetBite profile', url });
  } else {
    navigator.clipboard?.writeText(url);
    alert('Profile link copied!');
  }
}

async function checkUserParam() {
  const params = new URLSearchParams(location.search);
  const userParam = params.get('user');
  if (!userParam) return;
  history.replaceState({}, '', location.pathname);
  await openBuddyProfile(userParam);
}
