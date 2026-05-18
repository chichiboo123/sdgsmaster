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
let selMainSDG = null;
let selSubSDGs = [];
let cardReady = false;
let adminUnlocked = false;
let footerClickCount = 0;
let footerClickTimer = null;
let toastTimer = null;
let isFullscreen = false;

/* Citation modal state */
let citeCurrentTab = 'book';

/* =============================================
   INIT
============================================= */
document.addEventListener('DOMContentLoaded', () => {
  buildSDGGrid();
  applyI18n();
  loadPadletAuto();
  bindEvents();
  initResizeHandle();
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
    const aria = `${s.n}. ${esc(s.labels[lang])}`;
    const iconPath = getSdgIconPath(s.n, lang);
    return `
      <button type="button" class="sdg-btn" id="sdg${s.n}" style="background:${s.col}"
        data-sdg="${s.n}" aria-label="${aria}" aria-pressed="false">
        <span class="sdg-num">${s.n}</span>
        <span class="sdg-lbl">${esc(s.labels[lang])}</span>
        <img class="sdg-btn-icon" src="${iconPath}" alt="" aria-hidden="true"
          onerror="this.style.display='none'">
        <div class="sdg-tip" role="tooltip"><strong>${esc(t1)}</strong><br/>${esc(t2)}</div>
      </button>`;
  }).join('');
  const globalTip = document.getElementById('sdg-global-tip');

  grid.querySelectorAll('.sdg-btn').forEach(btn => {
    btn.addEventListener('click', () => pickSDG(Number(btn.dataset.sdg)));

    if (globalTip) {
      btn.addEventListener('mouseenter', () => {
        const lang = getLang();
        const n = Number(btn.dataset.sdg);
        const sdg = SDGS.find(s => s.n === n);
        if (!sdg) return;
        const [t1, t2] = sdg.tips[lang].split('\n');
        globalTip.innerHTML = `<strong>${esc(t1)}</strong><br>${esc(t2)}`;
        showGlobalTip(btn, globalTip);
      });
      btn.addEventListener('mouseleave', () => {
        globalTip.setAttribute('hidden', '');
      });
    }
  });
}

function showGlobalTip(anchor, tip) {
  const rect = anchor.getBoundingClientRect();
  const TIP_W = 180;
  const TIP_H = 68;
  const ARROW = 10;
  const MARGIN = 8;

  const showBelow = rect.bottom + ARROW + TIP_H < window.innerHeight - MARGIN;
  let top = showBelow ? rect.bottom + ARROW : rect.top - ARROW - TIP_H;
  let left = rect.left + rect.width / 2 - TIP_W / 2;

  if (left < MARGIN) left = MARGIN;
  if (left + TIP_W > window.innerWidth - MARGIN) left = window.innerWidth - TIP_W - MARGIN;

  tip.style.top = top + 'px';
  tip.style.left = left + 'px';
  tip.dataset.pos = showBelow ? 'below' : 'above';
  tip.removeAttribute('hidden');
}

/* =============================================
   UPDATE SDG BUTTON VISUAL STATES
============================================= */
function updateSDGButtons() {
  document.querySelectorAll('.sdg-btn').forEach(btn => {
    const n = Number(btn.dataset.sdg);
    btn.classList.remove('on', 'main', 'sub');
    btn.setAttribute('aria-pressed', 'false');

    if (selMainSDG && selMainSDG.n === n) {
      btn.classList.add('on', 'main');
      btn.setAttribute('aria-pressed', 'true');
    } else if (selSubSDGs.some(s => s.n === n)) {
      btn.classList.add('on', 'sub');
      btn.setAttribute('aria-pressed', 'true');
    }
  });
}

/* =============================================
   LANGUAGE SWITCHER
============================================= */
function switchLang(lang) {
  setLang(lang);
  document.documentElement.lang = lang === 'ko' ? 'ko' : lang === 'ja' ? 'ja' : lang === 'id' ? 'id' : 'en';

  const langSelect = document.getElementById('lang-select');
  if (langSelect) langSelect.value = lang;

  applyI18n();
  buildSDGGrid();

  // Re-select if was selected
  if (selMainSDG) {
    updateSDGButtons();
    updateSDGBanner(selMainSDG, selSubSDGs);
  }

  // Re-select category
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('on', b.dataset.key === getSelCatKey());
  });

  // Update cite tab labels
  updateCiteTabLabels();

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
    const on = b.dataset.key === key;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
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
   SDG SELECTION (multi: main + sub)
