/* =========================================================================
   틀편집 스튜디오 2.0 — engine.js
   틀(템플릿) 13종 · 글씨/자막 그리기 · 카테고리(R1~R5) 분석값
   이 파일은 화면(studio2.html)과 앱 로직(app.js)이 함께 씁니다.
   ========================================================================= */

/* ---------- 글씨체 (인플루언서 추천 8종 · CDN 내장) ---------- */
const FONTS = [
  { id: 'pretendard', family: 'Pretendard', name: '프리텐다드', sample: '자취 5년차', badge: '인기 1위 · 깔끔 리뷰', top: true },
  { id: 'gmarket', family: 'GmarketSans', name: 'G마켓 산스', sample: '만원대 가성비', badge: '후킹·가격 1위' },
  { id: 'score', family: 'S-CoreDream', name: '에스코어 드림', sample: '세련된 모던', badge: '세련된 모던' },
  { id: 'paperlogy', family: 'Paperlogy', name: '페이퍼로지', sample: '요즘 감성', badge: '요즘 감성' },
  { id: 'jua', family: 'Jua', name: '배민 주아체', sample: '이거 뭐야', badge: '친근한 살림', single: true },
  { id: 'nanumsquare', family: 'NanumSquareNeo', name: '나눔스퀘어 네오', sample: '물때 안 낌', badge: '모던 정보형' },
  { id: 'maruburi', family: 'MaruBuri', name: '마루 부리', sample: '오늘도 천천히', badge: '감성 무드' },
  { id: 'dohyeon', family: 'Do Hyeon', name: '배민 도현체', sample: '이건 정착템', badge: '강한 제목 훅', single: true },
];
const ACCENTS = {
  lime: { color: '#D7FF3E', name: '라임' },
  yellow: { color: '#FFD84D', name: '노랑' },
  pink: { color: '#FF5FA2', name: '핑크' },
};
const UI = {
  font: 'pretendard',
  captionStyle: 'outline', // outline | bar
  accent: 'lime',
  safe: false,
  weight: 700,   // 400 | 500 | 700 | 900
  spacing: 0,    // 자간 px · -4 ~ +6
};
/* 셋톡에서 클로드와 합의한 캡션 고정선
   · top_label : 인스타 상단 UI 아래(safe.top 230)부터
   · bottom_sub: 인스타 하단 UI 위(safe.bottom 330) — 마지막 줄 기준 captionLine 1540
   · 9:16(1080×1920) 기준 값이고, 16:9 틀은 화면 아래 여백을 씁니다 */
const SAFE = {
  top: 230,
  bottom: 330,
  rail: { x: 870, y: 1060, w: 210, h: 640 },
  feedSquare: { y: 420, h: 1080 },
  captionLine: 1540,
  bottomEdge: 1590,
};
const safeLabelY = () => SAFE.top;
const safeSubBottom = (f) => (f && f.H > f.W ? SAFE.captionLine : f.H - 120);

const SANS_BASE = '"Pretendard", "Noto Sans KR", system-ui, sans-serif';
let SANS = SANS_BASE;
const fontOf = (id) => FONTS.find((f) => f.id === (id || UI.font)) || FONTS[0];
const fontFamily = () => `"${fontOf().family}", "Noto Sans KR", system-ui, sans-serif`;
const accentColor = () => (ACCENTS[UI.accent] || ACCENTS.lime).color;
/* 포팅한 원본(index.html) 틀들이 쓰는 글꼴도 사용자가 고른 글씨체를 따릅니다 */
function refreshSans() { SANS = fontFamily(); }

/* ---------- 글씨 두께 ---------- */
const WEIGHT_CHOICES = [400, 500, 700, 900];
const WEIGHT_SHIFT = {
  400: { 400: 400, 500: 400, 600: 400, 700: 400, 800: 500, 900: 600 },
  500: { 400: 400, 500: 500, 600: 500, 700: 500, 800: 600, 900: 700 },
  900: { 400: 600, 500: 700, 600: 800, 700: 900, 800: 900, 900: 900 },
};
function tw(base) {
  const sel = UI.weight || 700;
  const b = clamp(Math.round((Number(base) || 700) / 100) * 100, 400, 900);
  if (sel === 700) return b;
  const row = WEIGHT_SHIFT[sel];
  return (row && row[b]) || b;
}
const fontStr = (weight, size) => `${tw(weight)} ${size}px ${fontFamily()}`;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const easeOut = ease;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- 자간: 글자 단위로 직접 그려 iOS 16~17.3 사파리에서도 동일 ---------- */
const spacingNow = () => UI.spacing || 0;
const charsOf = (s) => Array.from(String(s == null ? '' : s));
function eachChar(ctx, str, x, sp, fn) {
  let cx = x;
  const run = charsOf(str);
  for (let i = 0; i < run.length; i += 1) {
    const c = run[i];
    const w = ctx.measureText(c).width;
    fn(c, cx);
    cx += w + sp;
  }
  return cx;
}
function measureSpaced(ctx, str, sp) {
  if (!sp) return ctx.measureText(str).width;
  const run = charsOf(str);
  if (run.length < 2) return ctx.measureText(str).width;
  let w = 0;
  for (let i = 0; i < run.length; i += 1) w += ctx.measureText(run[i]).width;
  return w + sp * (run.length - 1);
}
const widthOf = (ctx, str) => measureSpaced(ctx, str, spacingNow());
function fillTxt(ctx, str, x, y) {
  const sp = spacingNow();
  if (!sp) { ctx.fillText(str, x, y); return; }
  eachChar(ctx, str, x, sp, (c, xx) => ctx.fillText(c, xx, y));
}
function fauxPx(size, weight) {
  if (UI.weight !== 900 || tw(weight) < 900) return 0;
  return size * (fontOf().single ? 0.008 : 0.014);
}
async function ensureFont(id = UI.font, weights = [400, 500, 600, 700, 800, 900]) {
  const f = fontOf(id);
  if (!document.fonts || !document.fonts.load) return false;
  try {
    await Promise.all(weights.map((w) => document.fonts.load(`${w} 40px "${f.family}"`).catch(() => null)));
    return document.fonts.check(`${weights[0]} 40px "${f.family}"`);
  } catch {
    return false;
  }
}

/* ---------- 그리기 도우미 ---------- */
function fit(srcW, srcH, boxW, boxH, mode) {
  const s = mode === 'cover' ? Math.max(boxW / srcW, boxH / srcH) : Math.min(boxW / srcW, boxH / srcH);
  const w = srcW * s, h = srcH * s;
  return { w, h, x: (boxW - w) / 2, y: (boxH - h) / 2 };
}
function drawFullFrame(ctx, f) {
  const r = fit(f.srcW, f.srcH, f.W, f.H, 'cover');
  ctx.drawImage(f.src, r.x, r.y, r.w, r.h);
}
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function drawTracked(ctx, str, x, y, opt = {}) {
  const { size = 26, weight = 700, spacing = 6, color = 'rgba(255,255,255,0.7)', align = 'left', baseline = 'top', alpha = 1 } = opt;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = fontStr(weight, size);
  ctx.fillStyle = color;
  ctx.textBaseline = baseline;
  ctx.textAlign = 'left';
  const chars = String(str == null ? '' : str).split('');
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((s, w) => s + w, 0) + spacing * Math.max(0, chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  chars.forEach((c, i) => { ctx.fillText(c, cx + spacing / 2, y); cx += widths[i] + spacing; });
  ctx.restore();
  return total;
}
function truncate(ctx, str, maxW) {
  let s = String(str == null ? '' : str);
  if (widthOf(ctx, s) <= maxW) return s;
  while (s.length > 1 && widthOf(ctx, s + '…') > maxW) s = s.slice(0, -1);
  return s + '…';
}

/* ---------- 리치 텍스트: *강조* + 줄바꿈 + 외곽선/바 ---------- */
function parsePara(para) {
  const tokens = [];
  let acc = false, cur = '', sp = false;
  const push = () => { if (cur) { tokens.push({ t: cur, a: acc, sp }); cur = ''; sp = false; } };
  for (const ch of String(para)) {
    if (ch === '*') { if (cur) push(); acc = !acc; continue; }
    if (/\s/.test(ch)) { push(); sp = true; continue; }
    cur += ch;
  }
  push();
  if (tokens.length) tokens[0].sp = false;
  return tokens;
}
function parseRich(text) {
  const paras = String(text == null ? '' : text).split('\n').map((p) => p.trim());
  return paras
    .filter((para, i) => para || (i > 0 && i < paras.length - 1))
    .map(parsePara);
}
function layoutRich(ctx, text, size, weight, maxW) {
  ctx.font = fontStr(weight, size);
  const sp = spacingNow();
  const space = ctx.measureText(' ').width * 1.02 + sp;
  const lines = [];
  const pushLine = (cur, curW) => lines.push({ words: cur, width: curW });
  for (const para of parseRich(text)) {
    if (!para.length) { lines.push({ words: [], width: 0, gap: true }); continue; }
    let cur = [], curW = 0;
    for (const w of para) {
      let ww = measureSpaced(ctx, w.t, sp);
      if (cur.length && curW + (w.sp ? space : 0) + ww > maxW) { pushLine(cur, curW); cur = []; curW = 0; }
      if (!cur.length && ww > maxW) {
        let chunk = '';
        for (const ch of w.t) {
          if (chunk && measureSpaced(ctx, chunk + ch, sp) > maxW) {
            pushLine([{ t: chunk, a: w.a, sp: false }], measureSpaced(ctx, chunk, sp));
            chunk = ch;
          } else chunk += ch;
        }
        ww = measureSpaced(ctx, chunk, sp);
        cur = [{ t: chunk, a: w.a, sp: false }]; curW = ww;
        continue;
      }
      const lead = cur.length && w.sp ? space : 0;
      if (!cur.length) { cur = [{ ...w, sp: false }]; curW = ww; }
      else { cur.push(w); curW += lead + ww; }
    }
    if (cur.length) pushLine(cur, curW);
  }
  return { lines, space, lineH: size };
}
function drawRich(ctx, text, opt = {}) {
  const {
    x = 540, y = 900, bottom = null, size = 60, weight = 800,
    color = '#FFFFFF', align = 'center', maxW = 900, lineHeight = 1.32, maxLines = 3,
    stroke = true, shadow = 22, opacity = 1, bar = false,
    barColor = 'rgba(10,11,16,0.46)', barPadX = 34, barPadY = 20, barRadius = 26,
    accent = accentColor(), lineGap = 1,
  } = opt;
  if (!String(text || '').trim()) return { h: 0, y0: y };
  ctx.save();
  ctx.globalAlpha *= opacity;
  const { lines: all, space } = layoutRich(ctx, text, size, weight, maxW);
  const lines = all.slice(0, maxLines);
  const lh = size * lineHeight;
  const totalH = lines.reduce((s, l, i) => s + (l.gap ? lh * 0.55 : lh * lineGap), 0);
  const y0 = bottom == null ? y : bottom - totalH;

  if (bar) {
    let maxLineW = 0;
    for (const l of lines) if (l.words.length) maxLineW = Math.max(maxLineW, l.width);
    const bw = Math.min(maxW + barPadX * 2, maxLineW + barPadX * 2);
    const bh = totalH + barPadY * 2;
    const bx = align === 'center' ? x - bw / 2 : align === 'right' ? x - bw : x - barPadX;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = barColor;
    roundRect(ctx, bx, y0 - barPadY, bw, bh, barRadius);
    ctx.fill();
    ctx.restore();
  }

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const sp = spacingNow();
  const fb = fauxPx(size, weight);
  let cy = y0;
  for (const line of lines) {
    if (line.gap) { cy += lh * 0.55; continue; }
    let cx = align === 'center' ? x - line.width / 2 : align === 'right' ? x - line.width : x;
    line.words.forEach((w, i) => {
      if (i > 0 && w.sp) cx += space;
      ctx.font = fontStr(weight, size);
      const ww = measureSpaced(ctx, w.t, sp);
      const ty = cy + (lh - size) / 2;
      const run = (fn) => (sp ? eachChar(ctx, w.t, cx, sp, (c, xx) => fn(c, xx, ty)) : fn(w.t, cx, ty));
      if (stroke) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2, size * 0.085);
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = shadow; ctx.shadowOffsetY = size * 0.06; }
        run((t, xx, yy) => ctx.strokeText(t, xx, yy));
        ctx.restore();
      } else if (shadow) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = shadow;
        ctx.shadowOffsetY = size * 0.06;
        ctx.fillStyle = w.a ? accent : color;
        run((t, xx, yy) => ctx.fillText(t, xx, yy));
        ctx.restore();
      }
      ctx.fillStyle = w.a ? accent : color;
      run((t, xx, yy) => ctx.fillText(t, xx, yy));
      if (fb) {
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.lineJoin = 'round';
        ctx.lineWidth = fb;
        ctx.strokeStyle = ctx.fillStyle;
        run((t, xx, yy) => ctx.strokeText(t, xx, yy));
        ctx.restore();
      }
      cx += ww;
    });
    cy += lh * lineGap;
  }
  ctx.restore();
  return { h: totalH, y0 };
}

