import { t, setLang, getLang, applyI18n, TRANSLATIONS } from './i18n.js';
import { SDGS } from './sdg-data.js';

/* =============================================
   CONSTANTS — change ADMIN_PASSWORD here
============================================= */
const DEFAULT_PADLET_URL = 'https://padlet.com/chichiboo/sdgsmaster';
const ADMIN_PASSWORD = 'chichiboo';         // ← 비밀번호 변경 가능
const LS_PADLET_KEY  = 'sdgsmaster_padlet'; // localStorage key

/* =============================================
   STATE
============================================= */
let selCat    = '';
let selCatCustom = '';
let selSDG    = null;
let cardReady = false;
let adminUnlocked = false;
let footerClickCount = 0;
let footerClickTimer = null;
let toastTimer = null;
let isFullscreen = false;

/* =============================================
   INIT
============================================= */
document.addEventListener('DOMContentLoaded', () => {
  buildSDGGrid();
  applyI18n();
  loadPadletAuto();
  bindEvents();
  refreshProgress();
});

/* =============================================
   BUILD SDG GRID
============================================= */
function buildSDGGrid() {
  const lang = getLang();
  const grid = document.getElementById('sdg-grid');
  grid.innerHTML = SDGS.map(s => {
    const [t1, t2] = s.tips[lang].split('\n');
    return `
      <button class="sdg-btn" id="sdg${s.n}" style="background:${s.col}"
        onclick="window._pickSDG(${s.n})">
        <span class="sdg-num">${s.n}</span>
        <span class="sdg-lbl">${s.labels[lang]}</span>
        <div class="sdg-tip"><strong>${t1}</strong><br/>${t2}</div>
      </button>`;
  }).join('');
}

/* =============================================
   LANGUAGE SWITCHER
============================================= */
function switchLang(lang) {
  setLang(lang);

  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });

  applyI18n();
  buildSDGGrid();

  // Re-select if was selected
  if (selSDG) {
    const btn = document.getElementById('sdg' + selSDG.n);
    if (btn) btn.classList.add('on');
    updateSDGBanner(selSDG);
  }

  // Re-select category
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('on', b.dataset.key === getSelCatKey());
  });

  refreshProgress();
}

function getSelCatKey() {
  if (!selCat) return '';
  if (selCat === 'other') return 'other';
  return selCat;
}

/* =============================================
   CATEGORY SELECTION
============================================= */
function pickCat(key) {
  selCat = key;
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('on', b.dataset.key === key);
  });
  const otherWrap = document.getElementById('cat-other-wrap');
  if (key === 'other') {
    otherWrap.classList.add('show');
    document.getElementById('cat-other-input').focus();
  } else {
    otherWrap.classList.remove('show');
    selCatCustom = '';
  }
  hideErr('e-cat');
  hideErr('e-cat-other');
  refreshProgress();
}

function getCatDisplay() {
  if (selCat === 'other') return selCatCustom || t('catOther');
  const map = { daily: 'catDaily', book: 'catBook', internet: 'catInternet' };
  return t(map[selCat] || 'catOther');
}

/* =============================================
   SDG SELECTION
============================================= */
function pickSDG(n) {
  document.querySelectorAll('.sdg-btn').forEach(b => b.classList.remove('on'));
  const btn = document.getElementById('sdg' + n);
  if (btn) btn.classList.add('on');
  selSDG = SDGS.find(s => s.n === n);
  updateSDGBanner(selSDG);
  hideErr('e-sdg');
  refreshProgress();
}

window._pickSDG = pickSDG;

function updateSDGBanner(sdg) {
  const banner = document.getElementById('sdg-banner');
  const dot    = document.getElementById('sdg-banner-dot');
  const text   = document.getElementById('sdg-banner-text');
  const lang   = getLang();
  const [, tip2] = sdg.tips[lang].split('\n');

  dot.style.background = sdg.col;
  text.innerHTML = `<strong>${t('step2Label').includes('Connect') ? 'Goal' : '목표'} ${sdg.n}: ${sdg.labels[lang]}</strong> — ${tip2}`;
  banner.style.background = hexAlpha(sdg.col, 0.09);
  banner.style.color = sdg.col;
  banner.classList.add('show');
}