============================================= */
function pickSDG(n) {
  const sdg = SDGS.find(s => s.n === n);
  if (!sdg) return;

  if (selMainSDG && selMainSDG.n === n) {
    // Deselect main
    if (selSubSDGs.length > 0) {
      // Promote first sub to main
      selMainSDG = selSubSDGs.shift();
    } else {
      selMainSDG = null;
    }
  } else if (selSubSDGs.some(s => s.n === n)) {
    // Deselect this sub
    selSubSDGs = selSubSDGs.filter(s => s.n !== n);
  } else if (!selMainSDG) {
    // No main yet — set as main
    selMainSDG = sdg;
  } else {
    // Main exists — add as sub
    selSubSDGs.push(sdg);
  }

  updateSDGButtons();

  if (selMainSDG) {
    updateSDGBanner(selMainSDG, selSubSDGs);
    hideErr('e-sdg');
  } else {
    // Clear banner
    const banner = document.getElementById('sdg-banner');
    banner.classList.remove('show');
  }

  refreshProgress();
}

function updateSDGBanner(mainSdg, subSdgs = []) {
  const banner = document.getElementById('sdg-banner');
  const dot    = document.getElementById('sdg-banner-dot');
  const text   = document.getElementById('sdg-banner-text');
  const lang   = getLang();
  const [, tip2] = mainSdg.tips[lang].split('\n');

  dot.style.background = mainSdg.col;

  let html = `<strong>★ Goal ${mainSdg.n}: ${esc(mainSdg.labels[lang])}</strong> — ${esc(tip2)}`;

  if (subSdgs.length > 0) {
    html += `<div class="banner-sub-pills">`;
    subSdgs.forEach(s => {
      html += `<span class="banner-sub-pill" style="background:${s.col}">+${s.n} ${esc(s.labels[lang])}</span>`;
    });
    html += `</div>`;
  }

  text.innerHTML = html;
  banner.style.background = hexAlpha(mainSdg.col, 0.09);
  banner.style.color = mainSdg.col;
  banner.classList.add('show');
}

/* =============================================
   SDG ICON HELPERS
============================================= */
function getSdgIconPath(n, lang) {
  const base = import.meta.env.BASE_URL;
  if (lang === 'ko') {
    return `${base}sdg-icons/ko/logo-${n}_700x700.png`;
  }
  return `${base}sdg-icons/other/E-WEB-Goal-${String(n).padStart(2, '0')}.png`;
}

async function checkLocalIcon(path) {
  return new Promise(resolve => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), 2000);
    img.onload = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = path;
  });
}

/* =============================================
   SDG ICON PRELOAD (data URL for html2canvas)
============================================= */
async function preloadSdgIcon(n) {
  const lang = getLang();
  const localPath = getSdgIconPath(n, lang);
  const localOk = await checkLocalIcon(localPath);
  if (localOk) return localPath;

  const candidates = [
    `https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-${String(n).padStart(2,'0')}.jpg`,
    `https://cdn.jsdelivr.net/gh/open-sdg/sdg-translations@master/assets/img/goals/en/${n}.png`,
  ];
  for (const url of candidates) {
    const result = await new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(null), 4000);
      img.onload = () => {
        clearTimeout(timer);
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch { resolve(url); }
      };
      img.onerror = () => { clearTimeout(timer); resolve(null); };
      img.src = url;
    });
    if (result) return result;
  }
  return null;
}

