/* =========================================================================
   pc.js — 틀편집 스튜디오 PC (캡컷 스타일 5트랙 타임라인 에디터)
   ① 영상/배경 ② 자막/텍스트 ③ 보이스 ④ BGM ⑤ 효과
   블록을 좌우로 끌어 타이밍을 옮기고, 양쪽 손잡이로 시작·끝을 자릅니다.
   프리셋으로 자동 구성한 뒤 바로 MP4/WebM으로 내보냅니다.
   ========================================================================= */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const uid = (() => { let n = 0; return () => 'b' + (++n); })();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const TRACKS = [
    { id: 'video', name: '영상·배경', cls: 'v', color: '#2f6bff' },
    { id: 'text', name: '자막·텍스트', cls: 't', color: '#ff5fa2' },
    { id: 'voice', name: '보이스', cls: 'a', color: '#33d6a6' },
    { id: 'bgm', name: 'BGM', cls: 'b', color: '#ffb02e' },
    { id: 'fx', name: '효과', cls: 'f', color: '#a679ff' },
  ];
  const MIN_DUR = 0.3;
  const BGMS = [
    { id: 'hook', name: '팝 훅', file: 'bgm_hook.mp3', desc: '경쾌한 팝 · 15초 루프' },
    { id: 'upbeat', name: '업비트', file: 'bgm_upbeat.mp3', desc: '신나는 리듬 · 18초 루프' },
    { id: 'chill', name: '칠', file: 'bgm_chill.mp3', desc: '잔잔한 루프 · 16초' },
    { id: 'vlog', name: '브이로그', file: 'bgm_vlog.mp3', desc: '감성 브이로그 · 16초' },
  ];
  const FX = [
    { id: 'zoom', name: '줌인', emoji: '🔍', desc: '천천히 당겨지는 카메라' },
    { id: 'pop', name: '팝', emoji: '✨', desc: '톡 튀는 확대 + 섬광' },
    { id: 'flash', name: '플래시', emoji: '⚡', desc: '하얀 섬광 한 번' },
    { id: 'vignette', name: '비네트', emoji: '🌘', desc: '가장자리 어둡게' },
    { id: 'marker', name: '형광 마커', emoji: '🖍', desc: '그 구간 자막을 라임 마커로' },
  ];
  const FONTS_PC = [
    { id: 'pretendard', family: 'Pretendard' },
    { id: 'gmarket', family: 'GmarketSans' },
    { id: 'jua', family: 'Jua' },
    { id: 'gaegu', family: 'Gaegu' },
    { id: 'nanumpen', family: 'Nanum Pen Script' },
    { id: 'singleday', family: 'Single Day' },
    { id: 'dohyeon', family: 'Do Hyeon' },
    { id: 'score', family: 'S-CoreDream' },
    /* 클로드4 실측 3종용 눈누 폰트 (fonts.css) */
    { id: 'nanumbarun', family: 'NanumBarunGothic' },
    { id: 'nanumcoding', family: 'NanumGothicCoding' },
    { id: 'kkubulim', family: 'BM Kkubulim' },
    { id: 'wavvepado', family: 'Wavve PADO' },
    { id: 'dangdang', family: 'Cafe24 Dangdanghae' },
    { id: 'kukdae', family: 'SDKukdetopokki' },
  ];

  const state = {
    name: '새 프로젝트',
    ratio: '9:16',
    t: 0,
    playing: false,
    px: 64,
    snap: true,
    safe: false,
    selected: null,
    blocks: [],
    media: [],
    frame: { top: '', footer: '' },
    exporting: false,
    exportResult: null,
    audioSummary: null,
  };
  let history = [];
  const W = () => (state.ratio === '9:16' ? 1080 : 1920);
  const H = () => (state.ratio === '9:16' ? 1920 : 1080);
  const cv = $('cv');
  const ctx = cv.getContext('2d');
  let mediaSeq = 0;

  /* ---------------------------------------------------------------- 도우미 */
  const tc = (s) => {
    const t = Math.max(0, s || 0);
    const m = Math.floor(t / 60);
    const sec = Math.floor(t % 60);
    const f = Math.floor((t % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(f).padStart(2, '0')}`;
  };
  const fmtDur = (s) => (s >= 60 ? `${Math.floor(s / 60)}분 ${Math.round(s % 60)}초` : `${(Math.round(s * 10) / 10).toFixed(1)}초`);
  let toastTimer = null;
  function toast(msg, ms = 2600) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  }
  function duration() {
    let end = 0;
    for (const b of state.blocks) end = Math.max(end, b.start + b.dur);
    return Math.max(4, Math.round(end * 10) / 10);
  }
  const trackOf = (id) => TRACKS.find((t) => t.id === id) || TRACKS[0];
  const blockById = (id) => state.blocks.find((b) => b.id === id) || null;
  const mediaById = (id) => state.media.find((m) => m.id === id) || null;
  const blocksAt = (track, t) => state.blocks.filter((b) => b.track === track && t >= b.start - 1e-6 && t < b.start + b.dur - 1e-6);
  const activeAt = (track, t) => blocksAt(track, t)[0] || null;

  function pushHistory() {
    history.push(JSON.stringify({ blocks: state.blocks, frame: state.frame, ratio: state.ratio }));
    if (history.length > 40) history.shift();
    $('btnUndo').disabled = history.length === 0;
  }
  function undo() {
    if (!history.length) return;
    const snap = JSON.parse(history.pop());
    state.blocks = snap.blocks;
    state.frame = snap.frame;
    state.ratio = snap.ratio;
    state.selected = null;
    paintRatio(); renderAll();
    $('btnUndo').disabled = history.length === 0;
    toast('한 단계 되돌렸어요');
  }

  /* ---------------------------------------------------------------- 미디어 */
  async function addImageMedia(name, url) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    try { await img.decode(); } catch { /* 늦게 열려도 그려지면 됨 */ }
    const m = { id: 'm' + (++mediaSeq), kind: 'image', name, url, el: img, w: img.naturalWidth || 1080, h: img.naturalHeight || 1920, dur: 4 };
    state.media.push(m);
    renderMedia();
    return m;
  }
  function addVideoMedia(name, url, file) {
    const v = document.createElement('video');
    v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    const m = { id: 'm' + (++mediaSeq), kind: 'video', name, url, el: v, w: 1080, h: 1920, dur: 4, file };
    const ready = new Promise((res) => {
      v.addEventListener('loadedmetadata', () => {
        m.w = v.videoWidth || 1080; m.h = v.videoHeight || 1920;
        m.dur = Number.isFinite(v.duration) && v.duration > 0.2 ? Math.min(20, v.duration) : 4;
        try { v.currentTime = 0.01; } catch { /* 무시 */ }
        res(m);
      }, { once: true });
      v.addEventListener('error', () => res(m), { once: true });
    });
    state.media.push(m);
    renderMedia();
    return ready;
  }
  function addAudioMedia(name, url, kind = 'audio', dur = 3) {
    const same = state.media.find((m) => m.url === url && m.kind === 'audio');
    if (same) return same;
    const a = document.createElement('audio');
    a.src = url; a.preload = 'auto';
    const m = { id: 'm' + (++mediaSeq), kind, name, url, el: a, dur, w: 0, h: 0 };
    a.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(a.duration) && a.duration > 0.1) m.dur = a.duration;
    }, { once: true });
    state.media.push(m);
    renderMedia();
    return m;
  }
  async function addFiles(files) {
    let n = 0;
    for (const f of files) {
      const url = URL.createObjectURL(f);
      if (/^video\//i.test(f.type) || /\.(mp4|mov|webm|m4v)$/i.test(f.name)) { await addVideoMedia(f.name, url, f); n += 1; }
      else if (/^audio\//i.test(f.type) || /\.(mp3|m4a|wav|aac|ogg)$/i.test(f.name)) { addAudioMedia(f.name, url); n += 1; }
      else { await addImageMedia(f.name, url); n += 1; }
    }
    toast(`${n}개 미디어를 올렸어요 · 목록에서 눌러 타임라인에 넣으세요`);
  }
  async function addSamples() {
    const shots = [['demo_product_1.jpg', '에어프라이어 컷'], ['demo_product_2.jpg', '욕실 소품 컷'], ['demo_product_3.jpg', '전기포트 컷']];
    const have = new Set(state.media.map((m) => m.url));
    for (const [url, name] of shots) if (!have.has(url)) await addImageMedia(name, url);
    toast('샘플 제품 컷 3장을 넣었어요');
  }

  /* ---------------------------------------------------------------- 블록 추가 */
  function baseBlock(track, start, dur, extra = {}) {
    return { id: uid(), track, start: Math.max(0, start), dur: Math.max(MIN_DUR, dur), ...extra };
  }
  function addVideoBlock(mediaId, at = state.t) {
    const m = mediaById(mediaId);
    if (!m) return null;
    const b = baseBlock('video', at, Math.min(m.dur || 4, 6), { mediaId, zoom: 0.06, fit: 'cover', label: m.name });
    pushHistory();
    state.blocks.push(b);
    select(b.id);
    renderAll();
    return b;
  }
  function addTextBlock(styleId = 'pinkPuff', at = state.t, dur = 2.4, opts = {}) {
    const b = baseBlock('text', at, dur, {
      text: '자막을 입력하세요', styleId,
      font: 'pretendard', size: 62, weight: 800, spacing: 2,
      x: 0.5, y: 0.76, align: 'center', maxLines: 2,
      ...opts,
    });
    pushHistory();
    state.blocks.push(b);
    select(b.id);
    renderAll();
    return b;
  }
  function addFxBlock(effect, at = state.t, dur = 1.2) {
    const b = baseBlock('fx', at, dur, { effect, intensity: effect === 'vignette' ? 0.45 : 0.7 });
    pushHistory();
    state.blocks.push(b);
    select(b.id);
    renderAll();
    return b;
  }
  function addBgmBlock(bgmId, at = 0, dur = duration()) {
    const bgm = BGMS.find((b) => b.id === bgmId);
    if (!bgm) return null;
    const url = bgm.file;
    const m = addAudioMedia(bgm.name, url, 'audio', dur);
    m.el.loop = true;
    const b = baseBlock('bgm', at, dur, { mediaId: m.id, volume: 0.35, fadeIn: 0.4, fadeOut: 0.6, name: bgm.name });
    state.blocks.push(b);
    renderAll();
    return b;
  }
  function select(id) {
    state.selected = id;
    for (const el of document.querySelectorAll('.blk')) el.classList.toggle('sel', el.dataset.id === id);
    renderInspector();
  }

  /* ---------------------------------------------------------------- 삭제/분할 */
  function deleteSelected() {
    const id = state.selected;
    if (!id) return toast('먼저 타임라인에서 블록을 골라 주세요');
    pushHistory();
    state.blocks = state.blocks.filter((b) => b.id !== id);
    state.selected = null;
    renderAll();
    toast('블록을 지웠어요');
  }
  function splitAt(t = state.t) {
    const target = state.selected ? blockById(state.selected) : null;
    const at = Number(t.toFixed(3));
    const list = target
      ? (at > target.start + 0.05 && at < target.start + target.dur - 0.05 ? [target] : [])
      : state.blocks.filter((b) => at > b.start + 0.05 && at < b.start + b.dur - 0.05);
    if (!list.length) return toast('재생 헤드가 블록 안에 있어야 분할할 수 있어요');
    pushHistory();
    for (const b of list) {
      const right = { ...b, id: uid(), start: at, dur: b.start + b.dur - at };
      b.dur = at - b.start;
      state.blocks.push(right);
    }
    renderAll();
    toast(`${list.length}개 블록을 ${at.toFixed(1)}초에서 나눴어요`);
  }

  /* ---------------------------------------------------------------- 그리기 */
  function mediaReady(m) {
    if (!m) return false;
    if (m.kind === 'image') return m.el.complete && m.el.naturalWidth > 0;
    if (m.kind === 'video') return m.el.readyState >= 2;
    return false;
  }
  function drawMediaFit(g, m, w, h, zoom = 1, pan = 0.5) {
    if (!mediaReady(m)) return false;
    const sw = m.kind === 'image' ? (m.el.naturalWidth || m.w) : (m.el.videoWidth || m.w);
    const sh = m.kind === 'image' ? (m.el.naturalHeight || m.h) : (m.el.videoHeight || m.h);
    const k = Math.max(w / sw, h / sh) * zoom;
    const dw = sw * k, dh = sh * k;
    const x = -(dw - w) * pan;
    const y = -(dh - h) * 0.5;
    g.imageSmoothingQuality = 'high';
    g.drawImage(m.el, x, y, dw, dh);
    return true;
  }
  function fxAt(track, t) { return state.blocks.filter((b) => b.track === track && t >= b.start && t < b.start + b.dur); }
  function zoomFactor(t) {
    let z = 1;
    for (const b of fxAt('fx', t)) {
      const p = clamp((t - b.start) / Math.max(0.001, b.dur), 0, 1);
      if (b.effect === 'zoom') z *= 1 + 0.16 * (b.intensity || 0.7) * p;
      if (b.effect === 'pop') {
        const bump = Math.sin(clamp((t - b.start) / 0.5, 0, 1) * Math.PI);
        z *= 1 + 0.09 * (b.intensity || 0.7) * bump;
      }
    }
    return z;
  }
  function drawVideoLayer(g, t, w, h) {
    const all = state.blocks.filter((b) => b.track === 'video').sort((a, b) => a.start - b.start);
    const cur = all.find((b) => t >= b.start && t < b.start + b.dur) || null;
    const idx = cur ? all.indexOf(cur) : -1;
    const nxt = idx >= 0 ? all[idx + 1] : null;
    let drew = false;
    if (cur) {
      const m = mediaById(cur.mediaId);
      const p = clamp((t - cur.start) / Math.max(0.001, cur.dur), 0, 1);
      const zoom = 1 + (cur.zoom || 0) * p;
      drew = drawMediaFit(g, m, w, h, zoom, 0.5);
      if (!drew) { g.fillStyle = '#1a1d24'; g.fillRect(0, 0, w, h); }
      if (nxt) {
        const fadeStart = nxt.start - 0.45;
        if (t > fadeStart) {
          const a = clamp((t - fadeStart) / 0.45, 0, 1);
          g.save();
          g.globalAlpha = a;
          drawMediaFit(g, mediaById(nxt.mediaId), w, h, 1.02, 0.5);
          g.restore();
        }
      }
    }
    if (!drew && !cur) {
      const grd = g.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, '#191c24');
      grd.addColorStop(1, '#0d0f14');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
    return drew;
  }
  function drawTextLayer(g, t, w, h) {
    const marker = fxAt('fx', t).some((b) => b.effect === 'marker');
    const texts = state.blocks.filter((b) => b.track === 'text' && t >= b.start && t < b.start + b.dur).sort((a, b) => a.y - b.y);
    for (const b of texts) {
      const style = capStyleOf(marker ? 'lime' : b.styleId);
      const p = clamp((t - b.start) / 0.16, 0, 1);
      const prevFont = UI.font, prevWeight = UI.weight;
      UI.font = b.font || 'pretendard';
      UI.weight = b.weight || 800;
      const size = Math.max(16, Math.round((b.size || 62) * (h / 1920)));
      drawRich(g, String(b.text || ''), {
        x: b.x * w,
        y: (b.y || 0.76) * h,
        size,
        weight: b.weight || 800,
        align: b.align || 'center',
        maxW: w * 0.9,
        maxLines: b.maxLines || 2,
        lineHeight: 1.28,
        color: style.ink,
        stroke: !!style.stroke,
        strokeW: style.stroke ? Math.max(2, size * style.strokeW) : null,
        strokeCol: style.stroke || null,
        shadow: style.shadow == null ? 20 : style.shadow,
        shadowCol: style.shadowCol || 'rgba(0,0,0,.45)',
        glow: style.glow || null,
        bar: !!style.bar,
        barColor: (style.bar && style.bar.color) || 'rgba(12,13,18,.66)',
        barRadius: (style.bar && style.bar.radius) || 16,
        barPadX: (style.bar && style.bar.padX) || 26,
        barPadY: (style.bar && style.bar.padY) || 14,
        opacity: p,
        tracking: num(b.spacing, 0),
      });
      UI.font = prevFont; UI.weight = prevWeight;
    }
  }
  function drawFxOverlays(g, t, w, h) {
    for (const b of fxAt('fx', t)) {
      const p = clamp((t - b.start) / Math.max(0.001, b.dur), 0, 1);
      if (b.effect === 'flash') {
        const a = Math.max(0, 1 - Math.abs(p - 0.18) / 0.34);
        if (a > 0) { g.save(); g.globalAlpha = a * (b.intensity || 0.7); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.restore(); }
      } else if (b.effect === 'pop') {
        const a = Math.max(0, 1 - p / 0.35) * 0.35 * (b.intensity || 0.7);
        if (a > 0) { g.save(); g.globalAlpha = a; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.restore(); }
      } else if (b.effect === 'vignette') {
        const grd = g.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.26, w / 2, h / 2, Math.max(w, h) * 0.72);
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(1, `rgba(0,0,0,${0.55 * (b.intensity || 0.45)})`);
        g.fillStyle = grd;
        g.fillRect(0, 0, w, h);
      } else if (b.effect === 'marker') {
        /* 형광 마커는 자막 스타일로 표현되고, 아래에 손그림 느낌 밑줄을 더합니다 */
        g.save();
        g.globalAlpha = 0.55;
        g.fillStyle = '#D7FF3E';
        const bw = w * 0.44, bh = h * 0.012;
        g.translate(w / 2, h * 0.9);
        g.rotate(-0.012);
        g.fillRect(-bw / 2, 0, bw, bh);
        g.restore();
      }
    }
  }
  function drawFrameLayer(g, w, h) {
    const f = state.frame || {};
    if (f.top) {
      g.save();
      g.font = `800 ${Math.round(h * 0.016)}px "Pretendard","Noto Sans KR",sans-serif`;
      g.fillStyle = 'rgba(255,255,255,.72)';
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.fillText(f.top, w / 2, h * 0.055);
      g.restore();
    }
    if (f.footer) {
      g.save();
      g.font = `700 ${Math.round(h * 0.013)}px "Pretendard","Noto Sans KR",sans-serif`;
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.textAlign = 'center';
      g.textBaseline = 'bottom';
      g.fillText(f.footer, w / 2, h * 0.945);
      g.restore();
    }
  }
  function drawSafe(g, w, h) {
    g.save();
    g.strokeStyle = 'rgba(212,255,50,.65)';
    g.lineWidth = 3;
    g.setLineDash([14, 12]);
    if (h > w) {
      g.strokeRect(0, 230 * (h / 1920), w, h - (230 + 330) * (h / 1920));
      g.beginPath(); g.moveTo(0, 1540 * (h / 1920)); g.lineTo(w, 1540 * (h / 1920)); g.stroke();
    } else {
      g.strokeRect(w * 0.04, h * 0.06, w * 0.92, h * 0.88);
    }
    g.restore();
  }
  function compose(g, t) {
    const w = W(), h = H();
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    const z = zoomFactor(t);
    g.translate(w / 2, h / 2);
    g.scale(z, z);
    g.translate(-w / 2, -h / 2);
    drawVideoLayer(g, t, w, h);
    g.restore();
    drawFxOverlays(g, t, w, h);
    drawFrameLayer(g, w, h);
    drawTextLayer(g, t, w, h);
    if (state.safe) drawSafe(g, w, h);
  }
  function renderPreview() {
    cv.width = W();
    cv.height = H();
    compose(ctx, state.t);
    $('tc').innerHTML = `${tc(state.t)} <small>/ ${tc(duration())}</small>`;
    fitCanvas();
    syncAudio();
  }
  function fitCanvas() {
    const stage = document.querySelector('.stage');
    if (!stage) return;
    const pad = 32;
    const aw = stage.clientWidth - pad;
    const ah = stage.clientHeight - pad;
    const ar = cv.width / cv.height;
    let w = aw, h = w / ar;
    if (h > ah) { h = ah; w = h * ar; }
    cv.style.width = `${Math.round(w)}px`;
    cv.style.height = `${Math.round(h)}px`;
  }

  /* ---------------------------------------------------------------- 오디오 동기화 */
  function volumeAt(b, t) {
    const rel = t - b.start;
    let v = num(b.volume, b.track === 'bgm' ? 0.35 : 1);
    const fi = num(b.fadeIn, 0), fo = num(b.fadeOut, 0);
    if (fi > 0 && rel < fi) v *= rel / fi;
    if (fo > 0 && rel > b.dur - fo) v *= Math.max(0, (b.dur - rel) / fo);
    return clamp(v, 0, 1);
  }
  function syncAudio(opts = {}) {
    const t = state.t;
    const playing = opts.exporting ? true : state.playing;
    if (!opts.exporting) {
      for (const b of state.blocks) {
        if (b.track !== 'voice' && b.track !== 'bgm') continue;
        const m = mediaById(b.mediaId);
        if (!m || !m.el) continue;
        const el = m.el;
        const inRange = t >= b.start && t < b.start + b.dur;
        if (inRange && playing) {
          const target = Math.max(0, t - b.start + num(b.offset, 0));
          if (Math.abs(el.currentTime - target) > 0.35) { try { el.currentTime = target; } catch { /* 무시 */ } }
          if (el.paused) el.play().catch(() => {});
        } else if (!el.paused) {
          el.pause();
        }
        el.volume = clamp(inRange ? volumeAt(b, t) : 0, 0, 1);
      }
    }
    /* 영상 블록은 재생/내보내기 모두 원본 엘리먼트를 재생시켜 프레임을 그립니다 */
    for (const m of state.media) {
      if (m.kind !== 'video' || !m.el) continue;
      const b = state.blocks.find((x) => x.track === 'video' && x.mediaId === m.id);
      const inRange = !!b && playing && t >= b.start && t < b.start + b.dur;
      if (inRange) {
        const target = Math.max(0, t - b.start);
        if (Math.abs(m.el.currentTime - target) > 0.45) { try { m.el.currentTime = target; } catch { /* 무시 */ } }
        if (m.el.paused) m.el.play().catch(() => {});
      } else if (!m.el.paused) {
        m.el.pause();
      }
    }
  }
  function pauseAllAudio() {
    for (const m of state.media) {
      if (m.el && m.el.pause) { try { m.el.pause(); } catch { /* 무시 */ } }
    }
  }

  /* ---------------------------------------------------------------- 재생 */
  let raf = 0, lastTs = 0;
  function play() {
    if (state.playing) return;
    if (state.t >= duration() - 0.02) state.t = 0;
    state.playing = true;
    $('btnPlay').textContent = '❚❚';
    lastTs = performance.now();
    const step = (now) => {
      if (!state.playing) return;
      const dt = Math.min(0.2, (now - lastTs) / 1000);
      lastTs = now;
      state.t += dt;
      if (state.t >= duration()) { state.t = duration(); pause(); renderPreview(); renderPlayhead(); return; }
      compose(ctx, state.t);
      $('tc').innerHTML = `${tc(state.t)} <small>/ ${tc(duration())}</small>`;
      syncAudio();
      renderPlayhead();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function pause() {
    state.playing = false;
    cancelAnimationFrame(raf);
    $('btnPlay').textContent = '▶';
    pauseAllAudio();
  }
  function seek(t) {
    state.t = clamp(num(t, 0), 0, Math.max(0.1, duration()));
    renderPreview();
    renderPlayhead();
    scheduleSave();
  }

  /* ---------------------------------------------------------------- 타임라인 */
  function timelineWidth() { return Math.max(600, duration() * state.px + 60); }
  function renderRuler() {
    const inner = $('tlInner');
    inner.style.width = `${timelineWidth()}px`;
    const ruler = $('ruler');
    const stepSec = state.px >= 44 ? 1 : state.px >= 26 ? 2 : 5;
    let html = '';
    for (let s = 0; s <= duration() + stepSec; s += stepSec) {
      const x = Math.round(s * state.px);
      html += `<div class="tick major" style="left:${x}px"></div><span class="tlabel" style="left:${x}px">${s}초</span>`;
      if (stepSec === 1) {
        const half = Math.round((s + 0.5) * state.px);
        html += `<div class="tick" style="left:${half}px"></div>`;
      }
    }
    ruler.innerHTML = html;
  }
  function renderHeads() {
    $('tlHeads').innerHTML = TRACKS.map((t) => `<div class="thead"><i style="background:${t.color}"></i>${esc(t.name)}</div>`).join('');
  }
  function blockLabel(b) {
    if (b.track === 'text') return b.text || '자막';
    if (b.track === 'video') return (mediaById(b.mediaId) || {}).name || '영상';
    if (b.track === 'fx') return (FX.find((f) => f.id === b.effect) || {}).name || '효과';
    const m = mediaById(b.mediaId);
    return b.name || (m && m.name) || '오디오';
  }
  function renderTracks() {
    const wrap = $('tracks');
    wrap.innerHTML = TRACKS.map((t) => `<div class="lane" data-lane="${t.id}"></div>`).join('');
    for (const b of state.blocks) {
      const lane = wrap.querySelector(`[data-lane="${b.track}"]`);
      if (!lane) continue;
      const el = document.createElement('div');
      const cls = b.track === 'video' ? 'v' : b.track === 'text' ? 't' : b.track === 'fx' ? 'f' : b.track === 'voice' ? 'a' : 'b';
      el.className = `blk ${cls}${state.selected === b.id ? ' sel' : ''}`;
      el.dataset.id = b.id;
      el.dataset.track = b.track;
      el.style.left = `${b.start * state.px}px`;
      el.style.width = `${Math.max(14, b.dur * state.px)}px`;
      el.title = `${blockLabel(b)} · ${b.start.toFixed(2)}s ~ ${(b.start + b.dur).toFixed(2)}s`;
      el.innerHTML = `<span class="h l"></span><span class="lbl">${esc(blockLabel(b))}</span><span class="h r"></span>`;
      lane.appendChild(el);
    }
    $('durTotal').textContent = `총 ${fmtDur(duration())}`;
  }
  function renderPlayhead() {
    const ph = $('playhead');
    ph.style.left = `${state.t * state.px}px`;
  }
  function renderTimeline() {
    renderRuler();
    renderTracks();
    renderPlayhead();
  }
  function renderAll() {
    renderTimeline();
    renderPreview();
    renderInspector();
    renderStylesPanel();
  }

  /* ---------- 타임라인 조작 (드래그 / 트리밍 / 스크럽) ---------- */
  function snapTime(v, skipId) {
    if (!state.snap) return Math.max(0, v);
    const edges = [0, state.t];
    for (const b of state.blocks) {
      if (b.id === skipId) continue;
      edges.push(b.start, b.start + b.dur);
    }
    let best = Math.round(v * 10) / 10;
    const tol = 8 / state.px;
    for (const e of edges) if (Math.abs(v - e) < tol && Math.abs(e - best) < Math.abs(v - best)) best = Math.round(e * 100) / 100;
    return Math.max(0, best);
  }
  let drag = null;
  function onPointerDown(e) {
    const ruler = e.target.closest('#ruler');
    const blk = e.target.closest('.blk');
    const grab = e.target.closest('.grab');
    if (grab || ruler) {
      if (e.button !== 0) return;
      const rect = $('tlInner').getBoundingClientRect();
      const move = (ev) => seek((ev.clientX - rect.left) / state.px);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        scheduleSave();
      };
      move(e);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      return;
    }
    if (!blk) {
      if (e.target.closest('.lane')) select(null);
      return;
    }
    const b = blockById(blk.dataset.id);
    if (!b) return;
    select(b.id);
    const mode = e.target.classList.contains('h') ? (e.target.classList.contains('l') ? 'trimL' : 'trimR') : 'move';
    drag = { b, mode, x0: e.clientX, start0: b.start, dur0: b.dur, moved: false, snap0: null };
    const move = (ev) => {
      const dt = (ev.clientX - drag.x0) / state.px;
      if (Math.abs(ev.clientX - drag.x0) > 2) drag.moved = true;
      if (!drag.moved) return;
      if (!drag.snap0) { pushHistory(); drag.snap0 = true; }
      if (drag.mode === 'move') {
        b.start = snapTime(Math.max(0, drag.start0 + dt), b.id);
      } else if (drag.mode === 'trimL') {
        const maxStart = drag.start0 + drag.dur0 - MIN_DUR;
        const ns = snapTime(clamp(drag.start0 + dt, 0, maxStart), b.id);
        b.start = ns;
        b.dur = drag.start0 + drag.dur0 - ns;
      } else {
        const end = snapTime(Math.max(b.start + MIN_DUR, drag.start0 + drag.dur0 + dt), b.id);
        b.dur = Math.max(MIN_DUR, end - b.start);
      }
      const el = document.querySelector(`.blk[data-id="${b.id}"]`);
      if (el) {
        el.style.left = `${b.start * state.px}px`;
        el.style.width = `${Math.max(14, b.dur * state.px)}px`;
        el.title = `${blockLabel(b)} · ${b.start.toFixed(2)}s ~ ${(b.start + b.dur).toFixed(2)}s`;
      }
      renderRuler();
      $('durTotal').textContent = `총 ${fmtDur(duration())}`;
      if (state.selected === b.id) renderInspector();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.querySelectorAll('.blk.dragging').forEach((x) => x.classList.remove('dragging'));
      if (drag && drag.moved) { renderAll(); scheduleSave(); }
      drag = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    blk.classList.add('dragging');
  }
  $('tlInner').addEventListener('pointerdown', onPointerDown);

  /* ---------------------------------------------------------------- 인스펙터 */
  function renderInspector() {
    const host = $('inspector');
    const b = state.selected ? blockById(state.selected) : null;
    if (!b) {
      host.innerHTML = `<h3>속성</h3>
        <p class="empty">타임라인에서 블록을 누르면 여기서 시작·길이·글씨·볼륨을 바로 고칠 수 있어요.<br><br>
        · 블록 몸통을 끌면 타이밍 이동<br>· 양쪽 끝을 끌면 시작/끝 자르기<br>· 빈 곳을 누르면 선택 해제</p>`;
      return;
    }
    const tr = trackOf(b.track);
    const common = `
      <div class="section">
        <label class="fld">시작 (초) <input type="number" step="0.1" min="0" data-fld="start" value="${b.start.toFixed(2)}"></label>
        <label class="fld">길이 (초) <input type="number" step="0.1" min="0.3" data-fld="dur" value="${b.dur.toFixed(2)}"></label>
        <p class="hint">${tr.name} · ${(b.start + b.dur).toFixed(2)}초에 끝나요</p>
      </div>`;
    let body = '';
    if (b.track === 'text') {
      body = `
        <div class="section">
          <label class="fld">자막 <textarea data-fld="text" rows="3">${esc(b.text)}</textarea></label>
          <label class="fld">스타일
            <select data-fld="styleId">${CAPTION_STYLES.map((s) => `<option value="${s.id}" ${s.id === b.styleId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
          </label>
          <div class="row2">
            <label class="fld">글씨체
              <select data-fld="font">${FONTS_PC.map((f) => `<option value="${f.id}" ${f.id === b.font ? 'selected' : ''}>${esc(f.family)}</option>`).join('')}</select>
            </label>
            <label class="fld">두께
              <select data-fld="weight">${[400, 500, 700, 800, 900].map((w) => `<option value="${w}" ${w === b.weight ? 'selected' : ''}>${w}</option>`).join('')}</select>
            </label>
          </div>
          <div class="sliderline"><span>크기</span><input type="range" min="28" max="140" step="1" data-fld="size" value="${b.size}"><output>${b.size}</output></div>
          <div class="sliderline"><span>자간</span><input type="range" min="-4" max="14" step="1" data-fld="spacing" value="${b.spacing}"><output>${b.spacing > 0 ? '+' : ''}${b.spacing}px</output></div>
          <div class="sliderline"><span>가로 위치</span><input type="range" min="0" max="1" step="0.01" data-fld="x" value="${b.x}"><output>${Math.round(b.x * 100)}%</output></div>
          <div class="sliderline"><span>세로 위치</span><input type="range" min="0" max="1" step="0.01" data-fld="y" value="${b.y}"><output>${Math.round(b.y * 100)}%</output></div>
          <label class="fld">정렬
            <select data-fld="align">${['left', 'center', 'right'].map((a) => `<option value="${a}" ${a === b.align ? 'selected' : ''}>${a === 'left' ? '왼쪽' : a === 'center' ? '가운데' : '오른쪽'}</option>`).join('')}</select>
          </label>
        </div>`;
    } else if (b.track === 'video') {
      body = `
        <div class="section">
          <label class="fld">미디어
            <select data-fld="mediaId">${state.media.filter((m) => m.kind === 'image' || m.kind === 'video').map((m) => `<option value="${m.id}" ${m.id === b.mediaId ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>
          </label>
          <div class="sliderline"><span>줌(켄번즈)</span><input type="range" min="0" max="0.3" step="0.01" data-fld="zoom" value="${b.zoom || 0}"><output>${Math.round((b.zoom || 0) * 100)}%</output></div>
          <p class="hint">블록이 길면 그만큼 천천히 확대돼요. 다음 블록과는 0.45초 겹치며 부드럽게 넘어갑니다.</p>
        </div>`;
    } else if (b.track === 'fx') {
      body = `
        <div class="section">
          <label class="fld">효과
            <select data-fld="effect">${FX.map((f) => `<option value="${f.id}" ${f.id === b.effect ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>
          </label>
          <div class="sliderline"><span>강도</span><input type="range" min="0" max="1" step="0.01" data-fld="intensity" value="${b.intensity}"><output>${Math.round(b.intensity * 100)}%</output></div>
        </div>`;
    } else {
      body = `
        <div class="section">
          <div class="sliderline"><span>볼륨</span><input type="range" min="0" max="1" step="0.01" data-fld="volume" value="${num(b.volume, 0.5)}"><output>${Math.round(num(b.volume, 0.5) * 100)}%</output></div>
          <div class="sliderline"><span>페이드인</span><input type="range" min="0" max="2" step="0.05" data-fld="fadeIn" value="${num(b.fadeIn, 0)}"><output>${num(b.fadeIn, 0).toFixed(2)}s</output></div>
          <div class="sliderline"><span>페이드아웃</span><input type="range" min="0" max="2" step="0.05" data-fld="fadeOut" value="${num(b.fadeOut, 0)}"><output>${num(b.fadeOut, 0).toFixed(2)}s</output></div>
          <p class="hint">${esc((mediaById(b.mediaId) || {}).name || b.name || '')}</p>
        </div>`;
    }
    host.innerHTML = `<h3>속성 <span class="badge" style="background:${tr.color}">${esc(tr.name)}</span></h3>${common}${body}`;
    host.querySelectorAll('[data-fld]').forEach((el) => {
      const fld = el.dataset.fld;
      const apply = (commit) => {
        if (el.type === 'range' || el.type === 'number') b[fld] = num(el.value, b[fld]);
        else b[fld] = el.value;
        if (fld === 'start' || fld === 'dur') b[fld] = Math.max(fld === 'start' ? 0 : MIN_DUR, b[fld]);
        if (fld === 'mediaId' && b.track === 'video') {
          const m = mediaById(b.mediaId);
          b.label = m ? m.name : b.label;
        }
        const out = el.parentElement.querySelector('output');
        if (out) {
          out.textContent = fld === 'spacing' ? `${b[fld] > 0 ? '+' : ''}${b[fld]}px`
            : fld === 'x' || fld === 'y' ? `${Math.round(b[fld] * 100)}%`
            : fld === 'size' || fld === 'intensity' ? `${fld === 'intensity' ? Math.round(b[fld] * 100) + '%' : b[fld]}`
            : fld === 'zoom' ? `${Math.round(b[fld] * 100)}%`
            : fld === 'volume' ? `${Math.round(b[fld] * 100)}%`
            : fld === 'fadeIn' || fld === 'fadeOut' ? `${Number(b[fld]).toFixed(2)}s` : out.textContent;
        }
        renderTracks();
        renderPreview();
        scheduleSave();
      };
      el.addEventListener('input', () => apply(false));
      el.addEventListener('change', () => apply(true));
      el.addEventListener('pointerdown', () => { if (el.type === 'range') pushHistory(); });
      el.addEventListener('focus', () => { if (el.type !== 'range') pushHistory(); }, { once: true });
    });
  }

  /* ---------------------------------------------------------------- 왼쪽 패널 */
  function renderMedia() {
    const wrap = $('mediaList');
    if (!state.media.length) {
      wrap.innerHTML = '<p class="hint" style="grid-column:1/-1">아직 미디어가 없어요. 사진·영상을 올리거나 샘플 컷을 넣어 보세요.</p>';
      return;
    }
    wrap.innerHTML = state.media.filter((m) => m.kind !== 'audio').map((m) => `
      <div class="mitem" data-media="${m.id}">
        ${m.kind === 'image' ? `<img src="${m.url}" alt="${esc(m.name)}">` : `<video src="${m.url}" muted playsinline preload="metadata"></video>`}
        <span class="mlabel">${esc(m.name)}</span>
        <button class="add" data-add="${m.id}" aria-label="타임라인에 넣기">＋</button>
      </div>`).join('');
    renderVoiceList();
  }
  function renderVoiceList() {
    const wrap = $('voiceList');
    if (!wrap) return;
    const voices = state.media.filter((m) => m.kind === 'audio' && !BGMS.some((b) => b.name === m.name));
    wrap.innerHTML = voices.length
      ? voices.map((m) => `<div class="mitem" data-media="${m.id}" style="aspect-ratio:auto;padding:8px 10px;background:var(--panel-2)">
          <div style="font-size:11.5px;font-weight:800">${esc(m.name)}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:3px">${m.dur ? m.dur.toFixed(1) + '초' : '오디오'}</div>
          <button class="add" data-add-voice="${m.id}" aria-label="보이스 트랙에 넣기">＋</button>
        </div>`).join('')
      : '<p class="hint">보이스 파일을 올리거나 아래 TTS로 만들면 여기에 쌓여요.</p>';
  }
  function addVoiceBlock(mediaId, at = 0) {
    const m = mediaById(mediaId);
    if (!m) return;
    const at2 = Math.max(0, at);
    const dur = Math.min(Math.max(0.5, m.dur || 3), Math.max(3, duration() - at2));
    const b = baseBlock('voice', at2, dur, { mediaId, volume: 1, fadeIn: 0.05, fadeOut: 0.15, name: m.name });
    pushHistory();
    state.blocks.push(b);
    select(b.id);
    renderAll();
    toast('보이스 트랙에 넣었어요 · 타임라인에서 타이밍을 맞춰 보세요');
  }
  function renderStylesPanel() {
    const wrap = $('styleTags');
    if (!wrap) return;
    wrap.innerHTML = CAPTION_STYLES.map((s) => {
      const sw = s.bar ? s.bar.color : s.ink;
      const ring = s.stroke || 'transparent';
      return `<button class="styletag" data-style="${s.id}" title="${esc(s.hint || '')}"><i style="background:${sw};box-shadow:inset 0 0 0 2px ${ring}"></i>${esc(s.name)}</button>`;
    }).join('');
  }
  function renderStaticPanels() {
    $('bgmList').innerHTML = BGMS.map((b) => `
      <button class="tile" data-bgm="${b.id}"><span class="em">🎵</span><span>${esc(b.name)}<small>${esc(b.desc)}</small></span></button>`).join('') +
      '<p class="hint" style="color:#c8b26a">🎧 앱 내 음원은 <b>저작권 프리</b>이며, A2O·ILLIT 등 인스타 유행 원곡은 업로드 시 <b>인스타 앱에서 붙이는 걸 권장</b>해요.</p>';
    $('fxList').innerHTML = FX.map((f) => `
      <button class="tile" data-fx="${f.id}"><span class="em">${f.emoji}</span><span>${esc(f.name)}<small>${esc(f.desc)}</small></span></button>`).join('');
    $('autoPreset').innerHTML = PRESETS.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    $('frameList').innerHTML = PRESETS.map((p) => `
      <button class="tile" data-preset="${p.id}"><span class="em">🎞</span><span>${esc(p.name)}<small>${esc(p.desc)}</small></span></button>`).join('');
  }

  /* ---------------------------------------------------------------- 프리셋 */
  const PRESETS = [
    {
      id: 'ref12', name: '🩷 파스텔 손글씨 · 쭉쭉 늘려줘요', desc: 'DfRcwTAqOkK · 자간 +10 · 12초',
      ratio: '9:16', len: 12, bgm: 'hook',
      frame: { top: '', footer: '' },
      build(a) {
        a.video(0, 4, 0); a.video(4, 4, 1); a.video(8, 4, 2);
        a.text(0.2, 3.2, '쭉쭉 늘려줘요', { style: 'pinkPuff', font: 'gaegu', spacing: 10, size: 78, weight: 800, y: 0.2 });
        a.text(3.4, 3.0, '이거 하나면 끝', { style: 'pinkPuff', font: 'gaegu', spacing: 8, size: 68, weight: 800, y: 0.22 });
        a.text(6.6, 2.8, '만원대 정착템', { style: 'butter', font: 'gaegu', spacing: 6, size: 70, weight: 800, y: 0.22 });
        a.text(9.6, 2.2, '댓글에 “링크”', { style: 'whiteBox', font: 'gaegu', spacing: 4, size: 62, weight: 800, y: 0.8 });
        a.fx('zoom', 0, 12, 0.5);
        a.fx('marker', 3.4, 3.0);
        a.fx('flash', 6.5, 0.5);
        a.fx('pop', 9.5, 0.8);
        a.fx('vignette', 0, 12, 0.3);
      },
    },
    {
      id: 'thing20', name: '🖤 굵은 외곽선 고딕 (thingthing.kr)', desc: '상단 중앙 2줄 · 두꺼운 검정 외곽선 · 20초',
      ratio: '9:16', len: 20, bgm: 'upbeat',
      frame: { top: '', footer: '' },
      build(a) {
        a.video(0, 5, 0); a.video(5, 5, 1); a.video(10, 5, 2); a.video(15, 5, 0);
        a.text(0.2, 4.6, '반으로 쪼개봤어요', { style: 'boldOutline', font: 'gmarket', spacing: 0, size: 104, weight: 900, y: 0.13, maxLines: 2 });
        a.text(5.2, 4.6, '진짜 속이 다르네', { style: 'boldOutline', font: 'gmarket', spacing: 0, size: 108, weight: 900, y: 0.13, maxLines: 2 });
        a.text(10.2, 4.6, '이건 소문보다 낫다', { style: 'boldOutline', font: 'gmarket', spacing: 0, size: 100, weight: 900, y: 0.13, maxLines: 2 });
        a.text(15.2, 4.4, '한 번 보면 압니다', { style: 'boldOutline', font: 'gmarket', spacing: 0, size: 104, weight: 900, y: 0.13, maxLines: 2 });
        a.fx('zoom', 0, 5, 0.4); a.fx('zoom', 10, 5, 0.4);
        a.fx('flash', 5, 0.4); a.fx('flash', 10, 0.4); a.fx('flash', 15, 0.4);
      },
    },
    {
      id: 'closeup8', name: '🔍 무자막 클로즈업 (_bbangya_bbangya_)', desc: '자막 없이 제품만 · 줌인 · 팝 BGM · 8초',
      ratio: '9:16', len: 8, bgm: 'hook',
      frame: { top: '', footer: 'bbangya.bbangya' },
      build(a) {
        a.video(0, 4, 1, 0.14); a.video(4, 4, 2, 0.14);
        /* 무자막: 글자 없이 제품 클로즈업만. 필요하면 텍스트 패널에서 추가 */
        a.fx('zoom', 0, 8, 0.6);
        a.fx('vignette', 0, 8, 0.3);
        a.fx('pop', 0, 0.5); a.fx('pop', 4, 0.5);
      },
    },
    {
      id: 'deal15', name: '🛒 직구 핫딜 15초', desc: '훅 → 가격 → 장점 → CTA · 자동 구성',
      ratio: '9:16', len: 15, bgm: 'hook',
      frame: { top: 'BLACK FRIDAY', footer: '' },
      build(a) {
        a.video(0, 4, 0); a.video(4, 4, 2); a.video(8, 4, 1); a.video(12, 3, 0);
        a.text(0.2, 3.4, '이거 모르면 손해', { style: 'butter', font: 'gmarket', spacing: 1, size: 92, weight: 900, y: 0.14 });
        a.text(3.8, 3.4, '39,900 → 19,900', { style: 'butterBox', font: 'pretendard', spacing: 0, size: 70, weight: 900, y: 0.2 });
        a.text(7.4, 3.6, '설치 10초 · 물때 안 낌', { style: 'pinkPuff', font: 'gmarket', spacing: 1, size: 64, weight: 800, y: 0.2 });
        a.text(11.4, 2.8, '댓글에 “링크” 남겨요', { style: 'whiteBox', font: 'pretendard', spacing: 1, size: 58, weight: 800, y: 0.8 });
        a.fx('zoom', 0, 15, 0.35);
        a.fx('flash', 3.8, 0.4); a.fx('flash', 7.4, 0.4); a.fx('flash', 11.4, 0.4);
        a.fx('marker', 7.4, 3.6);
        a.fx('vignette', 0, 15, 0.28);
      },
    },
    {
      /* 클로드4 실측 ① — 노랑 훅 + "N. 제품명" 섹션 + 말 자막 (따뜻·밝게) */
      id: 'review3', name: '💛 리뷰 BEST 3 (클로드4 실측)', desc: '노랑 훅 → 1·2·3 제품 섹션 + 말 자막 · 30초',
      ratio: '9:16', len: 30, bgm: 'hook',
      frame: { top: '리뷰 BEST 3', footer: '' },
      build(a) {
        a.video(0, 10, 0); a.video(10, 10, 1); a.video(20, 10, 2);
        a.text(0.1, 2.9, '리뷰 BEST 3', { style: 'butter', font: 'kukdae', spacing: 0, size: 150, weight: 900, y: 0.5, maxLines: 1 });
        a.text(3.1, 3.4, '1. 수분 크림', { style: 'boldOutline', font: 'dangdang', spacing: 0, size: 96, weight: 900, y: 0.76, maxLines: 1 });
        a.text(6.6, 3.4, '바르면 촉촉, 다음 날까지', { style: 'cream', font: 'wavvepado', spacing: -1, size: 72, weight: 700, y: 0.76, maxLines: 2 });
        a.text(10.1, 3.4, '2. 진정 앰플', { style: 'boldOutline', font: 'dangdang', spacing: 0, size: 96, weight: 900, y: 0.76, maxLines: 1 });
        a.text(13.6, 3.4, '열감 싹 잡아주는 한 방울', { style: 'cream', font: 'wavvepado', spacing: -1, size: 72, weight: 700, y: 0.76, maxLines: 2 });
        a.text(17.1, 3.4, '3. 수분 패드', { style: 'boldOutline', font: 'dangdang', spacing: 0, size: 96, weight: 900, y: 0.76, maxLines: 1 });
        a.text(20.6, 3.4, '가성비 생각하면 이게 1등', { style: 'cream', font: 'wavvepado', spacing: -1, size: 72, weight: 700, y: 0.76, maxLines: 2 });
        a.text(27.0, 2.6, '댓글에 번호 남겨 주세요', { style: 'butter', font: 'wavvepado', spacing: 0, size: 66, weight: 700, y: 0.8, maxLines: 1 });
        a.fx('zoom', 0, 30, 0.06);
        a.fx('flash', 3.0, 0.3); a.fx('flash', 10.0, 0.3); a.fx('flash', 17.0, 0.3);
      },
    },
    {
      /* 클로드4 실측 ② — 2줄 제목 고정 + 흰 각진 박스 자막 + 📢 ASMR 📢 */
      id: 'asmrbox', name: '🍠 ASMR 박스 (클로드4 실측)', desc: '2줄 제목 고정 + 각진 흰 박스 자막 · 17초',
      ratio: '9:16', len: 17, bgm: 'chill',
      frame: { top: '', footer: '' },
      build(a) {
        a.video(0, 5, 0, 0.04); a.video(5, 6, 1, 0.04); a.video(11, 6, 2, 0.04);
        a.text(0.0, 17, '봉 뜯자마자\n바삭 소리 🍠', { style: 'boldOutline', font: 'kkubulim', spacing: 0, size: 93, weight: 800, y: 0.095, maxLines: 2 });
        a.text(0.2, 5.4, '한 봉에 1,800원이에요', { style: 'whiteBox', font: 'nanumcoding', spacing: 0, size: 33, weight: 700, y: 0.66, maxLines: 2 });
        a.text(5.6, 5.4, '소리가 진짜 다르죠', { style: 'whiteBox', font: 'nanumcoding', spacing: 0, size: 33, weight: 700, y: 0.66, maxLines: 2 });
        a.text(10.8, 6.0, '한입에 다 못 먹어요', { style: 'whiteBox', font: 'nanumcoding', spacing: 0, size: 33, weight: 700, y: 0.66, maxLines: 2 });
        a.text(0.0, 17, '📢 ASMR 📢', { style: 'outline', font: 'kkubulim', spacing: 0, size: 64, weight: 700, y: 0.585, maxLines: 1 });
        a.fx('zoom', 0, 17, 0.05);
        a.fx('vignette', 0, 17, 0.2);
      },
    },
    {
      /* 클로드4 실측 ③ — 3초 타자 인트로 + 라임 번호 라벨 (매트 톤) */
      id: 'interior3', name: '🪴 인테리어 찐템 (클로드4 실측)', desc: '3초 타자 인트로 + 라임 번호·제품명·한줄평 · 16초',
      ratio: '9:16', len: 16, bgm: 'vlog',
      frame: { top: '', footer: 'living.plant' },
      build(a) {
        a.video(0, 4, 0, 0.03); a.video(4, 4, 1, 0.03); a.video(8, 4, 2, 0.03); a.video(12, 4, 0, 0.03);
        a.text(0.0, 3.0, '3년째', { style: 'outline', font: 'nanumbarun', spacing: 12, size: 128, weight: 700, y: 0.36, maxLines: 1 });
        a.text(0.0, 3.0, '잘쓰고있는', { style: 'outline', font: 'gmarket', spacing: 0, size: 75, weight: 500, y: 0.44, maxLines: 1 });
        a.text(0.3, 2.7, '찐템을 소개합니다', { style: 'outline', font: 'nanumbarun', spacing: 0, size: 124, weight: 700, y: 0.52, maxLines: 1 });
        a.text(3.1, 3.0, '1. 이케아', { style: 'lime', font: 'nanumbarun', spacing: 0, size: 33, weight: 700, y: 0.49, maxLines: 1 });
        a.text(3.1, 3.0, '원목 수납장', { style: 'outline', font: 'gmarket', spacing: 0, size: 33, weight: 500, y: 0.535, maxLines: 1 });
        a.text(3.1, 3.0, '3년째 안 바꿔요', { style: 'whiteBox', font: 'nanumbarun', spacing: 0, size: 23, weight: 700, y: 0.565, maxLines: 2 });
        a.text(6.1, 3.0, '2. 무인양품', { style: 'lime', font: 'nanumbarun', spacing: 0, size: 33, weight: 700, y: 0.49, maxLines: 1 });
        a.text(6.1, 3.0, '라탄 바구니', { style: 'outline', font: 'gmarket', spacing: 0, size: 33, weight: 500, y: 0.535, maxLines: 1 });
        a.text(6.1, 3.0, '수납이 예뻐져요', { style: 'whiteBox', font: 'nanumbarun', spacing: 0, size: 23, weight: 700, y: 0.565, maxLines: 2 });
        a.text(9.1, 3.0, '3. 한샘', { style: 'lime', font: 'nanumbarun', spacing: 0, size: 33, weight: 700, y: 0.49, maxLines: 1 });
        a.text(9.1, 3.0, '조명 스탠드', { style: 'outline', font: 'gmarket', spacing: 0, size: 33, weight: 500, y: 0.535, maxLines: 1 });
        a.text(9.1, 3.0, '저녁마다 켜두고 살아요', { style: 'whiteBox', font: 'nanumbarun', spacing: 0, size: 23, weight: 700, y: 0.565, maxLines: 2 });
        a.text(12.1, 3.4, '이 셋이면 방이 달라져요', { style: 'whiteBox', font: 'nanumbarun', spacing: 0, size: 30, weight: 700, y: 0.72, maxLines: 2 });
        a.fx('zoom', 0, 16, 0.04);
        a.fx('vignette', 0, 16, 0.18);
      },
    },
    {
      id: 'jip18', name: '🏠 자취 꿀템 3스텝 18초', desc: '단계별 자막 + 형광 마커',
      ratio: '9:16', len: 18, bgm: 'chill',
      frame: { top: '자취 5년차 정착템', footer: '' },
      build(a) {
        a.video(0, 6, 2); a.video(6, 6, 1); a.video(12, 6, 0);
        a.text(0.3, 5.4, '1. 설치 10초', { style: 'lime', font: 'pretendard', spacing: 1, size: 76, weight: 900, y: 0.16 });
        a.text(6.3, 5.4, '2. 물때 안 낌', { style: 'lime', font: 'pretendard', spacing: 1, size: 76, weight: 900, y: 0.16 });
        a.text(12.3, 5.4, '3. 만원대 가성비', { style: 'lime', font: 'pretendard', spacing: 1, size: 76, weight: 900, y: 0.16 });
        a.text(0.5, 4.8, '주방이 이렇게 달라져요', { style: 'darkPill', font: 'pretendard', spacing: 0, size: 52, weight: 700, y: 0.8 });
        a.fx('zoom', 0, 18, 0.3);
        a.fx('marker', 0.3, 5.4); a.fx('marker', 6.3, 5.4); a.fx('marker', 12.3, 5.4);
        a.fx('vignette', 0, 18, 0.25);
      },
    },
  ];

  function mediaIndex(list) {
    const imgs = state.media.filter((m) => m.kind !== 'audio');
    return imgs[list] || imgs[0];
  }
  function applyPreset(id) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    if (!state.media.some((m) => m.kind !== 'audio')) {
      toast('먼저 샘플 제품 컷이나 미디어를 넣어 주세요');
      $('btnSampleMedia').focus();
      return;
    }
    pushHistory();
    state.blocks = [];
    state.selected = null;
    state.ratio = p.ratio;
    state.frame = { ...p.frame };
    const api = {
      video(start, dur, idx, zoom = 0.06) {
        const m = mediaIndex(idx);
        if (!m) return;
        state.blocks.push(baseBlock('video', start, dur, { mediaId: m.id, zoom, fit: 'cover', label: m.name }));
      },
      text(start, dur, text, o = {}) {
        state.blocks.push(baseBlock('text', start, dur, {
          text, styleId: o.style || 'pinkPuff', font: o.font || 'pretendard',
          size: o.size || 64, weight: o.weight || 800, spacing: o.spacing == null ? 2 : o.spacing,
          x: o.x == null ? 0.5 : o.x, y: o.y == null ? 0.76 : o.y, align: o.align || 'center', maxLines: o.maxLines || 2,
        }));
      },
      fx(effect, start, dur, intensity = 0.7) {
        state.blocks.push(baseBlock('fx', start, dur, { effect, intensity }));
      },
    };
    p.build(api);
    if (p.bgm) {
      const existing = state.blocks.find((b) => b.track === 'bgm');
      if (!existing) addBgmBlock(p.bgm, 0, p.len);
    }
    /* 올려둔 보이스(TTS 포함)가 있으면 보이스 트랙에도 자동으로 넣어 5개 트랙을 모두 채웁니다 */
    if (!state.blocks.some((b) => b.track === 'voice')) {
      const vm = state.media.find((m) => m.kind === 'audio' && !BGMS.some((bg) => m.url.endsWith(bg.file)));
      if (vm) {
        state.blocks.push(baseBlock('voice', 0, Math.min(Math.max(1, vm.dur || 3), p.len), {
          mediaId: vm.id, volume: 1, fadeIn: 0.05, fadeOut: 0.15, name: vm.name,
        }));
      }
    }
    paintRatio();
    renderAll();
    toast(`${p.name} 로 5개 트랙을 구성했어요 · 블록을 끌어 타이밍만 고치세요`, 4000);
    scheduleSave();
  }

  /* ---------------------------------------------------------------- 비율/자동저장 */
  function paintRatio() {
    document.querySelectorAll('#ratioSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ratio === state.ratio)));
    renderPreview();
  }
  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 500);
  }
  function saveNow() {
    try {
      const data = {
        name: state.name, ratio: state.ratio, blocks: state.blocks, frame: state.frame,
        media: state.media.filter((m) => m.url && !m.url.startsWith('blob:')).map((m) => ({ id: m.id, kind: m.kind, name: m.name, url: m.url, dur: m.dur })),
      };
      localStorage.setItem('studio2.pc.project', JSON.stringify(data));
      $('saveState').textContent = '저장됨 ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } catch { /* 저장 실패는 무시 */ }
  }
  async function loadSaved() {
    try {
      const raw = localStorage.getItem('studio2.pc.project');
      if (!raw) return false;
      const d = JSON.parse(raw);
      state.name = d.name || state.name;
      state.ratio = d.ratio || state.ratio;
      state.frame = d.frame || state.frame;
      for (const m of d.media || []) {
        if (m.kind === 'image') { const img = new Image(); img.src = m.url; state.media.push({ ...m, el: img, w: 1080, h: 1920 }); }
      }
      state.blocks = (d.blocks || []).map((b) => ({ ...b, id: uid() }));
      $('projName').value = state.name;
      return true;
    } catch { return false; }
  }

  /* ---------------------------------------------------------------- 내보내기 */
  function pickMime(fmt) {
    const want = fmt === 'webm' ? 'webm' : 'mp4';
    const list = want === 'mp4'
      ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (const m of list) if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    return '';
  }
  async function exportVideo() {
    if (state.exporting) return;
    const fmt = $('expFormat').value;
    const dur = duration();
    const overlay = $('exportOverlay');
    overlay.hidden = false;
    $('expBar').style.width = '0%';
    $('expVideo').hidden = true;
    $('btnDownload').hidden = true;
    $('expStatus').textContent = `0.0 / ${dur.toFixed(1)}초 · ${state.ratio} ${W()}×${H()} · 녹화 준비 중…`;
    state.exporting = true;
    pause();
    state.t = 0;

    const canvas = document.createElement('canvas');
    canvas.width = W(); canvas.height = H();
    const g = canvas.getContext('2d');
    const stream = canvas.captureStream(30);

    let audioCtx = null, dest = null, master = null, audioOn = false;
    const exportEls = [];
    const usedVoice = state.blocks.some((b) => b.track === 'voice');
    const usedBgm = state.blocks.some((b) => b.track === 'bgm');
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      await audioCtx.resume().catch(() => {});
      dest = audioCtx.createMediaStreamDestination();
      master = audioCtx.createDynamicsCompressor();
      master.threshold.value = -12; master.knee.value = 8; master.ratio.value = 6;
      master.attack.value = 0.004; master.release.value = 0.24;
      master.connect(dest);
      for (const b of state.blocks) {
        if (b.track !== 'voice' && b.track !== 'bgm') continue;
        const m = mediaById(b.mediaId);
        if (!m || !m.url) continue;
        /* 재내보내기를 위해 매번 새 엘리먼트로 녹음합니다 */
        const el = new Audio();
        el.src = m.url; el.preload = 'auto';
        if (b.track === 'bgm') el.loop = true;
        const src = audioCtx.createMediaElementSource(el);
        const gain = audioCtx.createGain();
        gain.gain.value = 0;
        src.connect(gain);
        gain.connect(master);
        exportEls.push({ b, el, gain });
      }
      const at = dest.stream.getAudioTracks();
      if (at.length) stream.addTrack(at[0]);
      state.audioSummary = { on: true, voice: usedVoice, bgm: usedBgm, clipAudio: false };
      audioOn = true;
    } catch (e) {
      console.warn(e);
      state.audioSummary = { on: false };
    }

    const mime = pickMime(fmt);
    let recorder;
    try { recorder = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 }); }
    catch { recorder = new MediaRecorder(stream); }
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((res) => recorder.addEventListener('stop', res, { once: true }));

    const syncExportAudio = (t) => {
      for (const { b, el, gain } of exportEls) {
        const inRange = t >= b.start && t < b.start + b.dur;
        if (inRange) {
          const target = Math.max(0, t - b.start + num(b.offset, 0));
          if (Math.abs(el.currentTime - target) > 0.4) { try { el.currentTime = target; } catch { /* 무시 */ } }
          if (el.paused) el.play().catch(() => {});
          gain.gain.value = volumeAt(b, t);
        } else {
          if (!el.paused) el.pause();
          gain.gain.value = 0;
        }
      }
    };

    recorder.start(400);
    const startAt = performance.now() + 0.1;
    let lastT = -1;
    await new Promise((resolve) => {
      const loop = () => {
        const t = Math.max(0, (performance.now() - startAt) / 1000);
        state.t = Math.min(t, dur);
        compose(g, state.t);
        syncAudio({ exporting: true });
        syncExportAudio(state.t);
        if (t - lastT > 0.2) {
          lastT = t;
          $('expBar').style.width = `${Math.min(100, (t / dur) * 100)}%`;
          $('expStatus').textContent = `${t.toFixed(1)} / ${dur.toFixed(1)}초 · ${audioOn ? '소리 포함' : '소리 없이'} 녹화 중…`;
        }
        if (t >= dur) { resolve(); return; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    await new Promise((r) => setTimeout(r, 220));
    recorder.stop();
    await stopped;
    for (const { el } of exportEls) { try { el.pause(); el.src = ''; } catch { /* 무시 */ } }
    state.exporting = false;
    pauseAllAudio();
    if (audioCtx) { try { await audioCtx.close(); } catch { /* 무시 */ } }

    const blob = new Blob(chunks, { type: mime || 'video/webm' });
    const ext = /mp4/.test(blob.type) ? 'mp4' : 'webm';
    const url = URL.createObjectURL(blob);
    state.exportResult = { blob, url, mime: blob.type || mime, ext, bytes: blob.size, dur, audio: state.audioSummary };
    $('expBar').style.width = '100%';
    $('expStatus').textContent = `완료 · ${ext.toUpperCase()} · ${(blob.size / 1048576).toFixed(2)}MB · ${dur.toFixed(1)}초 · ${audioOn ? '소리 포함' : '소리 없음'}`;
    const v = $('expVideo');
    v.src = url;
    v.hidden = false;
    $('btnDownload').hidden = false;
    state.t = 0;
    renderAll();
    window.__pc.lastExport = state.exportResult;
    return state.exportResult;
  }
  function downloadResult() {
    const r = state.exportResult;
    if (!r) return;
    const a = document.createElement('a');
    a.href = r.url;
    a.download = `${(state.name || 'studio').replace(/[^\w가-힣-]+/g, '_')}_${Date.now()}.${r.ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ---------------------------------------------------------------- 이벤트 연결 */
  async function initMediaButtons() {
    $('fileMedia').addEventListener('change', async (e) => { await addFiles(Array.from(e.target.files || [])); e.target.value = ''; });
    $('fileVoice').addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) {
        const m = addAudioMedia(f.name, URL.createObjectURL(f));
        m.el.addEventListener('loadedmetadata', () => {
          m.dur = m.el.duration || m.dur;
          if (state.t < 0.05) addVoiceBlock(m.id, 0);
          renderVoiceList();
        }, { once: true });
      }
      e.target.value = '';
      toast('보이스 파일을 올렸어요');
    });
    $('btnSampleMedia').onclick = () => addSamples();
    $('mediaList').addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) { addVideoBlock(add.dataset.add); return; }
      const item = e.target.closest('[data-media]');
      if (item) addVideoBlock(item.dataset.media);
    });
    $('voiceList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-add-voice]');
      if (b) addVoiceBlock(b.dataset.addVoice, state.t);
    });
  }

  function bindUI() {
    document.querySelectorAll('.ptab').forEach((t) => {
      t.onclick = () => {
        document.querySelectorAll('.ptab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
        document.querySelectorAll('.ppanel').forEach((p) => p.classList.toggle('on', p.id === 'panel-' + t.dataset.ptab));
      };
    });
    document.querySelectorAll('#ratioSeg button').forEach((b) => {
      b.onclick = () => {
        if (state.ratio === b.dataset.ratio) return;
        pushHistory();
        state.ratio = b.dataset.ratio;
        paintRatio();
        renderAll();
        scheduleSave();
      };
    });
    $('projName').addEventListener('input', () => { state.name = $('projName').value; scheduleSave(); });
    $('btnPlay').onclick = () => (state.playing ? pause() : play());
    $('btnPrev').onclick = () => { pause(); seek(Math.max(0, state.t - 1 / 30)); };
    $('btnNext').onclick = () => { pause(); seek(state.t + 1 / 30); };
    $('btnSafe').onclick = () => {
      state.safe = !state.safe;
      $('btnSafe').setAttribute('aria-pressed', String(state.safe));
      renderPreview();
    };
    $('btnFit').onclick = () => fitCanvas();
    $('btnSplit').onclick = () => splitAt(state.t);
    $('btnDelete').onclick = deleteSelected;
    $('btnUndo').onclick = undo;
    $('btnZoomIn').onclick = () => { state.px = clamp(state.px * 1.25, 12, 260); $('zoomLabel').textContent = `${Math.round(state.px)}px/s`; renderTimeline(); };
    $('btnZoomOut').onclick = () => { state.px = clamp(state.px / 1.25, 12, 260); $('zoomLabel').textContent = `${Math.round(state.px)}px/s`; renderTimeline(); };
    $('chkSnap').onchange = (e) => { state.snap = e.target.checked; };
    $('btnAuto').onclick = () => applyPreset($('autoPreset').value);
    $('btnExport').onclick = () => exportVideo().catch((err) => {
      state.exporting = false;
      $('expStatus').textContent = '내보내기 실패 · ' + (err && err.message ? err.message : err);
    });
    $('btnDownload').onclick = downloadResult;
    $('btnExpClose').onclick = () => { $('exportOverlay').hidden = true; };

    document.querySelectorAll('.refbtn').forEach((b) => {
      b.onclick = () => {
        if (b.id === 'btnRefStretch') {
          const blk = addTextBlock('pinkPuff', state.t, 3, { text: '쭉쭉 늘려줘요', font: 'gaegu', spacing: 10, size: 78, weight: 800, y: 0.2 });
          toast('파스텔 손글씨 · 개구체 + 자간 +10px + 핑크+흰 테두리', 3600);
          return blk;
        }
        if (b.id === 'btnRefBold') {
          const blk = addTextBlock('boldOutline', state.t, 3, { text: '진짜 속이 다르네', font: 'gmarket', spacing: 0, size: 104, weight: 900, y: 0.13, maxLines: 2 });
          toast('굵은 외곽선 고딕 · 상단 두 줄 + 굵은 검정 테두리', 3600);
          return blk;
        }
        const blk = addTextBlock('outline', state.t, 3, { text: '한입에 반으로', font: 'jua', spacing: 2, size: 62, weight: 700, y: 0.78, maxLines: 1 });
        addBgmBlock('hook', 0, duration());
        toast('무자막 클로즈업 · 자막 없이 제품만 + 줌인 + 팝 BGM', 3600);
        return blk;
      };
    });
    document.getElementById('styleTags').addEventListener('click', (e) => {
      const b = e.target.closest('[data-style]');
      if (b) addTextBlock(b.dataset.style, state.t, 2.4);
    });
    document.getElementById('bgmList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-bgm]');
      if (!b) return;
      pushHistory();
      const exists = state.blocks.find((x) => x.track === 'bgm');
      if (exists) state.blocks = state.blocks.filter((x) => x.track !== 'bgm');
      addBgmBlock(b.dataset.bgm, 0, duration());
      renderAll();
      toast('BGM을 깔았어요 · 볼륨은 인스펙터에서');
    });
    document.getElementById('fxList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-fx]');
      if (b) addFxBlock(b.dataset.fx, state.t, 1.2);
    });
    document.getElementById('frameList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-preset]');
      if (b) applyPreset(b.dataset.preset);
    });

    document.addEventListener('keydown', (e) => {
      if (/input|textarea|select/i.test((e.target.tagName || ''))) return;
      if (e.code === 'Space') { e.preventDefault(); state.playing ? pause() : play(); }
      else if (e.key === 's' || e.key === 'S') splitAt(state.t);
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); pause(); seek(state.t + 1 / 30); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); pause(); seek(state.t - 1 / 30); }
    });
    window.addEventListener('resize', fitCanvas);
  }

  /* ---------------------------------------------------------------- TTS 연결 */
  function initTts() {
    mountTtsPanel(document.getElementById('ttsAudio'), {
      getText: () => {
        const sel = state.selected ? blockById(state.selected) : null;
        return sel && sel.track === 'text' ? String(sel.text || '') : '';
      },
      onAudio: async ({ blob, ext, providerName }) => {
        const url = URL.createObjectURL(blob);
        const m = addAudioMedia(`TTS · ${providerName}.${ext}`, url, 'audio', 3);
        try {
          const ac = new (window.AudioContext || window.webkitAudioContext)();
          const buf = await ac.decodeAudioData(await blob.arrayBuffer());
          m.dur = buf.duration;
          await ac.close();
        } catch { /* 길이를 못 재면 3초로 */ }
        addVoiceBlock(m.id, 0);
        renderVoiceList();
        return m;
      },
    });
  }

  /* ================================================ ✨ 주제만 넣고 자동 구성 (autogen.js · P4)
     주제 한 줄 → 영상/샘플 컷 + 컷별 자막 + 훅 + BGM + 전환 효과 + 추천 스타일을
     타임라인에 바로 깔고, 우측에 인스타 캡션·해시태그 복사 박스를 엽니다. */
  const AG = window.Autogen || null;
  let autoStyleId = 'auto';
  const PC_FONT_MAP = {
    pretendard: 'pretendard', gmarket: 'gmarket', jua: 'jua', gaegu: 'gaegu', nanumpen: 'nanumpen',
    singleday: 'singleday', dohyeon: 'dohyeon', score: 'score', nanumsquare: 'pretendard',
    paperlogy: 'pretendard', maruburi: 'singleday',
  };

  function renderAutoStyles() {
    const sel = $('autoStyle');
    if (!sel || !AG) return;
    sel.innerHTML = AG.STYLES.map((s) => `<option value="${s.id}">${s.emoji || ''} ${esc(s.label)}</option>`).join('');
    autoStyleId = sel.value || 'auto';
    sel.onchange = () => { autoStyleId = sel.value; };
  }
  function pcCuts() {
    const vids = state.blocks.filter((b) => b.track === 'video').length;
    const media = state.media.filter((m) => m.kind !== 'audio').length;
    return clamp(vids || media || 5, 3, 8);
  }
  function autoLayout(out) {
    const st = out.recommendedSubtitleStyle;
    if (st === 'boldOutline') return { hookY: 0.12, y: 0.16, hookSize: 104, size: 86 };
    if (st === 'pinkPuff') return { hookY: 0.2, y: 0.24, hookSize: 84, size: 66 };
    if (out.recommendedTemplateId === 'minimal-closeup') return { hookY: 0.76, y: 0.82, hookSize: 54, size: 48 };
    return { hookY: 0.2, y: 0.74, hookSize: 92, size: 64 };
  }
  async function copyAny(text) {
    const t = String(text || '');
    if (!t) return;
    try { await navigator.clipboard.writeText(t); toast('복사했어요 ✅'); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.top = '-1000px';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { /* 무시 */ }
      ta.remove();
      toast(ok ? '복사했어요 ✅' : '길게 눌러 복사해 주세요');
    }
  }
  async function voiceFromScript(text) {
    const cfg = window.__tts ? window.__tts.ttsLoad() : null;
    if (!cfg || (!cfg.key && cfg.provider !== 'custom')) {
      toast('오디오 탭의 외부 TTS에 키를 넣으면 대본으로 목소리를 만들어요');
      return false;
    }
    const src = String(text || '').trim();
    if (!src) { toast('대본이 비어 있어요'); return false; }
    const res = await window.__tts.ttsGenerate(cfg, src);
    const url = URL.createObjectURL(res.blob);
    const m = addAudioMedia(`TTS · ${res.providerName}.${res.ext}`, url, 'audio', 3);
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await ac.decodeAudioData(await res.blob.arrayBuffer());
      m.dur = buf.duration;
      await ac.close();
    } catch { /* 길이를 못 재면 기본값 */ }
    addVoiceBlock(m.id, 0);
    renderVoiceList();
    toast('보이스 트랙에 넣었어요 · 타임라인에서 길이를 맞춰 보세요');
    return true;
  }

  function showAutoBox(out) {
    const box = $('autoBox');
    if (!box) return;
    box.hidden = false;
    box.innerHTML = `
      <h3>✨ 자동 구성 · 캡션 & 해시태그</h3>
      <p class="ahint" id="abRec"></p>
      <div class="alabel">훅 (${out.hook.length}자)</div>
      <textarea id="abHook" rows="1" readonly spellcheck="false"></textarea>
      <div class="alabel">인스타 캡션</div>
      <textarea id="abCaption" rows="5" readonly spellcheck="false"></textarea>
      <div class="arow">
        <button class="btn" type="button" data-copy-one="abCaption">캡션 복사</button>
        <button class="btn" type="button" data-copy-one="abTags">태그 복사</button>
      </div>
      <div class="alabel">해시태그 ${out.hashtagList.length}개</div>
      <textarea id="abTags" rows="3" readonly spellcheck="false"></textarea>
      <div class="alabel">저장·팔로우 CTA</div>
      <textarea id="abCta" rows="2" readonly spellcheck="false"></textarea>
      <div class="alabel">보이스 대본</div>
      <textarea id="abScript" rows="4" readonly spellcheck="false"></textarea>
      <div class="arow">
        <button class="btn" type="button" id="abVoice">🎙 보이스 만들기</button>
        <button class="btn accent" type="button" id="abCopyAll">캡션+태그 복사</button>
      </div>
      <div class="arow">
        <button class="btn ghost" type="button" id="abPrompt">📋 P4 프롬프트 복사</button>
      </div>
      <p class="ahint">제휴 링크를 붙이는 포스팅이면 캡션 맨 아래 고지를 함께 남겨 주세요. 필요 없으면 지우셔도 돼요.</p>`;
    $('abRec').textContent = `${out.categoryName} · 틀 ${out.recommendedTemplateId} · 자막 ${out.recommendedSubtitleStyle} · BGM ${out.recommendedBgm}${out.source === 'ai' ? ' · AI(gpt-4o-mini)' : ' · 내장 생성기'} · 컷 ${out.scenes.length}개`;
    $('abHook').value = out.hook;
    $('abCaption').value = out.caption;
    $('abTags').value = out.hashtags;
    $('abCta').value = out.cta;
    $('abScript').value = out.voiceScript;
    box.querySelectorAll('[data-copy-one]').forEach((b) => { b.onclick = () => copyAny($(b.dataset.copyOne).value); });
    $('abCopyAll').onclick = () => copyAny(`${out.caption}\n\n${out.hashtags}\n\n${out.disclosure}`);
    $('abPrompt').onclick = () => copyAny(AG.buildP4Prompt($('autoTopic').value.trim() || out.topic, autoStyleId, out.cuts));
    $('abVoice').onclick = async () => {
      const b = $('abVoice');
      b.disabled = true; b.textContent = '만드는 중…';
      try { await voiceFromScript(out.voiceScript); } catch (e) { toast('⚠ ' + ((e && e.message) || e)); }
      finally { b.disabled = false; b.textContent = '🎙 보이스 만들기'; }
    };
  }

  async function autoCompose() {
    if (!AG) return toast('자동 생성기를 불러오지 못했어요 (autogen.js)');
    const topic = $('autoTopic').value.trim();
    if (!topic) { toast('주제를 한 줄 적어 주세요'); $('autoTopic').focus(); return; }
    const btn = $('btnAutoCompose');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = $('chkAutoAI').checked ? '🤖 만드는 중…' : '✨ 만드는 중…';
    try {
      const cuts = pcCuts();
      const useAI = $('chkAutoAI').checked;
      const out = useAI
        ? await AG.generateAsync(topic, autoStyleId, { ai: true, cuts })
        : AG.generate(topic, autoStyleId, { cuts });
      if (!out) throw new Error('주제를 다시 확인해 주세요');
      if (!state.media.some((m) => m.kind !== 'audio')) await addSamples();
      pushHistory();
      state.blocks = [];
      state.selected = null;
      state.ratio = '9:16';
      state.name = topic.slice(0, 40);
      $('projName').value = state.name;
      state.frame = { top: out.badge, footer: '' };
      paintRatio();
      const per = 3;
      const len = Math.round(out.scenes.length * per * 10) / 10;
      const imgs = state.media.filter((m) => m.kind !== 'audio');
      const L = autoLayout(out);
      const font = PC_FONT_MAP[out.recommendedFont] || 'pretendard';
      const hookDur = Math.min(1.6, per * 0.55);
      out.scenes.forEach((sc, i) => {
        const m = imgs[i % imgs.length];
        if (m) state.blocks.push(baseBlock('video', i * per, per, { mediaId: m.id, zoom: 0.08, fit: 'cover', label: m.name }));
        const tStart = i === 0 ? hookDur + 0.1 : i * per + 0.18;
        const tDur = i === 0 ? (per - hookDur - 0.25) : (per - 0.45);
        state.blocks.push(baseBlock('text', tStart, tDur, {
          text: sc.sub, styleId: out.recommendedSubtitleStyle, font,
          size: L.size, weight: out.recommendedWeight || 800, spacing: out.recommendedSpacing || 0,
          x: 0.5, y: L.y, align: 'center', maxLines: 2,
        }));
        if (i > 0) state.blocks.push(baseBlock('fx', i * per, 0.45, { effect: 'flash', intensity: 0.6 }));
      });
      state.blocks.push(baseBlock('text', 0.1, hookDur, {
        text: out.hook, styleId: out.recommendedSubtitleStyle, font,
        size: L.hookSize, weight: 900, spacing: out.recommendedSpacing || 0,
        x: 0.5, y: L.hookY, align: 'center', maxLines: 2,
      }));
      addBgmBlock(out.recommendedBgm, 0, len);
      state.blocks.push(baseBlock('fx', 0, len, { effect: 'zoom', intensity: 0.5 }));
      state.blocks.push(baseBlock('fx', 0, len, { effect: 'vignette', intensity: 0.28 }));
      const vm = state.media.find((m) => m.kind === 'audio' && !BGMS.some((b) => m.url.endsWith(b.file)));
      if (vm) state.blocks.push(baseBlock('voice', 0, len, { mediaId: vm.id, volume: 1, fadeIn: 0.05, fadeOut: 0.15, name: vm.name }));
      renderAll();
      scheduleSave();
      showAutoBox(out);
      toast(`✨ ${out.categoryName} · 컷 ${out.scenes.length}개 · 5개 트랙 구성 완료${out.source === 'ai' ? ' (AI)' : ''}`, 4200);
    } catch (e) {
      toast('⚠ ' + ((e && e.message) || e), 4600);
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  /* ---------------------------------------------------------------- 시작 */
  async function init() {
    renderHeads();
    renderStylesPanel();
    renderStaticPanels();
    renderAutoStyles();
    bindUI();
    initMediaButtons();
    initTts();
    const restored = await loadSaved();
    paintRatio();
    if (!restored) {
      $('btnSampleMedia').focus();
    }
    $('saveState').textContent = restored ? '지난 작업을 불러왔어요' : '자동 저장';
    $('zoomLabel').textContent = `${Math.round(state.px)}px/s`;
    if ($('btnAutoCompose')) {
      $('btnAutoCompose').onclick = autoCompose;
      $('autoTopic').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); autoCompose(); } });
    }
    renderAll();
    fitCanvas();
    // 글꼴이 늦게 열려도 한 번 더 그립니다
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => renderPreview()).catch(() => {});
    setTimeout(() => { renderPreview(); }, 600);
  }
  init();

  /* 검증·디버깅용 최소 핸들 */
  window.__pc = {
    state, duration, compose, seek, play, pause, applyPreset, exportVideo, PRESETS, TRACKS, BGMS, FX,
    addTextBlock, addFxBlock, addBgmBlock, addVideoBlock, addSamples, splitAt, deleteSelected,
    pickMime, blockById, select, renderAll, CAPTION_STYLES, snapTime, FX_ON: FX,
    Autogen: AG, autoCompose, showAutoBox, voiceFromScript,
  };
})();
