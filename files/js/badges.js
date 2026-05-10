// ── BADGE STORAGE ─────────────────────────────────────
function loadClaimedBadges() {
  try { return new Set(JSON.parse(localStorage.getItem('sb_badges') || '[]')); } catch(e) { return new Set(); }
}
function saveBadge(id) {
  const c = loadClaimedBadges(); c.add(id);
  try { localStorage.setItem('sb_badges', JSON.stringify([...c])); } catch(e) {}
  if (uid && sbUser && !sbUser.is_anonymous) {
    api('user_badges', { method:'POST', headers:{'Prefer':'resolution=merge-duplicates,return=minimal'}, body:JSON.stringify({ user_id:uid, badge_id:id }) }).catch(()=>{});
  }
}
function isBadgeClaimed(id) { return loadClaimedBadges().has(id); }

// ── BADGE SHEET ───────────────────────────────────────
function openBadgeSheet(badgeId) {
  const badge = BADGES[badgeId]; if (!badge) return;
  const claimed = isBadgeClaimed(badgeId);
  $('badge-sheet-inner').innerHTML = `
    <div class="badge-card">
      <div class="badge-sparkle-row"><span>✦</span><span>✦</span><span>✦</span></div>
      <div class="badge-icon-wrap">${badge.icon}</div>
      <div class="badge-card-title">${badge.title}</div>
      <div class="badge-card-sub">${badge.sub}</div>
      <div class="badge-card-country">${badge.flag} ${badge.country}</div>
    </div>
    <div class="badge-coming-section">
      <div class="badge-coming-title">More badges coming</div>
      <div class="badge-coming-grid">
        ${BADGES_COMING.map(b=>`<div class="badge-coming-item"><div class="badge-coming-icon">${b.icon}</div><div class="badge-coming-name">${b.name}</div><div class="badge-coming-hint">${b.hint}</div></div>`).join('')}
      </div>
    </div>
    ${!claimed
      ? `<button class="badge-claim-btn" style="margin-top:20px" onclick="claimBadge('${badgeId}')">🏅 Claim badge</button>`
      : `<div style="margin-top:20px;text-align:center;font-size:13px;color:#9E8E7A;font-weight:600">✓ Badge claimed</div>
         <button class="badge-claim-btn" style="margin-top:10px;background:#F5F0EA;color:#7A6A5A" onclick="closeBadgeSheet()">Close</button>`}
  `;
  $('badge-backdrop').classList.add('open');
}
function closeBadgeSheet() { $('badge-backdrop').classList.remove('open'); }
function claimBadge(id) { saveBadge(id); closeBadgeSheet(); renderHome(); setTimeout(initScrollReveal, 80); }