/* =============================================
   MAKE CARD
============================================= */
async function makeCard() {
  const name   = v('inp-name');
  const sit    = v('inp-sit');
  const action = v('inp-action');
  let ok = true;

  if (!name)              { showErr('e-name');      ok = false; } else hideErr('e-name');
  if (!selCat)            { showErr('e-cat');       ok = false; } else hideErr('e-cat');
  if (selCat === 'other' && !v('cat-other-input'))
                          { showErr('e-cat-other'); ok = false; } else hideErr('e-cat-other');
  if (!sit)               { showErr('e-sit');       ok = false; } else hideErr('e-sit');
  if (!selMainSDG)        { showErr('e-sdg');       ok = false; } else hideErr('e-sdg');
  if (!action)            { showErr('e-action');    ok = false; } else hideErr('e-action');

  if (!ok) { showToast('⚠️', t('toastValidationFail')); return; }

  if (selCat === 'other') selCatCustom = v('cat-other-input');

  const sourceText = v('inp-source');
  const lang       = getLang();

  const today = new Date().toLocaleDateString(
    lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : lang === 'id' ? 'id-ID' : 'en-US',
    { year:'numeric', month:'long', day:'numeric' }
  );

  const catLabel  = getCatDisplay();
  const sdgLabel  = selMainSDG.labels[lang];
  const brand     = t('cardBrand');

  // Lighter background
  const bg1 = hexAlpha(selMainSDG.col, 0.05);
  const bg2 = hexAlpha(selMainSDG.col, 0.02);

  // Section label texts
  const secSDG  = lang === 'ko' ? '마스터 SDGs' : lang === 'ja' ? 'マスターSDGs' : lang === 'id' ? 'SDGs Master' : 'Master SDGs';
  const secDisc = lang === 'ko' ? '발견한 사례' : lang === 'ja' ? '発見した事例' : lang === 'id' ? 'Kasus Ditemukan' : 'Discovered Case';
  const secAct  = lang === 'ko' ? '나의 생각 & 실천' : lang === 'ja' ? 'わたしの考え' : lang === 'id' ? 'Pikiran & Tindakan' : 'My Thoughts & Actions';

  // Sub-goals pills
  let subPillsHtml = '';
  if (selSubSDGs.length > 0) {
    subPillsHtml = `<div class="ic-sub-goals">`;
    selSubSDGs.forEach(s => {
      subPillsHtml += `<span class="ic-sub-pill" style="background:${s.col}">+${s.n} ${esc(s.labels[lang])}</span>`;
    });
    subPillsHtml += `</div>`;
  }

  // Preload SDG icon
  const makeBtn = document.getElementById('btn-make');
  if (makeBtn) makeBtn.disabled = true;
  const iconSrc = await preloadSdgIcon(selMainSDG.n);
  if (makeBtn) makeBtn.disabled = false;

  const iconHtml = iconSrc
    ? `<img class="ic-sdg-icon" src="${iconSrc}" alt="SDG ${selMainSDG.n}">`
    : `<div class="ic-sdg-icon-fallback" style="background:${selMainSDG.col}"><span>${selMainSDG.n}</span></div>`;

  const cpw = document.getElementById('cpw');
  cpw.classList.add('has-card');
  cpw.innerHTML = `
    <div class="insight-card" id="icard" style="
      background: linear-gradient(160deg, ${bg1} 0%, ${bg2} 100%);
      border-top: 5px solid ${selMainSDG.col};
    ">
      <!-- ① SDG 선택 헤더 -->
      <div class="ic-header" style="border-bottom: 1px solid ${hexAlpha(selMainSDG.col, 0.18)};">
        ${iconHtml}
        <div class="ic-header-body">
          <div class="ic-section-label" style="color:${selMainSDG.col}">${esc(secSDG)}</div>
          <div class="ic-sdg-pill" style="background:${selMainSDG.col}">
            ★ <span class="ic-sdg-num">${selMainSDG.n}</span>
            ${esc(sdgLabel)}
          </div>
          ${subPillsHtml}
        </div>
      </div>

      <!-- ② 발견한 사례 -->
      <div class="ic-section" style="border-bottom: 1px solid ${hexAlpha(selMainSDG.col, 0.14)};">
        <div class="ic-section-label" style="color:${selMainSDG.col}">${esc(secDisc)}</div>
        <div class="ic-cat-chip" style="background:${hexAlpha(selMainSDG.col,.10)};color:${selMainSDG.col}">
          ${esc(catLabel)}
        </div>
        <p class="ic-situation">${toHtml(sit)}</p>
        ${sourceText ? `<p class="ic-source">${esc(sourceText)}</p>` : ''}
      </div>

      <!-- ③ 나의 생각 & 실천 -->
      <div class="ic-section">
        <div class="ic-section-label" style="color:${selMainSDG.col}">${esc(secAct)}</div>
        <div class="ic-action">${toHtml(action)}</div>
      </div>

      <!-- 푸터 -->
      <div class="ic-footer">
        <span class="ic-logo">${esc(brand)}</span>
        <span class="ic-meta">by ${esc(name)} · ${today}</span>
      </div>
    </div>`;

  cardReady = true;
  document.getElementById('card-workspace')?.classList.add('ready');
  ['btn-txt', 'btn-img'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });
  refreshProgress();
  showToast('✨', t('toastCardDone'));
  cpw.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* =============================================
   EXPORT — TXT
