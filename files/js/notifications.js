// ── NOTIFICATIONS ─────────────────────────────────────
let _notifCount = 0;
let _notifChannel = null;

async function loadNotifCount() {
  if (!uid || !sbUser || sbUser.is_anonymous) return;
  try {
    const rows = await api(`notifications?user_id=eq.${uid}&read_at=is.null&select=id`);
    _notifCount = rows?.length || 0;
    updateNotifBadge();
    $('notif-btn').style.display = 'flex';
  } catch(e) {}
  subscribeNotifs();
}

function subscribeNotifs() {
  if (!sbClient || !uid || _notifChannel) return;
  _notifChannel = sbClient
    .channel('notifications:' + uid)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${uid}`
    }, () => {
      _notifCount++;
      updateNotifBadge();
      $('notif-btn').style.display = 'flex';
    })
    .subscribe();
}

function updateNotifBadge() {
  const badge = $('notif-badge');
  if (!badge) return;
  if (_notifCount > 0) {
    badge.textContent = _notifCount > 9 ? '9+' : (_notifCount > 1 ? _notifCount : '');
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

async function openNotifSheet() {
  $('notif-backdrop').classList.add('open');
  $('notif-list').innerHTML = '<div style="padding:32px;text-align:center;color:#B0A090">Loading...</div>';
  try {
    const rows = await api(
      `notifications?user_id=eq.${uid}&select=id,type,reaction_type,read_at,created_at,from_user_id,dish_id,experience_id,profiles!notifications_from_user_id_fkey2(display_name,avatar_url,username),dishes(name,name_en,image_url)&order=created_at.desc&limit=30`
    );
    if (!rows?.length) {
      $('notif-list').innerHTML = '<div class="notif-empty">No notifications yet.<br>Share your check-ins and collect likes! 🍜</div>';
      return;
    }
    $('notif-list').innerHTML = rows.map(n => {
      const profile  = n.profiles || {};
      const dish     = n.dishes   || {};
      const REACTION_LABELS = { thumbs_up:'👍 liked', love:'😍 loved', fire:'🔥 loved', sick:'🤢 reacted to', shocked:'😱 was shocked by' };
      const fromName   = profile.display_name || profile.username || 'Someone';
      const fromAv     = profile.avatar_url;
      const dishName   = dish.name_en || dish.name || 'a dish';
      const dishImg    = dish.image_url;
      const unread     = !n.read_at;
      const time       = formatNotifTime(n.created_at);
      const action     = REACTION_LABELS[n.reaction_type] || '❤️ liked';
      const avatarHtml = fromAv ? `<img src="${fromAv}" alt="">` : fromName[0].toUpperCase();

      return `<div class="notif-item${unread ? ' unread' : ''}" onclick="notifClick('${n.id}','${n.dish_id || ''}','${n.experience_id || ''}')">
        <div class="notif-avatar">${avatarHtml}</div>
        <div class="notif-body">
          <div class="notif-text"><strong>${fromName}</strong> ${action} your check-in of <strong>${dishName}</strong></div>
          <div class="notif-time">${time}</div>
        </div>
        ${dishImg ? `<div class="notif-dish-img"><img src="${dishImg}" alt="" loading="lazy"></div>` : `<div style="font-size:24px">${action.split(' ')[0]}</div>`}
      </div>`;
    }).join('');

    // Markeer als gelezen
    await markAllRead();
  } catch(e) {
    $('notif-list').innerHTML = '<div class="notif-empty">Could not load notifications.</div>';
  }
}

function closeNotifSheet() { $('notif-backdrop').classList.remove('open'); }

async function markAllRead() {
  if (!uid) return;
  try {
    await api(`notifications?user_id=eq.${uid}&read_at=is.null`, {
      method: 'PATCH',
      body: JSON.stringify({ read_at: new Date().toISOString() })
    });
    _notifCount = 0;
    updateNotifBadge();
  } catch(e) {}
}

function notifClick(notifId, dishId, experienceId) {
  closeNotifSheet();
  if (dishId) setTimeout(() => openCardFromHome(dishId), 300);
}

function formatNotifTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}