function drawCaptionArea(ctx, f, o = {}) {
  if (!f.caption) return;
  const style = UI.captionStyle;
  drawRich(ctx, f.caption, {
    x: o.x != null ? o.x : f.W / 2,
    bottom: o.bottom != null ? o.bottom : safeSubBottom(f),
    size: o.size || 58, weight: o.weight || 700,
    align: o.align || 'center',
    maxW: o.maxW || f.W * 0.78, maxLines: o.maxLines || 2,
    lineHeight: o.lineHeight || 1.34,
    color: 'rgba(255,255,255,0.98)',
    stroke: style === 'outline',
    shadow: style === 'outline' ? 22 : 14,
    bar: style === 'bar',
    opacity: Math.min(1, 0.35 + f.captionP * 7),
    barColor: o.barColor || 'rgba(10,11,16,0.46)',
  });
}

/* ---------- 유리 패널 · 효과 ---------- */
const frostCanvas = document.createElement('canvas');
function frostSample(f, k) {
  const bw = Math.max(8, Math.round(f.W * k));
  const bh = Math.max(8, Math.round(f.H * k));
  frostCanvas.width = bw;
  frostCanvas.height = bh;
  const c = frostCanvas.getContext('2d');
  c.clearRect(0, 0, bw, bh);
  const r = fit(f.srcW, f.srcH, bw, bh, 'cover');
  c.drawImage(f.src, r.x, r.y, r.w, r.h);
  return { canvas: frostCanvas, k };
}
function frostedPanel(ctx, f, x, y, w, h, r, opt = {}) {
  const { tint = 'rgba(255,255,255,0.16)', border = 'rgba(255,255,255,0.30)', sample = null, blur = 1 / 16 } = opt;
  const s = sample || frostSample(f, blur);
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(s.canvas, x * s.k, y * s.k, w * s.k, h * s.k, x, y, w, h);
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(x, y, w, h); }
  ctx.restore();
  if (border) {
    ctx.save();
    roundRect(ctx, x + 1, y + 1, w - 2, h - 2, Math.max(2, r - 1));
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = border;
    ctx.stroke();
    ctx.restore();
  }
}
function scrimTop(ctx, f, h, a) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, f.W, h);
}
function scrimBottom(ctx, f, h, a) {
  const g = ctx.createLinearGradient(0, f.H - h, 0, f.H);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, f.H - h, f.W, h);
}
function vignette(ctx, w, h, a) {
  const g = ctx.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.24, w / 2, h * 0.5, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
let grainTile = null;
function grain(ctx, w, h, alpha = 0.05) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = grainTile.height = 128;
    const g = grainTile.getContext('2d');
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (110 + Math.random() * 90) | 0;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 70;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  const p = ctx.createPattern(grainTile, 'repeat');
  if (p) { ctx.fillStyle = p; ctx.fillRect(0, 0, w, h); }
  ctx.restore();
}
const timecode = (s) => {
  const v = Math.max(0, Math.floor(s || 0));
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};
function captionFor(lines, t, dur) {
  if (!lines || !lines.length) return { text: '', p: 0 };
  if (lines.length === 1) return { text: lines[0], p: Math.min(1, (t || 0) / 0.7) };
  if (!dur) return { text: lines[0], p: 1 };
  const raw = (t / dur) * lines.length;
  const i = clamp(Math.floor(raw), 0, lines.length - 1);
  return { text: lines[i], p: Math.min(1, raw - i + 0.001) };
}

/* ---------- 세이프존 (미리보기 전용) ---------- */
function drawSafeZones(ctx, W, H) {
  const topH = SAFE.top, botY = H - SAFE.bottom, railW = SAFE.rail.w, railY = SAFE.rail.y, railH = SAFE.rail.h;
  ctx.save();
  ctx.fillStyle = 'rgba(255,45,85,0.16)';
  ctx.fillRect(0, 0, W, topH);
  ctx.fillRect(0, botY, W, H - botY);
  ctx.fillRect(W - railW, railY, railW, railH);
  const sq = (H - W) / 2;
  ctx.strokeStyle = 'rgba(0,229,255,0.95)';
  ctx.lineWidth = 5;
  ctx.setLineDash([26, 20]);
  ctx.strokeRect(2, sq, W - 4, W);
  ctx.strokeStyle = 'rgba(215,255,62,0.9)';
  ctx.setLineDash([16, 14]);
  ctx.beginPath(); ctx.moveTo(0, H - 380); ctx.lineTo(W, H - 380); ctx.stroke();
  ctx.strokeStyle = 'rgba(212,255,50,0.45)';
  ctx.setLineDash([8, 10]);
  ctx.beginPath(); ctx.moveTo(0, H - SAFE.bottom); ctx.lineTo(W, H - SAFE.bottom); ctx.stroke();
  ctx.setLineDash([]);
  ctx.setLineDash([]);
  const label = (txt, x, y) => {
    ctx.font = fontStr(700, 30);
    const tw2 = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, x, y, tw2 + 28, 44, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x + 14, y + 23);
  };
  label('인스타 상단 UI', 24, 26);
  label('캡션·프로필 UI', 24, H - 300);
  label('버튼 영역', W - 214, railY + 18);
  label('1:1 피드 썸네일', 24, sq + 16);
  label('자막 안전선', 24, H - 372);
  ctx.restore();
}

/* =========================================================================
   포팅용 도우미 — 기존 index.html 틀들이 쓰는 함수
   ========================================================================= */