============================================= */
function buildTxtContent() {
  const name   = v('inp-name');
  const sit    = v('inp-sit');
  const action = v('inp-action');
  const today  = new Date().toLocaleDateString(
    getLang() === 'ko' ? 'ko-KR' :
    getLang() === 'ja' ? 'ja-JP' :
    getLang() === 'id' ? 'id-ID' : 'en-US',
    { year:'numeric', month:'long', day:'numeric' }
  );
  const lang = getLang();
  const subGoalsTxt = selSubSDGs.length > 0
    ? `\n${lang === 'ko' ? '서브 목표' : lang === 'ja' ? 'サブ目標' : lang === 'id' ? 'Tujuan Tambahan' : 'Sub Goals'}: ` +
      selSubSDGs.map(s => `SDG ${s.n} ${s.labels[lang]}`).join(', ')
    : '';
  const sourceVal = v('inp-source');
  const sourceLine = sourceVal
    ? `${lang === 'ko' ? '출처' : lang === 'ja' ? '出典' : lang === 'id' ? 'Sumber' : 'Source'}: ${sourceVal}`
    : '';

  const lines = [
    `[SDGs Master] Master Card`,
    `${'='.repeat(32)}`,
    `${lang === 'ko' ? '이름' : lang === 'ja' ? '名前' : lang === 'id' ? 'Nama' : 'Name'}: ${name}`,
    `${lang === 'ko' ? '날짜' : lang === 'ja' ? '日付' : lang === 'id' ? 'Tanggal' : 'Date'}: ${today}`,
    `${lang === 'ko' ? '발견 장소' : lang === 'ja' ? '発見場所' : lang === 'id' ? 'Tempat' : 'Where'}: ${getCatDisplay()}`,
    `SDG Goal ${selMainSDG.n}: ${selMainSDG.labels[lang]}${subGoalsTxt}`,
    ``,
    `[${lang === 'ko' ? '상황' : lang === 'ja' ? '状況' : lang === 'id' ? 'Situasi' : 'Situation'}]`,
    sit,
    ...(sourceLine ? [``, sourceLine] : []),
    ``,
    `[${lang === 'ko' ? '나의 생각 & 실천' : lang === 'ja' ? 'わたしの考え' : lang === 'id' ? 'Pikiran & Tindakan' : 'Thoughts & Actions'}]`,
    action,
    ``,
    `SDGs · ${lang === 'ko' ? '지속가능발전목표' : lang === 'ja' ? '持続可能な開発目標' : lang === 'id' ? 'Tujuan Pembangunan Berkelanjutan' : 'Sustainable Development Goals'}`,
  ];
  return lines.join('\n');
}

async function exportTxt(mode) {
  if (!selMainSDG) return;
  const content = buildTxtContent();
  if (mode === 'clipboard') {
    try {
      await navigator.clipboard.writeText(content);
      showToast('📋', t('toastTxtCopied'));
    } catch {
      showToast('⚠️', t('toastCopyFail'));
    }
  } else {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'sdgs-master-card.txt'; a.click();
    URL.revokeObjectURL(url);
    showToast('💾', t('toastTxtDownloaded'));
  }
}