/* =============================================
   MAKE CARD
============================================= */
function makeCard() {
  const name   = v('inp-name');
  const sit    = v('inp-sit');
  const action = v('inp-action');
  let ok = true;

  if (!name)              { showErr('e-name');      ok = false; } else hideErr('e-name');
  if (!selCat)            { showErr('e-cat');       ok = false; } else hideErr('e-cat');
  if (selCat === 'other' && !v('cat-other-input'))
                          { showErr('e-cat-other'); ok = false; } else hideErr('e-cat-other');
  if (!sit)               { showErr('e-sit');       ok = false; } else hideErr('e-sit');
  if (!selSDG)            { showErr('e-sdg');       ok = false; } else hideErr('e-sdg');
  if (!action)            { showErr('e-action');    ok = false; } else hideErr('e-action');

  if (!ok) { showToast('⚠️', t('toastValidationFail')); return; }

  if (selCat === 'other') selCatCustom = v('cat-other-input');

  const today = new Date().toLocaleDateString(
    getLang() === 'ko' ? 'ko-KR' :
    getLang() === 'ja' ? 'ja-JP' :
    getLang() === 'id' ? 'id-ID' : 'en-US',
    { year:'numeric', month:'long', day:'numeric' }
  );

  const catLabel   = getCatDisplay();
  const sdgLabel   = selSDG.labels[getLang()];
  const actionLbl  = t('cardActionLabel');
  const brand      = t('cardBrand');
  const bg1 = hexAlpha(selSDG.col, 0.10);
  const bg2 = hexAlpha(selSDG.col, 0.04);

  const cpw = document.getElementById('cpw');
  cpw.classList.add('has-card');
  cpw.innerHTML = `
    <div class="insight-card" id="icard" style="
      background: linear-gradient(135deg, ${bg1} 0%, ${bg2} 100%);
      border-left: 5px solid ${selSDG.col};
    ">
      <div class="ic-deco" style="
        background:${selSDG.col}; opacity:.12;
        top:-36px; right:-36px; width:130px; height:130px;"></div>
      <div class="ic-deco" style="
        background:${selSDG.col}; opacity:.08;
        bottom:-24px; left:-24px; width:90px; height:90px;"></div>

      <div class="ic-top">
        <div class="ic-sdg-pill" style="background:${selSDG.col}">
          <span class="ic-sdg-num">${selSDG.n}</span>
          ${esc(sdgLabel)}
        </div>
        <span class="ic-cat" style="
          background:${hexAlpha(selSDG.col,.12)};
          color:${selSDG.col}">${esc(catLabel)}</span>
      </div>

      <p class="ic-situation">"${esc(sit)}"</p>
      <p class="ic-action-label">${esc(actionLbl)}</p>
      <div class="ic-action">${esc(action)}</div>

      <div class="ic-footer">
        <span class="ic-logo">${esc(brand)}</span>
        <span class="ic-meta">by ${esc(name)} · ${today}</span>
      </div>
    </div>`;

  cardReady = true;
  document.getElementById('btn-copy').disabled = false;
  refreshProgress();
  showToast('✨', t('toastCardDone'));
  cpw.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* =============================================
   COPY CARD
============================================= */
async function copyCard() {
  const card = document.getElementById('icard');
  if (!card) return;

  const btn = document.getElementById('btn-copy');
  btn.disabled = true;
  btn.textContent = t('btnCopying');

  try {
    const canvas = await html2canvas(card, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    canvas.toBlob(async blob => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('📋', t('toastCopied'));
      } catch {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'sdgs-master-card.png'; a.click();
        URL.revokeObjectURL(url);
        showToast('💾', t('toastDownloaded'));
      }
      btn.disabled = false;
      btn.innerHTML = t('btnCopy');
    }, 'image/png');

  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.innerHTML = t('btnCopy');
    showToast('⚠️', t('toastCopyFail'));
  }
}

/* =============================================
   PADLET — AUTO LOAD
============================================= */
function loadPadletAuto() {
  const saved = localStorage.getItem(LS_PADLET_KEY);
  const url   = saved || DEFAULT_PADLET_URL;
  embedPadlet(url);
}

function embedPadlet(rawUrl) {
  const src = rawUrl.trim();
  document.getElementById('padlet-body').innerHTML =
    `<iframe src="${esc(src)}"
      allow="camera;microphone;geolocation"
      title="Padlet"
      allowfullscreen>
    </iframe>`;
}

function openPadletNewTab() {
  const saved = localStorage.getItem(LS_PADLET_KEY);
  const url   = saved || DEFAULT_PADLET_URL;
  window.open(url, '_blank', 'noopener');
}

function toggleFullscreen() {
  const panel = document.getElementById('panel-right');
  isFullscreen = !isFullscreen;
  panel.classList.toggle('fullscreen', isFullscreen);

  const btn = document.getElementById('btn-fullscreen');
  btn.innerHTML = isFullscreen
    ? `⤡ <span data-i18n="padletExitFullscreen">${t('padletExitFullscreen')}</span>`
    : `⤢ <span data-i18n="padletFullscreen">${t('padletFullscreen')}</span>`;

  if (isFullscreen) {
    btn.style.position = 'fixed';
    btn.style.top = '12px';
    btn.style.right = '12px';
    btn.style.zIndex = '600';
    document.body.style.overflow = 'hidden';
  } else {
    btn.style.position = '';
    btn.style.top = '';
    btn.style.right = '';
    btn.style.zIndex = '';
    document.body.style.overflow = '';
  }
}

/* =============================================
   ADMIN MODE
============================================= */
function openAdminModal() {
  document.getElementById('admin-modal').classList.add('show');
  document.getElementById('admin-pw-input').value = '';
  document.getElementById('pw-err').classList.remove('show');
  document.getElementById('admin-pw-section').classList.remove('hide');
  document.getElementById('admin-settings').classList.remove('show');
  if (!adminUnlocked) {
    document.getElementById('admin-pw-input').focus();
  } else {
    showAdminSettings();
  }
}

