/* =========================================================================
   틀편집 스튜디오 2.0 — app.js
   만들기 · 틀 · 분석 · 올리기 (하단 4탭) · IndexedDB 자동 저장 · PWA
   ========================================================================= */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const fmt = (s) => {
    if (!Number.isFinite(s) || s <= 0) return '0:00';
    const v = Math.round(s);
    return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
  };
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const once = (el, ev) => new Promise((r) => el.addEventListener(ev, r, { once: true }));

  /* ---------------------------------------------------------------- 상태 */
  const SAMPLE_DEAL = { name: '무선 미니 마사지건', oldP: '$359', newP: '$169', off: '53', badge: '블프 역대가', keyword: '링크' };
  const VOICES = {
    chagal: { name: '샤갈(애덤) 톤', rate: 1.4, pitch: 0.82, note: '정보형 1.4배속 · 낮고 빠른 톤' },
    calm: { name: '차분 나레이션', rate: 1.1, pitch: 1.0, note: '브이로그 1.1배속 · 담백한 톤' },
    hype: { name: '하이텐션 리액션', rate: 1.5, pitch: 1.18, note: '리뷰 1.5배속 · 들뜬 톤' },
  };
  const BGMS = [
    { id: 'none', name: '없음', desc: '배경음악 없이 원음·보이스만' },
    { id: 'chill', name: '로파이 칠', desc: '자취·리빙 브이로그 · 차분한 붐뱁', file: 'bgm_chill.mp3' },
    { id: 'upbeat', name: '경쾌 리뷰', desc: '언박싱·직구 리뷰 · 통통 튀는 비트', file: 'bgm_upbeat.mp3' },
    { id: 'vlog', name: '감성 피아노', desc: '홈 루틴·인테리어 · 따뜻한 피아노', file: 'bgm_vlog.mp3' },
    { id: 'hook', name: '정보형 텐션', desc: '30만 정보형 · 임팩트 비트', file: 'bgm_hook.mp3' },
  ];

  const state = {
    clips: [],
    selectedId: 'info30',
    filter: 'all',
    arcFilter: 'all',
    previewIdx: 0,
    previewT: 0,
    rendering: false,
    result: null,
    photoLen: 15,
    voicePreset: 'chagal',
    voiceRate: 1,
    voiceVol: 1,
    voiceBuffer: null,
    voiceName: '',
    bgm: 'chill',
    bgmVol: 0.25,
    audioCtx: null,
    ytSigned: false,
    analysis: null,
    mine: [],
    pendingCaptions: {},
    autoCaptions: [],
    saveTimer: null,
  };
  const dirty = { hook: false, title: false, price: false, items: false, channel: false, script: false, deal: false };
  const selected = () => TEMPLATES.find((t) => t.id === state.selectedId) || TEMPLATES[0];
  const activeClip = () => state.clips[state.previewIdx] || null;
  const clipLines = (clip) => String((clip && clip.captions) || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const clipSeconds = (c) => Math.max(0.1, (c.end != null ? c.end : c.duration || 0) - (c.start || 0));
  const totalDuration = () => state.clips.reduce((s, c) => s + clipSeconds(c), 0);

  function toast(msg, ms = 3200) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.h);
    toast.h = setTimeout(() => { t.hidden = true; }, ms);
  }

  /* ---------------------------------------------------------------- 탭 */
  const VIEWS = ['create', 'templates', 'analyze', 'publish'];
  let view = 'create';
  function setView(v) {
    view = v;
    VIEWS.forEach((name) => { $(`view-${name}`).hidden = name !== v; });
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === v)));
    $('dock').parentElement.hidden = v !== 'create';
    window.scrollTo({ top: 0 });
    if (v === 'publish') refreshPublish();
    if (v === 'templates') refreshCards();
    if (v === 'analyze') { renderMine(); syncPrompt(); }
    if (v === 'create') refreshCards();
  }
  document.querySelectorAll('.tab').forEach((b) => { b.onclick = () => setView(b.dataset.view); });
  document.querySelectorAll('.stepchip').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('.stepchip').forEach((x) => x.classList.toggle('on', x === b));
      const el = $(b.dataset.go);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
  $('btnGoTemplates').onclick = () => setView('templates');

  /* ---------------------------------------------------------------- 텍스트/딜 */
  const readText = () => ({
    hook: $('fHook').value,
    title: $('fTitle').value,
    price: $('fPrice').value,
    items: $('fItems').value,
    channel: $('fChannel').value,
  });
  const itemLines = () => String($('fItems').value || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const readDeal = () => ({
    name: $('fName').value.trim(),
    oldP: $('fOld').value.trim(),
    newP: $('fNew').value.trim(),
    off: $('fOff').value.trim(),
    badge: $('fBadge').value.trim(),
    keyword: $('fKeyword').value.trim() || '링크',
    hook: $('fHook').value,
    channel: $('fChannel').value,
  });
  function dealFor(t) {
    const d = readDeal();
    const s = (t.sample && t.sample) || {};
    return {
      name: d.name || (dirty.deal ? '' : SAMPLE_DEAL.name),
      oldP: d.oldP || (dirty.deal ? '' : SAMPLE_DEAL.oldP),
      newP: d.newP || (dirty.deal ? '' : SAMPLE_DEAL.newP),
      off: d.off || (dirty.deal ? '' : SAMPLE_DEAL.off),
      badge: d.badge || (dirty.deal ? '' : SAMPLE_DEAL.badge),
      keyword: d.keyword,
      hook: d.hook || s.hook || '',
      channel: d.channel,
    };
  }
  function autoOff() {
    const o = parseFloat(String($('fOld').value).replace(/[^0-9.]/g, ''));
    const n = parseFloat(String($('fNew').value).replace(/[^0-9.]/g, ''));
    if (!isFinite(o) || !isFinite(n) || o <= 0 || n <= 0 || n >= o) return;
    $('fOff').value = String(Math.round((1 - n / o) * 100));
  }
  ['fOld', 'fNew'].forEach((id) => {
    $(id).addEventListener('input', () => { dirty.deal = true; autoOff(); renderNow(); scheduleSave(); });
  });
  ['fHook', 'fTitle', 'fPrice', 'fItems', 'fChannel', 'fName', 'fOff', 'fBadge', 'fKeyword', 'fScript'].forEach((id) => {
    $(id).addEventListener('input', () => {
      const k = id.replace('f', '').toLowerCase();
      if (k in dirty) dirty[k] = true;
      if (['name', 'off', 'badge', 'keyword'].includes(k)) dirty.deal = true;
      renderNow(); scheduleSave(); syncCaption();
    });
  });

  /* ---------------------------------------------------------------- 글씨체 */
  const FONT_KEY = 'studio2.customFonts.v1';
  const FONT_BUDGET = 3.5 * 1024 * 1024;
  let fontSeq = 0;
  const bytesToB64 = (buf) => {
    const bytes = new Uint8Array(buf);
    const CH = 0x8000;
    let out = '';
    for (let i = 0; i < bytes.length; i += CH) out += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(out);
  };
  const b64ToBuffer = (b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  };
  const cleanFontName = (filename) => String(filename || '내 폰트')
    .replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 22) || '내 폰트';
  const nextFamily = () => `Studio2Font${Date.now().toString(36)}${(fontSeq += 1)}`;
  async function makeCustomFont(name, family, buf) {
    const face = new FontFace(family, buf, { weight: '100 900', style: 'normal' });
    await face.load();
    document.fonts.add(face);
    return { id: 'custom-' + family.toLowerCase(), family, name, sample: '내 폰트 Aa 가나다', custom: true, face, data: buf };
  }
  function persistCustomFonts() {
    const custom = FONTS.filter((f) => f.custom);
    const keep = [];
    let used = 0;
    custom.forEach((f) => {
      if (!f.b64) f.b64 = bytesToB64(f.data);
      const cost = f.b64.length + 160;
      if (used + cost > FONT_BUDGET) { f.persisted = false; return; }
      used += cost; f.persisted = true;
      keep.push({ name: f.name, family: f.family, data: f.b64 });
    });
    try {
      if (keep.length) localStorage.setItem(FONT_KEY, JSON.stringify(keep));
      else localStorage.removeItem(FONT_KEY);
    } catch { custom.forEach((f) => { f.persisted = false; }); }
    return { saved: keep.length, lost: custom.filter((f) => !f.persisted).length };
  }
  async function restoreCustomFonts() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(FONT_KEY) || '[]'); } catch { list = []; }
    if (!Array.isArray(list) || !list.length) return 0;
    let n = 0;
    for (const item of list) {
      try {
        const f = await makeCustomFont(item.name, item.family, b64ToBuffer(item.data));
        f.persisted = true; f.b64 = item.data; FONTS.push(f); n += 1;
      } catch { /* 무시 */ }
    }
    return n;
  }
  function fontTag(f) {
    if (f.custom) return f.persisted ? '내 폰트 · 기억됨' : '내 폰트 · 이번만';
    return f.badge || '추천';
  }
  function renderFonts() {
    const wrap = $('fontList');
    wrap.innerHTML = '';
    FONTS.forEach((f) => {
      const cell = document.createElement('div');
      cell.className = 'fitem';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fchip';
      b.setAttribute('aria-pressed', String(UI.font === f.id));
      b.innerHTML = `<span class="sample" style="font-family:'${f.family}','Noto Sans KR',sans-serif;font-weight:${UI.weight}">${esc(f.sample)}</span>
        <span class="fname">${esc(f.name)}</span>
        <span class="fnote${f.top ? ' best' : ''}">${esc(fontTag(f))}</span>`;
      b.onclick = async () => {
        UI.font = f.id;
        refreshSans();
        renderFonts();
        await ensureFont(f.id);
        renderNow();
        toast(`${f.name} 글씨체로 그려요`);
        scheduleSave();
      };
      cell.appendChild(b);
      if (f.custom) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'fdel';
        del.setAttribute('aria-label', `${f.name} 지우기`);
        del.textContent = '✕';
        del.onclick = (e) => {
          e.stopPropagation();
          const i = FONTS.indexOf(f);
          if (i < 0) return;
          try { document.fonts.delete(f.face); } catch { /* 무시 */ }
          FONTS.splice(i, 1);
          if (UI.font === f.id) UI.font = 'pretendard';
          persistCustomFonts(); renderFonts(); refreshSans(); renderNow();
          toast(`${f.name} 폰트를 뺐어요`, 2200);
        };
        cell.appendChild(del);
      }
      wrap.appendChild(cell);
    });
  }
  $('fontInput').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    $('fontNote').textContent = '폰트 파일 여는 중…';
    const added = []; let failed = 0;
    for (const file of files) {
      try {
        const buf = await file.arrayBuffer();
        added.push(await makeCustomFont(cleanFontName(file.name), nextFamily(), buf));
        FONTS.push(added[added.length - 1]);
      } catch { failed += 1; }
    }
    const res = added.length ? persistCustomFonts() : { lost: 0 };
    if (added.length) { UI.font = added[added.length - 1].id; await ensureFont(UI.font); }
    renderFonts(); refreshSans(); renderNow();
    $('fontNote').textContent = '가진 폰트 파일(ttf·otf·woff2)을 올리면 바로 그 글씨로 그려요';
    const bits = [];
    if (added.length) bits.push(`${added.map((f) => f.name).join('·')} 글씨체로 그려요`);
    if (failed) bits.push(`${failed}개는 열지 못했어요 (ttf·otf·woff2만 돼요)`);
    if (added.length && res.lost) bits.push('파일이 커서 새로고침하면 이번만 써요');
    toast(bits.join(' · '), 4600);
    scheduleSave();
  });

  /* ---------------------------------------------------------------- 두께·자간·스타일 */
  function paintWeight() {
    document.querySelectorAll('#weightRow .segbtn').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.weight) === UI.weight)));
  }
  function paintTrack() {
    $('trackRange').value = String(UI.spacing);
    $('trackOut').textContent = `${UI.spacing > 0 ? '+' : ''}${UI.spacing}px`;
    document.querySelectorAll('#trackChips .segbtn').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.track) === UI.spacing)));
  }
  async function setWeight(w) {
    if (!WEIGHT_CHOICES.includes(w)) return;
    UI.weight = w; paintWeight(); renderFonts(); renderNow();
    await ensureFont(UI.font); renderNow(); scheduleSave();
  }
  function setSpacing(v) {
    UI.spacing = clamp(Math.round(Number(v) || 0), -4, 14);
    paintTrack(); renderNow(); scheduleSave();
  }
  document.querySelectorAll('#weightRow .segbtn').forEach((b) => { b.onclick = () => setWeight(Number(b.dataset.weight)); });
  document.querySelectorAll('#trackChips .segbtn').forEach((b) => { b.onclick = () => setSpacing(Number(b.dataset.track)); });
  $('trackRange').addEventListener('input', (e) => setSpacing(e.target.value));
  document.querySelectorAll('#capStyle .segbtn').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('#capStyle .segbtn').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      UI.captionStyle = b.dataset.style; renderNow(); scheduleSave();
    };
  });
  document.querySelectorAll('#accentRow .swatch').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('#accentRow .swatch').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      UI.accent = b.dataset.accent; renderNow(); scheduleSave();
    };
  });

  /* 참고 릴스 3종 — 한 번에 폰트·자간·자막 스타일·BGM을 맞춥니다 */
  async function applyRefStyle(kind) {
    if (kind === 'stretch') {
      UI.font = 'gaegu'; UI.weight = 700; UI.spacing = 10;
      UI.captionStyle = 'pinkPuff'; UI.accent = 'pink';
      await ensureFont(UI.font); refreshSans();
      toast('파스텔 손글씨 · 개구체 + 자간 +10px + 핑크+흰 테두리', 4200);
    } else if (kind === 'bold') {
      UI.font = 'gmarket'; UI.weight = 900; UI.spacing = 0;
      UI.captionStyle = 'boldOutline'; UI.accent = 'yellow';
      const tpl = TEMPLATES.find((t) => t.id === 'bold-outline');
      if (tpl) selectTemplate(tpl, true);
      if (!$('fHook').value.trim()) $('fHook').value = '반으로 쪼개봤어요';
      await ensureFont(UI.font); refreshSans();
      toast('굵은 외곽선 고딕 · 상단 두 줄 + 두꺼운 검정 테두리', 4200);
    } else if (kind === 'closeup') {
      UI.font = 'jua'; UI.weight = 700; UI.spacing = 2;
      UI.captionStyle = 'outline'; UI.accent = 'lime';
      const tpl = TEMPLATES.find((t) => t.id === 'minimal-closeup');
      if (tpl) selectTemplate(tpl, true);
      state.bgm = 'hook'; state.bgmVol = Math.max(state.bgmVol, 0.3);
      state.voicePreset = 'hype'; state.voiceRate = VOICES.hype.rate;
      await ensureFont(UI.font); refreshSans(); renderBgm();
      toast('무자막 클로즈업 · 자막 없이 제품만 + 줌인 + 팝 BGM(hook)', 4200);
    }
    paintUi(); renderNow(); scheduleSave();
  }
  if ($('btnRefStretch')) $('btnRefStretch').onclick = () => applyRefStyle('stretch');
  if ($('btnRefBold')) $('btnRefBold').onclick = () => applyRefStyle('bold');
  if ($('btnRefCloseup')) $('btnRefCloseup').onclick = () => applyRefStyle('closeup');
  function paintUi() {
    paintWeight(); paintTrack();
    document.querySelectorAll('#capStyle .segbtn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.style === UI.captionStyle)));
    document.querySelectorAll('#accentRow .swatch').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.accent === UI.accent)));
    $('btnSafe').setAttribute('aria-pressed', String(UI.safe));
    $('btnSafe').textContent = UI.safe ? '세이프존 끄기' : '세이프존';
    document.querySelectorAll('#voiceChips .chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.voice === state.voicePreset)));
    $('voiceRate').value = String(state.voiceRate);
    $('voiceRateOut').textContent = `${Number(state.voiceRate).toFixed(2).replace(/0$/, '')}x`;
    $('voiceVol').value = String(state.voiceVol);
    $('voiceVolOut').textContent = `${Math.round(state.voiceVol * 100)}%`;
    $('bgmVol').value = String(state.bgmVol);
    $('bgmVolOut').textContent = `${Math.round(state.bgmVol * 100)}%`;
    refreshSans();
    renderFonts();
  }
  $('btnSafe').onclick = () => {
    UI.safe = !UI.safe;
    paintUi(); renderNow();
    toast(UI.safe ? '세이프존: 인스타 UI에 가려지는 곳을 표시해요 (저장 영상엔 안 들어가요)' : '세이프존을 껐어요', 2600);
    scheduleSave();
  };

  /* ---------------------------------------------------------------- 클립 */
  function clipPlaceholder() {
    if (selected().id === 'label-item') return '라벨 | 자막 · 예: 2. 룸 슬리퍼 | 발이 편한 슬리퍼';
    return '이 영상에서 나올 자막 · 줄바꿈하면 순서대로';
  }
  const autoGrow = (ta) => {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(180, Math.max(38, ta.scrollHeight + 2))}px`;
  };
  function renderClips() {
    const wrap = $('clips');
    wrap.innerHTML = '';
    $('mediaCount').textContent = state.clips.length ? `클립 ${state.clips.length}개` : '영상 또는 사진 2~6장';
    if (!state.clips.length) {
      $('clipTotal').textContent = '';
      $('pick').classList.remove('has');
      return;
    }
    $('pick').classList.add('has');
    $('pickTitle').textContent = '영상 · 사진 더 추가';
    const ph = clipPlaceholder();
    state.clips.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'clip' + (i === state.previewIdx ? ' active' : '');
      const thumbStyle = c.thumb ? ` style="background-image:url('${c.thumb}')"` : '';
      const kindTag = c.kind === 'photo' ? '사진' : '영상';
      const trim = c.kind === 'video'
        ? `<div class="trimrow"><label>시작<input type="number" data-trim="start" min="0" step="0.1" value="${c.start.toFixed(1)}"></label><label>끝<input type="number" data-trim="end" min="0" step="0.1" value="${c.end.toFixed(1)}"></label></div>`
        : '';
      row.innerHTML = `
        <span class="num">${i + 1}</span>
        <span class="thumb"${thumbStyle}></span>
        <div class="body">
          <div class="top">
            <span class="cname">${esc(c.name)} · ${kindTag}</span>
            <span class="cdur">${fmt(clipSeconds(c))}</span>
            <button class="mini-btn" data-move="-1" type="button" aria-label="위로"${i === 0 ? ' disabled' : ''}>↑</button>
            <button class="mini-btn" data-move="1" type="button" aria-label="아래로"${i === state.clips.length - 1 ? ' disabled' : ''}>↓</button>
            <button class="mini-btn del" data-del type="button" aria-label="삭제">✕</button>
          </div>
          ${trim}
          <textarea rows="2" placeholder="${ph}">${esc(c.captions)}</textarea>
        </div>`;
      const ta = row.querySelector('textarea');
      ta.addEventListener('input', (e) => { c.captions = e.target.value; autoGrow(ta); scheduleSave(); });
      requestAnimationFrame(() => autoGrow(ta));
      row.querySelector('[data-del]').addEventListener('click', () => removeClip(c));
      row.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', () => moveClip(c, Number(b.dataset.move))));
      row.querySelectorAll('[data-trim]').forEach((inp) => {
        inp.addEventListener('change', () => {
          const v = Math.max(0, Number(inp.value) || 0);
          if (inp.dataset.trim === 'start') c.start = Math.min(v, c.end - 0.2);
          else c.end = Math.max(c.start + 0.2, Math.min(v, c.duration));
          renderClips(); renderNow(); scheduleSave();
        });
      });
      row.addEventListener('click', (e) => {
        if (e.target.closest('textarea,input,button')) return;
        state.previewIdx = i; state.previewT = 0; markActive(); previewPlay(); renderNow();
      });
      wrap.appendChild(row);
    });
    $('clipTotal').textContent = `클립 ${state.clips.length}개 · 총 ${fmt(totalDuration())}${state.clips.length > 1 ? ' · 이 순서대로 이어 붙여요' : ''}`;
    checkLength();
  }
  function markActive() {
    document.querySelectorAll('#clips .clip').forEach((el, i) => el.classList.toggle('active', i === state.previewIdx));
  }
  function moveClip(clip, dir) {
    const i = state.clips.indexOf(clip);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= state.clips.length) return;
    state.clips[i] = state.clips[j];
    state.clips[j] = clip;
    state.previewIdx = 0;
    renderClips(); previewPlay(); renderNow(); scheduleSave();
  }
  function removeClip(clip) {
    const i = state.clips.indexOf(clip);
    if (i < 0) return;
    try { clip.video && clip.video.pause(); } catch { /* 무시 */ }
    try { clip.url && URL.revokeObjectURL(clip.url); } catch { /* 무시 */ }
    state.clips.splice(i, 1);
    if (state.previewIdx >= state.clips.length) state.previewIdx = 0;
    renderClips(); $('sampleNote').hidden = state.clips.length > 0; previewPlay(); renderNow(); scheduleSave();
  }
  function checkLength() {
    const total = totalDuration();
    const w = $('lengthWarn');
    const over = state.clips.length > 0 && total > 180;
    w.hidden = !over;
    if (over) w.textContent = `릴스·쇼츠는 3분까지예요. 지금 ${fmt(total)} — 클립을 줄이거나 지워 주세요.`;
    $('btnRender').textContent = state.clips.length ? '영상 만들기' : '영상을 먼저 골라 주세요';
  }
  function redistributePhotos() {
    const photos = state.clips.filter((c) => c.kind === 'photo');
    if (!photos.length) return;
    const per = state.photoLen / photos.length;
    photos.forEach((c) => { c.start = 0; c.end = per; });
    renderClips(); renderNow(); scheduleSave();
  }
  $('photoLen').addEventListener('change', (e) => {
    state.photoLen = Number(e.target.value) || 15;
    redistributePhotos();
    toast(`사진 ${state.clips.filter((c) => c.kind === 'photo').length}장을 ${state.photoLen}초로 맞췄어요`);
  });

  /* 파일 읽기 */
  const seeked = (v) => new Promise((resolve) => {
    let done = false;
    const ok = () => { if (done) return; done = true; v.removeEventListener('seeked', ok); clearTimeout(tm); resolve(); };
    const tm = setTimeout(ok, 2000);
    v.addEventListener('seeked', ok, { once: true });
    try { v.currentTime = 0; } catch { ok(); }
  });
  async function resolveDuration(v) {
    if (Number.isFinite(v.duration) && v.duration > 0) return v.duration;
    await new Promise((resolve) => {
      let done = false;
      const ok = () => { if (done) return; done = true; v.removeEventListener('timeupdate', ok); resolve(); };
      setTimeout(ok, 2200);
      v.addEventListener('timeupdate', ok);
      try { v.currentTime = 1e6; } catch { ok(); }
    });
    const d = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    try { v.currentTime = 0; } catch { /* 무시 */ }
    return d;
  }
  const loadImage = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지'));
    img.src = URL.createObjectURL(file);
  });
  async function makeThumb(clip) {
    try {
      const c = document.createElement('canvas');
      c.width = 96; c.height = 128;
      const g = c.getContext('2d');
      const src = clip.kind === 'photo' ? clip.img : clip.video;
      const sw = clip.kind === 'photo' ? clip.img.naturalWidth : clip.video.videoWidth;
      const sh = clip.kind === 'photo' ? clip.img.naturalHeight : clip.video.videoHeight;
      const r = fit(sw || 9, sh || 16, c.width, c.height, 'cover');
      g.drawImage(src, r.x, r.y, r.w, r.h);
      clip.thumb = c.toDataURL('image/jpeg', 0.72);
      renderClips();
    } catch { /* 썸네일 실패는 무시 */ }
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const videoFiles = files.filter((f) => /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm|ogv|3gp)$/i.test(f.name));
    const imageFiles = files.filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|heic|heif|webp|gif)$/i.test(f.name));
    if (imageFiles.length && state.clips.some((c) => c.kind === 'video') && !videoFiles.length) {
      toast('영상과 사진은 한 프로젝트에 섞지 않아요. 사진은 새로 시작해 주세요.', 4200);
      return;
    }
    if (videoFiles.length) {
      if (state.clips.some((c) => c.kind === 'photo')) {
        state.clips.forEach((c) => { try { c.url && URL.revokeObjectURL(c.url); } catch { /* 무시 */ } });
        state.clips = [];
      }
    }
    $('pickSub').textContent = '미디어 읽는 중…';
    for (const file of videoFiles) {
      const clip = {
        id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6),
        kind: 'video', name: file.name.replace(/\.[^.]+$/, '').slice(0, 40),
        captions: '', duration: 0, start: 0, end: 0, thumb: '', url: URL.createObjectURL(file), video: null,
      };
      clip.captions = state.pendingCaptions[clip.name] || '';
      const v = document.createElement('video');
      v.src = clip.url; v.playsInline = true; v.setAttribute('playsinline', '');
      v.preload = 'auto'; v.muted = true; v.loop = false;
      v.addEventListener('ended', onClipEnded);
      clip.video = v;
      state.clips.push(clip);
      state.previewIdx = 0;
      renderClips();
      try {
        if (v.readyState < 1) await Promise.race([once(v, 'loadedmetadata'), once(v, 'error').then(() => { throw new Error('load'); })]);
        if (!v.videoWidth) throw new Error('load');
        clip.duration = await resolveDuration(v);
        clip.end = clip.duration;
        try {
          await Promise.race([once(v, 'loadeddata'), new Promise((r) => setTimeout(r, 800))]);
          await seeked(v);
          await makeThumb(clip);
        } catch { /* 썸네일 생략 */ }
      } catch {
        toast(`이 영상 형식은 브라우저에서 열 수 없어요: ${file.name}`, 5000);
        removeClip(clip);
        continue;
      }
      renderClips();
    }
    for (const file of imageFiles) {
      try {
        const img = await loadImage(file);
        const clip = {
          id: 'p' + Date.now() + Math.random().toString(36).slice(2, 6),
          kind: 'photo', name: file.name.replace(/\.[^.]+$/, '').slice(0, 40),
          captions: '', duration: 1, start: 0, end: 1, thumb: '', img, url: img.src,
        };
        clip.captions = state.pendingCaptions[clip.name] || '';
        state.clips.push(clip);
        await makeThumb(clip);
      } catch {
        toast(`이 사진은 열 수 없어요: ${file.name} (HEIC는 JPG로 저장해 주세요)`, 5000);
      }
    }
    if (imageFiles.length) {
      const photos = state.clips.filter((c) => c.kind === 'photo').length;
      if (photos > 6) toast(`사진은 6장까지 추천해요. 지금 ${photos}장이에요.`, 4200);
      redistributePhotos();
    }
    $('sampleNote').hidden = state.clips.length > 0;
    $('pickSub').textContent = state.clips.length ? '고른 순서대로 이어 붙여요' : '영상은 여러 개, 사진은 2~6장';
    $('pick').classList.toggle('has', state.clips.length > 0);
    $('pickTitle').textContent = state.clips.length ? '영상 · 사진 더 추가' : '영상 · 사진 고르기';
    if (state.clips.length) {
      const first = state.clips[0];
      const list = recommend(
        first.kind === 'photo' ? 1080 : first.video.videoWidth,
        first.kind === 'photo' ? 1920 : first.video.videoHeight,
        totalDuration(),
        first.kind === 'photo' ? 'photo' : 'video',
      );
      if (!list.some((t) => t.id === state.selectedId)) selectTemplate(list[0], true);
      previewPlay();
      toast(`${state.clips.length}개 미디어 · 총 ${fmt(totalDuration())} · ${selected().name} 틀을 추천했어요`, 4200);
    }
    /* ✨ 자동 생성으로 미리 만들어 둔 자막이 있으면 새 클립에 순서대로 나눠 넣습니다 */
    if (state.autoCaptions.length && state.clips.every((c) => !c.captions)) distributeCaptions(state.autoCaptions);
    renderClips(); renderNow(); scheduleSave();
    $('fileInput').value = '';
  }
  $('fileInput').addEventListener('change', (e) => addFiles(e.target.files));
  $('btnClearAll').onclick = () => {
    if (!state.clips.length) return;
    state.clips.forEach((c) => { try { c.video && c.video.pause(); c.url && URL.revokeObjectURL(c.url); } catch { /* 무시 */ } });
    state.clips = []; state.previewIdx = 0;
    $('sampleNote').hidden = false;
    $('pickTitle').textContent = '영상 · 사진 고르기';
    $('pickSub').textContent = '영상은 여러 개 이어 붙이고, 사진은 2~6장으로 릴스를 만들어요';
    renderClips(); previewPlay(); renderNow(); scheduleSave();
  };

  /* ---------------------------------------------------------------- 미리보기 */
  const samplePortrait = makeSampleSource('portrait');
  const sampleLandscape = makeSampleSource('landscape');
  const t0 = performance.now();
  const LOOP = 8;
  const photoCanvas = document.createElement('canvas');
  let prevPhoto = null;

  function photoFrame(clip, t, dur, W, H) {
    if (photoCanvas.width !== W || photoCanvas.height !== H) { photoCanvas.width = W; photoCanvas.height = H; }
    const g = photoCanvas.getContext('2d');
    const idx = state.clips.indexOf(clip);
    const n = state.clips.filter((c) => c.kind === 'photo').length || 1;
    const seqIndex = state.clips.filter((c) => c.kind === 'photo').indexOf(clip);
    const prog = clamp(t / (dur || 1), 0, 1);
    const fade = Math.min(0.5, Math.max(0.2, dur * 0.16));
    const drawOne = (item, p, alpha) => {
      const iw = item.img.naturalWidth || item.img.width;
      const ih = item.img.naturalHeight || item.img.height;
      const base = Math.max(W / iw, H / ih);
      const zoom = (1.05 + 0.14 * p) * base;
      const dw = iw * zoom, dh = ih * zoom;
      const slackX = Math.max(0, dw - W), slackY = Math.max(0, dh - H);
      const dir = (seqIndex % 2 === 0) ? 1 : -1;
      const fx = clamp(0.5 + dir * (p - 0.5) * 0.7, 0, 1);
      const fy = clamp(0.5 + (p - 0.5) * 0.4, 0, 1);
      g.save();
      g.globalAlpha = alpha;
      g.drawImage(item.img, -slackX * fx, -slackY * fy, dw, dh);
      g.restore();
    };
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#08080e';
    g.fillRect(0, 0, W, H);
    const prevIdx = state.clips.slice(0, idx).map((c) => c.kind).lastIndexOf('photo');
    const prevClip = prevIdx >= 0 ? state.clips[prevIdx] : null;
    if (prevClip && t < fade && prevClip !== clip) {
      drawOne(prevClip, 1, 1);
      drawOne(clip, 0.02, t / fade);
    } else {
      drawOne(clip, prog, 1);
    }
    return { canvas: photoCanvas, w: W, h: H };
  }

  /* 카드 썸네일은 "그 틀의 예시"로 그립니다 (내 문구는 큰 미리보기·저장 영상에만) */
  function sampleText(t) {
    const s = t.sample || {};
    return { hook: s.hook || '', title: s.title || '', price: s.price || '', items: s.items || '', channel: s.channel || '' };
  }
  function sampleDeal(t) {
    const s = t.sample || {};
    return { ...SAMPLE_DEAL, hook: s.hook || '', channel: s.channel || '' };
  }
  function sampleItems(t) {
    return String((t.sample && t.sample.items) || '').split('\n').map((s) => s.trim()).filter(Boolean);
  }
  function buildFrame(t, clip, time, dur) {
    let src, srcW, srcH, kind;
    if (clip.kind === 'photo') {
      const pc = photoFrame(clip, time, dur, t.W, t.H);
      src = pc.canvas; srcW = pc.w; srcH = pc.h; kind = 'photo';
    } else {
      src = clip.video; srcW = clip.video.videoWidth || 1080; srcH = clip.video.videoHeight || 1920; kind = 'video';
    }
    const lines = clipLines(clip);
    const cap = captionFor(lines, time, dur);
    const f = {
      src, srcW, srcH, kind, t: time, duration: dur, W: t.W, H: t.H,
      text: readText(), caption: cap.text, captionP: cap.p,
      clipIndex: Math.max(0, state.clips.indexOf(clip)), clipCount: state.clips.length,
      captionLines: lines.length, capLines: lines,
      items: itemLines(), deal: dealFor(t),
    };
    f.media = makeFrameMedia(f);
    return f;
  }
  function sampleFrame(t) {
    const sec = ((performance.now() - t0) / 1000) % LOOP;
    const s = t.H > t.W ? samplePortrait : sampleLandscape;
    s.draw(sec);
    const lines = (state.autoCaptions && state.autoCaptions.length)
      ? state.autoCaptions
      : ((t.sampleCaptions && t.sampleCaptions.length) ? t.sampleCaptions : ['']);
    const cap = captionFor(lines, sec, LOOP);
    const f = {
      src: s.canvas, srcW: s.canvas.width, srcH: s.canvas.height, kind: 'video',
      t: sec, duration: LOOP, W: t.W, H: t.H, text: sampleText(t),
      caption: cap.text, captionP: cap.p, clipIndex: 0, clipCount: state.clips.length,
      captionLines: lines.length, capLines: lines, items: sampleItems(t), deal: sampleDeal(t),
    };
    f.media = makeFrameMedia(f);
    return f;
  }
  function frameFor(t) {
    const clip = activeClip();
    if (clip && clip.kind === 'video' && clip.video.readyState >= 2) {
      const d = clipSeconds(clip);
      const time = clamp(clip.video.currentTime - clip.start, 0, d);
      return buildFrame(t, clip, time, d);
    }
    if (clip && clip.kind === 'photo') {
      const d = clipSeconds(clip);
      return buildFrame(t, clip, clamp(state.previewT, 0, d), d);
    }
    return sampleFrame(t);
  }
  function onClipEnded(e) {
    if (state.rendering) return;
    const i = state.clips.findIndex((c) => c.video === e.target);
    if (i < 0 || i !== state.previewIdx) return;
    state.previewIdx = (state.previewIdx + 1) % state.clips.length;
    state.previewT = 0;
    markActive(); previewPlay(); renderNow();
  }
  function previewPlay() {
    const cur = state.clips[state.previewIdx];
    state.clips.forEach((c, i) => {
      if (i === state.previewIdx || c.kind !== 'video') return;
      try { c.video.pause(); if (c.video.currentTime > 0) c.video.currentTime = 0; } catch { /* 무시 */ }
    });
    if (!cur || cur.kind !== 'video') return;
    try {
      cur.video.muted = true;
      cur.video.loop = false;
      cur.video.currentTime = cur.start;
      const p = cur.video.play();
      if (p && p.catch) p.catch(() => {});
    } catch { /* 무시 */ }
    markActive();
  }

  /* 카드 그리기 */
  let railCards = [];
  let gridCards = [];
  function drawCards(list) {
    for (const { t, ctx, scale } of list) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, t.W, t.H);
      try { t.draw(ctx, sampleFrame(t)); } catch { /* 틀 하나가 실패해도 계속 */ }
    }
  }
  function refreshCards() {
    railCards = [];
    gridCards = [];
    const rail = $('rail');
    rail.innerHTML = '';
    const list = TEMPLATES.filter((t) => state.arcFilter === 'all' || t.arc === state.arcFilter);
    list.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tcard';
      b.setAttribute('aria-pressed', String(state.selectedId === t.id));
      const scale = 0.1;
      const c = document.createElement('canvas');
      c.width = Math.round(t.W * scale);
      c.height = Math.round(t.H * scale);
      b.innerHTML = `${t.isNew ? '<span class="badge">NEW</span>' : ''}<span class="thumb${t.H < t.W ? ' ls' : ''}"></span>
        <span class="tag">${esc(t.arc)} ${esc(t.label)}</span><span class="name">${esc(t.name)}</span>`;
      b.querySelector('.thumb').appendChild(c);
      b.onclick = () => { selectTemplate(t); setView('create'); };
      rail.appendChild(b);
      railCards.push({ t, ctx: c.getContext('2d'), scale });
    });

    const grid = $('templateGrid');
    grid.innerHTML = '';
    TEMPLATES.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tcard';
      b.setAttribute('aria-pressed', String(state.selectedId === t.id));
      const scale = 0.14;
      const c = document.createElement('canvas');
      c.width = Math.round(t.W * scale);
      c.height = Math.round(t.H * scale);
      b.innerHTML = `${t.isNew ? '<span class="badge">NEW</span>' : ''}<span class="thumb${t.H < t.W ? ' ls' : ''}"></span>
        <span class="tag">${esc(t.arc)} · ${esc(t.label)}</span><span class="name">${esc(t.name)}</span>`;
      b.querySelector('.thumb').appendChild(c);
      b.onclick = () => { selectTemplate(t); setView('create'); };
      grid.appendChild(b);
      gridCards.push({ t, ctx: c.getContext('2d'), scale });
    });
    if (view === 'templates' || view === 'create') { drawCards(railCards); drawCards(gridCards); }
  }
  function renderNow() {
    if (view === 'create' || view === 'templates') {
      drawCards(railCards);
      if (view === 'templates') drawCards(gridCards);
    }
    if (view === 'create') {
      const t = selected();
      const pc = $('preview');
      if (pc.width !== Math.round(t.W / 3)) { pc.width = Math.round(t.W / 3); pc.height = Math.round(t.H / 3); }
      const p = pc.getContext('2d');
      p.setTransform(1 / 3, 0, 0, 1 / 3, 0, 0);
      p.clearRect(0, 0, t.W, t.H);
      try { t.draw(p, frameFor(t)); } catch (e) { console.warn('preview', e); }
      if (UI.safe && t.H > t.W) drawSafeZones(p, t.W, t.H);
    }
    $('tplNow').textContent = `${selected().name}`;
    $('stageMeta').textContent = `${selected().H > selected().W ? '9:16' : '16:9'} · ${fmt(totalDuration())} · 세이프존은 미리보기에만`;
  }
  function inView(el, pad = 260) {
    const r = el.getBoundingClientRect();
    return r.bottom > -pad && r.top < window.innerHeight + pad;
  }
  let lastCard = 0;
  let lastNow = performance.now();
  function loop(now) {
    const dt = Math.min(0.12, (now - lastNow) / 1000);
    lastNow = now;
    if (!state.rendering && view === 'create') {
      const clip = activeClip();
      if (clip && clip.kind === 'photo') {
        state.previewT += dt;
        if (state.previewT >= clipSeconds(clip)) {
          state.previewIdx = (state.previewIdx + 1) % state.clips.length;
          state.previewT = 0;
          markActive();
        }
      }
      if (clip && clip.kind === 'video') {
        const v = clip.video;
        if (v.readyState >= 2 && v.currentTime >= clip.end - 0.04) {
          if (state.clips.length > 1) {
            state.previewIdx = (state.previewIdx + 1) % state.clips.length;
            state.previewT = 0; markActive(); previewPlay();
          } else {
            try { v.currentTime = clip.start; } catch { /* 무시 */ }
          }
        }
      }
      if (inView($('preview'))) {
        const t = selected();
        const pc = $('preview');
        const p = pc.getContext('2d');
        p.setTransform(1 / 3, 0, 0, 1 / 3, 0, 0);
        try { t.draw(p, frameFor(t)); } catch { /* 무시 */ }
        if (UI.safe && t.H > t.W) drawSafeZones(p, t.W, t.H);
      }
    }
    if (!state.rendering && now - lastCard > 220) {
      lastCard = now;
      if (view === 'create' && inView($('rail'))) drawCards(railCards);
      if (view === 'templates' && inView($('templateGrid'))) drawCards(gridCards);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------------------------------------------------------------- 틀 선택 */
  function presetFor(t) {
    const db = window.PRESETS;
    if (!db) return null;
    return (db.presets || []).find((p) => String(p.src).split('/')[1] === t.id) || null;
  }
  function applySamples(t, force = false) {
    const s = t.sample || {};
    [['hook', 'fHook'], ['title', 'fTitle'], ['price', 'fPrice'], ['items', 'fItems'], ['channel', 'fChannel']].forEach(([k, id]) => {
      if (s[k] == null) return;
      if (force || !dirty[k]) $(id).value = s[k];
    });
    if (force || !dirty.script) {
      const lines = [s.hook || '', ...(t.sampleCaptions || [])].filter(Boolean).join(' ').replace(/\*/g, '');
      $('fScript').value = lines;
    }
  }
  function selectTemplate(t, silent) {
    state.selectedId = t.id;
    $('itemsField').hidden = !(t.need || []).includes('items');
    $('priceField').hidden = !(t.need || []).includes('price');
    applySamples(t, false);
    const pr = presetFor(t);
    const beats = (pr && pr.beats && pr.beats.length)
      ? `<span class="beats">${pr.beats.map((b) => `<span title="${esc(b.role || '')}">${esc([b.t, b.text || b.role].filter(Boolean).join(' '))}</span>`).join('')}</span>`
      : '';
    const desc = `<strong>${esc(t.name)}</strong><span class="muted">${esc(t.reason || t.trend)}</span><span>${esc(t.desc)}</span><span class="muted">팁: ${esc(t.tips)}</span><span class="muted">기준 ${(pr && pr.dur_target) || t.dur || 30}초 · 평균 컷 ${(ARC_INFO[t.arc] || {}).cut || '-'}초${pr && pr.number_beat ? ` · 숫자 후킹 “${esc(pr.number_beat)}”` : ''}${pr && pr.cta ? ` · CTA “${esc(pr.cta)}”` : ''}</span>${beats}`;
    $('tdesc').innerHTML = desc;
    $('tdesc2').innerHTML = desc;
    renderClips();
    refreshCards();
    renderNow(); scheduleSave();
    if (!silent) toast(`${t.name} 적용 · ${t.arc} ${(ARC_INFO[t.arc] || {}).name || ''}`, 2400);
  }
  $('btnExample').onclick = () => {
    const t = selected();
    applySamples(t, true);
    const caps = t.sampleCaptions || [];
    state.clips.forEach((c, i) => {
      if (!state.clips.length) return;
      if (state.clips.length === 1) c.captions = caps.join('\n');
      else {
        const per = Math.ceil(caps.length / state.clips.length);
        c.captions = caps.slice(i * per, i * per + per).join('\n');
      }
    });
    renderClips(); renderNow(); syncCaption(); scheduleSave();
    toast('이 틀의 예시 문구와 자막을 채웠어요', 2600);
  };

  /* ================================================ ✨ 주제 자동 생성 (autogen.js · P4)
     주제 한 줄 → 추천 틀 · 훅 · 컷 자막(top_label/sub) · 보이스 대본 · CTA · 캡션 · 해시태그 15
     키가 없으면 내장 생성기(즉시), [🤖 AI로 생성]을 켜면 gpt-4o-mini → 실패 시 폴백
     키가 없어도 [📋 P4 프롬프트 복사]로 GPT·클로드에 붙여 쓰고, 받은 JSON을 다시 붙여넣을 수 있어요. */
  const AG = window.Autogen || null;
  let autoStyleId = 'auto';
  let autoAIOn = false;
  let autoOut = null;
  const autoCuts = () => clamp(state.clips.length || 5, 3, 8);
  const autoSubs = (out) => (out.scenes || []).map((s) => s.sub);

  function renderAutoChips() {
    const wrap = $('autoStyleChips');
    if (!wrap) return;
    wrap.innerHTML = (AG ? AG.STYLES : []).map((s) =>
      `<button class="chip" type="button" data-auto-style="${s.id}" aria-pressed="${s.id === autoStyleId}" title="${s.desc || ''}">${s.emoji ? s.emoji + ' ' : ''}${s.label}</button>`).join('');
    wrap.querySelectorAll('[data-auto-style]').forEach((b) => {
      b.onclick = () => {
        autoStyleId = b.dataset.autoStyle;
        renderAutoChips();
        const s = AG && AG.styleOf(autoStyleId);
        if (s) $('autoStatus').textContent = autoStyleId === 'auto'
          ? '주제만 넣고 눌러보세요. 키 없이도 바로 자막·훅·캡션·해시태그를 만들어요.'
          : `스타일 힌트 · ${s.label} — ${s.desc}`;
      };
    });
  }

  function syncAutoKey() {
    if (!$('autoKeyField')) return;
    let stored = false;
    try { stored = !!(window.__tts && window.__tts.ttsLoad().key); } catch { stored = false; }
    $('autoKeyField').hidden = !autoAIOn || stored;
    if (!autoAIOn) return;
    $('autoStatus').textContent = stored
      ? '🤖 저장된 키로 주제 맞춤 카피를 만듭니다. 실패하면 내장 생성기로 만들어요.'
      : '🤖 키를 넣으면 AI가 주제에 맞춰 새로 씁니다. 실패하면 내장 생성기로 만들어요.';
  }

  function distributeCaptions(caps) {
    if (!state.clips.length || !caps || !caps.length) return false;
    if (state.clips.length === 1) {
      state.clips[0].captions = caps.join('\n');
    } else {
      const per = Math.ceil(caps.length / state.clips.length);
      state.clips.forEach((c, i) => { c.captions = caps.slice(i * per, i * per + per).join('\n'); });
    }
    renderClips();
    return true;
  }

  function ttsReady() {
    try {
      const c = ttsLoad();
      return !!(c.key || (c.provider === 'custom' && c.endpoint));
    } catch { return false; }
  }

  function copyWithBtn(sel) {
    document.querySelectorAll('[data-auto-copy]').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.autoCopy;
        if (k === 'caption') copyText($('autoCaption').value);
        else if (k === 'tags') copyText($('autoTags').value);
        else if (k === 'script') copyText($('autoScript').value);
        else if (k === 'cta') copyText($('autoCta').value);
        else if (k === 'prompt') copyText(AG.buildP4Prompt($('autoTopic').value.trim() || (autoOut && autoOut.topic) || '', autoStyleId, autoCuts()));
        else copyText($('autoAll').value);
      };
    });
  }

  function renderAutoResult(out) {
    const box = $('autoResult');
    if (!box) return;
    const tplName = (TEMPLATES.find((t) => t.id === out.recommendedTemplateId) || {}).name || out.recommendedTemplateId;
    const bgmName = (BGMS.find((b) => b.id === out.recommendedBgm) || {}).name || out.recommendedBgm;
    const styleName = ((CAPTION_STYLES.find((s) => s.id === out.recommendedSubtitleStyle) || {}).name) || out.recommendedSubtitleStyle;
    const ready = ttsReady();
    const sceneRows = (out.scenes || []).map((s, i) =>
      `<div class="srow"><b>${i + 1}</b><span class="sl">${esc(s.top_label)}</span><span class="sb">${esc(s.sub)}</span></div>`).join('');
    box.hidden = false;
    box.innerHTML = `
      <div class="capcard">
        <header><h3>🪝 훅 · 컷 자막 ${out.scenes.length}개</h3></header>
        <p class="hookline">${esc(out.hook)}</p>
        <div class="scenes">${sceneRows}</div>
      </div>
      <div class="capcard">
        <header><h3>📋 인스타 캡션</h3><button class="copybtn" type="button" data-auto-copy="caption">복사</button></header>
        <textarea id="autoCaption" rows="6" readonly spellcheck="false"></textarea>
      </div>
      <div class="capcard">
        <header><h3>#️⃣ 해시태그 ${out.hashtagList.length}개</h3><button class="copybtn" type="button" data-auto-copy="tags">복사</button></header>
        <textarea id="autoTags" class="mono" rows="3" readonly spellcheck="false"></textarea>
      </div>
      <div class="capcard">
        <header><h3>📣 저장·팔로우 CTA</h3><button class="copybtn" type="button" data-auto-copy="cta">복사</button></header>
        <textarea id="autoCta" rows="2" readonly spellcheck="false"></textarea>
      </div>
      <div class="capcard">
        <header><h3>🎙 보이스 대본</h3><button class="copybtn" type="button" data-auto-copy="script">복사</button></header>
        <textarea id="autoScript" rows="5" readonly spellcheck="false"></textarea>
        <div class="row" style="margin-top:8px">
          <button class="btn btn-ghost btn-sm" type="button" id="btnAutoVoice">🎙 대본으로 보이스 만들기</button>
        </div>
        <p class="hint" id="autoVoiceNote" style="margin-top:5px">${ready ? 'TTS 키가 있어서 한 번에 목소리까지 만들 수 있어요.' : '⚙ 설정에서 외부 TTS 키를 넣으면 이 대본으로 목소리를 만들어 보이스 트랙에 넣어요.'}</p>
      </div>
      <div class="capcard">
        <header><h3>🧾 캡션 + 해시태그 한 번에</h3><button class="copybtn" type="button" data-auto-copy="all">전체 복사</button></header>
        <textarea id="autoAll" class="mono" rows="4" readonly spellcheck="false"></textarea>
        <p class="hint" style="margin-top:5px">제휴 링크를 붙이는 포스팅이면 맨 아래 고지 문구를 함께 남겨 주세요(공정위 표시 요건). 필요 없으면 지우셔도 돼요.</p>
      </div>
      <div class="capcard">
        <header><h3>🤖 키 없이 AI에게 맡기기</h3><button class="copybtn" type="button" data-auto-copy="prompt">P4 프롬프트 복사</button></header>
        <p class="hint">클로드·GPT에 붙여넣고, 돌아온 JSON을 아래에 붙여넣으면 그대로 적용돼요.</p>
        <textarea id="autoJson" rows="3" placeholder='{"hook":"...","scenes":[...],"cta":"...","caption":"...","hashtags":[...]}' spellcheck="false"></textarea>
        <div class="row" style="margin-top:6px">
          <button class="btn btn-ghost btn-sm" type="button" id="btnAutoJson">📥 받은 JSON 적용</button>
        </div>
        <p class="hint" id="autoJsonNote" style="margin-top:5px"></p>
      </div>
      <p class="hint" id="autoRec" style="margin-top:8px"></p>`;
    $('autoCaption').value = out.caption;
    $('autoTags').value = out.hashtags;
    $('autoCta').value = out.cta;
    $('autoScript').value = out.voiceScript;
    $('autoAll').value = `${out.caption}\n\n${out.hashtags}\n\n${out.disclosure}`;
    $('autoRec').textContent = `추천 · 틀 ${tplName} / 자막 ${styleName} / BGM ${bgmName} · ${out.categoryName} 카테고리${out.source === 'ai' ? ' · AI(gpt-4o-mini)' : ' · 내장 생성기'} · 컷 ${out.cuts}개`;
    copyWithBtn(box);
    $('btnAutoVoice').onclick = async () => {
      const btn = $('btnAutoVoice');
      if (!ttsReady()) {
        toast('⚙ 설정 → 외부 TTS에 키를 넣으면 대본으로 목소리를 만들어요', 4600);
        return;
      }
      btn.disabled = true; btn.textContent = '목소리 만드는 중…';
      try {
        const res = await ttsGenerate(ttsLoad(), $('fScript').value.trim() || out.voiceScript);
        await useTtsAudio({ blob: res.blob, ext: res.ext, providerName: res.providerName });
        $('autoVoiceNote').textContent = `보이스 트랙에 넣었어요 · ${res.providerName}`;
      } catch (e) {
        $('autoVoiceNote').textContent = `⚠ ${(e && e.message) || e}`;
      } finally {
        btn.disabled = false; btn.textContent = '🎙 대본으로 보이스 만들기';
      }
    };
    $('btnAutoJson').onclick = async () => {
      const raw = $('autoJson').value.trim();
      if (!raw) { toast('AI가 돌려준 JSON을 붙여넣어 주세요'); return; }
      try {
        const parsed = JSON.parse(raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
        const base = AG.generate($('autoTopic').value.trim() || out.topic, autoStyleId, { cuts: autoCuts() });
        const merged = AG.normalizeAI(parsed, base);
        autoOut = merged;
        await applyAutoResult(merged);
        $('autoJsonNote').textContent = '붙여넣은 JSON으로 화면을 채웠어요.';
      } catch (e) {
        $('autoJsonNote').textContent = `⚠ JSON을 읽지 못했어요 · ${(e && e.message) || e}`;
      }
    };
  }

  async function applyAutoResult(out) {
    state.autoCaptions = autoSubs(out);
    const tpl = TEMPLATES.find((t) => t.id === out.recommendedTemplateId) || selected();
    selectTemplate(tpl, true);
    $('fHook').value = out.hook;
    $('fTitle').value = out.badge;
    if (out.priceText && (tpl.need || []).includes('price')) $('fPrice').value = out.priceText;
    if (out.priceSale) {
      $('fNew').value = out.priceSale;
      if (out.priceOrig) $('fOld').value = out.priceOrig;
      dirty.deal = true;
      autoOff();
    }
    $('fScript').value = out.voiceScript;
    dirty.hook = true; dirty.title = true; dirty.script = true; dirty.price = true;
    UI.captionStyle = out.recommendedSubtitleStyle;
    UI.accent = ACCENTS[out.recommendedAccent] ? out.recommendedAccent : UI.accent;
    UI.weight = WEIGHT_CHOICES.includes(out.recommendedWeight) ? out.recommendedWeight : UI.weight;
    UI.spacing = clamp(Number(out.recommendedSpacing) || 0, -4, 14);
    UI.font = out.recommendedFont || UI.font;
    state.bgm = out.recommendedBgm;
    state.bgmVol = Math.max(state.bgmVol, 0.22);
    try { await ensureFont(UI.font); } catch { /* 폰트가 늦게 와도 그대로 그립니다 */ }
    refreshSans(); paintUi(); renderBgm();
    distributeCaptions(state.autoCaptions);
    renderClips(); renderNow(); syncCaption(); scheduleSave();
    renderAutoResult(out);
    const e1 = out.scenes && out.scenes[0] ? ` · 자막 ${out.scenes.length}줄` : '';
    toast(`✨ ${out.categoryName} · ${tpl.name}${e1} · 캡션·해시태그 ${out.hashtagList.length}개 준비 완료`, 4400);
  }

  async function runAutoFill() {
    if (!AG) { toast('자동 생성기를 불러오지 못했어요 (autogen.js)', 4200); return; }
    const topic = $('autoTopic').value.trim();
    if (!topic) { toast('주제를 한 줄 적어 주세요. 예: 다이소 욕실 수납템 3선', 3600); $('autoTopic').focus(); return; }
    const btn = $('btnAutoFill');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = autoAIOn ? '🤖 만드는 중…' : '✨ 만드는 중…';
    $('autoStatus').textContent = autoAIOn ? 'OpenAI로 주제 맞춤 카피를 만드는 중…' : '주제에서 훅·자막·캡션을 만드는 중…';
    try {
      const cuts = autoCuts();
      const out = autoAIOn
        ? await AG.generateAsync(topic, autoStyleId, { ai: true, key: $('autoKey').value.trim(), cuts })
        : AG.generate(topic, autoStyleId, { cuts });
      if (!out) throw new Error('주제를 다시 확인해 주세요');
      autoOut = out;
      await applyAutoResult(out);
      const note = autoAIOn
        ? (out.source === 'ai' ? '🤖 AI(gpt-4o-mini)로 만들었어요.' : `내장 생성기로 만들었어요. ${out.aiError || ''}`)
        : '내장 생성기로 바로 만들었어요.';
      $('autoStatus').textContent = `${note} 아래 카드에서 복사하거나, JSON을 붙여넣어 다시 적용할 수 있어요.`;
    } catch (e) {
      $('autoStatus').textContent = `⚠ ${(e && e.message) || e}`;
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  if ($('btnAutoFill')) {
    renderAutoChips();
    syncAutoKey();
    $('btnAutoFill').onclick = runAutoFill;
    $('btnAutoAI').onclick = () => {
      autoAIOn = !autoAIOn;
      $('btnAutoAI').setAttribute('aria-pressed', String(autoAIOn));
      syncAutoKey();
    };
    $('autoTopic').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); runAutoFill(); }
    });
  }


  document.querySelectorAll('#arcChips .chip').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('#arcChips .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      state.arcFilter = b.dataset.arc;
      refreshCards();
    };
  });

  /* ---------------------------------------------------------------- 스타일 카드 */
  function renderStyles() {
    const wrap = $('stylesGrid');
    wrap.innerHTML = '';
    const db = window.PRESETS;
    if (!db || !db.creatorStyles) {
      wrap.innerHTML = '<p class="hint">프리셋 파일을 불러오지 못했어요. presets.js가 같은 폴더에 있는지 확인해 주세요.</p>';
      return;
    }
    db.creatorStyles.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'stylecard';
      b.innerHTML = `<em>${esc(s.cat)} · ${esc((s.arc_name || ''))}</em><b>${esc(s.name)}</b>
        <span>${esc(s.hook)}</span><span>${esc(s.dur_target)}초 기준 · ${esc(s.label)} · BGM ${esc(s.bgm)}</span>
        <span>${esc((s.caption && s.caption.top_label) || '')} / ${esc((s.caption && s.caption.bottom_sub) || '')}</span>`;
      b.onclick = () => applyStyle(s);
      wrap.appendChild(b);
    });
  }
  function applyStyle(s) {
    const db = window.PRESETS;
    const p = db.presets.find((x) => x.id === s.preset);
    const tpl = p ? TEMPLATES.find((t) => t.id === String(p.src).split('/')[1]) : null;
    UI.font = s.font || UI.font;
    UI.accent = s.accent || UI.accent;
    UI.weight = 700; UI.spacing = 0;
    state.voicePreset = s.voice || 'calm';
    state.voiceRate = (VOICES[state.voicePreset] || VOICES.calm).rate;
    state.bgm = s.bgm || 'none';
    if (s.dur_target && state.clips.some((c) => c.kind === 'photo')) {
      state.photoLen = [10, 15, 20, 30].includes(s.dur_target) ? s.dur_target : 15;
      $('photoLen').value = String(state.photoLen);
      redistributePhotos();
    }
    if (tpl) selectTemplate(tpl, true);
    if (!dirty.hook && s.hook) $('fHook').value = s.hook;
    const cap = s.caption || {};
    if (!dirty.title && cap.top_label) $('fTitle').value = cap.top_label;
    if (cap.bottom_sub && state.clips.length && !state.clips[0].captions) {
      state.clips[0].captions = cap.bottom_sub;
      renderClips();
    }
    paintUi(); renderBgm(); renderStyles(); refreshCards();
    setView('create'); renderNow(); syncCaption();
    toast(`${s.name} 적용 · ${tpl ? tpl.name : ''} · ${s.dur_target}초 · ${state.bgm === 'none' ? 'BGM 없음' : 'BGM ' + state.bgm}`, 4200);
    scheduleSave();
  }

  /* ---------------------------------------------------------------- srt */
  const srtStamp = (sec) => {
    const ms = Math.max(0, Math.round((sec || 0) * 1000));
    const h = Math.floor(ms / 3600000);
    const m = Math.floor(ms / 60000) % 60;
    const s = Math.floor(ms / 1000) % 60;
    const r = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`;
  };
  function buildSrt() {
    const rows = [];
    let clock = 0;
    let n = 1;
    state.clips.forEach((clip) => {
      const lines = clipLines(clip);
      const d = clipSeconds(clip);
      if (lines.length && d > 0) {
        const per = d / lines.length;
        lines.forEach((line, i) => {
          const a = clock + i * per;
          const b = clock + (i + 1) * per;
          rows.push(`${n}\n${srtStamp(a)} --> ${srtStamp(Math.max(a + 0.2, b - 0.05))}\n${line.replace(/\*/g, '')}\n`);
          n += 1;
        });
      }
      clock += d;
    });
    return rows.join('\n');
  }
  $('btnSrtSave').onclick = async () => {
    if (!state.clips.length) return toast('영상을 넣고 클립마다 자막을 적으면 .srt로 저장할 수 있어요', 4000);
    if (!state.clips.some((c) => clipLines(c).length)) return toast('저장할 자막이 없어요', 4000);
    const base = ($('projName').value || '자막').replace(/[\\/:*?"<>|#]/g, '').trim().slice(0, 40) || '자막';
    const blob = new Blob([buildSrt()], { type: 'application/x-subrip;charset=utf-8' });
    downloadBlob(blob, `${base}.srt`);
    toast(`${base}.srt 저장을 시작했어요`, 2600);
  };
  function extractSrtCues(raw) {
    const lines = String(raw || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
    const TIME = /(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})/;
    const cues = [];
    let cur = null;
    const flush = () => { if (cur && cur.body.length) cues.push({ start: cur.start, end: cur.end, text: cur.body.join(' ') }); cur = null; };
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].replace(/\u00a0/g, ' ').trim();
      if (!line) { flush(); continue; }
      const m = line.match(TIME);
      if (m) {
        flush();
        cur = {
          start: (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000,
          end: (+m[5]) * 3600 + (+m[6]) * 60 + (+m[7]) + (+m[8]) / 1000,
          body: [],
        };
        continue;
      }
      if (!cur) continue;
      if (/^\d+$/.test(line)) {
        const next = (lines[i + 1] || '').replace(/\u00a0/g, ' ').trim();
        if (!cur.body.length || TIME.test(next)) { flush(); continue; }
      }
      const clean = line.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '').trim();
      if (clean) cur.body.push(clean);
    }
    flush();
    return cues;
  }
  function applyCues(cues) {
    if (!cues.length || !state.clips.length) return 0;
    let clock = 0;
    const ranges = state.clips.map((c) => { const r = [clock, clock + clipSeconds(c)]; clock = r[1]; return r; });
    const buckets = state.clips.map(() => []);
    const pick = (s) => {
      for (let i = 0; i < ranges.length; i += 1) if (s >= ranges[i][0] - 0.001 && s < ranges[i][1]) return i;
      return s < ranges[0][0] ? 0 : ranges.length - 1;
    };
    cues.forEach((cue) => buckets[pick(cue.start)].push(cue.text));
    state.clips.forEach((c, i) => { c.captions = buckets[i].join('\n'); });
    return cues.length;
  }
  $('srtInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const raw = await file.text();
      const isSrt = /-->/.test(raw) || /\.srt$/i.test(file.name);
      if (isSrt) {
        const cues = extractSrtCues(raw);
        if (!cues.length) return toast('자막을 읽지 못했어요. .srt 형식인지 확인해 주세요', 4200);
        const count = applyCues(cues);
        if (!count) {
          cues.forEach((cue, i) => { state.pendingCaptions[`srt${i}`] = cue.text; });
          return toast('영상을 넣으면 .srt 자막을 순서대로 채워요', 4000);
        }
        renderClips(); renderNow(); syncCaption(); scheduleSave();
        return toast(`.srt 자막 ${count}줄을 클립 ${state.clips.length}개에 채웠어요`, 4000);
      }
      const lines = String(raw).replace(/^\uFEFF/, '').split('\n').map((s) => s.trim()).filter(Boolean);
      if (!lines.length) return toast('읽을 자막이 없어요', 3000);
      if (!state.clips.length) return toast('영상을 먼저 넣어 주세요. 텍스트는 클립 카드에 붙여넣을 수 있어요', 4200);
      state.clips.forEach((c, i) => { c.captions = lines[i] || ''; });
      if (lines.length > state.clips.length) state.clips[state.clips.length - 1].captions = lines.slice(state.clips.length - 1).join('\n');
      renderClips(); renderNow(); syncCaption(); scheduleSave();
      toast(`.txt 자막 ${lines.length}줄을 클립 ${state.clips.length}개에 채웠어요`, 4000);
    } catch {
      toast('자막 파일을 읽지 못했어요', 4000);
    }
  });

  /* ---------------------------------------------------------------- 보이스 */
  document.querySelectorAll('#voiceChips .chip').forEach((b) => {
    b.onclick = () => {
      state.voicePreset = b.dataset.voice;
      const v = VOICES[state.voicePreset];
      state.voiceRate = v.rate;
      paintUi();
      stopSpeak();
      toast(`${v.name} · ${v.note}`, 2400);
      scheduleSave();
    };
  });
  let speaking = false;
  function stopSpeak() {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* 무시 */ }
    speaking = false;
    $('btnTempo').textContent = '▶ 템포 미리듣기';
  }
  $('btnTempo').onclick = () => {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return toast('이 브라우저는 기기 음성 미리듣기를 지원하지 않아요', 4000);
    if (speaking) { stopSpeak(); return; }
    const text = String($('fScript').value || $('fHook').value || '').trim();
    if (!text) return toast('대본을 먼저 적어 주세요');
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const preset = VOICES[state.voicePreset];
    u.lang = 'ko-KR';
    u.rate = clamp(state.voiceRate || preset.rate, 0.5, 2);
    u.pitch = preset.pitch;
    const ko = (synth.getVoices() || []).filter((v) => /^ko/i.test(v.lang));
    if (ko.length) u.voice = ko[0];
    u.onend = stopSpeak; u.onerror = stopSpeak;
    speaking = true;
    $('btnTempo').textContent = '■ 멈추기';
    synth.speak(u);
  };
  $('voiceInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    $('voiceSub').textContent = '음성 읽는 중…';
    try {
      const ac = state.audioCtx || (state.audioCtx = new (window.AudioContext || window.webkitAudioContext)());
      const buffer = await ac.decodeAudioData((await file.arrayBuffer()).slice(0));
      state.voiceBuffer = buffer;
      state.voiceName = file.name;
      $('voiceName').textContent = file.name.length > 26 ? file.name.slice(0, 24) + '…' : file.name;
      $('voiceSub').textContent = `${fmt(buffer.duration)} · 영상 길이에 맞춰 믹싱돼요`;
      $('voicePick').classList.add('has');
      $('btnVoiceClear').hidden = false;
      toast('보이스 파일을 올렸어요. 원음·BGM과 함께 섞여요', 3400);
    } catch {
      state.voiceBuffer = null;
      $('voiceName').textContent = 'AI 보이스 파일 올리기';
      $('voiceSub').textContent = '이 파일은 열 수 없어요. MP3로 다시 뽑아 주세요.';
      $('voicePick').classList.remove('has');
      $('btnVoiceClear').hidden = true;
      toast('음성 파일을 읽지 못했어요 (MP3/M4A/WAV)', 4600);
    }
    $('voiceInput').value = '';
  });
  $('btnVoiceClear').onclick = (e) => {
    e.preventDefault();
    state.voiceBuffer = null; state.voiceName = '';
    $('voiceName').textContent = 'AI 보이스 파일 올리기';
    $('voiceSub').textContent = '캡컷(애덤)·타입캐스트·브루에서 뽑은 MP3/M4A';
    $('voicePick').classList.remove('has');
    $('btnVoiceClear').hidden = true;
  };
  $('voiceRate').addEventListener('input', (e) => {
    state.voiceRate = Number(e.target.value);
    $('voiceRateOut').textContent = `${state.voiceRate.toFixed(2).replace(/0$/, '')}x`;
  });
  $('voiceVol').addEventListener('input', (e) => {
    state.voiceVol = Number(e.target.value);
    $('voiceVolOut').textContent = `${Math.round(state.voiceVol * 100)}%`;
  });

  /* ---------------------------------------------------------------- 외부 TTS
     생성된 음성은 업로드한 파일과 똑같이 state.voiceBuffer로 들어가
     보이스 트랙·저장(MP4) 믹싱에 그대로 쓰입니다. 키는 localStorage에만. */
  async function useTtsAudio({ blob, ext, providerName }) {
    $('voiceSub').textContent = '음성 읽는 중…';
    try {
      const ac = state.audioCtx || (state.audioCtx = new (window.AudioContext || window.webkitAudioContext)());
      const buffer = await ac.decodeAudioData((await blob.arrayBuffer()).slice(0));
      state.voiceBuffer = buffer;
      state.voiceName = `TTS · ${providerName}`;
      $('voiceName').textContent = state.voiceName;
      $('voiceSub').textContent = `${fmt(buffer.duration)} · ${providerName} · 영상 길이에 맞춰 믹싱돼요`;
      $('voicePick').classList.add('has');
      $('btnVoiceClear').hidden = false;
      toast(`외부 TTS 음성을 보이스 트랙에 넣었어요 (${fmt(buffer.duration)})`, 3800);
      scheduleSave();
    } catch {
      $('voiceSub').textContent = '이 형식은 브라우저가 읽지 못했어요. MP3로 다시 뽑아 주세요.';
      toast('생성된 음성을 해석하지 못했어요 (MP3/WAV)', 4600);
    }
  }
  const ttsOpts = {
    getText: () => String($('fScript').value || $('fHook').value || '').trim(),
    onAudio: useTtsAudio,
  };
  mountTtsPanel(document.getElementById('ttsVoice'), ttsOpts);
  mountTtsPanel(document.getElementById('ttsSettings'), ttsOpts);

  /* ---------------------------------------------------------------- BGM */
  const bgmEl = typeof Audio !== 'undefined' ? new Audio() : null;
  if (bgmEl) { bgmEl.loop = true; bgmEl.preload = 'auto'; }
  const bgmCache = {};
  let bgmPlaying = null;
  function renderBgm() {
    const wrap = $('bgmList');
    wrap.innerHTML = '';
    BGMS.forEach((b) => {
      const row = document.createElement('div');
      row.className = 'bgm-item' + (state.bgm === b.id ? ' on' : '');
      row.innerHTML = `<span class="bmain"><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></span>`;
      if (b.id !== 'none') {
        const pb = document.createElement('button');
        pb.type = 'button';
        pb.className = 'playbtn' + (bgmPlaying === b.id ? ' playing' : '');
        pb.setAttribute('aria-label', '미리듣기');
        pb.textContent = bgmPlaying === b.id ? '■' : '▶';
        pb.onclick = (e) => { e.stopPropagation(); toggleBgmPreview(b.id); };
        row.appendChild(pb);
      }
      row.onclick = () => {
        state.bgm = b.id;
        if (b.id === 'none') stopBgmPreview();
        renderBgm(); refreshSans();
        toast(b.id === 'none' ? 'BGM 없이 저장해요' : `${b.name} 선택 · ▶로 미리 들어보세요`, 2200);
        scheduleSave();
      };
      wrap.appendChild(row);
    });
  }
  function toggleBgmPreview(id) {
    if (!bgmEl) return;
    if (bgmPlaying === id) { stopBgmPreview(); return; }
    stopBgmPreview();
    const b = BGMS.find((x) => x.id === id);
    if (!b || !b.file) return;
    bgmEl.src = b.file; bgmEl.volume = clamp(state.bgmVol, 0, 1); bgmEl.currentTime = 0;
    bgmEl.play().then(() => { bgmPlaying = id; state.bgm = id; renderBgm(); })
      .catch(() => toast('미리듣기를 시작할 수 없어요. 한 번 더 눌러 주세요.', 3000));
  }
  function stopBgmPreview() {
    bgmPlaying = null;
    if (bgmEl) { try { bgmEl.pause(); bgmEl.currentTime = 0; } catch { /* 무시 */ } }
    renderBgm();
  }
  $('bgmVol').addEventListener('input', (e) => {
    state.bgmVol = Number(e.target.value);
    $('bgmVolOut').textContent = `${Math.round(state.bgmVol * 100)}%`;
    if (bgmEl) bgmEl.volume = clamp(state.bgmVol, 0, 1);
  });
  async function getBgmBuffer(id) {
    const b = BGMS.find((x) => x.id === id);
    if (!b || !b.file) return null;
    if (bgmCache[id]) return bgmCache[id];
    const ac = state.audioCtx || (state.audioCtx = new (window.AudioContext || window.webkitAudioContext)());
    const res = await fetch(b.file);
    if (!res.ok) throw new Error(`BGM ${res.status}`);
    const buf = await ac.decodeAudioData(await res.arrayBuffer());
    bgmCache[id] = buf;
    return buf;
  }

  /* ---------------------------------------------------------------- 내보내기 */
  /* iOS Safari는 video/mp4, 크롬은 video/webm만 지원하는 경우가 있어요.
     isTypeSupported로 mp4 계열을 먼저 고르고, 없으면 webm으로 내려갑니다. */
  const MIME_CANDIDATES = [
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  function pickMime() {
    try { return MIME_CANDIDATES.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || ''; } catch { return ''; }
  }
  /* 컨테이너 이름 → 다운로드 확장자. 선택된 MIME과 파일 확장자를 항상 같게 맞춥니다. */
  function containerOf(mime) {
    const m = String(mime || '').toLowerCase();
    if (m.includes('mp4') || m.includes('m4a')) return 'mp4';
    if (m.includes('webm')) return 'webm';
    return '';
  }
  function mimeLabel(m) {
    if (!m) return '없음';
    const v = containerOf(m) === 'mp4' ? 'MP4' : (containerOf(m) === 'webm' ? 'WEBM' : m.split(';')[0]);
    const c = /avc1|avc3/i.test(m) ? 'H.264' : (/vp9/i.test(m) ? 'VP9' : (/vp8/i.test(m) ? 'VP8' : '브라우저 기본'));
    return `${v} · ${c}`;
  }
  function renderCodecDiag() {
    const ok = typeof MediaRecorder !== 'undefined';
    const mime = pickMime();
    const isMp4 = /mp4/.test(mime);
    const isH264 = /avc1|avc3/i.test(mime);
    $('codecDiag').innerHTML = [
      `<span>녹화 엔진 <b class="${ok ? 'ok' : ''}">${ok ? '지원 ✅' : '없음 ❌'}</b></span>`,
      `<span>저장 형식 <b>${esc(mimeLabel(mime))}</b></span>`,
      `<span>인스타·유튜브 <b>${isMp4 && isH264 ? '바로 업로드 가능 ✅' : (isMp4 ? '코덱 확인 필요' : (mime ? 'MP4 필요(Safari)' : '확인 불가'))}</b></span>`,
    ].join('');
  }
  function setDock(html) { $('dock').innerHTML = html; }
  function idleDock() {
    setDock(`<button class="btn btn-accent" id="btnRender" type="button">${state.clips.length ? '영상 만들기' : '영상을 먼저 골라 주세요'}</button>`);
    $('btnRender').onclick = startRender;
  }
  idleDock();

  async function startRender() {
    if (!state.clips.length) { $('fileInput').click(); return; }
    if (state.clips.some((c) => !clipSeconds(c))) return toast('영상을 아직 읽는 중이에요. 잠깐만요.');
    if (state.clips.some((c) => c.kind === 'video' && !c.video.videoWidth)) return toast('열 수 없는 영상이 있어요. 그 클립을 지워 주세요.');
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      return toast('이 브라우저는 영상 만들기를 지원하지 않아요. 사파리·크롬 최신 버전으로 열어 주세요.', 6000);
    }
    stopBgmPreview(); stopSpeak();
    try {
      state.audioCtx = state.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      await state.audioCtx.resume();
    } catch { /* 무시 */ }
    let wake = null;
    try { wake = await navigator.wakeLock?.request('screen'); } catch { /* 무시 */ }
    const ac = new AbortController();
    state.rendering = true;
    state.clips.forEach((c) => { try { c.kind === 'video' && c.video.pause(); } catch { /* 무시 */ } });
    setDock('<div class="meter"><i id="meterFill"></i><span id="meterText">준비 중…</span></div><button class="btn btn-line" id="btnStop" type="button">취소</button>');
    $('btnStop').onclick = () => ac.abort();
    try {
      await ensureFont(UI.font);
      const blob = await renderMovie({
        template: selected(),
        onProgress: (p) => {
          const fill = $('meterFill'); const txt = $('meterText');
          if (fill) fill.style.width = `${Math.min(100, p * 100)}%`;
          if (txt) txt.textContent = `편집 중 ${Math.round(clamp(p, 0, 1) * 100)}% · 화면을 켜 두세요`;
        },
        signal: ac.signal,
      });
      showResult(blob);
    } catch (err) {
      if (err && err.name === 'AbortError') toast('취소했어요.', 2200);
      else toast('편집하지 못했어요: ' + ((err && err.message) || err), 6000);
    } finally {
      state.rendering = false;
      try { await wake?.release(); } catch { /* 무시 */ }
      state.clips.forEach((c) => { try { if (c.kind === 'video') c.video.muted = true; } catch { /* 무시 */ } });
      state.previewIdx = 0; state.previewT = 0;
      previewPlay();
      if (!state.result) idleDock(); else idleDock();
    }
  }

  async function renderMovie({ template, onProgress, signal }) {
    const clips = state.clips;
    const total = clips.reduce((s, c) => s + clipSeconds(c), 0) || 1;
    const canvas = document.createElement('canvas');
    canvas.width = template.W;
    canvas.height = template.H;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);

    let audioCtx = null, dest = null, bgmNode = null, bgmGain = null, voiceNode = null, clipBus = null;
    let audioOn = false;
    try {
      audioCtx = state.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      state.audioCtx = audioCtx;
      await audioCtx.resume().catch(() => {});
      dest = audioCtx.createMediaStreamDestination();
      const master = audioCtx.createDynamicsCompressor();
      master.threshold.value = -12; master.knee.value = 8; master.ratio.value = 6;
      master.attack.value = 0.004; master.release.value = 0.24;
      master.connect(dest);
      clipBus = audioCtx.createGain(); clipBus.gain.value = 1; clipBus.connect(master);
      for (const c of clips) {
        if (c.kind !== 'video') continue;
        if (!c.video._srcNode) c.video._srcNode = audioCtx.createMediaElementSource(c.video);
        c.video._srcNode.connect(clipBus);
      }
      if (state.bgm !== 'none') {
        try {
          const buf = await getBgmBuffer(state.bgm);
          if (buf) {
            bgmNode = audioCtx.createBufferSource();
            bgmNode.buffer = buf; bgmNode.loop = true;
            bgmGain = audioCtx.createGain(); bgmGain.gain.value = 0;
            bgmNode.connect(bgmGain); bgmGain.connect(master);
          }
        } catch (e) { console.warn('BGM 없이 진행', e); }
      }
      if (state.voiceBuffer) {
        voiceNode = audioCtx.createBufferSource();
        voiceNode.buffer = state.voiceBuffer;
        voiceNode.playbackRate.value = clamp(state.voiceRate, 0.5, 2);
        const vg = audioCtx.createGain();
        vg.gain.value = clamp(state.voiceVol, 0, 2);
        voiceNode.connect(vg); vg.connect(master);
      }
      const tracks = dest.stream.getAudioTracks();
      if (tracks.length) stream.addTrack(tracks[0]);
      audioOn = true;
      state.audioSummary = { on: true, bgm: !!bgmNode, voice: !!voiceNode, clipAudio: clips.some((c) => c.kind === 'video') };
    } catch (e) {
      console.warn(e);
      audioOn = false;
      state.audioSummary = { on: false };
      toast('이 브라우저에서는 소리를 담기 어려워요. 영상은 소리 없이 만들어져요.', 5000);
    }

    const mimeType = pickMime();
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: mimeType || undefined, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 });
    } catch {
      recorder = new MediaRecorder(stream);
    }
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = once(recorder, 'stop');
    recorder.start(1000);

    const at = audioCtx ? audioCtx.currentTime + 0.08 : 0;
    if (bgmNode && bgmGain) {
      const vol = clamp(state.bgmVol, 0, 1);
      const fadeIn = 0.35, fadeOut = Math.min(0.9, Math.max(0.3, total * 0.12));
      bgmGain.gain.setValueAtTime(0, at);
      bgmGain.gain.linearRampToValueAtTime(vol, at + fadeIn);
      const hold = at + Math.max(fadeIn + 0.05, total - fadeOut);
      bgmGain.gain.setValueAtTime(vol, hold);
      bgmGain.gain.linearRampToValueAtTime(0, at + total);
      try { bgmNode.start(at); } catch { try { bgmNode.start(); } catch { /* 무시 */ } }
    }
    if (voiceNode) { try { voiceNode.start(at); } catch { /* 무시 */ } }

    let done = 0;
    try {
      for (const clip of clips) {
        if (signal && signal.aborted) break;
        const d = clipSeconds(clip);
        const drawOnce = (time) => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const f = buildFrame(template, clip, time, d);
          try { template.draw(ctx, f); } catch (e) { console.error(e); }
        };
        if (clip.kind === 'video') {
          const v = clip.video;
          try { v.pause(); } catch { /* 무시 */ }
          v.loop = false; v.muted = !audioOn;
          await seeked(v);
          try { v.currentTime = clip.start; } catch { /* 무시 */ }
          await new Promise((res) => {
            let done2 = false;
            const finish = () => { if (done2) return; done2 = true; v.removeEventListener('seeked', finish); res(); };
            v.addEventListener('seeked', finish, { once: true });
            setTimeout(finish, 600);
          });
          try { await v.play(); } catch { /* 무시 */ }
          await new Promise((resolve) => {
            let ended = false;
            const finish = () => {
              if (ended) return;
              ended = true;
              v.removeEventListener('ended', finish);
              signal && signal.removeEventListener('abort', finish);
              resolve();
            };
            v.addEventListener('ended', finish);
            signal && signal.addEventListener('abort', finish);
            const tick = () => {
              if (ended) return;
              const time = clamp(v.currentTime - clip.start, 0, d);
              drawOnce(time);
              onProgress && onProgress((done + time) / total);
              if (v.currentTime >= clip.end - 0.03) return finish();
              if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) v.requestVideoFrameCallback(tick);
              else requestAnimationFrame(tick);
            };
            tick();
          });
          try { v.pause(); } catch { /* 무시 */ }
        } else {
          const start = performance.now();
          await new Promise((resolve) => {
            let ended = false;
            const finish = () => { if (ended) return; ended = true; resolve(); };
            signal && signal.addEventListener('abort', finish);
            const step = () => {
              if (ended) return;
              const el = (performance.now() - start) / 1000;
              drawOnce(clamp(el, 0, d));
              onProgress && onProgress((done + Math.min(el, d)) / total);
              if (el >= d) return finish();
              requestAnimationFrame(step);
            };
            step();
          });
        }
        done += d;
      }
    } catch (e) {
      console.error(e);
    } finally {
      await new Promise((r) => setTimeout(r, 120));
      if (recorder.state !== 'inactive') recorder.stop();
    }

    await stopped;
    try { bgmNode && bgmNode.stop(); } catch { /* 무시 */ }
    try { voiceNode && voiceNode.stop(); } catch { /* 무시 */ }
    if (clipBus) clips.forEach((c) => { try { c.video && c.video._srcNode && c.video._srcNode.disconnect(clipBus); } catch { /* 무시 */ } });
    stream.getTracks().forEach((tr) => { try { tr.stop(); } catch { /* 무시 */ } });
    clips.forEach((c) => { try { if (c.kind === 'video') { c.video.muted = true; c.video.currentTime = 0; } } catch { /* 무시 */ } });
    if (signal && signal.aborted) throw new DOMException('취소됨', 'AbortError');
    const type = (recorder.mimeType || mimeType || 'video/webm').split(';')[0];
    return new Blob(chunks, { type });
  }

  /* ---------------------------------------------------------------- 결과 */
  function showResult(blob) {
    state.result = blob;
    const rv = $('resultVideo');
    try { if (rv.src) URL.revokeObjectURL(rv.src); } catch { /* 무시 */ }
    rv.src = URL.createObjectURL(blob);
    const text = readText();
    const t = selected();
    const ext = containerOf(blob.type) || 'webm';
    const base = ($('projName').value || text.title || 'video').replace(/[\\/:*?"<>|#]/g, '').trim().slice(0, 40) || 'video';
    const name = `${base}_${t.H > t.W ? '9x16' : '16x9'}.${ext}`;
    state.resultName = name;
    $('resultBox').hidden = false;
    $('resultEmpty').hidden = true;
    $('pubState').textContent = `${Math.round(blob.size / 1024)} KB · ${ext.toUpperCase()}`;
    $('resultSpec').innerHTML = [
      `<span><b>${Math.round(blob.size / 1024)} KB</b></span>`,
      `<span><b>${t.W}×${t.H}</b></span>`,
      `<span><b>${totalDuration().toFixed(1)}초</b></span>`,
      `<span><b>${esc(blob.type.split(';')[0])}</b></span>`,
    ].join('');
    if (ext === 'mp4') {
      $('codecNote').innerHTML = '<b>MP4로 저장됐어요 ✅</b> 인스타·유튜브에 바로 올릴 수 있어요. <b>폰에 저장</b>을 누른 뒤 공유 창에서 <b>“비디오 저장”</b>을 고르세요.';
    } else {
      $('codecNote').innerHTML = '<b>이 브라우저는 MP4 녹화를 지원하지 않아 WEBM으로 만들었어요.</b> 인스타그램은 WEBM을 받지 않아요. 아이폰 <b>사파리(iOS 16+)</b>에서 다시 열면 MP4로 저장돼요.';
    }
    detectCodec(blob).then((codec) => {
      const label = codec === 'h264' ? 'H.264' : codec === 'webm' ? 'WEBM' : String(codec).toUpperCase();
      $('resultSpec').insertAdjacentHTML('beforeend', `<span>코덱 <b>${label}</b></span>`);
      if (ext === 'mp4' && (codec === 'vp9' || codec === 'av01')) {
        $('codecNote').innerHTML = `<b>MP4지만 코덱이 ${codec.toUpperCase()}이에요 ⚠️</b> 인스타그램은 <b>H.264 MP4</b>만 받아요. 아이폰 사파리에서 다시 만들면 H.264로 저장돼요.`;
      }
    });
    const isShort = t.platform !== 'youtube';
    const ytTitle = text.title || text.hook || readDeal().name || base;
    $('ytTitle').value = `${ytTitle}${isShort ? ' #Shorts' : ''}`.slice(0, 100);
    const descParts = [];
    if (text.hook) descParts.push(text.hook.replace(/\*/g, '').replace(/\n/g, ' '));
    const caps = state.clips.flatMap((c) => clipLines(c));
    if (caps.length) descParts.push(caps.map((l) => '· ' + l.replace(/\*/g, '')).join('\n'));
    if (text.items) descParts.push(itemLines().map((s, i) => `${i + 1}. ${s}`).join('\n'));
    descParts.push(buildHashtags().split(' ').slice(0, 8).join(' '));
    if (isShort) descParts.push('#Shorts');
    $('ytDesc').value = descParts.filter(Boolean).join('\n\n').slice(0, 4800);
    $('ytTags').value = [text.title, text.hook, readDeal().badge, 'Shorts'].filter(Boolean).join(', ').slice(0, 480);
    $('ytResult').hidden = true;
    syncCaption();
    setView('publish');
    toast('완성! 아래에서 저장하거나 캡션을 복사하세요.');
  }
  function detectCodec(blob) {
    if (!/mp4/.test(blob.type)) return Promise.resolve('webm');
    return blob.slice(0, 8192).arrayBuffer().then((buf) => {
      const bytes = new Uint8Array(buf);
      let s = '';
      for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
      if (s.indexOf('avcC') >= 0 || s.indexOf('avc1') >= 0) return 'h264';
      if (s.indexOf('vp09') >= 0) return 'vp9';
      if (s.indexOf('av01') >= 0) return 'av01';
      if (s.indexOf('hvc1') >= 0 || s.indexOf('hev1') >= 0) return 'hevc';
      return 'unknown';
    }).catch(() => 'unknown');
  }
  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  $('btnSave').onclick = async () => {
    if (!state.result) return toast('먼저 영상을 만들어 주세요');
    const file = new File([state.result], state.resultName || 'video.mp4', { type: state.result.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: $('projName').value || '영상' });
        return toast('공유 창에서 “비디오 저장”을 고르세요');
      } catch (e) {
        if (e && e.name === 'AbortError') return undefined;
      }
    }
    downloadBlob(state.result, state.resultName || 'video.mp4');
    toast('저장을 시작했어요. 안 되면 영상을 길게 눌러 저장해 보세요.', 5000);
    return undefined;
  };
  $('btnShare').onclick = async () => {
    if (!state.result) return toast('먼저 영상을 만들어 주세요');
    const file = new File([state.result], state.resultName || 'video.mp4', { type: state.result.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: $('projName').value || '영상' }); } catch { /* 취소 */ }
      return undefined;
    }
    return toast('이 브라우저는 공유를 지원하지 않아요. 폰에 저장을 눌러 주세요.');
  };
  document.querySelectorAll('.rtab').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('.rtab').forEach((x) => x.classList.toggle('on', x === b));
      $('paneIg').hidden = b.dataset.pane !== 'ig';
      $('paneYt').hidden = b.dataset.pane !== 'yt';
    };
  });
  function refreshPublish() {
    if (!state.result) { $('resultBox').hidden = true; $('resultEmpty').hidden = false; $('pubState').textContent = '—'; }
    syncCaption();
    renderProjects();
    renderCodecDiag();
  }

  /* ---------------------------------------------------------------- 캡션 */
  function buildCaption() {
    const text = readText();
    const d = readDeal();
    const caps = state.clips.flatMap((c) => clipLines(c));
    const name = d.name || text.title || '직구 핫딜 상품';
    const L = [];
    L.push(`${name}${d.off ? ` ${d.off}% 할인 중 🔥` : ''}`);
    L.push('');
    if (d.oldP && d.newP) L.push(`정가 ${d.oldP} → 지금 ${d.newP}${d.badge ? ` (${d.badge})` : ''}`);
    else if (d.newP) L.push(`지금 ${d.newP}${d.badge ? ` (${d.badge})` : ''}`);
    else if (d.badge) L.push(d.badge);
    if (text.hook) { L.push(''); L.push(text.hook.replace(/\*/g, '')); }
    if (caps.length) { L.push(''); caps.slice(0, 5).forEach((l) => L.push('· ' + l.replace(/\*/g, ''))); }
    if (text.items) { L.push(''); itemLines().slice(0, 6).forEach((l, i) => L.push(`${i + 1}. ${l}`)); }
    if (d.keyword) { L.push(''); L.push(`💬 댓글에 '${d.keyword}' 남겨주시면 DM으로 링크 보내드려요.`); }
    if (d.off || d.oldP || d.newP || d.badge) {
      L.push(''); L.push('※ 이 포스팅은 제휴 마케팅 활동의 일환으로 일정 수수료를 제공받습니다.');
    }
    return L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function buildHashtags() {
    const text = readText();
    const d = readDeal();
    const base = ['직구템', '해외직구', '핫딜', '가성비템', '살림템', '릴스추천', '리뷰', '추천템', '인스타쇼핑'];
    if (/블프|블랙프라이/i.test(d.badge || '')) base.unshift('블프세일', '블랙프라이데이');
    const words = `${text.title} ${d.name}`.replace(/[^\w가-힣\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length >= 2 && /[가-힣A-Za-z]/.test(w)).slice(0, 6);
    const badgeTag = d.badge ? d.badge.replace(/\s+/g, '') : '';
    const all = base.concat(words).concat(badgeTag ? [badgeTag] : []);
    const seen = new Set();
    const tags = [];
    all.forEach((t) => {
      const k = t.toLowerCase();
      if (!t || seen.has(k)) return;
      seen.add(k); tags.push('#' + t);
    });
    return tags.slice(0, 20).join(' ');
  }
  function buildDM() {
    const d = readDeal();
    const L = [];
    L.push('안녕하세요! 댓글 남겨주셔서 감사해요 🙌');
    L.push(d.name ? `${d.name} 링크 보내드릴게요.` : '문의하신 상품 링크 보내드릴게요.');
    L.push('');
    L.push('👉 링크: (여기에 제휴 링크 붙여넣기)');
    L.push('');
    if (d.oldP && d.newP) L.push(`· 정가 ${d.oldP} → 지금 ${d.newP}${d.off ? ` (${d.off}% 할인)` : ''}`);
    else if (d.newP) L.push(`· 지금 ${d.newP}${d.off ? ` (${d.off}% 할인)` : ''}`);
    if (d.badge) L.push(`· ${d.badge} 행사라 조기 종료될 수 있어요`);
    L.push('· 해외배송이라 보통 7~14일 정도 걸려요');
    L.push('· 결제 전에 쿠폰 적용 여부 꼭 확인해 주세요');
    L.push('');
    L.push('받으신 링크는 제휴 링크라, 같은 가격에 구매하셔도 저에게 소정의 수수료가 들어와요.');
    L.push('필요 없으시면 언제든 말씀해 주세요 🙂');
    return L.join('\n');
  }
  function syncCaption() {
    if (!$('capText')) return;
    $('capText').value = buildCaption();
    $('hashText').value = buildHashtags();
    $('dmText').value = buildDM();
    $('allText').value = `[캡션]\n${$('capText').value}\n\n[해시태그]\n${$('hashText').value}\n\n[자동 DM]\n${$('dmText').value}`;
  }
  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast('복사했어요 ✅');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { /* 무시 */ }
      ta.remove();
      toast(ok ? '복사했어요 ✅' : '길게 눌러 복사해 주세요');
    }
  }
  document.querySelectorAll('[data-copy]').forEach((b) => {
    b.addEventListener('click', () => copyText($(b.dataset.copy).value));
  });

  /* ---------------------------------------------------------------- YouTube */
  const YT_KEY = 'studio2.youtubeClientId';
  const YT = (() => {
    const SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
    let token = null, expiresAt = 0;
    function loadGis() {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.onload = resolve;
        s.onerror = () => reject(new Error('Google 로그인 스크립트를 불러오지 못했어요.'));
        document.head.appendChild(s);
      });
    }
    const isSignedIn = () => !!token && Date.now() < expiresAt - 60000;
    async function signIn(clientId) {
      if (!clientId) throw new Error('설정에서 Google OAuth 클라이언트 ID를 먼저 입력해 주세요.');
      await loadGis();
      return new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (r) => {
            if (r.error) return reject(new Error(r.error_description || r.error));
            token = r.access_token;
            expiresAt = Date.now() + Number(r.expires_in || 3600) * 1000;
            resolve();
          },
          error_callback: (e) => reject(new Error((e && e.message) || '로그인이 취소됐어요.')),
        });
        client.requestAccessToken();
      });
    }
    function signOut() {
      try { if (token && window.google) window.google.accounts.oauth2.revoke(token); } catch { /* 무시 */ }
      token = null; expiresAt = 0;
    }
    async function api(path, params) {
      const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
      Object.keys(params || {}).forEach((k) => url.searchParams.set(k, params[k]));
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data && data.error && data.error.message) || `YouTube API 오류 (${res.status})`);
      return data;
    }
    async function getMyChannel() {
      const d = await api('channels', { part: 'snippet,statistics', mine: 'true' });
      return (d.items && d.items[0]) || null;
    }
    async function getTrending(regionCode, max) {
      const d = await api('videos', { part: 'snippet,statistics', chart: 'mostPopular', regionCode: regionCode || 'KR', maxResults: String(max || 10) });
      return d.items || [];
    }
    async function uploadVideo(blob, meta, onProgress) {
      if (!isSignedIn()) throw new Error('YouTube에 다시 로그인해 주세요.');
      const body = {
        snippet: { title: String(meta.title || '').slice(0, 100), description: meta.description || '', tags: meta.tags || [], categoryId: meta.categoryId || '22' },
        status: { privacyStatus: meta.privacyStatus || 'private', selfDeclaredMadeForKids: false },
      };
      if (meta.publishAt) { body.status.privacyStatus = 'private'; body.status.publishAt = new Date(meta.publishAt).toISOString(); }
      const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': blob.type || 'video/mp4',
          'X-Upload-Content-Length': String(blob.size),
        },
        body: JSON.stringify(body),
      });
      if (!init.ok) {
        const e = await init.json().catch(() => ({}));
        throw new Error((e && e.error && e.error.message) || `업로드 준비 실패 (${init.status})`);
      }
      const uploadUrl = init.headers.get('Location');
      if (!uploadUrl) throw new Error('업로드 주소를 받지 못했어요.');
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', blob.type || 'video/mp4');
        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable && onProgress) onProgress(ev.loaded / ev.total); };
        xhr.onload = () => {
          let data = {};
          try { data = JSON.parse(xhr.responseText); } catch { /* 무시 */ }
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error((data && data.error && data.error.message) || `업로드 실패 (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('네트워크 오류로 업로드에 실패했어요.'));
        xhr.send(blob);
      });
    }
    return { isSignedIn, signIn, signOut, getMyChannel, getTrending, uploadVideo };
  })();
  const getClientId = () => { try { return localStorage.getItem(YT_KEY) || ''; } catch { return ''; } };
  const setClientId = (v) => { try { if (v) localStorage.setItem(YT_KEY, v); else localStorage.removeItem(YT_KEY); } catch { /* 무시 */ } };
  function setSignedUi(on, channel) {
    state.ytSigned = on;
    $('btnConnect').textContent = on ? '연결 해제' : 'YouTube 연결';
    const badge = $('channelBadge');
    if (on && channel) {
      const thumb = channel.snippet?.thumbnails?.default?.url || '';
      badge.innerHTML = `${thumb ? `<img src="${esc(thumb)}" alt="">` : ''}<b>${esc(channel.snippet.title)}</b>`;
      badge.hidden = false;
    } else {
      badge.innerHTML = '';
      badge.hidden = true;
    }
  }
  async function connect() {
    const id = getClientId();
    if (!id) { openSettings(); throw new Error('⚙️ 설정에서 Google OAuth 클라이언트 ID를 먼저 저장해 주세요.'); }
    if (location.protocol === 'file:') { openSettings(); throw new Error('파일(file://)로 열면 Google 로그인이 막혀요. https:// 주소에서 열어 주세요.'); }
    await YT.signIn(id);
    const ch = await YT.getMyChannel().catch(() => null);
    setSignedUi(true, ch);
    if (ch && !$('fChannel').value) $('fChannel').value = (ch.snippet.customUrl || ch.snippet.title || '').slice(0, 24);
    loadTrending();
  }
  $('btnConnect').onclick = async () => {
    if (YT.isSignedIn()) { YT.signOut(); setSignedUi(false); toast('YouTube 연결을 해제했어요.'); return; }
    try { await connect(); toast('YouTube 채널이 연결됐어요!'); } catch (e) { toast(e.message || '연결하지 못했어요.', 6500); }
  };
  async function loadTrending() {
    try {
      const items = await YT.getTrending('KR', 10);
      $('trendingGrid').innerHTML = items.map((v) => {
        const sn = v.snippet || {};
        const thumb = sn.thumbnails?.medium?.url || '';
        const views = Number((v.statistics && v.statistics.viewCount) || 0).toLocaleString('ko-KR');
        return `<a class="trend-item" href="https://youtu.be/${esc(v.id)}" target="_blank" rel="noopener">${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy">` : ''}<b>${esc(sn.title || '')}</b><span>${esc(sn.channelTitle || '')} · ${views}회</span></a>`;
      }).join('');
    } catch (e) { toast('인기 영상을 불러오지 못했어요: ' + (e.message || e), 5000); }
  }
  $('btnTrend').onclick = () => loadTrending();
  $('btnUpload').onclick = async () => {
    if (!state.result) return toast('먼저 영상을 만들어 주세요.');
    const title = ($('ytTitle').value || '').trim();
    if (!title) return toast('YouTube 제목을 입력해 주세요.');
    const publishAt = $('ytPublishAt').value || '';
    if (publishAt && new Date(publishAt).getTime() <= Date.now() + 60000) return toast('예약 공개 시간은 지금보다 뒤로 정해 주세요.');
    const bar = $('ytBarWrap'), res = $('ytResult');
    const fill = $('ytBar');
    try {
      if (!YT.isSignedIn()) await connect();
      bar.hidden = false; res.hidden = true;
      $('btnUpload').disabled = true;
      fill.style.width = '0%';
      const out = await YT.uploadVideo(state.result, {
        title,
        description: $('ytDesc').value,
        tags: $('ytTags').value.split(',').map((s) => s.trim()).filter(Boolean),
        privacyStatus: $('ytPrivacy').value,
        publishAt: publishAt || null,
      }, (p) => { fill.style.width = `${Math.round(p * 100)}%`; });
      if (!out || !out.id) throw new Error('업로드 응답에 영상 ID가 없어요.');
      res.innerHTML = `✅ 업로드 완료! <a href="https://youtu.be/${esc(out.id)}" target="_blank" rel="noopener">영상 보기</a> · <a href="https://studio.youtube.com/video/${esc(out.id)}/edit" target="_blank" rel="noopener">스튜디오에서 수정</a>`;
      res.hidden = false;
      toast('YouTube에 올렸어요!');
    } catch (e) {
      toast('업로드 실패: ' + (e.message || e), 7000);
      res.textContent = '업로드 실패: ' + (e.message || e);
      res.hidden = false;
    } finally {
      bar.hidden = true;
      $('btnUpload').disabled = false;
    }
  };

  /* ---------------------------------------------------------------- 설정 */
  function openSettings() {
    $('clientIdInput').value = getClientId();
    $('fileNotice').hidden = location.protocol !== 'file:';
    $('presetCount').textContent = String((window.PRESETS && window.PRESETS.presets.length) || TEMPLATES.length);
    renderCodecDiag();
    const dlg = $('settingsDialog');
    if (!dlg.open) { try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); } }
  }
  $('btnSettings').onclick = openSettings;
  $('btnSaveClient').onclick = () => {
    const v = ($('clientIdInput').value || '').trim();
    setClientId(v);
    toast(v ? '저장했어요. 이제 “YouTube 연결”을 눌러 보세요.' : '클라이언트 ID를 지웠어요.');
  };

  /* ---------------------------------------------------------------- 분석: 컷 감지
     클로드가 셋톡에 공유한 detectCuts 사양:
     · 64×114 축소 캔버스 · 10fps 샘플링
     · RGB 히스토그램 차이(16빈/채널, 임계값 th=0.32)
     · 0.3초 이내 중복 컷 제거
     · 반환 { cuts:[초], shots:[길이], avg, dur } + onProgress
     iOS Safari는 seek 뒤 onseeked가 가끔 오지 않습니다 → seek마다 1초(1000ms) 타임아웃 폴백.
     3분(180초)이 넘는 영상은 fps를 5 이하로 자동으로 낮춰 샘플 수를 줄입니다.
  */
  const CUT = {
    fps: 10, th: 0.32, dedupe: 0.3, w: 64, h: 114,
    maxSamples: 600,
    longDur: 180,   // 3분
    longFps: 5,     // 3분 초과 영상의 fps 상한
    seekMs: 1000,   // seeked 이벤트 대기 상한(iOS Safari 폴백)
  };
  const cutCanvas = document.createElement('canvas');
  cutCanvas.width = CUT.w; cutCanvas.height = CUT.h;
  const cutCtx = cutCanvas.getContext('2d', { willReadFrequently: true });
  const BINS = 16;
  function rgbHistogram(data) {
    const hist = new Float32Array(BINS * 3);
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      hist[data[i] >> 4] += 1;
      hist[BINS + (data[i + 1] >> 4)] += 1;
      hist[BINS * 2 + (data[i + 2] >> 4)] += 1;
    }
    for (let i = 0; i < hist.length; i += 1) hist[i] /= n;
    return hist;
  }
  function histDistance(a, b) {
    let total = 0;
    for (let c = 0; c < 3; c += 1) {
      let l1 = 0;
      for (let i = 0; i < BINS; i += 1) l1 += Math.abs(a[c * BINS + i] - b[c * BINS + i]);
      total += l1 / 2; // 채널마다 0~1
    }
    return total / 3;
  }
  /* seeked 이벤트가 오지 않아도 seekMs 뒤에 다음 프레임으로 넘어갑니다(폴백).
     반환값: 제때 seeked가 왔으면 true, 타임아웃이면 false. */
  function seekTo(v, t, timeout) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (timedOut) => {
        if (done) return; done = true;
        v.removeEventListener('seeked', onSeeked);
        clearTimeout(tm);
        resolve(!timedOut);
      };
      const onSeeked = () => finish(false);
      const tm = setTimeout(() => finish(true), timeout || CUT.seekMs);
      v.addEventListener('seeked', onSeeked, { once: true });
      try { v.currentTime = t; } catch { finish(false); }
    });
  }
  /* 영상 길이에 따른 샘플링 계획. 3분(180초) 초과면 fps를 5 이하로 낮춥니다. */
  function cutPlan(dur, wantFps) {
    const d = Math.max(0.1, Number(dur) || 0);
    const base = Math.max(1, Math.min(CUT.fps, Number(wantFps) || CUT.fps));
    const long = d > CUT.longDur;
    const fps = long ? Math.min(base, CUT.longFps) : base;
    const maxSamples = Math.max(30, Math.min(CUT.maxSamples, Math.ceil(fps * d)));
    const step = Math.max(1 / fps, d / maxSamples);
    return { fps, long, maxSamples, step, effFps: +(1 / step).toFixed(2) };
  }
  /* 셋톡 합의 코드(cutdetect.js) — detectCuts(file,{fps:10,th:0.32,onProgress})
     → { cuts:[초], shots:[길이], avg, dur, hookCut, ... }
     긴 영상은 maxSamples(600)프레임까지만 훑어 샘플 간격을 늘립니다. */
  async function detectCuts(file, o = {}) {
    const th = o.th || CUT.th, W = CUT.w, H = CUT.h;
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true;
    v.src = URL.createObjectURL(file);
    try {
      await Promise.race([once(v, 'loadedmetadata'), once(v, 'error').then(() => { throw new Error('영상을 열 수 없어요'); })]);
      const dur = await resolveDuration(v);
      if (!dur) throw new Error('영상 길이를 읽지 못했어요');
      const x = cutCtx;
      const plan = cutPlan(dur, o.fps);
      const step = plan.step;
      const maxN = Math.min(Number(o.maxSamples) || plan.maxSamples, plan.maxSamples);
      let prev = null, cuts = [0], checked = 0, seekTimeouts = 0;
      for (let t = 0; t < dur && checked < maxN; t += step) {
        const seekedOk = await seekTo(v, t, CUT.seekMs);
        if (!seekedOk) seekTimeouts += 1;
        try { x.drawImage(v, 0, 0, W, H); } catch { /* 무시 */ }
        const d = x.getImageData(0, 0, W, H).data, h = new Float32Array(48);
        for (let i = 0; i < d.length; i += 4) { h[d[i] >> 4]++; h[16 + (d[i + 1] >> 4)]++; h[32 + (d[i + 2] >> 4)]++; }
        if (prev) {
          let s = 0;
          for (let k = 0; k < 48; k += 1) s += Math.abs(h[k] - prev[k]);
          s /= (W * H * 6);
          if (s > th && t - cuts[cuts.length - 1] > CUT.dedupe) cuts.push(+t.toFixed(2));
        }
        prev = h;
        checked += 1;
        if (o.onProgress) o.onProgress(t / dur);
      }
      const b = [...cuts, dur];
      const shots = b.slice(1).map((e, i) => +(e - b[i]).toFixed(2));
      return {
        cuts, shots, avg: +(dur / shots.length).toFixed(2), dur: +dur.toFixed(2),
        hookCut: cuts.find((c) => c > 0 && c <= 3) || null,
        fps: plan.effFps, fpsCap: plan.fps, longVideo: plan.long, seekTimeouts,
        th, samples: checked, file, name: file.name,
      };
    } finally {
      try { v.pause(); } catch { /* 무시 */ }
      URL.revokeObjectURL(v.src);
    }
  }
  const ARC_TEMPLATE = { R1: 'info30', R2: 'label-item', R3: 'step3', R4: 'deal-review', R5: 'vlog-film' };
  /* 셋톡 합의 코드(matchType) — 평균 컷 길이만 보는 임시 규칙이라 '추정'입니다. */
  function matchType(r) { return r.avg < 1.3 ? 'R2' : r.avg < 2.0 ? 'R1' : r.avg < 3 ? 'R3' : 'R5'; }
  function arcForAvg(avg, dur) {
    const r = { avg };
    const arc = matchType(r);
    const why = {
      R1: '컷 1.3~2초의 정보형 호흡이에요 → 불만·후기로 시작하는 솔직 리뷰(R1)와 가까워요',
      R2: '컷이 1.3초보다 짧아요 → 수량·아이템을 빠르게 넘기는 리스트·하울(R2)과 가까워요',
      R3: '컷 2~3초로 과정을 보여주는 호흡이에요 → 비포/애프터 3스텝(R3)과 가까워요',
      R5: '컷이 3초 이상으로 길어요 → 여백과 무드를 살리는 감성 루틴(R5)과 가까워요',
    }[arc] || '';
    const extra = (avg >= 1.3 && avg < 2.0 && dur <= 25) ? ' 가격·비교 영상이라면 R4도 잘 맞아요(직접 골라 적용할 수 있어요).' : '';
    return { arc, why: why + extra };
  }
  const ARC_EST_NOTE = '평균 컷 길이만 보는 임시 규칙(matchType)이라 <b>추정</b>이에요. 영상 내용·상품·목적까지 보는 판단은 아니니 R칩으로 직접 바꿔 주세요.';
  async function runCutAnalysis(file) {
    const bar = $('cutBarWrap'), fill = $('cutBar'), status = $('cutStatus');
    bar.hidden = false; $('cutResult').hidden = true;
    fill.style.width = '0%';
    status.textContent = '프레임을 읽는 중…';
    try {
      const res = await detectCuts(file, {
        onProgress: (p) => {
          fill.style.width = `${Math.round(p * 100)}%`;
          status.textContent = `히스토그램 비교 ${Math.round(p * 100)}%`;
        },
      });
      const m = arcForAvg(res.avg, res.dur);
      res.arc = m.arc; res.why = m.why; res.templateId = ARC_TEMPLATE[m.arc];
      state.analysis = res;
      fill.style.width = '100%';
      status.textContent = `‘${file.name}’ 분석 완료 · ${res.dur.toFixed(1)}초 · ${res.samples}프레임 샘플 · ${res.fps}fps`;
      $('btnApplyCut').disabled = false;
      $('cutKpis').innerHTML = [
        `<div class="kpi"><b>${res.dur.toFixed(1)}s</b><span>영상 길이</span></div>`,
        `<div class="kpi"><b>${Math.max(0, res.cuts.length - 1)}</b><span>장면 전환</span></div>`,
        `<div class="kpi"><b>${res.avg.toFixed(1)}s</b><span>평균 컷(추정)</span></div>`,
      ].join('');
      document.querySelectorAll('#cutArc span').forEach((s, i) => s.classList.toggle('on', `R${i + 1}` === res.arc));
      const tl = $('cutTimeline');
      tl.innerHTML = '';
      let clock = 0;
      res.shots.forEach((len) => {
        const seg = document.createElement('div');
        seg.className = 'seg';
        seg.style.left = `${(clock / res.dur) * 100}%`;
        seg.style.width = `${Math.max(0.4, (len / res.dur) * 100)}%`;
        tl.appendChild(seg);
        clock += len;
      });
      res.cuts.filter((t) => t > 0).forEach((t) => {
        const i = document.createElement('i');
        i.style.left = `${(t / res.dur) * 100}%`;
        tl.appendChild(i);
      });
      // 0~3초 훅 체크 구간 (빨간 구간)
      const hook = document.createElement('div');
      hook.className = 'hook-zone';
      hook.style.width = `${Math.min(100, (3 / res.dur) * 100)}%`;
      tl.appendChild(hook);
      const cutList = res.cuts.filter((t) => t > 0);
      $('cutCuts').innerHTML = cutList.length
        ? `컷 시점: ${cutList.slice(0, 10).map((t) => t + 's').join(' · ')}${cutList.length > 10 ? ' …' : ''}<br>훅 컷(0~3초): <b>${res.hookCut != null ? res.hookCut + 's' : '없음 — 첫 3초에 컷을 하나 넣거나 훅 자막을 쓰세요'}</b>`
        : '장면 전환이 거의 없어요 (한 컷 영상) · 훅 컷 <b>없음</b>';
      const longNote = res.longVideo ? ` · 3분 초과라 fps를 ${res.fpsCap} 이하로 자동 낮췄어요` : '';
      const seekNote = res.seekTimeouts ? ` · seek 응답 지연 ${res.seekTimeouts}회(1초 폴백 사용)` : '';
      $('cutWhy').innerHTML = `<span class="est">추정</span>${esc(res.why)} · 추천 틀 <b>${esc(TEMPLATES.find((t) => t.id === res.templateId).name)}</b>`
        + `<br><span class="hint">${ARC_EST_NOTE}</span>`
        + `<br><span class="hint">측정: ${CUT.w}×${CUT.h} 캔버스 · RGB 히스토그램 · 기준 ${res.th} · 0.3초 중복 컷 제거 · ${res.samples}프레임 · ${res.fps}fps${longNote}${seekNote} · 빨간 구간 = 0~3초 훅 체크</span>`;
      $('cutResult').hidden = false;
    } catch (e) {
      status.textContent = '분석하지 못했어요: ' + (e.message || e);
      fill.style.width = '0%';
    }
  }
  $('cutFile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (f) runCutAnalysis(f);
  });
  document.querySelectorAll('#cutArc span').forEach((s, i) => {
    s.style.cursor = 'pointer';
    s.onclick = () => {
      if (!state.analysis) return;
      const arc = `R${i + 1}`;
      state.analysis.arc = arc;
      state.analysis.templateId = ARC_TEMPLATE[arc];
      document.querySelectorAll('#cutArc span').forEach((x) => x.classList.toggle('on', x === s));
      $('cutWhy').innerHTML = `${esc(ARC_INFO[arc].name)}(${arc})로 직접 골랐어요 · 추천 틀 <b>${esc(TEMPLATES.find((t) => t.id === state.analysis.templateId).name)}</b>`;
      $('btnApplyCut').disabled = false;
      toast(`${arc} ${ARC_INFO[arc].name} · ${TEMPLATES.find((t) => t.id === state.analysis.templateId).name}`, 2600);
    };
  });
  $('btnApplyCut').onclick = () => {
    const a = state.analysis;
    if (!a) return;
    const t = TEMPLATES.find((x) => x.id === a.templateId) || TEMPLATES[0];
    selectTemplate(t, true);
    addFiles([a.file]);
    $('btnApplyCut').disabled = true;
    setView('create');
    setTimeout(() => $('sec-media').scrollIntoView({ behavior: 'smooth' }), 120);
    toast(`${t.name} 틀로 편집을 시작해요 · ${a.arc} 평균 컷 ${a.avg.toFixed(1)}초`, 4200);
  };

  /* ---------------------------------------------------------------- 분석: 프롬프트/JSON */
  const promptKind = { v: 'p1' };
  function beatNames(cat) {
    const c = window.PRESETS && window.PRESETS.categories && window.PRESETS.categories[cat];
    return ((c && c.beats) || []).map((b) => b.role).join(' / ');
  }
  function promptSchema() {
    return [
      '{',
      ' "name": "프리셋 이름(한글, 20자 이내)",',
      ' "cat": "R1|R2|R3|R4|R5",',
      ' "dur_target": 30,',
      ' "hook": "0~3초 실제 문장(14자 이내)",',
      ' "number_beat": "숫자 후킹(수량·가격·배수)",',
      ' "beats": [{"t":"0-1.5","role":"<표준 beat 이름>","text":"이 프리셋의 실제 문구"}],',
      ' "caption": {"top_label":"상단 라벨(가격·진행·브랜드)","bottom_sub":"하단 자막 1줄"},',
      ' "bgm": "none|chill|upbeat|vlog|hook",',
      ' "cta": "댓글·저장 유도 문장",',
      ' "confidence": "높음|보통|낮음",',
      ' "need_from_user": ["근거가 부족해 직접 찍어야 할 컷 목록(없으면 빈 배열)"]',
      '}',
      '',
      '표준 beat role (beats[].role은 반드시 이 이름 중 하나)',
      `R1: ${beatNames('R1')}`,
      `R2: ${beatNames('R2')}`,
      `R3: ${beatNames('R3')}`,
      `R4: ${beatNames('R4')}`,
      `R5: ${beatNames('R5')}`,
      '',
      '캡션 고정선: top_label은 인스타 상단 UI(230px) 아래, bottom_sub는 하단 UI(330px) 위 — 마지막 줄 기준 y=1540.',
    ].join('\n');
  }
  function buildPrompt(kind = promptKind.v) {
    const url = $('refUrl').value.trim();
    const text = $('refText').value.trim();
    const product = [$('fName').value, $('fOld').value, $('fNew').value].filter(Boolean).join(' / ') || '(상품 정보 없음)';
    const base = ['금지: 없는 정보 창작, 브랜드 비방, 가격 단정, 확인되지 않은 값은 null.', '', promptSchema()];
    if (kind === 'p2') {
      return [
        '역할: 한국 인스타 릴스 기획자.',
        `제품: ${product || '(상품 정보 없음)'} / 카테고리: ${CAT_LABEL[(selected().cats || [])[0]] || '리빙'}`,
        '조건: 30초 이내 · 9:16 · 한국어 · 과장 금지 · 대가성 문구 포함.',
        '출력: JSON 배열 3개(각 안이 아래 같은 스키마). 저장률은 R4, 완주율은 R2, 신뢰는 R1을 노려 서로 다르게.',
        '',
        ...base,
      ].join('\n');
    }
    if (kind === 'p3') {
      return [
        '역할: 참고 링크 → 편집 프리셋 변환기.',
        `링크: ${url || '(없음)'}`,
        '링크 영상은 열 수 없습니다. 아래 붙여넣은 자막·캡션만 근거로 구조를 추정하세요.',
        text ? `--- 자막/캡션 시작 ---\n${text}\n--- 끝 ---` : '--- 자막/캡션 없음: 링크 제목만으로 추정하지 말고 null ---',
        '과제: 아래 JSON 하나로만 답하라.',
        '반드시 채울 것: "confidence"(높음|보통|낮음)와 "need_from_user"(근거가 부족해 사용자가 직접 찍어야 할 컷 목록).',
        '',
        ...base,
      ].join('\n');
    }
    return [
      '역할: 한국 인스타 릴스/유튜브 쇼츠 편집 분석가.',
      `입력: (1) 참고 영상 링크 ${url || '(없음)'} (2) 영상 설명/캡션/자막 ${text ? '아래' : '(없음)'}`,
      text ? `--- 자막/캡션 시작 ---\n${text}\n--- 끝 ---` : '',
      '과제: 0~3초 훅, 컷 길이, 상단 라벨/하단 자막 분리, CTA를 분석해 아래 JSON 하나로만 답하라.',
      '',
      ...base,
    ].filter((x) => x !== '').join('\n');
  }
  function syncPrompt() { if ($('promptOut')) $('promptOut').value = buildPrompt(); }
  document.querySelectorAll('#promptTabs .segbtn').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('#promptTabs .segbtn').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      promptKind.v = b.dataset.prompt;
      syncPrompt();
    };
  });
  ['refUrl', 'refText', 'fName', 'fOld', 'fNew', 'fHook', 'fTitle'].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener('input', syncPrompt);
  });
  $('btnCopyPrompt').onclick = () => { syncPrompt(); copyText($('promptOut').value); };
  $('btnLocalGuess').onclick = () => {
    const text = $('refText').value.trim();
    if (!text) return toast('자막·캡션을 먼저 붙여넣어 주세요', 3000);
    const dict = {
      R1: /후기|내돈|써봤|리뷰|단점|개월|년|사용기/g,
      R2: /다이소|테무|알리|BEST|베스트|가지|개|모음|추천|하울/g,
      R3: /전후|비포|애프터|청소|물때|곰팡이|세탁|수납|정리|얼룩/g,
      R4: /쿠팡|할인|정가|가격|최저가|배|원|세일/g,
      R5: /루틴|아침|일상|브이로그|ASMR|감성|주말/g,
    };
    let best = 'R2'; let bestN = -1;
    Object.keys(dict).forEach((k) => {
      const n = (text.match(dict[k]) || []).length;
      if (n > bestN) { bestN = n; best = k; }
    });
    const lines = text.split(/\n|[.!?]\s/).filter((s) => s.trim().length > 2).length;
    const dur = clamp(Math.round(lines * 3.2), 12, 75);
    const map = { R1: 'info30', R2: 'label-item', R3: 'step3', R4: 'deal-review', R5: 'vlog-film' };
    $('guessOut').textContent = `빠른 추정: ${best} ${ARC_INFO[best].name} · 예상 길이 ${dur}초 · 컷 ${ARC_INFO[best].cut}초 · 추천 틀 ${TEMPLATES.find((t) => t.id === map[best]).name}`;
    state.analysis = Object.assign(state.analysis || {}, { arc: best, templateId: map[best], guess: true, name: '빠른 추정' });
    return toast('AI 없이 문장만으로 추정했어요. 정확한 분석은 프롬프트를 AI에 붙여넣어 주세요.', 4200);
  };
  function normalizePreset(raw, i = 0) {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const cat = ['R1', 'R2', 'R3', 'R4', 'R5'].includes(o.cat) ? o.cat : 'R2';
    const bgm = ['none', 'chill', 'upbeat', 'vlog', 'hook'].includes(o.bgm) ? o.bgm : 'chill';
    const capRaw = o.caption;
    const caption = typeof capRaw === 'string'
      ? { top_label: '', bottom_sub: capRaw.slice(0, 120), anchor: { top_label: 230, bottom_sub: 330, captionLine: 1540 } }
      : {
        top_label: String((capRaw && capRaw.top_label) || '').slice(0, 40),
        bottom_sub: String((capRaw && capRaw.bottom_sub) || '').slice(0, 120),
        anchor: { top_label: 230, bottom_sub: 330, captionLine: 1540 },
      };
    const beats = (Array.isArray(o.beats) ? o.beats : []).slice(0, 10).map((b) => (typeof b === 'string'
      ? { t: '', role: b.slice(0, 60), text: b.slice(0, 80) }
      : { t: String(b.t || '').slice(0, 12), role: String(b.role || '').slice(0, 60), text: String(b.text || b.role || '').slice(0, 90) }));
    return {
      id: 'mine-' + Date.now().toString(36) + '-' + i,
      name: String(o.name || '내 프리셋').slice(0, 30),
      cat,
      dur_target: clamp(Math.round(Number(o.dur_target) || ARC_INFO[cat].len), 5, 180),
      hook: String(o.hook || '').slice(0, 80),
      number_beat: String(o.number_beat || '').slice(0, 40),
      beats,
      caption,
      bgm,
      cta: String(o.cta || '').slice(0, 80),
      confidence: ['높음', '보통', '낮음'].includes(o.confidence) ? o.confidence : '보통',
      need_from_user: Array.isArray(o.need_from_user) ? o.need_from_user.map((s) => String(s).slice(0, 90)).filter(Boolean).slice(0, 12) : [],
      templateId: o.templateId || ARC_TEMPLATE[cat],
      createdAt: Date.now(),
    };
  }
  $('btnMakePreset').onclick = async () => {
    const raw = $('jsonIn').value.trim();
    if (!raw) return toast('AI 답변(JSON)을 먼저 붙여넣어 주세요', 3000);
    try {
      const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(clean);
      const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.presets) ? parsed.presets : [parsed]);
      if (!list.length) throw new Error('빈 JSON');
      const made = list.map(normalizePreset);
      state.mine.push(...made);
      await dbPut('custom', made);
      renderMine();
      renderShootList(made);
      $('jsonOut').textContent = `✅ ${made.map((m) => `${m.name}(${m.confidence})`).join(', ')} 프리셋을 만들었어요. 틀 탭 → 내 프리셋에서 적용하세요.`;
      toast(`${made.length}개 프리셋을 만들었어요`, 3600);
      $('jsonIn').value = '';
    } catch (e) {
      $('jsonOut').textContent = 'JSON을 읽지 못했어요: ' + (e.message || e);
      toast('JSON 형식을 확인해 주세요. 코드블록(```)은 지워도 돼요.', 4600);
    }
  };
  function renderShootList(list) {
    const wrap = $('shootList');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!list || !list.length) return;
    const rows = [];
    list.forEach((p) => (p.need_from_user || []).forEach((t) => rows.push({ p, t })));
    const head = document.createElement('p');
    head.className = 'hint';
    head.innerHTML = `🎬 <b>촬영 준비 체크리스트</b> · 확신도 ${list.map((p) => `${esc(p.name)} ${esc(p.confidence)}`).join(' / ')}`;
    wrap.appendChild(head);
    if (!rows.length) {
      const none = document.createElement('p');
      none.className = 'hint';
      none.textContent = 'AI가 추가 촬영이 필요 없다고 판단했어요 (need_from_user 비어 있음).';
      wrap.appendChild(none);
      return;
    }
    rows.forEach(({ p, t }) => {
      const lab = document.createElement('label');
      lab.className = 'mine';
      lab.style.cursor = 'pointer';
      lab.innerHTML = `<input type="checkbox" style="width:18px;height:18px;min-height:0;flex:none;padding:0"><span style="flex:1;font-size:12px">${esc(t)}</span><small>${esc(p.name)}</small>`;
      wrap.appendChild(lab);
    });
  }
  function renderMine() {
    const wrap = $('mineList');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!state.mine.length) {
      wrap.innerHTML = '<p class="hint">아직 없어요. 분석 탭에서 AI 답변(JSON)을 붙여넣으면 여기에 쌓여요.</p>';
      return;
    }
    state.mine.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'mine';
      row.innerHTML = `<b>${esc(m.name)}</b><small>${esc(m.cat)} · ${m.dur_target}초 · 확신도 ${esc(m.confidence || '보통')}${m.need_from_user && m.need_from_user.length ? ` · 촬영 ${m.need_from_user.length}컷` : ''}</small>`;
      const apply = document.createElement('button');
      apply.className = 'mini-btn';
      apply.textContent = '적용';
      apply.style.width = 'auto';
      apply.style.padding = '0 8px';
      apply.onclick = () => {
        const t = TEMPLATES.find((x) => x.id === m.templateId) || selected();
        selectTemplate(t, true);
        $('fHook').value = m.hook || $('fHook').value;
        dirty.hook = true;
        if (m.caption && m.caption.top_label) { $('fTitle').value = m.caption.top_label; dirty.title = true; }
        if (m.caption && m.caption.bottom_sub && state.clips.length) {
          state.clips[0].captions = m.caption.bottom_sub;
          renderClips();
        } else if (m.caption && m.caption.bottom_sub) {
          $('fItems').value = m.caption.bottom_sub; dirty.items = true;
        }
        state.bgm = m.bgm;
        renderBgm();
        renderShootList([m]);
        setView('create'); renderNow(); syncCaption();
        toast(`${m.name} 적용 · ${t.name} · ${m.dur_target}초 · ${m.cta || ''}`, 4200);
      };
      const del = document.createElement('button');
      del.className = 'mini-btn del';
      del.textContent = '✕';
      del.onclick = async () => {
        state.mine = state.mine.filter((x) => x.id !== m.id);
        await dbDelete('custom', m.id);
        renderMine();
      };
      row.appendChild(apply);
      row.appendChild(del);
      wrap.appendChild(row);
    });
  }

  /* ---------------------------------------------------------------- IndexedDB */
  let dbPromise = null;
  function dbOpen() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('no idb'));
      const req = indexedDB.open('studio2', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('custom')) db.createObjectStore('custom', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }
  async function dbPut(store, value) {
    try {
      const db = await dbOpen();
      const tx = db.transaction(store, 'readwrite');
      const items = Array.isArray(value) ? value : [value];
      items.forEach((v) => tx.objectStore(store).put(v));
      await new Promise((r) => { tx.oncomplete = r; tx.onerror = r; tx.onabort = r; });
      return true;
    } catch { return false; }
  }
  async function dbGetAll(store) {
    try {
      const db = await dbOpen();
      return await new Promise((resolve) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch { return []; }
  }
  async function dbDelete(store, id) {
    try {
      const db = await dbOpen();
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(id);
      await new Promise((r) => { tx.oncomplete = r; tx.onerror = r; });
    } catch { /* 무시 */ }
  }

  /* IndexedDB 자동저장·JSON 내보내기에는 편집 데이터만 넣습니다.
     YouTube OAuth 액세스 토큰은 YT 클로저 메모리에만 있고 여기·localStorage에 들어가지 않아요.
     (localStorage에는 OAuth 클라이언트 ID만 저장 → 토큰 아님) */
  function projectData(id = 'current') {
    return {
      id,
      name: $('projName').value || '새 프로젝트',
      updatedAt: Date.now(),
      selectedId: state.selectedId,
      photoLen: state.photoLen,
      ui: { font: UI.font, weight: UI.weight, spacing: UI.spacing, captionStyle: UI.captionStyle, accent: UI.accent, safe: UI.safe },
      text: readText(),
      deal: readDeal(),
      audio: { voicePreset: state.voicePreset, voiceRate: state.voiceRate, voiceVol: state.voiceVol, bgm: state.bgm, bgmVol: state.bgmVol },
      clips: state.clips.map((c) => ({ name: c.name, kind: c.kind, duration: c.duration, start: c.start, end: c.end, captions: c.captions })),
    };
  }
  function applyProject(p) {
    if (!p) return;
    $('projName').value = p.name || '새 프로젝트';
    state.selectedId = p.selectedId || state.selectedId;
    state.photoLen = p.photoLen || state.photoLen;
    $('photoLen').value = String(state.photoLen);
    if (p.ui) Object.assign(UI, p.ui);
    if (p.text) {
      $('fHook').value = p.text.hook || '';
      $('fTitle').value = p.text.title || '';
      $('fPrice').value = p.text.price || '';
      $('fItems').value = p.text.items || '';
      $('fChannel').value = p.text.channel || '';
      Object.keys(dirty).forEach((k) => { dirty[k] = true; });
    }
    if (p.deal) {
      $('fName').value = p.deal.name || '';
      $('fOld').value = p.deal.oldP || '';
      $('fNew').value = p.deal.newP || '';
      $('fOff').value = p.deal.off || '';
      $('fBadge').value = p.deal.badge || '';
      $('fKeyword').value = p.deal.keyword || '';
    }
    if (p.audio) {
      state.voicePreset = p.audio.voicePreset || state.voicePreset;
      state.voiceRate = num(p.audio.voiceRate, state.voiceRate);
      state.voiceVol = num(p.audio.voiceVol, state.voiceVol);
      state.bgm = p.audio.bgm || state.bgm;
      state.bgmVol = num(p.audio.bgmVol, state.bgmVol);
    }
    state.pendingCaptions = {};
    state.autoCaptions = [];
    (p.clips || []).forEach((c) => { if (c.captions) state.pendingCaptions[c.name] = c.captions; });
    paintUi(); renderBgm(); refreshSans();
    $('itemsField').hidden = !(selected().need || []).includes('items');
    $('priceField').hidden = !(selected().need || []).includes('price');
    refreshCards(); renderNow(); syncCaption();
  }
  function scheduleSave() {
    $('saveState').textContent = '저장 중…';
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(async () => {
      const ok = await dbPut('projects', projectData('current'));
      $('saveState').textContent = ok ? `자동 저장됨 · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : '저장 실패 (파일로 열면 저장이 막혀요)';
      $('autosaveInfo').textContent = ok ? '자동 저장 켜짐' : '자동 저장 안 됨';
      renderProjects();
    }, 700);
  }
  async function renderProjects() {
    const list = (await dbGetAll('projects')).filter((p) => p.id !== 'current').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
    const wrap = $('projectList');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!list.length) { wrap.innerHTML = '<p class="hint">저장한 프로젝트가 아직 없어요.</p>'; return; }
    list.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'projectrow';
      row.innerHTML = `<div><b>${esc(p.name)}</b><small>${new Date(p.updatedAt).toLocaleString('ko-KR')} · ${TEMPLATES.find((t) => t.id === p.selectedId)?.name || ''}</small></div>`;
      const load = document.createElement('button');
      load.className = 'mini-btn';
      load.textContent = '열기';
      load.style.width = 'auto';
      load.style.padding = '0 8px';
      load.onclick = () => { applyProject(p); setView('create'); toast(`‘${p.name}’ 프로젝트를 열었어요. 영상을 다시 골라 주세요.`, 4200); };
      const del = document.createElement('button');
      del.className = 'mini-btn del';
      del.textContent = '✕';
      del.onclick = async () => { await dbDelete('projects', p.id); renderProjects(); };
      row.appendChild(load); row.appendChild(del);
      wrap.appendChild(row);
    });
  }
  $('btnSnapshot').onclick = async () => {
    const p = projectData('p' + Date.now().toString(36));
    const ok = await dbPut('projects', p);
    renderProjects();
    toast(ok ? `‘${p.name}’ 저장했어요` : '저장하지 못했어요', 3000);
  };
  $('btnExport').onclick = () => {
    const blob = new Blob([JSON.stringify(projectData('export'), null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${($('projName').value || 'project').replace(/[\\/:*?"<>|]/g, '')}.json`);
  };
  $('importInput').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      applyProject(JSON.parse(await f.text()));
      toast('프로젝트 설정을 불러왔어요. 영상을 다시 골라 주세요.', 4200);
    } catch { toast('JSON 파일을 읽지 못했어요', 3200); }
  });
  $('projName').addEventListener('input', scheduleSave);

  /* ---------------------------------------------------------------- PWA */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  function coachmark() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    let seen = false;
    try { seen = localStorage.getItem('studio2.coach') === '1'; } catch { seen = false; }
    if (standalone || seen) return;
    setTimeout(() => {
      $('coach').hidden = false;
      coachmark.timer = setTimeout(() => { $('coach').hidden = true; }, 7000);
    }, 2400);
    $('coachClose').onclick = () => {
      $('coach').hidden = true;
      clearTimeout(coachmark.timer);
      try { localStorage.setItem('studio2.coach', '1'); } catch { /* 무시 */ }
    };
  }

  /* ---------------------------------------------------------------- 시작 */
  async function init() {
    renderStyles();
    renderFonts();
    renderBgm();
    paintUi();
    renderClips();
    const cur = (await dbGetAll('projects')).find((p) => p.id === 'current');
    if (cur) {
      applyProject(cur);
      $('saveState').textContent = '지난 작업을 불러왔어요';
    } else {
      selectTemplate(selected(), true);
    }
    refreshCards();
    renderNow();
    const customs = await dbGetAll('custom');
    state.mine = customs.sort((a, b) => a.createdAt - b.createdAt);
    renderMine();
    renderProjects();
    renderCodecDiag();
    syncPrompt();
    coachmark();
    (async () => { for (const f of FONTS) await ensureFont(f.id); refreshCards(); renderNow(); })();
    if (await restoreCustomFonts()) { renderFonts(); refreshCards(); renderNow(); }
  }
  init();

  /* 검증·디버깅용 최소 핸들 (화면에는 쓰이지 않아요) */
  window.__studio2 = {
    state, UI, SAFE, TEMPLATES, detectCuts, cutPlan, seekTo, CUT, matchType, arcForAvg,
    projectData, applyProject, pickMime, containerOf, mimeLabel,
    CAPTION_STYLES, capStyleOf, demoLoaded, DEMO_SHOTS, FONTS, applyRefStyle, renderNow, sampleFrame, refreshCards, selectTemplate,
    Autogen: AG, autoFill: runAutoFill, autoOut: () => autoOut, renderAutoChips,
  };
})();