/* =============================================
   EXPORT — IMAGE
============================================= */
async function exportImage(mode) {
  const card = document.getElementById('icard');
  if (!card) return;

  const btn = document.getElementById('btn-img');
  if (btn) btn.disabled = true;

  try {
    const canvas = await html2canvas(card, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    canvas.toBlob(async blob => {
      if (mode === 'clipboard') {
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
          showToast('💾', t('toastImgDownloaded'));
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'sdgs-master-card.png'; a.click();
        URL.revokeObjectURL(url);
        showToast('💾', t('toastImgDownloaded'));
      }
      if (btn) btn.disabled = false;
    }, 'image/png');

  } catch (err) {
    console.error(err);
    if (btn) btn.disabled = false;
    showToast('⚠️', t('toastCopyFail'));
  }
}

/* =============================================
   RESIZE HANDLE — click to cycle presets
============================================= */
function initResizeHandle() {
  const handle = document.getElementById('resize-handle');
  const split  = document.getElementById('split');
  if (!handle || !split) return;

  const presets = ['33%', '50%', '67%'];
  let idx = 1; // start at 50%

  handle.addEventListener('click', () => {
    idx = (idx + 1) % presets.length;
    split.style.setProperty('--left-w', presets[idx]);
    handle.dataset.preset = presets[idx];
  });
}

/* =============================================
   PADLET — AUTO LOAD
============================================= */
function loadPadletAuto() {
  const saved = localStorage.getItem(LS_PADLET_KEY);
  const url   = sanitizeUrl(saved) || DEFAULT_PADLET_URL;
  embedPadlet(url);
}

function sanitizeUrl(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  try {
    const u = new URL(s);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
  } catch { /* not a valid URL */ }
  return '';
}

function embedPadlet(rawUrl) {
  const src = sanitizeUrl(rawUrl) || DEFAULT_PADLET_URL;
  const body = document.getElementById('padlet-body');
  body.innerHTML = `
    <div class="padlet-loading" id="padlet-loading">
      <div class="padlet-spinner" aria-hidden="true"></div>
    </div>
    <iframe src="${esc(src)}"
      allow="camera;microphone;geolocation"
      title="Padlet"
      loading="lazy"
      allowfullscreen></iframe>`;
  const iframe = body.querySelector('iframe');
  const loading = body.querySelector('#padlet-loading');
  iframe.addEventListener('load', () => loading?.remove(), { once: true });
  setTimeout(() => loading?.remove(), 8000);
}

function openPadletNewTab() {
  const saved = localStorage.getItem(LS_PADLET_KEY);
  const url   = sanitizeUrl(saved) || DEFAULT_PADLET_URL;
  window.open(url, '_blank', 'noopener');
}

function toggleFullscreen() {
  const panel = document.getElementById('panel-right');
  isFullscreen = !isFullscreen;
  panel.classList.toggle('fullscreen', isFullscreen);

  const btn = document.getElementById('btn-fullscreen');
  btn.innerHTML = isFullscreen
    ? `<span class="ms">fullscreen_exit</span> <span data-i18n="padletExitFullscreen">${t('padletExitFullscreen')}</span>`
    : `<span class="ms">fullscreen</span> <span data-i18n="padletFullscreen">${t('padletFullscreen')}</span>`;

  if (isFullscreen) {
    btn.style.position = 'fixed';
    btn.style.top = '12px';
    btn.style.right = '12px';
    btn.style.zIndex = '600';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    // iOS Safari: request native fullscreen when available
    if (panel.requestFullscreen) {
      panel.requestFullscreen().catch(() => {});
    } else if (panel.webkitRequestFullscreen) {
      panel.webkitRequestFullscreen();
    }
  } else {
    btn.style.position = '';
    btn.style.top = '';
    btn.style.right = '';
    btn.style.zIndex = '';
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    }
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
  const raw = document.getElementById('admin-padlet-input').value.trim();
  const url = sanitizeUrl(raw);
  if (!url) {
    showToast('⚠️', 'https://padlet.com/... 형식의 URL을 입력해 주세요.');
    return;
  }
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
  const s1 = !!selMainSDG;
  const s2 = !!(v('inp-name') && selCat &&
    (selCat !== 'other' || v('cat-other-input')) && v('inp-sit'));
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
   HELP MODAL
============================================= */
function openHelpModal() {
  document.getElementById('help-modal').classList.add('show');
  switchHelpTab('guide');
}

function closeHelpModal() {
  document.getElementById('help-modal').classList.remove('show');
}

function switchHelpTab(tab) {
  ['guide', 'example'].forEach(id => {
    document.getElementById(`help-tab-${id}`)?.classList.toggle('active', id === tab);
    const panel = document.getElementById(`help-panel-${id}`);
    if (panel) panel.style.display = id === tab ? '' : 'none';
  });
}

/* =============================================
   CITATION MODAL
============================================= */
function openCiteModal() {
  document.getElementById('cite-modal').classList.add('show');
  updateCiteTabLabels();
}

function closeCiteModal() {
  document.getElementById('cite-modal').classList.remove('show');
}

function switchCiteTab(type) {
  citeCurrentTab = type;

  // Update tab buttons
  document.querySelectorAll('.cite-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === type);
  });

  // Show/hide forms
  ['book', 'web', 'news'].forEach(t => {
    const form = document.getElementById('cite-form-' + t);
    if (form) form.style.display = t === type ? 'block' : 'none';
  });

  // Hide result on tab switch
  const result = document.getElementById('cite-result');
  if (result) result.style.display = 'none';
}

function updateCiteTabLabels() {
  const tabs = [
    { id: 'cite-tab-book', icon: 'menu_book', key: 'citeTabBook' },
    { id: 'cite-tab-web',  icon: 'language',  key: 'citeTabWeb' },
    { id: 'cite-tab-news', icon: 'article',   key: 'citeTabNews' },
  ];
  tabs.forEach(({ id, icon, key }) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<span class="ms">${icon}</span> ${t(key)}`;
  });
}

function generateCite() {
  const lang = getLang();
  let result = '';

  if (citeCurrentTab === 'book') {
    const author    = document.getElementById('cite-book-author')?.value.trim() || '';
    const year      = document.getElementById('cite-book-year')?.value.trim() || '';
    const title     = document.getElementById('cite-book-title')?.value.trim() || '';
    const publisher = document.getElementById('cite-book-publisher')?.value.trim() || '';
    const page      = document.getElementById('cite-book-page')?.value.trim() || '';

    if (lang === 'ko' || lang === 'ja') {
      const titleWrapped = lang === 'ko' ? `『${title}』` : `『${title}』`;
      result = `${author}. (${year}). ${titleWrapped}. ${publisher}`;
      if (page) result += `, p.${page}`;
      result += '.';
    } else if (lang === 'id') {
      result = `${author}. (${year}). ${title}. ${publisher}`;
      if (page) result += `, hal.${page}`;
      result += '.';
    } else {
      result = `${author}. (${year}). ${title}. ${publisher}`;
      if (page) result += `, p.${page}`;
      result += '.';
    }
  } else if (citeCurrentTab === 'web') {
    const siteName = document.getElementById('cite-web-name')?.value.trim() || '';
    const dateVal  = document.getElementById('cite-web-date')?.value || '';
    const url      = document.getElementById('cite-web-url')?.value.trim() || '';

    let dateStr = dateVal;
    if (dateVal) {
      const d = new Date(dateVal + 'T00:00:00');
      if (!isNaN(d)) {
        if (lang === 'ko') {
          dateStr = `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
        } else if (lang === 'ja') {
          dateStr = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
        } else if (lang === 'id') {
          const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
          dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        } else {
          const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          dateStr = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        }
      }
    }

    if (lang === 'ko') {
      result = `${siteName}. (접속일: ${dateStr}). ${url}.`;
    } else if (lang === 'ja') {
      result = `${siteName}. (アクセス日: ${dateStr}). ${url}.`;
    } else if (lang === 'id') {
      result = `${siteName}. (Diakses: ${dateStr}). ${url}.`;
    } else {
      result = `${siteName}. (Accessed: ${dateStr}). ${url}.`;
    }
  } else if (citeCurrentTab === 'news') {
    const reporter = document.getElementById('cite-news-reporter')?.value.trim() || '';
    const dateVal  = document.getElementById('cite-news-date')?.value || '';
    const title    = document.getElementById('cite-news-title')?.value.trim() || '';
    const source   = document.getElementById('cite-news-source')?.value.trim() || '';

    let dateStr = dateVal;
    if (dateVal) {
      const d = new Date(dateVal + 'T00:00:00');
      if (!isNaN(d)) {
        if (lang === 'ko') {
          dateStr = `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
        } else if (lang === 'ja') {
          dateStr = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
        } else if (lang === 'id') {
          const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
          dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        } else {
          const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          dateStr = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        }
      }
    }

    if (lang === 'ko') {
      result = `${reporter}. (${dateStr}). 「${title}」. ${source}.`;
    } else if (lang === 'ja') {
      result = `${reporter}. (${dateStr}). 「${title}」. ${source}.`;
    } else {
      result = `${reporter}. (${dateStr}). "${title}." ${source}.`;
    }
  }

  const resultEl = document.getElementById('cite-result');
  const resultTextEl = document.getElementById('cite-result-text');
  if (resultEl && resultTextEl) {
    resultTextEl.textContent = result;
    resultEl.style.display = 'block';
  }
}

async function copyCite() {
  const text = document.getElementById('cite-result-text')?.textContent || '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('📋', t('citeCopied'));
  } catch {
    showToast('⚠️', t('toastCopyFail'));
  }
}

/* =============================================
   BIND EVENTS
============================================= */
function bindEvents() {
  // Lang dropdown
  document.getElementById('lang-select')?.addEventListener('change', e => switchLang(e.target.value));

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

  // Export dropdown toggles
  document.getElementById('btn-txt')?.addEventListener('click', e => {
    e.stopPropagation();
    toggleExportDd('txt');
  });
  document.getElementById('btn-img')?.addEventListener('click', e => {
    e.stopPropagation();
    toggleExportDd('img');
  });

  // Export dropdown items
  document.getElementById('btn-txt-copy')?.addEventListener('click', () => { closeExportDds(); exportTxt('clipboard'); });
  document.getElementById('btn-txt-dl')?.addEventListener('click',   () => { closeExportDds(); exportTxt('download'); });
  document.getElementById('btn-img-copy')?.addEventListener('click', () => { closeExportDds(); exportImage('clipboard'); });
  document.getElementById('btn-img-dl')?.addEventListener('click',   () => { closeExportDds(); exportImage('download'); });

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => closeExportDds());

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
      closeCiteModal();
      closeHelpModal();
    }
  });

  // Help modal
  document.getElementById('btn-help')?.addEventListener('click', openHelpModal);
  document.getElementById('btn-help-close')?.addEventListener('click', closeHelpModal);
  document.getElementById('help-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('help-modal')) closeHelpModal();
  });

  // Help tabs
  document.getElementById('help-tab-guide')?.addEventListener('click', () => switchHelpTab('guide'));
  document.getElementById('help-tab-example')?.addEventListener('click', () => switchHelpTab('example'));

  // Citation modal
  document.getElementById('btn-cite')?.addEventListener('click', openCiteModal);
  document.getElementById('btn-cite-close')?.addEventListener('click', closeCiteModal);
  document.getElementById('cite-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('cite-modal')) closeCiteModal();
  });

  // Citation tabs
  document.querySelectorAll('.cite-tab').forEach(btn => {
    btn.addEventListener('click', () => switchCiteTab(btn.dataset.tab));
  });

  // Citation generate & copy
  document.getElementById('btn-cite-generate')?.addEventListener('click', generateCite);
  document.getElementById('btn-cite-copy')?.addEventListener('click', copyCite);

  // Auto-grow textareas
  document.querySelectorAll('textarea.f-textarea').forEach(ta => {
    const grow = () => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    };
    ta.addEventListener('input', grow);
    grow();
  });
}

/* =============================================
   EXPORT DROPDOWN
============================================= */
function toggleExportDd(type) {
  const dd    = document.getElementById(`export-${type}-dd`);
  const other = document.getElementById(`export-${type === 'txt' ? 'img' : 'txt'}-dd`);
  if (!dd) return;
  const isOpen = dd.classList.contains('open');
  if (other) other.classList.remove('open');
  dd.classList.toggle('open', !isOpen);
}

function closeExportDds() {
  document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('open'));
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

function toHtml(s) {
  return esc(s).replace(/\n/g, '<br>');
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