function closeAdminModal() {
  document.getElementById('admin-modal').classList.remove('show');
}

function checkAdminPw() {
  const pw = document.getElementById('admin-pw-input').value;
  if (pw === ADMIN_PASSWORD) {
    adminUnlocked = true;
    document.getElementById('admin-badge').classList.add('show');
    showAdminSettings();
  } else {
    document.getElementById('pw-err').classList.add('show');
    document.getElementById('admin-pw-input').select();
  }
}

function showAdminSettings() {
  document.getElementById('admin-pw-section').classList.add('hide');
  document.getElementById('admin-settings').classList.add('show');
  const saved = localStorage.getItem(LS_PADLET_KEY);
  document.getElementById('admin-padlet-input').value = saved || DEFAULT_PADLET_URL;
}

function saveAdminPadlet() {
  const url = document.getElementById('admin-padlet-input').value.trim();
  if (!url) return;
  localStorage.setItem(LS_PADLET_KEY, url);
  embedPadlet(url);
  closeAdminModal();
  showToast('✅', t('adminSaved'));
}

function resetAdminPadlet() {
  localStorage.removeItem(LS_PADLET_KEY);
  document.getElementById('admin-padlet-input').value = DEFAULT_PADLET_URL;
  embedPadlet(DEFAULT_PADLET_URL);
  showToast('🔄', t('adminReset'));
}

/* =============================================
   FOOTER — SECRET ENTRY (3 clicks in 2s)
   1st/2nd click: normal link behavior (opens litt.ly in new tab)
   3rd click: preventDefault, open admin modal
============================================= */
function handleFooterClick(e) {
  footerClickCount++;
  clearTimeout(footerClickTimer);
  if (footerClickCount >= 3) {
    footerClickCount = 0;
    e.preventDefault();
    openAdminModal();
  } else {
    footerClickTimer = setTimeout(() => { footerClickCount = 0; }, 2000);
  }
}

/* =============================================
   PROGRESS INDICATOR
============================================= */
function refreshProgress() {
  const s1 = v('inp-name') && selCat &&
    (selCat !== 'other' || v('cat-other-input')) && v('inp-sit');
  const s2 = selSDG && v('inp-action');
  const s3 = cardReady;

  setPB('pb1', 'hchip1', s1, true);
  setPB('pb2', 'hchip2', s2, !!s1);
  setPB('pb3', 'hchip3', s3, !!(s1 && s2));
}

function setPB(pbId, chipId, done, active) {
  [document.getElementById(pbId), document.getElementById(chipId)].forEach(el => {
    if (!el) return;
    el.classList.remove('active', 'done');
    if (done)        el.classList.add('done');
    else if (active) el.classList.add('active');
  });
}

/* =============================================
   BIND EVENTS
============================================= */
function bindEvents() {
  // Lang buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => switchLang(btn.dataset.lang));
  });

  // Category buttons
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => pickCat(btn.dataset.key));
  });

  // "기타" custom input
  const otherInput = document.getElementById('cat-other-input');
  if (otherInput) {
    otherInput.addEventListener('input', () => {
      selCatCustom = otherInput.value.trim();
      if (selCatCustom) hideErr('e-cat-other');
      refreshProgress();
    });
  }

  // Make card button
  document.getElementById('btn-make').addEventListener('click', makeCard);

  // Copy button
  document.getElementById('btn-copy').addEventListener('click', copyCard);

  // Padlet controls
  document.getElementById('btn-padlet-newtab').addEventListener('click', openPadletNewTab);
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

  // Admin modal
  document.getElementById('btn-admin-close').addEventListener('click', closeAdminModal);
  document.getElementById('admin-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('admin-modal')) closeAdminModal();
  });
  document.getElementById('admin-pw-btn').addEventListener('click', checkAdminPw);
  document.getElementById('admin-pw-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkAdminPw();
  });
  document.getElementById('admin-save-btn').addEventListener('click', saveAdminPadlet);
  document.getElementById('admin-reset-btn').addEventListener('click', resetAdminPadlet);

  // Footer: single/double click → navigate, triple click → admin
  document.getElementById('footer-credit').addEventListener('click', e => handleFooterClick(e));

  // Live progress update
  ['inp-name', 'inp-sit', 'inp-action'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', refreshProgress);
  });

  // Keyboard: Escape closes fullscreen / modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (isFullscreen) toggleFullscreen();
      closeAdminModal();
    }
  });
}

/* =============================================
   HELPERS
============================================= */
const v = id => document.getElementById(id)?.value.trim() ?? '';

const showErr = id => document.getElementById(id)?.classList.add('show');
const hideErr = id => document.getElementById(id)?.classList.remove('show');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function showToast(icon, msg) {
  clearTimeout(toastTimer);
  const el = document.getElementById('toast');
  document.getElementById('t-icon').textContent = icon;
  document.getElementById('t-msg').textContent  = msg;
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}
