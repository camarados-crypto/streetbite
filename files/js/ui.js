// ── SCROLL REVEAL ─────────────────────────────────────
function initScrollReveal() {
  const els = document.querySelectorAll('.scroll-reveal');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } });
  }, { threshold: 0.08 });
  els.forEach(el => obs.observe(el));
}

// ── CONFETTI ──────────────────────────────────────────
function launchConfetti() {
  const wrap = $('confetti-wrap'); wrap.innerHTML = '';
  const colors = ['#D4692A','#74C69D','#F4B942','#185FA5','#534AB7','#E24B4A','#3B6D11'];
  for (let i = 0; i < 72; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const shapes = ['2px','50%','0'];
    el.style.cssText = `left:${Math.random()*100}%;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;background:${colors[i%colors.length]};border-radius:${shapes[i%3]};animation-duration:${1.8+Math.random()*1.2}s;animation-delay:${Math.random()*.6}s;`;
    wrap.appendChild(el);
  }
  setTimeout(() => { wrap.innerHTML = ''; }, 3200);
}

// ── UNLOCK MOMENT ─────────────────────────────────────
function showUnlockMoment() {
  if (unlockShown) return;
  unlockShown = true;
  launchConfetti();
  $('unlock-moment').classList.add('show');
}
function closeUnlockMoment() {
  $('unlock-moment').classList.remove('show');
  document.querySelectorAll('.scroll-reveal').forEach(el => el.classList.remove('revealed'));
  setTimeout(initScrollReveal, 100);
}

// ── FORMAT PRICE ──────────────────────────────────────
function formatPrice(price, currency) {
  const r = Math.round(price);
  if (currency === 'VND') return r.toLocaleString() + ' ₫';
  if (currency === 'JPY') return '¥' + r.toLocaleString();
  if (currency === 'IDR') return 'Rp ' + r.toLocaleString();
  if (currency === 'THB') return '฿' + r;
  if (currency === 'EUR') return '€' + price.toFixed(2);
  return currency + ' ' + price.toFixed(2);
}