function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text == null ? '' : text).split('\n')) {
    let line = '';
    for (const ch of para) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = ch; }
      else line = test;
    }
    out.push(line);
  }
  return out.filter((l, i, a) => l.length || a.length === 1);
}
function strokeText(ctx, text, cx, y, opt = {}) {
  const { size = 90, maxW = 900, fill = '#fff', stroke = '#000', align = 'center', lineGap = 1.14, maxLines = 3, strokeWidth = null } = opt;
  text = String(text == null ? '' : text).replace(/\*/g, ''); // 포팅 틀은 *별표* 대신 글자만 그려요
  ctx.save();
  ctx.font = `900 ${size}px ${SANS}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = strokeWidth || size * 0.16;
  ctx.strokeStyle = stroke || 'rgba(0,0,0,0)';
  ctx.fillStyle = fill;
  const lines = wrapLines(ctx, text, maxW).slice(0, maxLines);
  lines.forEach((l, i) => {
    const ly = y + i * size * lineGap;
    if (stroke && stroke !== 'none') ctx.strokeText(l, cx, ly);
    ctx.fillText(l, cx, ly);
  });
  ctx.restore();
  return lines.length * size * lineGap;
}
function tagPill(ctx, text, x, y, opt = {}) {
  const size = opt.size || 42;
  const padX = opt.padX == null ? size * 0.62 : opt.padX;
  const padY = opt.padY == null ? size * 0.34 : opt.padY;
  ctx.save();
  ctx.font = `${opt.weight || 900} ${size}px ${SANS}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const w = ctx.measureText(text).width + padX * 2;
  const h = size + padY * 2;
  if (opt.shadow) { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8; }
  ctx.fillStyle = opt.bg || 'rgba(255,255,255,.16)';
  roundRect(ctx, x, y, w, h, opt.radius == null ? h / 2 : opt.radius);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (opt.border) { ctx.strokeStyle = opt.border; ctx.lineWidth = 3; ctx.stroke(); }
  ctx.fillStyle = opt.fg || '#fff';
  ctx.fillText(text, x + padX, y + h / 2 + size * 0.04);
  ctx.restore();
  return { w, h };
}
function splitCaption(txt) {
  const out = [];
  String(txt == null ? '' : txt).split('\n').forEach((p) => {
    let buf = '';
    for (let i = 0; i < p.length; i++) {
      buf += p[i];
      const endPunct = /[.!?。]/.test(p[i]);
      const boundary = (i === p.length - 1) || /\s/.test(p[i + 1]);
      if (endPunct && boundary) { out.push(buf); buf = ''; }
    }
    if (buf.trim()) out.push(buf);
  });
  return out.map((s) => s.trim()).filter(Boolean);
}
function lineIndexAt(t, duration, n) {
  if (!n) return -1;
  const p = duration ? Math.min(Math.max(t / duration, 0), 0.9999) : 0;
  return Math.min(n - 1, Math.floor(p * n));
}
function timedCaption2(f) {
  const parts = (f.capLines && f.capLines.length) ? f.capLines : (f.caption ? [f.caption] : []);
  const i = lineIndexAt(f.t, f.duration, parts.length);
  return i < 0 ? '' : parts[i];
}
function progress(ctx, f, color, y, h) {
  y = y == null ? f.H - 14 : y;
  h = h || 14;
  const p = f.duration ? Math.min(f.t / f.duration, 1) : 0;
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fillRect(0, y, f.W, h);
  ctx.fillStyle = color;
  ctx.fillRect(0, y, f.W * p, h);
}
function offBadge(ctx, text, x, y, size) {
  const padX = size * 0.62, padY = size * 0.40;
  ctx.save();
  ctx.font = `900 ${size}px ${SANS}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const w = ctx.measureText(text).width + padX * 2;
  const h = size + padY * 2;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#ff2d55');
  g.addColorStop(1, '#ff6b35');
  ctx.shadowColor = 'rgba(255,45,85,.45)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x + padX, y + h / 2 + size * 0.04);
  ctx.restore();
  return { w, h };
}
function fitHookSize(ctx, text, maxW, start) {
  let size = start;
  ctx.save();
  while (size > 52) {
    ctx.font = `900 ${size}px ${SANS}`;
    const lines = wrapLines(ctx, text, maxW);
    const orphan = lines.some((l) => l.length <= 1 && lines.length > 1);
    if (lines.length <= 2 && !orphan) break;
    size -= 4;
  }
  ctx.restore();
  return size;
}
function pricePill(ctx, x, y, oldP, newP, t) {
  if (!oldP && !newP) return;
  let sizeOld = 50, sizeNew = 96, arrowSize = 60;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `800 ${sizeOld}px ${SANS}`;
  let wOld = oldP ? ctx.measureText(oldP).width : 0;
  ctx.font = `900 ${sizeNew}px ${SANS}`;
  let wNew = newP ? ctx.measureText(newP).width : 0;
  let wArrow = (oldP && newP) ? 74 : 0;
  let padX = 46;
  let w = padX * 2 + wOld + wArrow + wNew;
  let h = 152;
  if (w > 968) {
    const k = 968 / w;
    sizeOld *= k; sizeNew *= k; arrowSize *= k; wOld *= k; wNew *= k; wArrow *= k; padX *= k;
    w = 968; h = Math.round(h * (0.55 + 0.45 * k));
  }
  const pop = Math.min(1, easeOut((t - 0.15) / 0.35));
  ctx.translate(x, y + h / 2);
  ctx.scale(0.92 + 0.08 * pop, 0.92 + 0.08 * pop);
  ctx.translate(-x, -(y + h / 2));
  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = 'rgba(255,255,255,.97)';
  roundRect(ctx, x, y, w, h, 42);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  let cx = x + padX;
  const midY = y + h / 2 + 3;
  if (oldP) {
    ctx.font = `800 ${sizeOld}px ${SANS}`;
    ctx.fillStyle = 'rgba(18,18,28,.42)';
    ctx.fillText(oldP, cx, midY);
    ctx.strokeStyle = 'rgba(18,18,28,.55)';
    ctx.lineWidth = Math.max(4, sizeOld * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx - 4, midY + 2);
    ctx.lineTo(cx + wOld + 4, midY + 2);
    ctx.stroke();
    cx += wOld + 16;
    if (newP) {
      ctx.font = `900 ${arrowSize}px ${SANS}`;
      ctx.fillStyle = '#15151f';
      ctx.fillText('→', cx, midY + 2);
      cx += wArrow + 6;
    }
  }
  if (newP) {
    ctx.font = `900 ${sizeNew}px ${SANS}`;
    ctx.fillStyle = '#ff2040';
    ctx.fillText(newP, cx, midY + 2);
  }
  ctx.restore();
}

/* 미디어 래퍼 — 프레임의 f.src를 틀들이 쓰기 좋은 형태로 감쌉니다 */
function makeFrameMedia(f) {
  const src = f.src;
  const aspect = (f.srcW || 1) / (f.srcH || 1);
  const draw = (ctx, x, y, w, h, mode) => {
    const s = (mode === 'contain') ? Math.min(w / f.srcW, h / f.srcH) : Math.max(w / f.srcW, h / f.srcH);
    const dw = f.srcW * s, dh = f.srcH * s;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.restore();
  };
  const blur = document.createElement('canvas');
  return {
    kind: f.kind || 'video',
    aspect,
    draw,
    blurBg(ctx, ff) {
      blur.width = 32;
      blur.height = Math.max(2, Math.round((32 * ff.H) / ff.W));
      const b = blur.getContext('2d');
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.clearRect(0, 0, blur.width, blur.height);
      const s = Math.max(blur.width / f.srcW, blur.height / f.srcH);
      b.drawImage(src, (blur.width - f.srcW * s) / 2, (blur.height - f.srcH * s) / 2, f.srcW * s, f.srcH * s);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(blur, 0, 0, ff.W, ff.H);
      ctx.restore();
    },
  };
}

/* =========================================================================
   틀 13종
   arc: R1~R5 아키타입 · dur: 목표 길이(초) · platform: reels/shorts/youtube
   ========================================================================= */
const TEMPLATES = [];

/* ---------- P01 · 직구 핫딜 릴스형 (원본 index.html) ---------- */
TEMPLATES.push({
  id: 'reels-deal',
  presetId: 'P01',
  name: '🔥 직구 핫딜 릴스형',
  label: '직구·핫딜',
  platform: 'reels',
  cats: ['review'],
  arc: 'R4',
  dur: 22,
  W: 1080, H: 1920,
  tagBg: '#ffe6e6', tagFg: '#c0233a',
  trend: '인스타 릴스 · 제휴/직구 딜 전용',
  desc: '상단 훅 + 할인 배지 + 정가→할인가 비교 + 하단 고정 CTA. 사진 2~6장으로 바로 만드는 딜 전용 틀.',
  tips: '훅은 “정가 주고 사면 후회”처럼 손해를 먼저 말하면 3초 이탈이 줄어요.',
  need: ['deal'],
  sample: { hook: '정가 주고 사면 후회', title: '블프 역대가', price: '$359 → $169', channel: 'deal.pick' },
  sampleCaptions: ['무선 미니 마사지건', '$359 → $169, 53% 할인', '댓글에 링크 남기면 DM'],
  draw(ctx, f) {
    const W = f.W, H = f.H, d = f.deal || {};
    const isVideo = (f.kind || 'video') === 'video';
    if (isVideo) {
      f.media.draw(ctx, 0, 0, W, H, 'cover');
      ctx.fillStyle = 'rgba(6,6,12,0.26)';
      ctx.fillRect(0, 0, W, H);
    } else {
      f.media.blurBg(ctx, f);
      const cx = 56, cy = 648, cw = W - 112, ch = 748;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.6)';
      ctx.shadowBlur = 46;
      ctx.shadowOffsetY = 20;
      ctx.fillStyle = '#0a0a12';
      roundRect(ctx, cx, cy, cw, ch, 46);
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, cx, cy, cw, ch, 46);
      ctx.clip();
      f.media.draw(ctx, cx, cy, cw, ch, 'cover');
      ctx.restore();
      ctx.save();
      roundRect(ctx, cx + 1.5, cy + 1.5, cw - 3, ch - 3, 45);
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    let g = ctx.createLinearGradient(0, 0, 0, H * 0.46);
    g.addColorStop(0, 'rgba(8,8,14,.94)');
    g.addColorStop(0.55, 'rgba(8,8,14,.62)');
    g.addColorStop(1, 'rgba(8,8,14,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.46);

    g = ctx.createLinearGradient(0, H * 0.58, 0, H);
    g.addColorStop(0, 'rgba(8,8,14,0)');
    g.addColorStop(0.45, 'rgba(8,8,14,.72)');
    g.addColorStop(1, 'rgba(8,8,14,.97)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.58, W, H * 0.42);

    /* top_label 고정선: 인스타 상단 UI(230px) 아래부터 */
    let by = safeLabelY() + 16, bx = 56;
    const offLabel = d.off ? (d.off + '% OFF') : '특가';
    const b1 = offBadge(ctx, '🔥 ' + offLabel, bx, by, 46);
    bx += b1.w + 14;
    if (d.badge) {
      tagPill(ctx, d.badge, bx, by + 6, { size: 38, bg: 'rgba(255,255,255,.14)', fg: '#fff', border: 'rgba(255,255,255,.55)', padX: 24, padY: 18 });
    }

    const hook = d.hook || d.name || f.text.hook || f.text.title || '지금이 역대가';
    const big = f.t < 3;
    const hookSize = fitHookSize(ctx, hook, W - 112, big ? 92 : 68);
    const pop = big ? (0.86 + 0.14 * easeOut(f.t / 0.32)) : 1;
    ctx.save();
    ctx.translate(56, 350);
    ctx.scale(pop, pop);
    strokeText(ctx, hook, 0, 0, { size: hookSize, maxW: W - 112, align: 'left', fill: big ? '#FFE14D' : '#ffffff', stroke: '#0a0a10', strokeWidth: hookSize * 0.16, maxLines: 2 });
    ctx.restore();

    pricePill(ctx, 56, 584, d.oldP, d.newP, f.t);

    const lines = f.capLines || [];
    const li = lineIndexAt(f.t, f.duration, lines.length);
    if (li >= 0) {
      const nLine = lines.length || 1;
      const lineStart = (li * f.duration) / nLine;
      const a = Math.min(1, Math.max(0, (f.t - lineStart) / 0.28));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(0, (1 - easeOut(a)) * 18);
      const capSize = fitHookSize(ctx, lines[li], W - 150, 58);
      strokeText(ctx, lines[li], W / 2, 1260 + (58 - capSize) * 0.6, { size: capSize, maxW: W - 150, maxLines: 2, fill: '#ffffff', stroke: 'rgba(0,0,0,.9)', strokeWidth: 13 });
      ctx.restore();
    }

    const handle = f.text.channel || d.channel;
    if (handle) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.font = `700 28px ${SANS}`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('@' + String(handle).replace(/^@/, ''), W - 56, 300);
      ctx.restore();
    }

    /* CTA도 하단 UI(330px) 위에 두어 가려지지 않게 */
    const ctaY = 1424, ctaH = 112, ctaX = 40, ctaW = W - 80;
    const pulse = 1 + Math.sin(f.t * 4.2) * 0.012;
    ctx.save();
    ctx.translate(W / 2, ctaY + ctaH / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-W / 2, -(ctaY + ctaH / 2));
    const cg = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY + ctaH);
    cg.addColorStop(0, '#ff2d55');
    cg.addColorStop(1, '#ff6b35');
    ctx.shadowColor = 'rgba(255,45,85,.55)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = cg;
    roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    let fitSize = 46;
    ctx.font = `900 ${fitSize}px ${SANS}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const kw = d.keyword || '링크';
    const ctaText = `💬 댓글에 '${kw}' 남기면 DM 발송`;
    while (ctx.measureText(ctaText).width > ctaW - 70 && fitSize > 26) {
      fitSize -= 2;
      ctx.font = `900 ${fitSize}px ${SANS}`;
    }
    ctx.fillText(ctaText, W / 2, ctaY + ctaH / 2 + 2);
    ctx.restore();

    progress(ctx, f, '#ffd60a', 1560, 6);
  },
});

