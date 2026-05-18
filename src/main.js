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
    return `
      <button type="button" class="sdg-btn" id="sdg${s.n}" style="background:${s.col}"
        data-sdg="${s.n}" aria-label="${aria}" aria-pressed="false">
        <span class="sdg-num">${s.n}</span>
        <span class="sdg-lbl">${esc(s.labels[lang])}</span>
        <div class="sdg-tip" role="tooltip"><strong>${esc(t1)}</strong><br/>${esc(t2)}</div>
      </button>`;
  }).join('');
  grid.querySelectorAll('.sdg-btn').forEach(btn => {
    btn.addEventListener('click', () => pickSDG(Number(btn.dataset.sdg)));
  });
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

  document.querySelectorAll('.lang-btn').forEach(b => {
    const active = b.dataset.lang === lang;
    b.classList.toggle('active', active);
    b.setAttribute('aria-checked', active ? 'true' : 'false');
  });

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
  if (!selMainSDG)        { showErr('e-sdg');       ok = false; } else hideErr('e-sdg');
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
  const sdgLabel   = selMainSDG.labels[getLang()];
  const actionLbl  = t('cardActionLabel');
  const brand      = t('cardBrand');
  const bg1 = hexAlpha(selMainSDG.col, 0.10);
  const bg2 = hexAlpha(selMainSDG.col, 0.04);

  // Build sub-goals pills HTML for card
  let subPillsHtml = '';
  if (selSubSDGs.length > 0) {
    subPillsHtml = `<div class="ic-sub-goals">`;
    selSubSDGs.forEach(s => {
      subPillsHtml += `<span class="ic-sub-pill" style="background:${s.col}">+${s.n} ${esc(s.labels[getLang()])}</span>`;
    });
    subPillsHtml += `</div>`;
  }

  const cpw = document.getElementById('cpw');
  cpw.classList.add('has-card');
  cpw.innerHTML = `
    <div class="insight-card" id="icard" style="
      background: linear-gradient(135deg, ${bg1} 0%, ${bg2} 100%);
      border-left: 5px solid ${selMainSDG.col};
    ">
      <div class="ic-deco" style="
        background:${selMainSDG.col}; opacity:.12;
        top:-36px; right:-36px; width:130px; height:130px;"></div>
      <div class="ic-deco" style="
        background:${selMainSDG.col}; opacity:.08;
        bottom:-24px; left:-24px; width:90px; height:90px;"></div>

      <div class="ic-top">
        <div class="ic-top-left">
          <div class="ic-sdg-pill" style="background:${selMainSDG.col}">
            <span class="ic-sdg-num">${selMainSDG.n}</span>
            ${esc(sdgLabel)}
          </div>
          ${subPillsHtml}
        </div>
        <span class="ic-cat" style="
          background:${hexAlpha(selMainSDG.col,.12)};
          color:${selMainSDG.col}">${esc(catLabel)}</span>
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
  ['btn-txt-copy', 'btn-txt-dl', 'btn-img-copy', 'btn-img-dl'].forEach(id => {
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
  const lines = [
    `[SDGs Master] Insight Card`,
    `${'='.repeat(32)}`,
    `${lang === 'ko' ? '이름' : lang === 'ja' ? '名前' : lang === 'id' ? 'Nama' : 'Name'}: ${name}`,
    `${lang === 'ko' ? '날짜' : lang === 'ja' ? '日付' : lang === 'id' ? 'Tanggal' : 'Date'}: ${today}`,
    `${lang === 'ko' ? '발견 장소' : lang === 'ja' ? '発見場所' : lang === 'id' ? 'Tempat' : 'Where'}: ${getCatDisplay()}`,
    `SDG Goal ${selMainSDG.n}: ${selMainSDG.labels[lang]}${subGoalsTxt}`,
    ``,
    `[${lang === 'ko' ? '상황' : lang === 'ja' ? '状況' : lang === 'id' ? 'Situasi' : 'Situation'}]`,
    sit,
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

  const btnId = mode === 'clipboard' ? 'btn-img-copy' : 'btn-img-dl';
  const btn   = document.getElementById(btnId);
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
   RESIZE HANDLE
============================================= */
function initResizeHandle() {
  const handle = document.getElementById('resize-handle');
  const split  = document.getElementById('split');
  if (!handle || !split) return;

  let dragging = false;

  function onMove(clientX) {
    const rect = split.getBoundingClientRect();
    const pct  = Math.min(Math.max((clientX - rect.left) / rect.width * 100, 20), 80);
    split.style.setProperty('--left-w', `${pct.toFixed(1)}%`);
  }

  handle.addEventListener('mousedown', e => {
    dragging = true;
    handle.classList.add('dragging');
    document.body.style.cursor    = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    onMove(e.clientX);
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor    = '';
    document.body.style.userSelect = '';
  });

  handle.addEventListener('touchstart', e => {
    dragging = true;
    handle.classList.add('dragging');
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    onMove(e.touches[0].clientX);
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
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
  const s1 = v('inp-name') && selCat &&
    (selCat !== 'other' || v('cat-other-input')) && v('inp-sit');
  const s2 = selMainSDG && v('inp-action');
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
  const tabBook = document.getElementById('cite-tab-book');
  const tabWeb  = document.getElementById('cite-tab-web');
  const tabNews = document.getElementById('cite-tab-news');
  if (tabBook) tabBook.innerHTML = t('citeTabBook');
  if (tabWeb)  tabWeb.innerHTML  = t('citeTabWeb');
  if (tabNews) tabNews.innerHTML = t('citeTabNews');
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

  // Export buttons
  document.getElementById('btn-txt-copy')?.addEventListener('click', () => exportTxt('clipboard'));
  document.getElementById('btn-txt-dl')?.addEventListener('click',   () => exportTxt('download'));
  document.getElementById('btn-img-copy')?.addEventListener('click', () => exportImage('clipboard'));
  document.getElementById('btn-img-dl')?.addEventListener('click',   () => exportImage('download'));

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
    }
  });

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
