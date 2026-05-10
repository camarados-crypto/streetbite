// ── GLOBAL STATE ─────────────────────────────────────
let sbUser = null, uid = null, token = null;
let _initDone = false; // guards against auth handler firing renderHome during init
let allCountries = [], currentCountry = null, countryId = null;
let collections = [], allDishes = [];
let userDishes = new Set();
let activeColl = null, activeDish = null, activeDishNum = 0;
let flipped = false, recentDishIds = [];
let unlockShown = false;
let ciRating = 0, ciPhotoFile = null, ciPhotoDataUrl = null;

// ── SWIPE TO CLOSE CARD ──────────────────────────────
let _ty = 0;
document.addEventListener('DOMContentLoaded', () => {
  $('card-modal').addEventListener('touchstart', e => _ty = e.touches[0].clientY, {passive:true});
  $('card-modal').addEventListener('touchend',   e => { if (e.changedTouches[0].clientY - _ty > 80) closeCard(); }, {passive:true});
});

// ── INIT ─────────────────────────────────────────────
async function init() {
  try {
    await initAuth();
    await load();
    updateWelcome();
    renderHome();
    _initDone = true;
    ensureProfile();
    refreshFriendsActivity();
    showScreen('s-home');
    setTimeout(initScrollReveal, 100);
    $('loading').style.display = 'none';
    loadNotifCount();
    checkUserParam();
  } catch(e) {
    $('loading').innerHTML = `
      <div style="text-align:center;padding:24px;color:#7A6A5A;font-family:'DM Sans',sans-serif">
        <div style="font-size:40px;margin-bottom:16px">⚠️</div>
        <div style="font-size:16px;font-weight:700;color:#1C1208;margin-bottom:8px">Could not load</div>
        <div style="font-size:13px;max-width:260px;margin:0 auto;line-height:1.5">${e.message}</div>
        <button onclick="location.reload()" style="margin-top:20px;padding:11px 22px;border-radius:10px;background:#D4692A;color:#fff;border:none;font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif">Try again</button>
      </div>`;
  }
}

init();