/* ---------- P02 · 훅 자막형 (원본 index.html) ---------- */
TEMPLATES.push({
  id: 'shorts-hook',
  presetId: 'P02',
  name: '훅 자막형',
  label: '쇼츠·훅',
  platform: 'shorts',
  cats: ['hook', 'info'],
  arc: 'R1',
  dur: 30,
  W: 1080, H: 1920,
  tagBg: '#fff3d6', tagFg: '#8a5a00',
  trend: '🔥 쇼츠에서 가장 많이 쓰는 포맷',
  desc: '첫 3초 큰 훅 문구로 이탈을 막고, 아래에 굵은 자막이 이어집니다. 가로 영상은 흐림 배경으로 세로에 꽉 채워요.',
  tips: '훅은 15자 이내 질문형이 효과적이에요. 예: "이거 모르면 손해"',
  sample: { hook: '이거 모르면 손해!', title: '자취생 5분 요리 꿀팁', channel: 'mychannel' },
  sampleCaptions: ['오늘은 정말 간단한 요리', '재료는 딱 세 가지', '끝까지 보면 보너스 팁'],
  draw(ctx, f) {
    f.media.blurBg(ctx, f);
    const ar = f.media.aspect || 1;
    const vh = Math.min(f.H * 0.62, f.W / ar);
    const vy = (f.H - vh) / 2;
    f.media.draw(ctx, 0, vy, f.W, vh, ar > 0.8 ? 'contain' : 'cover');

    if (f.t < 3 && f.text.hook) {
      const a = easeOut(f.t / 0.35);
      ctx.save();
      ctx.globalAlpha = f.t > 2.6 ? Math.max(0, (3 - f.t) / 0.4) : 1;
      ctx.translate(f.W / 2, 330);
      ctx.scale(0.7 + 0.3 * a, 0.7 + 0.3 * a);
      strokeText(ctx, f.text.hook, 0, -60, { size: 104, maxW: f.W * 0.86, fill: '#FFE14D', maxLines: 3 });
      ctx.restore();
    } else if (f.text.title) {
      strokeText(ctx, f.text.title, f.W / 2, 260, { size: 70, maxW: f.W * 0.86, maxLines: 2 });
    }
    const cap = timedCaption2(f);
    if (cap) strokeText(ctx, cap, f.W / 2, 1360, { size: 76, maxW: f.W * 0.84, maxLines: 2 });
    progress(ctx, f, '#FF3B5C', 1560, 8);
  },
});

/* ---------- P03 · 브이로그 카드형 (원본 index.html) ---------- */
TEMPLATES.push({
  id: 'shorts-vlog',
  presetId: 'P03',
  name: '브이로그 카드형',
  label: '감성·브이로그',
  platform: 'shorts',
  cats: ['mood'],
  arc: 'R5',
  dur: 20,
  W: 1080, H: 1920,
  tagBg: '#f6e7dc', tagFg: '#7a5236',
  trend: '✨ 일상·브이로그 채널 인기',
  desc: '부드러운 단색 배경 위에 둥근 카드 영상, 상단에 제목과 날짜 스티커가 붙는 감성 스타일이에요.',
  tips: '제목은 "오늘의 ○○"처럼 시리즈로 만들면 재방문이 늘어요.',
  sample: { hook: '오늘의 기록', title: '창가 자리', channel: 'slow.home' },
  sampleCaptions: ['아침 햇살 좋은 날', '창가에 두니까 공간이 달라짐', '오늘도 천천히'],
  draw(ctx, f) {
    const g = ctx.createLinearGradient(0, 0, 0, f.H);
    g.addColorStop(0, '#FDF2E9');
    g.addColorStop(1, '#F6D7C3');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, f.W, f.H);

    const pad = 70, cy = 500, ch = f.H - cy - 420;
    ctx.save();
    ctx.shadowColor = 'rgba(80,40,20,.25)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = '#000';
    roundRect(ctx, pad, cy, f.W - pad * 2, ch, 48);
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, pad, cy, f.W - pad * 2, ch, 48);
    ctx.clip();
    f.media.draw(ctx, pad, cy, f.W - pad * 2, ch, 'cover');
    ctx.restore();

    const today = new Date();
    tagPill(ctx, `📅 ${today.getMonth() + 1}월 ${today.getDate()}일`, pad, safeLabelY() + 16, { size: 40, bg: '#E07A5F', padY: 16 });

    ctx.save();
    ctx.fillStyle = '#3D2B1F';
    ctx.font = `900 72px ${SANS}`;
    ctx.textBaseline = 'top';
    wrapLines(ctx, f.text.title || f.text.hook || (f.deal && f.deal.name) || '오늘의 기록', f.W - pad * 2)
      .slice(0, 2)
      .forEach((l, i) => ctx.fillText(l, pad, 326 + i * 80));
    ctx.restore();

    const cap = timedCaption2(f);
    if (cap) {
      ctx.save();
      ctx.font = `700 52px ${SANS}`;
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 16;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      wrapLines(ctx, cap, f.W - pad * 2).slice(0, 2)
        .forEach((l, i) => ctx.fillText(l, f.W / 2, 1396 + i * 66));
      ctx.restore();
    }
    if (f.text.channel) {
      ctx.save();
      ctx.font = `600 38px ${SANS}`;
      ctx.fillStyle = 'rgba(61,43,31,.6)';
      ctx.textAlign = 'right';
      ctx.fillText('@' + String(f.text.channel).replace(/^@/, ''), f.W - pad, 300);
      ctx.restore();
    }
  },
});

/* ---------- P04 · 정보 TOP 리스트형 (원본 index.html) ---------- */
TEMPLATES.push({
  id: 'shorts-list',
  presetId: 'P04',
  name: '정보 TOP 리스트형',
  label: '리스트·하울',
  platform: 'shorts',
  cats: ['info', 'review'],
  arc: 'R2',
  dur: 30,
  W: 1080, H: 1920,
  tagBg: '#dbe8ff', tagFg: '#20479c',
  trend: '📈 저장·공유가 많은 정보형',
  desc: '상단 고정 제목 + 시간에 따라 바뀌는 순위 번호. "꿀팁 TOP 3", "추천 맛집 5곳" 같은 영상에 딱이에요.',
  tips: '항목은 한 줄에 하나씩 적으면 영상 길이에 맞춰 순서대로 나와요.',
  need: ['items'],
  sample: { hook: '다이소 3천원템', title: '놓치면 후회 TOP 3', items: '실리콘 수납봉\n극세사 걸레\n문틈 먼지커버', channel: 'living.pick' },
  sampleCaptions: ['실리콘 수납봉', '극세사 걸레', '문틈 먼지커버'],
  draw(ctx, f) {
    ctx.fillStyle = '#0B0F1A';
    ctx.fillRect(0, 0, f.W, f.H);
    f.media.draw(ctx, 0, 0, f.W, f.H, 'cover');
    // 상단 제목 띠 (safe.top 230 아래에 제목)
    ctx.fillStyle = '#2563EB';
    ctx.fillRect(0, 0, f.W, 430);
    strokeText(ctx, f.text.title || f.text.hook || '알아두면 좋은 TOP 3', f.W / 2, 240, { size: 80, maxW: f.W * 0.88, stroke: '#0B0F1A', maxLines: 2 });

    // 하단 순위·항목 패널 (captionLine 1540 위에서 끝남)
    ctx.fillStyle = 'rgba(11,15,26,0.94)';
    ctx.fillRect(0, 1140, f.W, 400);

    const items = (f.items && f.items.length) ? f.items : (f.capLines || []);
    if (items.length && f.duration) {
      const n = items.length;
      const idx = lineIndexAt(f.t, f.duration, n);
      const local = (f.t / f.duration) * n - idx;
      const a = easeOut(local * 4);
      ctx.save();
      ctx.globalAlpha = a;
      const rank = n - idx;
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(150, 1340, 88, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0B0F1A';
      ctx.font = '900 104px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(rank), 150, 1348);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate((1 - a) * 60, 0);
      ctx.font = `800 64px ${SANS}`;
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'top';
      wrapLines(ctx, items[idx], f.W - 330).slice(0, 2)
        .forEach((l, i) => ctx.fillText(l, 280, 1284 + i * 76));
      ctx.restore();
    }
    progress(ctx, f, '#FACC15', 1120, 8);
  },
});

/* ---------- P05 · 롱폼 기본형 (원본 index.html · 16:9) ---------- */
TEMPLATES.push({
  id: 'youtube-classic',
  presetId: 'P05',
  name: '롱폼 기본형',
  label: '유튜브 롱폼',
  platform: 'youtube',
  cats: ['info'],
  arc: 'R1',
  dur: 60,
  W: 1920, H: 1080,
  tagBg: '#ffe0e0', tagFg: '#b01634',
  trend: '🎬 강의·리뷰·브이로그 기본',
  desc: '시작 2.5초 제목 카드 → 본편(채널 워터마크) → 마지막 4초 구독 유도 화면으로 구성돼요.',
  tips: '마지막 구독 화면 구간은 YouTube 스튜디오의 "최종 화면" 위치와 맞춰 두면 좋아요.',
  sample: { hook: '자취 5년차 정착템', title: '자취생 5분 요리 꿀팁', channel: 'mychannel' },
  sampleCaptions: ['오늘은 정말 간단한 요리', '재료는 딱 세 가지', '끝까지 보면 보너스 팁'],
  draw(ctx, f) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, f.W, f.H);
    const ar = f.media.aspect || 1;
    if (ar < 0.95) {
      f.media.blurBg(ctx, f);
      f.media.draw(ctx, 0, 0, f.W, f.H, 'contain');
    } else {
      f.media.draw(ctx, 0, 0, f.W, f.H, 'cover');
    }

    const handle = f.text.channel || (f.deal && f.deal.channel);
    if (handle) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      tagPill(ctx, '▶ ' + String(handle).replace(/^@/, ''), f.W - 430, 48, { size: 34, bg: 'rgba(0,0,0,.55)', padY: 16 });
      ctx.restore();
    }

    const intro = 2.5;
    if (f.t < intro) {
      const a2 = f.t < intro - 0.5 ? 1 : (intro - f.t) / 0.5;
      ctx.save();
      ctx.globalAlpha = a2;
      ctx.fillStyle = 'rgba(10,10,20,.72)';
      ctx.fillRect(0, 0, f.W, f.H);
      const s = easeOut(f.t / 0.5);
      ctx.fillStyle = '#FF0033';
      ctx.fillRect(f.W / 2 - 300 * s, f.H / 2 + 110, 600 * s, 12);
      strokeText(ctx, f.text.title || f.text.hook || '제목을 입력하세요', f.W / 2, f.H / 2 - 120, { size: 110, maxW: f.W * 0.8, stroke: 'none', maxLines: 2 });
      ctx.restore();
    } else {
      const cap = timedCaption2(f);
      if (cap) {
        ctx.save();
        ctx.font = `700 56px ${SANS}`;
        const ls = wrapLines(ctx, cap, f.W * 0.75).slice(0, 2);
        const w = Math.max(...ls.map((l) => ctx.measureText(l).width)) + 60;
        const h = ls.length * 72 + 30;
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        roundRect(ctx, (f.W - w) / 2, f.H - 90 - h, w, h, 14);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ls.forEach((l, i) => ctx.fillText(l, f.W / 2, f.H - 90 - h + 18 + i * 72));
        ctx.restore();
      }
    }

    const outro = 4;
    if (f.duration > outro + intro && f.t > f.duration - outro) {
      const a3 = easeOut((f.t - (f.duration - outro)) / 0.6);
      ctx.save();
      ctx.globalAlpha = a3;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(0, 0, f.W, f.H);
      strokeText(ctx, '시청해 주셔서 감사합니다!', f.W / 2, 250, { size: 80, maxW: f.W * 0.8, stroke: 'none' });
      const bw = 520, bh = 120;
      ctx.fillStyle = '#FF0033';
      roundRect(ctx, (f.W - bw) / 2, 520, bw, bh, 60);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `900 60px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔔 구독하기', f.W / 2, 584);
      ctx.restore();
    }
  },
});

/* ---------- P06 · 시네마틱 하이라이트형 (원본 index.html · 16:9) ---------- */
TEMPLATES.push({
  id: 'youtube-cinema',
  presetId: 'P06',
  name: '시네마틱 하이라이트형',
  label: '유튜브 하이라이트',
  platform: 'youtube',
  cats: ['mood'],
  arc: 'R5',
  dur: 45,
  W: 1920, H: 1080,
  tagBg: '#e8e2ff', tagFg: '#4b3a99',
  trend: '🎥 여행·하이라이트 영상 인기',
  desc: '위아래 영화 같은 검은 띠(레터박스)와 왼쪽 아래 자막 바가 들어가는 고급스러운 스타일이에요.',
  tips: '음악이 있는 영상, 여행 하이라이트에 특히 잘 어울려요.',
  sample: { hook: '주말의 기록', title: '창가에서 시작한 하루', channel: 'slow.home' },
  sampleCaptions: ['아침 햇살', '커피 한 잔', '천천히 걷는 길', '오늘도 좋아'],
  draw(ctx, f) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, f.W, f.H);
    const bar = Math.round(f.H * 0.12 * easeOut(f.t / 1.2));
    f.media.draw(ctx, 0, 0, f.W, f.H, 'cover');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, f.W, bar);
    ctx.fillRect(0, f.H - bar, f.W, bar);

    const title = f.text.title || f.text.hook || (f.deal && f.deal.name);
    const show = f.t > 0.8 && f.t < 6;
    if (show && title) {
      const a = Math.min(easeOut((f.t - 0.8) / 0.6), f.t > 5.4 ? (6 - f.t) / 0.6 : 1);
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#F5C542';
      ctx.fillRect(120, f.H - 330, 10, 150);
      ctx.fillStyle = '#fff';
      ctx.font = `800 76px ${SANS}`;
      ctx.textBaseline = 'top';
      ctx.fillText(title, 160, f.H - 330);
      ctx.font = `500 40px ${SANS}`;
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      const handle = f.text.channel || (f.deal && f.deal.channel);
      ctx.fillText(handle ? '@' + String(handle).replace(/^@/, '') : '', 162, f.H - 230);
      ctx.restore();
    }
    const cap = f.t >= 6 ? timedCaption2(f) : '';
    if (cap) {
      ctx.save();
      ctx.font = `500 50px ${SANS}`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 12;
      ctx.fillText(cap, f.W / 2, f.H - bar - 50);
      ctx.restore();
    }
  },
});

/* ---------- P11 · 30만 정보형 · 정석 ---------- */
TEMPLATES.push({
  id: 'info30',
  presetId: 'P11',
  name: '30만 정보형 · 정석',
  label: '리빙·정보',
  platform: 'reels',
  cats: ['living', 'info', 'review'],
  arc: 'R1',
  dur: 30,
  W: 1080, H: 1920,
  tagBg: '#f1efe8', tagFg: '#6a6152',
  trend: '30만+ 정보형 릴스의 정석 — 2줄 빅 훅 + 포인트 컬러 + 세이프존 자막',
  desc: '상단 1:1 썸네일 안전 영역에 두 줄 훅, 하단 UI 위에 한 줄 자막. 샤갈(애덤) 보이스 1.4배속과 가장 잘 맞는 기본형이에요.',
  tips: '훅은 2줄·14자 안쪽. 핵심 단어만 *별표*로 감싸 포인트 컬러를 넣으세요.',
  sample: { hook: '자취 5년차,\n*이건 진짜* 정착템', title: '내돈내산 · 재구매 3회', channel: 'living.home' },
  sampleCaptions: ['주방 물때 3년 고민 끝났어요', '*만원대*인데 이 정도면 반칙', '설치 10초 · 흡착력 미쳤음'],
  draw(ctx, f) {
    drawFullFrame(ctx, f);
    scrimTop(ctx, f, 980, 0.44);
    scrimBottom(ctx, f, 760, 0.5);
    const t = f.text;

    if (t.title) {
      const a = ease(f.t / 0.45);
      ctx.save();
      ctx.font = fontStr(700, 30);
      const txt = truncate(ctx, t.title, 640);
      const badgeW = widthOf(ctx, txt);
      const bh = 64, bw = badgeW + 72;
      const bx = (f.W - bw) / 2, by = 452;
      ctx.globalAlpha = a;
      frostedPanel(ctx, f, bx, by, bw, bh, bh / 2, { tint: 'rgba(255,255,255,0.16)', border: 'rgba(255,255,255,0.3)' });
      ctx.fillStyle = accentColor();
      ctx.beginPath(); ctx.arc(bx + 30, by + bh / 2, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.97)';
      ctx.font = fontStr(700, 30);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      fillTxt(ctx, txt, bx + 50, by + bh / 2 + 1);
      ctx.restore();
    }

    if (t.hook) {
      drawRich(ctx, t.hook, {
        x: f.W / 2, y: 556, size: 96, weight: 900, align: 'center',
        maxW: f.W * 0.84, lineHeight: 1.26, maxLines: 3, shadow: 26,
        opacity: ease(f.t / 0.5),
      });
    }

    drawCaptionArea(ctx, f, { bottom: f.H - 380, size: 58, weight: 700, maxLines: 2, maxW: f.W * 0.78 });
  },
});

/* ---------- P12 · 리뷰 · 가격 비교 ---------- */
TEMPLATES.push({
  id: 'deal-review',
  presetId: 'P12',
  name: '리뷰 · 가격 비교',
  label: '제품 리뷰',
  platform: 'reels',
  cats: ['review', 'living'],
  arc: 'R4',
  dur: 25,
  W: 1080, H: 1920,
  tagBg: '#eaf3ff', tagFg: '#26569f',
  trend: '언박싱·내돈내산 리뷰에서 저장률 높은 가격 비교 포맷',
  desc: '상단에 리뷰 배지와 훅, 아래에 정가 ↔ 할인가 비교 카드. "얼마 아꼈는지"를 숫자로 보여줘 저장·공유를 부릅니다.',
  tips: '가격은 "39,900 → 19,900"처럼 화살표로. 배지에는 "리뷰 2주차 · 내돈내산".',
  need: ['price'],
  sample: { hook: '쿠팡 3만원대\n*이거* 왜 이제 샀지', title: '리뷰 2주차 · 내돈내산', price: '39,900 → 19,900', channel: 'living.pick' },
  sampleCaptions: ['정가 주고 산 게 후회될 정도', '이번엔 *반값*에 겟', '소음·물때 둘 다 잡혔어요'],
  draw(ctx, f) {
    drawFullFrame(ctx, f);
    scrimTop(ctx, f, 900, 0.46);
    scrimBottom(ctx, f, 700, 0.46);

    const badge = (f.text.title || '리뷰 2주차').trim();
    const a0 = ease(f.t / 0.4);
    ctx.save();
    ctx.globalAlpha = a0;
    ctx.font = fontStr(800, 28);
    const bw = Math.min(f.W - 120, widthOf(ctx, badge) + 76);
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    roundRect(ctx, 72, 430, bw, 60, 30); ctx.fill();
    ctx.fillStyle = '#16181f';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    fillTxt(ctx, truncate(ctx, badge, bw - 48), 108, 462);
    ctx.restore();

    if (f.text.hook) {
      drawRich(ctx, f.text.hook, {
        x: 72, y: 528, size: 88, weight: 900, align: 'left',
        maxW: f.W * 0.86, lineHeight: 1.28, maxLines: 3, shadow: 24,
        opacity: ease(f.t / 0.5),
      });
    }

    const price = String(f.text.price || '').trim();
    if (price) {
      const pop = ease(Math.max(0, (f.t - 0.1) / 0.5));
      const [wasRaw, nowRaw] = price.split(/→|->|~>/).map((s) => (s || '').trim());
      const px = 64, pw = f.W - 128, ph = 274, py = f.H - 846;
      ctx.save();
      ctx.globalAlpha = pop;
      ctx.translate(0, (1 - pop) * 20);
      frostedPanel(ctx, f, px, py, pw, ph, 34, { tint: 'rgba(255,255,255,0.92)', border: 'rgba(255,255,255,0.7)' });
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = '#8a8f9a'; ctx.font = fontStr(700, 28);
      if (wasRaw && nowRaw) {
        fillTxt(ctx, '정가', px + 44, py + 34);
        ctx.fillStyle = '#9a9ea8';
        ctx.font = fontStr(600, 40);
        const ww = widthOf(ctx, wasRaw);
        fillTxt(ctx, wasRaw, px + 44, py + 76);
        ctx.strokeStyle = '#9a9ea8'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(px + 40, py + 100); ctx.lineTo(px + 48 + ww, py + 100); ctx.stroke();
        ctx.fillStyle = '#6b7180'; ctx.font = fontStr(700, 26);
        fillTxt(ctx, '지금', px + 44, py + 124);
        ctx.fillStyle = '#16181f'; ctx.font = fontStr(900, 82);
        fillTxt(ctx, truncate(ctx, nowRaw, pw - 88), px + 44, py + 158);
      } else {
        ctx.fillStyle = '#16181f'; ctx.font = fontStr(900, 72);
        fillTxt(ctx, truncate(ctx, price, pw - 88), px + 44, py + 60);
      }
      ctx.save();
      ctx.fillStyle = accentColor();
      roundRect(ctx, px + pw - 196, py + 36, 156, 52, 26); ctx.fill();
      ctx.fillStyle = '#14161c'; ctx.font = fontStr(900, 26); ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fillTxt(ctx, '내돈내산', px + pw - 118, py + 63);
      ctx.restore();
      ctx.restore();
    }

    drawCaptionArea(ctx, f, { bottom: f.H - 380, size: 56, weight: 700, maxLines: 2, maxW: f.W * 0.78 });
  },
});

/* ---------- P13 · 댓글·DM 질문 훅 ---------- */
TEMPLATES.push({
  id: 'qna',
  presetId: 'P13',
  name: '댓글·DM 질문 훅',
  label: '훅·질문',
  platform: 'reels',
  cats: ['hook', 'review', 'living'],
  arc: 'R1',
  dur: 22,
  W: 1080, H: 1920,
  tagBg: '#eee9ff', tagFg: '#5a44c8',
  trend: '댓글·DM 질문으로 시작해 저장·댓글을 부르는 포맷',
  desc: '진짜 인스타 댓글처럼 생긴 질문 카드가 먼저 뜨고, 아래에 답변 자막이 이어져요. "이거 어디서 사셨어요?"가 대표 훅.',
  tips: '훅을 실제로 받은 질문 문장으로 쓰세요. 답변은 3줄 안쪽.',
  sample: { hook: '이거 어디서 사셨어요?', title: '댓글 200개 · 같은 질문', channel: 'living.jip' },
  sampleCaptions: ['자취방 수납장, 다이소 아니에요', '링크는 *프로필*에 정리했어요', '사이즈는 3호 추천!'],
  draw(ctx, f) {
    drawFullFrame(ctx, f);
    scrimTop(ctx, f, 880, 0.28);
    scrimBottom(ctx, f, 800, 0.62);

    const q = (f.text.hook || '이거 어디서 사셨어요?').trim();
    ctx.font = fontStr(700, 52);
    const maxW = f.W - 340;
    const lines = [];
    for (const para of q.split('\n')) {
      let cur = '';
      for (const w of para.split(' ').filter(Boolean)) {
        const test = cur ? cur + ' ' + w : w;
        if (widthOf(ctx, test) <= maxW) cur = test;
        else { if (cur) lines.push(cur); cur = w; }
      }
      if (cur) lines.push(cur);
    }
    const bx = 88, bw = f.W - 176, by = 470;
    const bh = 156 + Math.min(3, lines.length) * 74;
    const a = ease(f.t / 0.55);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(0, (1 - a) * 44);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 46; ctx.shadowOffsetY = 16;
    ctx.fillStyle = '#FFFFFF'; roundRect(ctx, bx, by, bw, bh, 40); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(bx + 88, by + bh - 3);
    ctx.lineTo(bx + 104, by + bh + 32);
    ctx.lineTo(bx + 152, by + bh - 3);
    ctx.closePath(); ctx.fill();

    const av = 72, ax = bx + 40, ay = by + 36;
    const g = ctx.createLinearGradient(ax, ay, ax + av, ay + av);
    g.addColorStop(0, '#C9B79C'); g.addColorStop(1, '#8C7A63');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ax + av / 2, ay + av / 2, av / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = fontStr(800, 30); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('리', ax + av / 2, ay + av / 2 + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1A1A22'; ctx.font = fontStr(800, 30);
    fillTxt(ctx, String(f.text.channel || 'living.jip').replace(/^@/, ''), ax + av + 20, ay + 22);
    ctx.fillStyle = '#9A9AA8'; ctx.font = fontStr(500, 24);
    fillTxt(ctx, f.text.title ? truncate(ctx, f.text.title, bw - 240) : '댓글 · 방금', ax + av + 20, ay + 56);

    ctx.fillStyle = '#14141A'; ctx.font = fontStr(700, 52); ctx.textBaseline = 'top';
    lines.slice(0, 3).forEach((l, i) => fillTxt(ctx, l, bx + 40, by + 150 + i * 74));
    ctx.restore();

    if (f.caption) {
      const px = 64, pw = f.W - 128, ph = 250, py = f.H - 690;
      frostedPanel(ctx, f, px, py, pw, ph, 40, { tint: 'rgba(12,12,18,0.55)', border: 'rgba(255,255,255,0.18)' });
      ctx.fillStyle = accentColor(); ctx.font = fontStr(800, 26);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      fillTxt(ctx, 'REPLY', px + 44, py + 36);
      drawRich(ctx, f.caption, {
        x: px + 44, y: py + 96, size: 54, weight: 700, align: 'left',
        maxW: pw - 88, maxLines: 3, lineHeight: 1.34,
        color: 'rgba(255,255,255,0.98)', stroke: false, shadow: 14,
        opacity: Math.min(1, 0.4 + f.captionP * 7),
      });
    }
  },
});

/* ---------- P14 · 3스텝 체크 요약 ---------- */
TEMPLATES.push({
  id: 'step3',
  presetId: 'P14',
  name: '3스텝 체크 요약',
  label: '리빙·꿀팁',
  platform: 'reels',
  cats: ['info', 'living', 'review'],
  arc: 'R3',
  dur: 35,
  W: 1080, H: 1920,
  tagBg: '#eaf6ee', tagFg: '#1d6b40',
  trend: '저장·공유를 부르는 3줄 체크리스트 포맷',
  desc: '설치·사용·가격처럼 리빙 리뷰의 핵심 3가지를 1·2·3으로 하나씩 체크. 여백 있는 카드라 정보가 깔끔하게 읽혀요.',
  tips: '항목은 3개, 각 10자 안쪽. 예: "1. 설치 10초 / 2. 물때 안 낌 / 3. 만원대 가성비"',
  need: ['items'],
  sample: { hook: '설치 전에 *이 3개*만 보세요', title: '설치 10초 체크리스트', items: '설치 10초\n물때 안 낌\n만원대 가성비', channel: 'living.tip' },
  sampleCaptions: ['첫째, 설치 10초', '둘째, 물때 안 낌', '셋째, 만원대 가성비'],
  draw(ctx, f) {
    drawFullFrame(ctx, f);
    ctx.fillStyle = 'rgba(8,9,12,0.34)';
    ctx.fillRect(0, 0, f.W, f.H);

    if (f.text.hook) {
      drawRich(ctx, f.text.hook, {
        x: f.W / 2, y: 470, size: 66, weight: 900, align: 'center',
        maxW: f.W * 0.86, lineHeight: 1.28, maxLines: 2, shadow: 22,
        opacity: ease(f.t / 0.45),
      });
    }

    const itemCount = String(f.text.items || '').split('\n').map((s) => s.trim()).filter(Boolean).length || 3;
    const x = 72, w = f.W - 144, h = 208 + itemCount * 128, y = 742;
    frostedPanel(ctx, f, x, y, w, h, 44, { tint: 'rgba(255,255,255,0.94)', border: 'rgba(255,255,255,0.75)' });
    drawTracked(ctx, 'CHECK LIST', x + 52, y + 44, { size: 24, weight: 800, spacing: 8, color: '#9aa0ac' });
    drawRich(ctx, f.text.title || '체크리스트', {
      x: x + 52, y: y + 92, size: 58, weight: 900, align: 'left',
      maxW: w - 104, maxLines: 2, color: '#16181f', stroke: false, shadow: 0,
    });

    const items = String(f.text.items || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3);
    const rows = items.length || 3;
    const rowH = 128, areaTop = y + 228;
    const visible = f.duration ? Math.min(rows, 1 + Math.floor((f.t / f.duration) * rows * 1.05)) : rows;
    items.forEach((it, i) => {
      const ry = areaTop + i * rowH;
      const on = i < visible;
      ctx.save();
      ctx.globalAlpha = on ? 1 : 0.32;
      ctx.fillStyle = on ? accentColor() : 'rgba(20,22,28,0.08)';
      roundRect(ctx, x + 52, ry + 8, 64, 64, 20); ctx.fill();
      ctx.fillStyle = on ? '#16181f' : '#8a8f9a';
      ctx.font = fontStr(900, 34); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), x + 84, ry + 42);
      ctx.textAlign = 'left';
      ctx.fillStyle = on ? '#16181f' : '#8a8f9a';
      ctx.font = fontStr(on ? 800 : 600, 44);
      fillTxt(ctx, truncate(ctx, it, w - 190), x + 140, ry + 42);
      if (i < items.length - 1) {
        ctx.strokeStyle = 'rgba(20,22,28,0.08)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 52, ry + 96); ctx.lineTo(x + w - 52, ry + 96); ctx.stroke();
      }
      ctx.restore();
    });

    drawCaptionArea(ctx, f, { bottom: f.H - 380, size: 54, weight: 700, maxLines: 2, maxW: f.W * 0.78 });
  },
});

/* ---------- P15 · 감성 리빙 브이로그 ---------- */
TEMPLATES.push({
  id: 'vlog-film',
  presetId: 'P15',
  name: '감성 리빙 브이로그',
  label: '감성·브이로그',
  platform: 'reels',
  cats: ['mood', 'living'],
  arc: 'R5',
  dur: 20,
  W: 1080, H: 1920,
  tagBg: '#f0e9dd', tagFg: '#6d5942',
  trend: '홈 루틴·인테리어 브이로그의 고급스러운 기본',
  desc: '상하 레터박스, 작은 타임코드와 "08:00 AM · HOME ROUTINE" 라벨. 감성 한 줄 자막이 천천히 떠요.',
  tips: '자막은 짧은 감성 문장으로. 영상이 길면 이 틀이 특히 좋아요.',
  sample: { hook: '08:00 AM · HOME ROUTINE', title: '창가 자리', channel: 'slow.home' },
  sampleCaptions: ['아침 햇살 좋은 날', '창가에 두니까 공간이 달라짐', '오늘도 천천히'],
  draw(ctx, f) {
    drawFullFrame(ctx, f);
    vignette(ctx, f.W, f.H, 0.55);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, f.W, 110);
    ctx.fillRect(0, f.H - 110, f.W, 110);
    grain(ctx, f.W, f.H, 0.05);

    ctx.font = fontStr(500, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(`${timecode(f.t)} / ${timecode(f.duration)}`, 80, 268);
    drawTracked(ctx, (f.text.channel || 'HOME').replace(/^@/, '').toUpperCase(), f.W - 80, 268, {
      size: 24, weight: 600, spacing: 8, color: 'rgba(255,255,255,0.6)', align: 'right',
    });

    const head = (f.text.hook || '').trim();
    if (head && f.t < 4.2) {
      const a = f.t < 0.6 ? f.t / 0.6 : f.t > 3.4 ? Math.max(0, (4.2 - f.t) / 0.8) : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(f.W / 2 - 34, 560, 68, 2);
      ctx.restore();
      drawTracked(ctx, head, f.W / 2, 596, { size: 34, weight: 600, spacing: 4, color: 'rgba(255,255,255,0.9)', align: 'center', alpha: a });
      if (f.text.title) {
        drawRich(ctx, f.text.title, {
          x: f.W / 2, y: 660, size: 54, weight: 500, align: 'center',
          maxW: f.W * 0.8, maxLines: 1, lineHeight: 1.5, shadow: 10, opacity: a * 0.95,
        });
      }
    }

    if (f.caption) {
      const a = Math.min(1, 0.25 + f.captionP * 6);
      ctx.save();
      ctx.globalAlpha = a * 0.6;
      ctx.fillStyle = '#fff';
      ctx.fillRect(f.W / 2 - 22, f.H - 470, 44, 1.5);
      ctx.restore();
      drawRich(ctx, f.caption, {
        x: f.W / 2, bottom: f.H - 380, size: 50, weight: 500, align: 'center',
        maxW: f.W * 0.8, maxLines: 2, lineHeight: 1.6,
        color: 'rgba(255,255,255,0.94)', stroke: UI.captionStyle === 'outline', shadow: 12,
        bar: UI.captionStyle === 'bar', barColor: 'rgba(8,9,12,0.34)',
        opacity: Math.min(1, 0.3 + f.captionP * 6),
      });
    }
  },
});

/* ---------- P16 · 네온 빅타이포 훅 ---------- */
TEMPLATES.push({
  id: 'neon-hook',
  presetId: 'P16',
  name: '네온 빅타이포 훅',
  label: '훅·임팩트',
  platform: 'reels',
  cats: ['hook', 'info', 'review'],
  arc: 'R2',
  dur: 18,
  W: 1080, H: 1920,
  tagBg: '#fff0d9', tagFg: '#8a5a00',
  trend: '첫 3초 이탈을 막는 대형 타이포',
  desc: '화면 가운데를 꽉 채우는 굵은 타이포와 포인트 컬러로 빛나는 핵심 단어. 스크롤을 멈추게 하는 훅이에요.',
  tips: '강조할 단어를 *별표*로 감싸면 포인트 컬러로 빛나요. 예: *만원대*인데 호텔 수건 같음',
  sample: { hook: '*만원대*인데\n호텔 수건 같음', title: '욕실 리셋', channel: 'living.hack' },
  sampleCaptions: ['수건 하나로 욕실 분위기 바뀜', '세탁 30번 해도 보송'],
  draw(ctx, f) {
    drawFullFrame(ctx, f);
    ctx.fillStyle = 'rgba(6,7,10,0.42)';
    ctx.fillRect(0, 0, f.W, f.H);
    const rg = ctx.createRadialGradient(f.W / 2, 900, 120, f.W / 2, 900, 980);
    rg.addColorStop(0, 'rgba(0,0,0,0.28)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, f.W, f.H);

    const text = f.text.hook || f.text.title || '';
    let size = 148;
    let lay = layoutRich(ctx, text, size, 900, f.W * 0.86);
    while (lay.lines.length > 3 && size > 78) { size -= 6; lay = layoutRich(ctx, text, size, 900, f.W * 0.86); }
    const a = ease(f.t / 0.45);
    const lh = size * 1.16;
    const totalH = lay.lines.length * lh;
    const y0 = 880 - totalH / 2;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(f.W / 2, 880);
    ctx.scale(0.955 + 0.045 * a, 0.955 + 0.045 * a);
    ctx.translate(-f.W / 2, -880);
    ctx.fillStyle = accentColor();
    ctx.fillRect(f.W / 2 - 30, y0 - 44, 60, 8);
    ctx.restore();

    drawRich(ctx, text, {
      x: f.W / 2, y: y0, size, weight: 900, align: 'center',
      maxW: f.W * 0.86, lineHeight: 1.16, maxLines: 3, shadow: 24,
      opacity: a, accent: accentColor(),
    });

    if (f.text.title) {
      drawTracked(ctx, String(f.text.title).toUpperCase(), f.W / 2, y0 + totalH + 40, {
        size: 28, weight: 700, spacing: 8, color: 'rgba(255,255,255,0.62)', align: 'center',
      });
    }

    drawCaptionArea(ctx, f, { bottom: f.H - 380, size: 56, weight: 700, maxLines: 2, maxW: f.W * 0.78 });
  },
});

/* ---------- P17 · 🛒 형광라벨 템소개 ---------- */
TEMPLATES.push({
  id: 'label-item',
  presetId: 'P17',
  name: '🛒 형광라벨 템소개',
  label: '템소개·추천',
  platform: 'reels',
  cats: ['review', 'living', 'info'],
  arc: 'R2',
  dur: 30,
  W: 1080, H: 1920,
  tagBg: '#ecffd6', tagFg: '#3d7a00',
  isNew: true,
  trend: '요즘 뜨는 "1. 2. 3." 형광 라벨 아이템 소개 릴스',
  desc: '사진은 그대로 두고, 위에 형광 라벨 하나 · 아래에 흰 자막 하나. 라벨만 바꿔 끼우면 아이템이 1·2·3 순서로 소개돼요.',
  tips: '자막 칸에 "2. 룸 슬리퍼 | 발이 편한 슬리퍼"처럼 쓰면 위 형광 라벨과 아래 흰 자막이 따로 나와요. 한 줄만 쓰면 위에는 훅 문구, 아래에는 그 자막이 들어가요.',
  sample: { hook: '1. 로프 수납바구니', title: '', items: '', price: '', channel: 'living.pick' },
  sampleCaptions: ['수납도 예쁘게 하고 싶다면 추천!', '욕실·주방 어디든 잘 어울려요', '만원대라 부담도 없어요'],
  draw(ctx, f) {
    drawFullFrame(ctx, f);
    const g = ctx.createLinearGradient(0, f.H - 780, 0, f.H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = g;
    ctx.fillRect(0, f.H - 780, f.W, 780);

    const raw = String(f.caption || '').trim();
    const pipe = raw.split('|').map((s) => s.trim());
    const hookPipe = String(f.text.hook || '').split('|').map((s) => s.trim());
    let label = '';
    let sub = raw;
    if (pipe.length > 1) { label = pipe[0]; sub = pipe.slice(1).join(' ').trim(); }
    if (!label) {
      label = hookPipe[0] || String(f.text.title || '').trim();
      if (hookPipe.length > 1 && !sub) sub = hookPipe.slice(1).join(' ').trim();
    }
    if (label && pipe.length > 1 && (f.clipCount || 0) > 1 && (f.captionLines || 1) === 1 && !/^\d+[.)]/.test(label)) {
      label = `${(f.clipIndex || 0) + 1}. ${label}`;
    }

    if (label) {
      const size = 60, lh = size * 1.24, padX = 54, padY = 26;
      const innerMax = f.W - 72 - padX * 2;
      ctx.font = fontStr(900, size);
      const lay = layoutRich(ctx, label, size, 900, innerMax);
      const rows = lay.lines.slice(0, 2);
      const widest = rows.reduce((m, l) => Math.max(m, l.width), 0);
      const bh = rows.length * lh + padY * 2;
      const bw = Math.min(f.W - 72, widest + padX * 2);
      const bx = (f.W - bw) / 2;
      const by = Math.round(f.H * 0.22);
      const a = ease(f.t / 0.42);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(0, (1 - a) * -22);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.26)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#D4FF32';
      roundRect(ctx, bx, by, bw, bh, 6);
      ctx.fill();
      ctx.restore();
      drawRich(ctx, label, {
        x: f.W / 2, y: by + padY, size, weight: 900, align: 'center',
        maxW: bw - padX * 2 + 2, maxLines: 2, lineHeight: 1.24,
        color: '#12140b', accent: '#12140b', stroke: false, shadow: 0,
      });
      ctx.restore();
    }

    if (sub) {
      drawRich(ctx, sub, {
        x: f.W / 2, bottom: safeSubBottom(f), size: 56, weight: 700, align: 'center',
        maxW: f.W * 0.82, maxLines: 2, lineHeight: 1.32,
        color: '#FFFFFF', stroke: false, shadow: 18,
        opacity: Math.min(1, 0.32 + f.captionP * 6),
      });
    }
  },
});

TEMPLATES.forEach((t) => { t.W = t.W || 1080; t.H = t.H || 1920; });

const ARC_INFO = {
  R1: { name: '단일 제품 솔직 리뷰', len: 30, cut: 1.8 },
  R2: { name: 'N가지 리스트·하울', len: 30, cut: 1.2 },
  R3: { name: '문제해결 비포애프터', len: 35, cut: 2.5 },
  R4: { name: '가격·가성비 비교', len: 25, cut: 1.8 },
  R5: { name: '감성 루틴 브이로그', len: 20, cut: 3.0 },
};
const CAT_LABEL = { living: '리빙·살림', review: '제품 리뷰', info: '정보·꿀팁', hook: '훅·질문', mood: '감성 브이로그' };

/* ---------- 추천 (방향 · 길이 · 사진/영상) ---------- */
function recommend(srcW, srcH, duration, mode) {
  const vertical = (srcH || 1) >= (srcW || 1);
  const d = duration || 0;
  const score = (t) => {
    let s = 0;
    if (t.platform === 'youtube') s += vertical ? -4 : 3;
    else s += vertical ? 3 : -2;
    if (d && d <= 180) s += t.platform === 'youtube' ? 0 : 2;
    if (d > 180) s += t.platform === 'youtube' ? 2 : -6;
    if (mode === 'photo') s += t.W === 1080 ? 1.2 : 0;
    if (t.id === 'info30') s += 0.5;
    if (t.id === 'youtube-classic') s += 0.4;
    return s;
  };
  return [...TEMPLATES].sort((a, b) => score(b) - score(a)).map((t, i) => ({
    ...t,
    recommended: i === 0,
    reason: i === 0 ? `${vertical ? '세로' : '가로'} 영상${d ? ` · ${Math.round(d)}초` : ''} → ${t.name} 틀이 가장 잘 맞아요` : '',
  }));
}

/* ---------- 샘플 영상(직접 그린 그래픽) ---------- */
function makeSampleSource(aspect = 'portrait') {
  const c = document.createElement('canvas');
  c.width = aspect === 'portrait' ? 540 : 960;
  c.height = aspect === 'portrait' ? 960 : 540;
  const x = c.getContext('2d');
  const bokeh = Array.from({ length: 9 }, () => ({
    x: Math.random(), y: Math.random(), r: 26 + Math.random() * 70,
    s: 0.03 + Math.random() * 0.07, p: Math.random() * 6.28,
  }));
  return {
    canvas: c,
    draw(t) {
      const g = x.createLinearGradient(0, 0, c.width * 0.4, c.height);
      g.addColorStop(0, '#6c5c4b');
      g.addColorStop(0.42, '#a08b73');
      g.addColorStop(1, '#3a322b');
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);

      const warm = x.createRadialGradient(c.width * 0.72, c.height * 0.2, 0, c.width * 0.72, c.height * 0.2, c.width * 0.85);
      warm.addColorStop(0, 'rgba(255,238,206,0.55)');
      warm.addColorStop(0.42, 'rgba(255,220,180,0.18)');
      warm.addColorStop(1, 'rgba(255,220,180,0)');
      x.fillStyle = warm; x.fillRect(0, 0, c.width, c.height);

      x.save();
      x.globalAlpha = 0.12;
      const wx = c.width * 0.6, wy = c.height * 0.1, ww = c.width * 0.3, wh = c.height * 0.4;
      x.fillStyle = '#fff7e8';
      roundRect(x, wx, wy, ww, wh, 18);
      x.fill();
      x.globalAlpha = 0.5;
      x.fillStyle = '#4a3d31';
      x.fillRect(wx + ww / 2 - 3, wy, 6, wh);
      x.fillRect(wx, wy + wh * 0.52 - 3, ww, 6);
      x.restore();

      x.save();
      x.translate(c.width * 0.16, c.height * 0.84);
      x.rotate(-0.2 + Math.sin(t * 0.3) * 0.012);
      x.fillStyle = 'rgba(28,34,26,0.55)';
      for (let i = 0; i < 7; i++) {
        x.save();
        x.rotate(-1.5 + i * 0.34);
        x.beginPath();
        x.ellipse(0, -110 - i * 8, 26, 88, 0, 0, Math.PI * 2);
        x.fill();
        x.restore();
      }
      x.restore();

      for (const b of bokeh) {
        const cx = (((b.x + t * b.s) % 1.2) - 0.1) * c.width;
        const cy = (((b.y + t * b.s * 0.35) % 1.2) - 0.1) * c.height + Math.sin(t * 0.5 + b.p) * 18;
        const rg = x.createRadialGradient(cx, cy, 0, cx, cy, b.r);
        rg.addColorStop(0, 'rgba(255,240,214,0.22)');
        rg.addColorStop(1, 'rgba(255,240,214,0)');
        x.fillStyle = rg;
        x.beginPath(); x.arc(cx, cy, b.r, 0, Math.PI * 2); x.fill();
      }
      const v = x.createRadialGradient(c.width / 2, c.height * 0.45, c.width * 0.2, c.width / 2, c.height * 0.5, c.height * 0.8);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.4)');
      x.fillStyle = v; x.fillRect(0, 0, c.width, c.height);
    },
  };
}

refreshSans();
