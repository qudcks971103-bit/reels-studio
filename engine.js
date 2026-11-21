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
  { id: 'gaegu', family: 'Gaegu', name: '개구체', sample: '쭉쭉 늘려줘요', badge: '참고 릴스 손글씨', single: true },
  { id: 'nanumpen', family: 'Nanum Pen Script', name: '나눔 손글씨 펜', sample: '쭉쭉 늘려줘요', badge: '또박또박 펜글씨', single: true },
  { id: 'singleday', family: 'Single Day', name: '싱글 데이', sample: '이거 진짜 대박', badge: '동글동글 손글씨', single: true },
  /* 클로드4 실측 3종(2026-11-21)에서 쓰는 눈누 폰트 — fonts.css에 CDN으로 내장 */
  { id: 'nanumbarun', family: 'NanumBarunGothic', name: '나눔바른고딕', sample: '3년째 잘 쓰는템', badge: '실측 인테리어 기본' },
  { id: 'nanumcoding', family: 'NanumGothicCoding', name: '나눔고딕코딩', sample: '바삭 소리 ASMR', badge: '실측 ASMR 박스', single: true },
  { id: 'kkubulim', family: 'BM Kkubulim', name: '꾸불림체', sample: '📢 ASMR 📢', badge: '실측 ASMR 제목', single: true },
  { id: 'wavvepado', family: 'Wavve PADO', name: '웨이브 파도체', sample: '촉촉 루틴 추천', badge: '실측 리뷰 자막', single: true },
  { id: 'dangdang', family: 'Cafe24 Dangdanghae', name: '카페24 당당해', sample: '1. 제품명', badge: '실측 섹션 제목', single: true },
  { id: 'kukdae', family: 'SDKukdetopokki', name: '산돌국대떡볶이체', sample: '리뷰 BEST 3', badge: '실측 리뷰 훅', single: true },
];
/* 실측 틀이 쓰는 글꼴 이름 — fonts.css @font-face 와 짝을 이룹니다.
   CDN이 막히거나 글꼴이 없으면 아래 STACK의 다음 글꼴(내장 한글 폰트)로 자연스럽게 넘어갑니다. */
const FONT_STACK = {
  nanumbarun: '"NanumBarunGothic", "Pretendard", "Noto Sans KR", system-ui, sans-serif',
  nanumcoding: '"NanumGothicCoding", "Nanum Gothic Coding", "Pretendard", "Noto Sans KR", monospace',
  kkubulim: '"BM Kkubulim", "Jua", "Gaegu", "Pretendard", "Noto Sans KR", sans-serif',
  wavvepado: '"Wavve PADO", "GmarketSans", "Pretendard", "Noto Sans KR", sans-serif',
  dangdang: '"Cafe24 Dangdanghae", "Do Hyeon", "Jua", "Pretendard", "Noto Sans KR", sans-serif',
  kukdae: '"SDKukdetopokki", "Do Hyeon", "Jua", "Pretendard", "Noto Sans KR", sans-serif',
  gmarket: '"GmarketSans", "Pretendard", "Noto Sans KR", sans-serif',
  pretendard: '"Pretendard", "Noto Sans KR", system-ui, sans-serif',
};
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
  spacing: 0,    // 자간 px · -4 ~ +14 (참고 릴스처럼 넓게 벌리기)
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
/* 틀별 글꼴 지정 — drawRich·layoutRich 가 그리는 순간의 fontFamily()를 따릅니다. */
let FONT_OVERRIDE = null;
const fontOf = (id) => FONTS.find((f) => f.id === (id || UI.font)) || FONTS[0];
const fontFamily = () => (FONT_OVERRIDE ? FONT_OVERRIDE : `"${fontOf().family}", "Noto Sans KR", system-ui, sans-serif`);
function withFont(stack, fn) {
  const prev = FONT_OVERRIDE;
  FONT_OVERRIDE = stack || null;
  try { return fn(); } finally { FONT_OVERRIDE = prev; }
}
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
/* 색감 — 클로드4가 실측한 레퍼런스 톤을 캔버스에 입힙니다.
   ctx.filter를 지원하면 한 번에, 아니면 옅은 색 오버레이로 근사합니다(iOS 사파리 폴백). */
const TONE_FILTER = {
  warmBright: 'saturate(1.05) brightness(1.05) sepia(0.10)',
  crispWarm: 'saturate(1.15) contrast(1.05) brightness(1.02) sepia(0.06)',
  matte: 'saturate(0.62) contrast(0.9) brightness(1.06)',
};
function drawTonedFrame(ctx, f, tone) {
  const key = TONE_FILTER[tone] ? tone : null;
  let canFilter = false;
  try { canFilter = typeof ctx.filter === 'string'; } catch { canFilter = false; }
  ctx.save();
  if (key && canFilter) ctx.filter = TONE_FILTER[key];
  drawFullFrame(ctx, f);
  ctx.restore();
  if (!key || canFilter) return;
  ctx.save();
  if (tone === 'matte') {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(0, 0, f.W, f.H);
    ctx.fillStyle = 'rgba(126,122,116,0.10)';
  } else if (tone === 'crispWarm') {
    ctx.fillStyle = 'rgba(255,186,105,0.07)';
  } else {
    ctx.fillStyle = 'rgba(255,198,130,0.06)';
  }
  ctx.fillRect(0, 0, f.W, f.H);
  ctx.restore();
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
function layoutRich(ctx, text, size, weight, maxW, spIn) {
  ctx.font = fontStr(weight, size);
  const sp = spIn == null ? spacingNow() : spIn;
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
    hl = false, hlColor = null, hlInk = null, tracking = null, trackingForce = 0,
    strokeW = null, strokeCol = null, shadowCol = null, glow = null, shadowY = null,
  } = opt;
  if (!String(text || '').trim()) return { h: 0, y0: y };
  ctx.save();
  ctx.globalAlpha *= opacity;
  const sp = tracking == null ? spacingNow() + (trackingForce || 0) : tracking;
  const { lines: all, space } = layoutRich(ctx, text, size, weight, maxW, sp);
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
      const wc = w.a ? (hl ? (hlInk || '#12130C') : accent) : color;
      if (hl && w.a) {
        ctx.save();
        ctx.fillStyle = hlColor || accent;
        const mh = size * 0.36;
        roundRect(ctx, cx - size * 0.05, ty + size * 0.50, ww + size * 0.10, mh, mh * 0.18);
        ctx.fill();
        ctx.restore();
      }
      const run = (fn) => (sp ? eachChar(ctx, w.t, cx, sp, (c, xx) => fn(c, xx, ty)) : fn(w.t, cx, ty));
      if (stroke && !(hl && w.a)) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = strokeW || Math.max(2, size * 0.085);
        ctx.strokeStyle = strokeCol || 'rgba(0,0,0,0.55)';
        if (shadow) {
          ctx.shadowColor = shadowCol || 'rgba(0,0,0,0.45)';
          ctx.shadowBlur = shadow;
          ctx.shadowOffsetY = shadowY == null ? size * 0.06 : shadowY;
        }
        run((t, xx, yy) => ctx.strokeText(t, xx, yy));
        ctx.restore();
      } else if (shadow) {
        ctx.save();
        ctx.shadowColor = shadowCol || 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = shadow;
        ctx.shadowOffsetY = shadowY == null ? size * 0.06 : shadowY;
        ctx.fillStyle = wc;
        run((t, xx, yy) => ctx.fillText(t, xx, yy));
        ctx.restore();
      }
      if (glow && !(hl && w.a)) {
        /* 네온: 글씨 색과 같은 빛 번짐을 한 번 더 그립니다 */
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2, size * 0.1);
        ctx.strokeStyle = glow;
        ctx.shadowColor = glow;
        ctx.shadowBlur = size * 0.5;
        ctx.shadowOffsetY = 0;
        run((t, xx, yy) => ctx.strokeText(t, xx, yy));
        ctx.restore();
      }
      ctx.fillStyle = wc;
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

/* ---------- 자막 스타일 12종 ----------
   참고 릴스(DfRcwTAqOkK)의 "*쭉쭉 늘려줘요*"처럼 파스텔 채우기 + 두꺼운 흰 테두리 +
   부드러운 그림자를 한 번에 고를 수 있게 표로 정리했습니다. 값은 drawRich 옵션으로 그대로 넘어갑니다. */
const CAPTION_STYLES = [
  { id: 'outline', name: '순백 + 그림자', hint: '가장 무난한 기본', ink: '#FFFFFF', stroke: 'rgba(0,0,0,0.34)', strokeW: 0.045, shadow: 22, shadowCol: 'rgba(0,0,0,0.45)' },
  { id: 'pinkPuff', name: '파스텔 핑크 + 흰 테두리', hint: '파스텔 손글씨', ink: '#FF6FA5', stroke: '#FFFFFF', strokeW: 0.085, shadow: 18, shadowCol: 'rgba(255,80,145,0.45)' },
  { id: 'butter', name: '버터옐로우 + 검정 테두리', hint: '눈에 확 띄는 훅', ink: '#FFE066', stroke: '#14110C', strokeW: 0.07, shadow: 16, shadowCol: 'rgba(0,0,0,0.45)' },
  { id: 'lime', name: '라임 형광 마커', hint: '정보·꿀팁 강조', ink: '#12130C', bar: { color: '#D7FF3E', radius: 10, padX: 20, padY: 8 }, shadow: 0 },
  { id: 'coral', name: '코랄 + 흰 테두리', hint: '리뷰·후기', ink: '#FF6B5B', stroke: '#FFFFFF', strokeW: 0.085, shadow: 18, shadowCol: 'rgba(255,80,60,0.35)' },
  { id: 'mint', name: '민트 + 흰 테두리', hint: '살림·청소', ink: '#4FE0BC', stroke: '#FFFFFF', strokeW: 0.085, shadow: 18, shadowCol: 'rgba(30,190,160,0.35)' },
  { id: 'sky', name: '스카이 + 흰 테두리', hint: '가전·테크', ink: '#5BC8FF', stroke: '#FFFFFF', strokeW: 0.085, shadow: 18, shadowCol: 'rgba(40,150,240,0.35)' },
  { id: 'darkPill', name: '반투명 다크 알약', hint: '밝은 배경에 안전', ink: '#FFFFFF', bar: { color: 'rgba(12,13,18,0.66)', radius: 999, padX: 34, padY: 16 }, shadow: 0 },
  { id: 'whiteBox', name: '화이트 박스', hint: '깔끔한 정보형', ink: '#17181D', bar: { color: 'rgba(255,255,255,0.95)', radius: 12, padX: 26, padY: 12 }, shadow: 12, shadowCol: 'rgba(0,0,0,0.28)' },
  { id: 'neon', name: '네온 아웃라인', hint: '밤·클럽 무드', ink: '#FFFFFF', stroke: '#FF3DDA', strokeW: 0.075, glow: '#FF3DDA', shadow: 30, shadowCol: 'rgba(255,61,218,0.65)' },
  { id: 'cream', name: '크림 + 브라운 테두리', hint: '감성 브이로그', ink: '#FFF6E2', stroke: '#6B4A2F', strokeW: 0.075, shadow: 18, shadowCol: 'rgba(60,40,20,0.4)' },
  { id: 'butterBox', name: '버터 박스 + 검정 글씨', hint: '가격·혜택 강조', ink: '#1A1508', bar: { color: 'rgba(255,224,102,0.96)', radius: 10, padX: 24, padY: 10 }, shadow: 12, shadowCol: 'rgba(0,0,0,0.3)' },
  { id: 'boldOutline', name: '굵은 외곽선 고딕', hint: '상단 제목·훅 전용', ink: '#FFFFFF', stroke: '#000000', strokeW: 0.13, shadow: 16, shadowCol: 'rgba(0,0,0,0.6)' },
];
const CAPTION_ALIAS = { bar: 'darkPill' };
const capStyleOf = (id) => CAPTION_STYLES.find((s) => s.id === (CAPTION_ALIAS[id] || id)) || CAPTION_STYLES[0];

function drawCaptionArea(ctx, f, o = {}) {
  if (!f.caption) return;
  const st = capStyleOf(UI.captionStyle);
  const size = o.size || 56;
  const rise = (1 - ease(Math.min(1, (f.captionP || 0) * 4))) * 8;
  ctx.save();
  ctx.translate(0, rise);
  drawRich(ctx, f.caption, {
    x: o.x != null ? o.x : f.W / 2,
    bottom: o.bottom != null ? o.bottom : safeSubBottom(f),
    size, weight: o.weight || 600,
    align: o.align || 'center',
    maxW: o.maxW || f.W * 0.78, maxLines: o.maxLines || 2,
    lineHeight: o.lineHeight || 1.3,
    color: st.ink,
    stroke: !!st.stroke,
    strokeW: st.stroke ? Math.max(2, size * st.strokeW) : null,
    strokeCol: st.stroke || null,
    shadow: st.shadow == null ? 22 : st.shadow,
    shadowCol: st.shadowCol || 'rgba(0,0,0,0.4)',
    glow: st.glow || null,
    bar: !!st.bar,
    barColor: (st.bar && st.bar.color) || o.barColor || 'rgba(14,14,18,0.56)',
    barRadius: (st.bar && st.bar.radius) || 20,
    barPadX: (st.bar && st.bar.padX) || 34,
    barPadY: (st.bar && st.bar.padY) || 18,
    opacity: Math.min(1, 0.35 + f.captionP * 6),
  });
  ctx.restore();
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
  const { tint = 'rgba(255,255,255,0.16)', border = 'rgba(255,255,255,0.30)', sample = null, blur = 1 / 16, lineWidth = 2.5 } = opt;
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
    ctx.lineWidth = lineWidth;
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
   디자인 킷 (2026) — 에디토리얼 미니멀 · 고감도 커머스
   · 타이포: 제목 800 · 자간 -3% · 행간 1.10~1.15 / 본문 600 / 숫자만 900
   · 자막: 흰 글씨 + 옅은 그림자(rgba(0,0,0,0.35)) · 강조는 글자 아래 40% 형광 마커
   · 컬러: 한 화면에 포인트 1개(라임 #D4FF32 · 크림 #F6F1E9 · 차콜 #16171B · 코랄 #FF6B4A)
   · 모션: 180~200ms · 8px 상승 페이드
   · 레이아웃: 좌측 정렬 · 여백 64px · 상단 라벨은 작은 반투명 유리 칩
   ========================================================================= */
const DS = {
  ink: '#16171B',
  inkSoft: 'rgba(22,23,27,0.58)',
  charcoal: '#16171B',
  cream: '#F6F1E9',
  lime: '#D4FF32',
  coral: '#FF6B4A',
  glass: 'rgba(16,16,20,0.42)',
  glassDeep: 'rgba(12,12,16,0.58)',
  hairline: 'rgba(255,255,255,0.22)',
  hairlineSoft: 'rgba(255,255,255,0.12)',
  margin: 64,
};
const accentNow = () => accentColor();
const tight = (size) => -Math.round(size * (size >= 130 ? 0.012 : size >= 110 ? 0.018 : 0.03));
const RISE_MS = 0.19;

function softShadow(ctx, size, alpha = 0.4) {
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = Math.max(6, size * 0.5);
  ctx.shadowOffsetY = Math.max(2, size * 0.07);
}
function clearShadow(ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/* 부드러운 스크림 — 5단 그라데이션 (위/아래) */
function scrimSmooth(ctx, f, h, a, fromTop = true) {
  const g = ctx.createLinearGradient(0, fromTop ? 0 : f.H - h, 0, fromTop ? h : f.H);
  const stops = [[0, 0], [0.24, 0.18], [0.47, 0.42], [0.73, 0.7], [1, 1]];
  stops.forEach(([p, m]) => {
    const v = fromTop ? (1 - m) * a : m * a;
    g.addColorStop(p, `rgba(0,0,0,${v})`);
  });
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, fromTop ? 0 : f.H - h, f.W, h);
  ctx.restore();
}

function hairlineRule(ctx, x, y, w, color = DS.hairline, th = 2) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, th);
  ctx.restore();
}

function accentDot(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color || accentNow();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* 모션 — 190ms · 8px 상승 페이드 */
function riseIn(f, start, dur = RISE_MS) {
  const p = Math.min(1, Math.max(0, ((f.t || 0) - (start || 0)) / dur));
  const e = easeOut(p);
  return { a: e, dy: (1 - e) * 8, p };
}

/* 작은 트래킹 라벨 */
function trackLabel(ctx, text, x, y, opt = {}) {
  return drawTracked(ctx, text, x, y, {
    size: opt.size || 24,
    weight: opt.weight || 600,
    spacing: opt.spacing == null ? 6 : opt.spacing,
    color: opt.color || 'rgba(255,255,255,0.62)',
    align: opt.align || 'left',
    alpha: opt.alpha == null ? 1 : opt.alpha,
  });
}

/* 상단 라벨 — 작은 반투명 유리 칩 */
function glassPill(ctx, f, text, x, y, opt = {}) {
  const size = opt.size || 30;
  const weight = opt.weight || 600;
  const sp = opt.spacing == null ? 0 : opt.spacing;
  ctx.save();
  ctx.font = fontStr(weight, size);
  const tw = measureSpaced(ctx, text, sp);
  const padX = opt.padX == null ? size * 0.95 : opt.padX;
  const padY = opt.padY == null ? size * 0.5 : opt.padY;
  const dotR = opt.dot ? Math.max(4, size * 0.17) : 0;
  const gap = opt.dot ? dotR * 2 + size * 0.5 : 0;
  const h = size + padY * 2;
  const w = tw + padX * 2 + gap;
  const bx = opt.align === 'center' ? x - w / 2 : opt.align === 'right' ? x - w : x;
  const by = opt.align === 'middle' ? y - h / 2 : y;
  frostedPanel(ctx, f, bx, by, w, h, h / 2, {
    tint: opt.tint || DS.glass,
    border: opt.border || DS.hairline,
    lineWidth: opt.lineWidth == null ? 1.5 : opt.lineWidth,
    sample: opt.sample || null,
    blur: opt.blur || 1 / 12,
  });
  let cx = bx + padX;
  if (opt.dot) {
    accentDot(ctx, cx + dotR, by + h / 2, dotR, opt.dotColor);
    cx += gap;
  }
  ctx.fillStyle = opt.fg || 'rgba(255,255,255,0.94)';
  ctx.font = fontStr(weight, size);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const ly = by + h / 2 + size * 0.02;
  if (sp) eachChar(ctx, text, cx, sp, (c, xx) => ctx.fillText(c, xx, ly));
  else ctx.fillText(text, cx, ly);
  ctx.restore();
  return { w, h, x: bx, y: by };
}

/* 헤어라인 태그 (칩 대신 얇은 테두리만) */
function hairTag(ctx, text, x, y, opt = {}) {
  const size = opt.size || 26;
  const sp = opt.spacing == null ? 4 : opt.spacing;
  ctx.save();
  ctx.font = fontStr(opt.weight || 600, size);
  const tw = measureSpaced(ctx, text, sp);
  const padX = opt.padX == null ? size * 0.85 : opt.padX;
  const padY = opt.padY == null ? size * 0.46 : opt.padY;
  const h = size + padY * 2;
  const w = tw + padX * 2;
  const bx = opt.align === 'center' ? x - w / 2 : opt.align === 'right' ? x - w : x;
  ctx.strokeStyle = opt.border || DS.hairline;
  ctx.lineWidth = opt.lineWidth == null ? 1.5 : opt.lineWidth;
  roundRect(ctx, bx + 1, y + 1, w - 2, h - 2, h / 2);
  ctx.stroke();
  ctx.fillStyle = opt.fg || 'rgba(255,255,255,0.86)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = bx + w / 2;
  const ly = y + h / 2 + size * 0.02;
  if (sp) {
    let start = cx - tw / 2;
    eachChar(ctx, text, start, sp, (c, xx) => ctx.fillText(c, xx, ly));
  } else ctx.fillText(text, cx, ly);
  ctx.restore();
  return { w, h, x: bx, y };
}

/* 리치 텍스트 크기 자동 맞춤 */
function fitRichSize(ctx, text, start, maxW, maxLines, weight = 800, spIn = null) {
  let size = start;
  while (size > 54) {
    const lay = layoutRich(ctx, text, size, weight, maxW, spIn == null ? spacingNow() + tight(size) : spIn);
    if (lay.lines.length <= maxLines) return size;
    size -= 4;
  }
  return size;
}

/* 제목 — 800 · 자간 -3% · 행간 1.12 */
function titleRich(ctx, text, opt = {}) {
  const size = opt.size || 82;
  return drawRich(ctx, text, {
    x: opt.x == null ? 540 : opt.x,
    y: opt.y == null ? 0 : opt.y,
    bottom: opt.bottom == null ? null : opt.bottom,
    size,
    weight: opt.weight || 800,
    align: opt.align || 'left',
    maxW: opt.maxW || 860,
    lineHeight: opt.lineHeight || 1.12,
    maxLines: opt.maxLines || 2,
    color: opt.color || '#FFFFFF',
    stroke: false,
    shadow: opt.shadow == null ? 26 : opt.shadow,
    shadowCol: opt.shadowCol || 'rgba(0,0,0,0.35)',
    opacity: opt.opacity == null ? 1 : opt.opacity,
    hl: !!opt.hl,
    hlColor: opt.hlColor || DS.lime,
    hlInk: opt.hlInk || null,
    accent: accentNow(),
    trackingForce: opt.trackingForce == null ? tight(size) : opt.trackingForce,
    lineGap: opt.lineGap || 1,
  });
}

/* 본문 자막 — 흰 글씨 600 + 옅은 그림자 */
function captionClean(ctx, text, opt = {}) {
  if (!String(text || '').trim()) return { h: 0, y0: 0 };
  /* 자막 스타일 13종이 틀과 상관없이 적용되도록 색·테두리·바·그림자를 여기서 한 번에 정합니다.
     (목록 항목·제목처럼 자막이 아닌 글자는 opt.plain = true 로 기존 모습 유지) */
  const st = opt.plain ? null : capStyleOf(UI.captionStyle || 'outline');
  const size = opt.size || 56;
  return drawRich(ctx, text, {
    x: opt.x == null ? 540 : opt.x,
    y: opt.y == null ? 0 : opt.y,
    bottom: opt.bottom == null ? null : opt.bottom,
    size,
    weight: opt.weight || 600,
    align: opt.align || 'center',
    maxW: opt.maxW || 860,
    maxLines: opt.maxLines || 2,
    lineHeight: opt.lineHeight || 1.32,
    color: opt.color || (st ? st.ink : 'rgba(255,255,255,0.98)'),
    stroke: !!(st && st.stroke),
    strokeW: st && st.stroke ? Math.max(2, size * st.strokeW) : null,
    strokeCol: (st && st.stroke) || null,
    glow: st ? st.glow : null,
    bar: !!(st && st.bar),
    barColor: (st && st.bar && st.bar.color) || 'rgba(12,13,18,0.6)',
    barRadius: (st && st.bar && st.bar.radius) || 18,
    barPadX: (st && st.bar && st.bar.padX) || 28,
    barPadY: (st && st.bar && st.bar.padY) || 12,
    shadow: opt.shadow == null ? (st && st.shadow != null ? st.shadow : 22) : opt.shadow,
    shadowCol: opt.shadowCol || 'rgba(0,0,0,0.35)',
    opacity: opt.opacity == null ? 1 : opt.opacity,
    hl: !!opt.hl,
    accent: opt.accent || accentNow(),
    trackingForce: opt.trackingForce || 0,
    lineGap: opt.lineGap || 1,
  });
}

/* 미니멀 진행 바 */
function progressLine(ctx, f, color, y = 1562, h = 5, inset = 64) {
  const p = f.duration ? clamp(f.t / f.duration, 0, 1) : 0;
  const w = f.W - inset * 2;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  roundRect(ctx, inset, y, w, h, h / 2);
  ctx.fill();
  if (p > 0.002) {
    ctx.fillStyle = color || 'rgba(255,255,255,0.85)';
    roundRect(ctx, inset, y, Math.max(h, w * p), h, h / 2);
    ctx.fill();
  }
  ctx.restore();
}

/* 진행 점 — 리스트/단계 인디케이터 */
function progressDots(ctx, n, active, x, y, opt = {}) {
  const r = opt.r || 6;
  const gap = opt.gap || 22;
  const color = opt.color || accentNow();
  for (let i = 0; i < n; i += 1) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + i * gap, y, i === active ? r : r * 0.72, 0, Math.PI * 2);
    if (i === active) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.fillStyle = opt.dim || 'rgba(255,255,255,0.28)';
      ctx.fill();
    }
    ctx.restore();
  }
}

/* 얇은 큰 숫자 (01 · 02 · 03) — 장식용 인덱스 */
function thinNumeral(ctx, text, x, y, size, opt = {}) {
  ctx.save();
  ctx.font = `${opt.weight || 300} ${size}px ${fontFamily()}`;
  ctx.fillStyle = opt.color || 'rgba(255,255,255,0.94)';
  ctx.textAlign = opt.align || 'left';
  ctx.textBaseline = 'alphabetic';
  if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
  const sp = opt.tracking == null ? tight(size) : opt.tracking;
  const w = measureSpaced(ctx, text, sp);
  let sx = x;
  if (ctx.textAlign === 'center') sx = x - w / 2;
  else if (ctx.textAlign === 'right') sx = x - w;
  ctx.textAlign = 'left';
  if (sp) eachChar(ctx, text, sx, sp, (c, xx) => ctx.fillText(c, xx, y));
  else ctx.fillText(text, sx, y);
  ctx.restore();
  return w;
}

/* 얇은 시네마틱 프레임 (코너 틱) */
function filmFrame(ctx, f, inset = 44, color = 'rgba(255,255,255,0.22)') {
  const W = f.W, H = f.H;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const L = 34;
  const pts = [[inset, inset, 1, 1], [W - inset, inset, -1, 1], [inset, H - inset, 1, -1], [W - inset, H - inset, -1, -1]];
  for (const [x, y, sx, sy] of pts) {
    ctx.beginPath();
    ctx.moveTo(x + sx * L, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * L);
    ctx.stroke();
  }
  ctx.restore();
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
    } else {
      f.media.blurBg(ctx, f);
      const cw = W - 128, ch = Math.round(H * 0.40), cx = 64, cy = Math.round(H * 0.31);
      ctx.save();
      softShadow(ctx, 90, 0.4);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      roundRect(ctx, cx, cy, cw, ch, 24);
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, cx, cy, cw, ch, 24);
      ctx.clip();
      f.media.draw(ctx, cx, cy, cw, ch, 'cover');
      ctx.restore();
      ctx.save();
      roundRect(ctx, cx + 1, cy + 1, cw - 2, ch - 2, 23);
      ctx.strokeStyle = DS.hairline;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    scrimSmooth(ctx, f, H * 0.46, 0.66, true);
    scrimSmooth(ctx, f, H * 0.54, 0.9, false);
    vignette(ctx, W, H, 0.14);

    /* 상단 라벨 — 작은 반투명 유리 칩 (할인은 가격 카드에서 한 번만) */
    const label = d.badge || '특가';
    const c = riseIn(f, 0.05);
    ctx.save();
    ctx.globalAlpha = c.a;
    ctx.translate(0, c.dy);
    ctx.font = fontStr(600, 27);
    glassPill(ctx, f, truncate(ctx, label, 520), 64, SAFE.top + 14, {
      size: 27, weight: 600, fg: 'rgba(255,255,255,0.92)', padX: 28, padY: 16,
    });
    const handle = f.text.channel || d.channel;
    if (handle) {
      trackLabel(ctx, '@' + String(handle).replace(/^@/, ''), W - 64, SAFE.top + 30, {
        size: 23, align: 'right', color: 'rgba(255,255,255,0.55)', spacing: 1,
      });
    }
    ctx.restore();

    /* 메인 훅 — 800 · 자간 타이트 · 행간 1.12 */
    const hook = d.hook || d.name || f.text.hook || f.text.title || '지금이 역대가';
    const big = f.t < 3;
    const maxW = W - 128;
    const hookSize = fitRichSize(ctx, hook, big ? 92 : 78, maxW, 2, 800);
    const e = riseIn(f, 0, 0.2);
    ctx.save();
    ctx.globalAlpha = e.a;
    ctx.translate(0, e.dy);
    const hr = titleRich(ctx, hook, {
      x: 64, y: 360, size: hookSize, weight: 800, maxW, lineHeight: 1.12, maxLines: 2,
      shadow: 30,
    });
    ctx.restore();
    const cardTop = clamp(360 + (hr.h || hookSize * 1.12) + 136, 596, 820);

    /* 가격 — 다크 유리 카드 · 숫자만 900 */
    if (d.oldP || d.newP) {
      const px = 64, pw = W - 128, py = cardTop, ph = 196;
      const pop = riseIn(f, 0.12, 0.2);
      ctx.save();
      ctx.globalAlpha = pop.a;
      ctx.translate(0, pop.dy);
      frostedPanel(ctx, f, px, py, pw, ph, 24, { tint: DS.glassDeep, border: DS.hairline, lineWidth: 1.5 });
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const split = px + Math.round(pw * 0.46);
      if (d.oldP) {
        trackLabel(ctx, '정가', px + 40, py + 36, { size: 21, color: 'rgba(255,255,255,0.5)', spacing: 5 });
        ctx.font = fontStr(600, 46);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const oldW = widthOf(ctx, d.oldP);
        ctx.textBaseline = 'top';
        fillTxt(ctx, d.oldP, px + 40, py + 96);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px + 36, py + 124);
        ctx.lineTo(px + 40 + Math.min(oldW, split - px - 76), py + 124);
        ctx.stroke();
        ctx.restore();
      }
      hairlineRule(ctx, split, py + 40, 1.2, DS.hairlineSoft, ph - 80);
      trackLabel(ctx, '지금', split + 36, py + 36, { size: 21, color: 'rgba(255,255,255,0.5)', spacing: 5 });
      if (d.newP) {
        ctx.font = fontStr(900, 88);
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'top';
        fillTxt(ctx, truncate(ctx, d.newP, pw - (split - px) - 170), split + 36, py + 64);
      }
      if (d.off) {
        ctx.save();
        ctx.font = fontStr(900, 28);
        const bt = `-${d.off}%`;
        const bw = widthOf(ctx, bt) + 36;
        ctx.fillStyle = DS.lime;
        roundRect(ctx, px + pw - bw - 32, py + 34, bw, 52, 26);
        ctx.fill();
        ctx.fillStyle = '#14160C';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        fillTxt(ctx, bt, px + pw - 32 - bw / 2, py + 61);
        ctx.restore();
      }
      ctx.restore();
    }

    /* 자막 — 박스 없이 흰 글씨 + 옅은 그림자 */
    const lines = f.capLines || [];
    const li = lineIndexAt(f.t, f.duration, lines.length);
    if (li >= 0) {
      const nLine = lines.length || 1;
      const m = riseIn(f, (li * f.duration) / nLine);
      ctx.save();
      ctx.globalAlpha = m.a;
      ctx.translate(0, m.dy);
      captionClean(ctx, lines[li], {
        bottom: 1312, size: 56, weight: 600, maxW: W - 160, maxLines: 2,
      });
      ctx.restore();
    }

    /* CTA — 유리 알약 (원색 그라데이션 없음) */
    const ctaY = 1376, ctaH = 96, ctaX = 64, ctaW = W - 128;
    const cm = riseIn(f, 0.3);
    ctx.save();
    ctx.globalAlpha = cm.a;
    ctx.translate(0, cm.dy);
    frostedPanel(ctx, f, ctaX, ctaY, ctaW, ctaH, ctaH / 2, { tint: 'rgba(16,16,20,0.46)', border: DS.hairline, lineWidth: 1.5 });
    const kw = d.keyword || '링크';
    const ctaText = `댓글에 '${kw}' 남기면 DM`;
    let fs = 36;
    ctx.font = fontStr(600, fs);
    while (widthOf(ctx, ctaText) > ctaW - 80 && fs > 24) { fs -= 2; ctx.font = fontStr(600, fs); }
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fillTxt(ctx, ctaText, ctaX + ctaW / 2, ctaY + ctaH / 2 + 1);
    ctx.restore();

    progressLine(ctx, f, 'rgba(255,255,255,0.85)', 1562, 4);
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
    const W = f.W, H = f.H;
    const ar = f.media.aspect || 1;
    if (ar > 1.05) {
      /* 가로 영상: 흐린 배경 + 가운데 원본 + 가장자리 페이드 */
      f.media.blurBg(ctx, f);
      const vh = Math.min(H * 0.62, W / ar);
      const vy = (H - vh) / 2;
      f.media.draw(ctx, 0, vy, W, vh, 'cover');
      const eT = ctx.createLinearGradient(0, vy, 0, vy + 48);
      eT.addColorStop(0, 'rgba(0,0,0,0.32)');
      eT.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = eT;
      ctx.fillRect(0, vy, W, 48);
      const eB = ctx.createLinearGradient(0, vy + vh - 48, 0, vy + vh);
      eB.addColorStop(0, 'rgba(0,0,0,0)');
      eB.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctx.fillStyle = eB;
      ctx.fillRect(0, vy + vh - 48, W, 48);
    } else {
      f.media.draw(ctx, 0, 0, W, H, 'cover');
    }
    scrimSmooth(ctx, f, 680, 0.5, true);
    scrimSmooth(ctx, f, 620, 0.6, false);
    vignette(ctx, W, H, 0.16);

    /* 인트로 훅 — 800 · 타이트 · 박스 없음 */
    if (f.t < 3 && f.text.hook) {
      const fade = f.t > 2.6 ? Math.max(0, (3 - f.t) / 0.4) : 1;
      const size = fitRichSize(ctx, f.text.hook, 100, W * 0.86, 3, 800);
      const e = riseIn(f, 0, 0.2);
      ctx.save();
      ctx.globalAlpha = fade * e.a;
      ctx.translate(0, e.dy);
      titleRich(ctx, f.text.hook, {
        x: W / 2, y: 700, size, weight: 800, align: 'center', maxW: W * 0.86,
        lineHeight: 1.12, maxLines: 3, shadow: 32, hl: true,
      });
      ctx.restore();
    } else if (f.text.title) {
      const e = riseIn(f, 0, 0.2);
      ctx.save();
      ctx.globalAlpha = e.a;
      ctx.translate(0, e.dy);
      ctx.font = fontStr(600, 27);
      glassPill(ctx, f, truncate(ctx, f.text.title, 600), W / 2, 268, {
        size: 27, weight: 600, align: 'center', fg: 'rgba(255,255,255,0.92)', padX: 28, padY: 15,
      });
      ctx.restore();
    }

    /* 본문 자막 — 600 · 흰 글씨 */
    const cap = timedCaption2(f);
    if (cap) {
      const parts = (f.capLines && f.capLines.length) ? f.capLines : [cap];
      const idx = Math.max(0, parts.indexOf(cap));
      const m = riseIn(f, (idx * (f.duration || 1)) / parts.length);
      ctx.save();
      ctx.globalAlpha = m.a;
      ctx.translate(0, m.dy);
      captionClean(ctx, cap, {
        bottom: SAFE.captionLine, size: 78, weight: 600, maxW: W * 0.86, maxLines: 2, lineHeight: 1.28,
      });
      ctx.restore();
    }
    progressLine(ctx, f, 'rgba(255,255,255,0.8)', 1562, 4);
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
    const W = f.W, H = f.H, pad = 64;
    /* 크림 종이 배경 (포인트 컬러는 코랄 점 하나) */
    ctx.fillStyle = DS.cream;
    ctx.fillRect(0, 0, W, H);

    const today = new Date();
    const dstr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, '0')}. ${String(today.getDate()).padStart(2, '0')}`;
    const e0 = riseIn(f, 0.02);
    ctx.save();
    ctx.globalAlpha = e0.a;
    ctx.translate(0, e0.dy);
    accentDot(ctx, pad + 5, SAFE.top + 20, 6, DS.coral);
    drawTracked(ctx, dstr, pad + 26, SAFE.top + 6, { size: 24, weight: 600, spacing: 5, color: DS.inkSoft });
    if (f.text.channel) {
      drawTracked(ctx, '@' + String(f.text.channel).replace(/^@/, ''), W - pad, SAFE.top + 6, {
        size: 23, weight: 600, spacing: 2, color: DS.inkSoft, align: 'right',
      });
    }
    ctx.restore();

    /* 제목 — 800 · 자간 타이트 · 행간 1.12 */
    const title = f.text.title || f.text.hook || (f.deal && f.deal.name) || '오늘의 기록';
    const tsize = fitRichSize(ctx, title, 78, W - pad * 2, 2, 800);
    const e1 = riseIn(f, 0.06);
    ctx.save();
    ctx.globalAlpha = e1.a;
    ctx.translate(0, e1.dy);
    titleRich(ctx, title, {
      x: pad, y: 312, size: tsize, weight: 800, align: 'left', maxW: W - pad * 2,
      lineHeight: 1.12, maxLines: 2, color: DS.ink, shadow: 0, hl: true, hlColor: '#E8E2D4', hlInk: DS.ink,
    });
    ctx.restore();

    /* 카드 — 얇은 헤어라인 + 부드러운 그림자 */
    const cy = 470, ch = 900, cw = W - pad * 2;
    ctx.save();
    softShadow(ctx, 60, 0.16);
    ctx.fillStyle = 'rgba(22,23,27,0.9)';
    roundRect(ctx, pad, cy, cw, ch, 20);
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, pad, cy, cw, ch, 20);
    ctx.clip();
    f.media.draw(ctx, pad, cy, cw, ch, 'cover');
    ctx.restore();
    ctx.save();
    roundRect(ctx, pad + 1, cy + 1, cw - 2, ch - 2, 19);
    ctx.strokeStyle = 'rgba(22,23,27,0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    /* 자막 — 종이 위 차콜 */
    const cap = timedCaption2(f);
    if (cap) {
      const parts = (f.capLines && f.capLines.length) ? f.capLines : [cap];
      const idx = Math.max(0, parts.indexOf(cap));
      const m = riseIn(f, (idx * (f.duration || 1)) / parts.length);
      ctx.save();
      ctx.globalAlpha = m.a;
      ctx.translate(0, m.dy);
      drawRich(ctx, cap, {
        x: W / 2, bottom: 1512, size: 50, weight: 600, align: 'center',
        maxW: W - pad * 2, maxLines: 2, lineHeight: 1.34, color: 'rgba(22,23,27,0.84)',
        stroke: false, shadow: 0,
      });
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
    const W = f.W, H = f.H;
    ctx.fillStyle = '#07070B';
    ctx.fillRect(0, 0, W, H);
    f.media.draw(ctx, 0, 0, W, H, 'cover');
    scrimSmooth(ctx, f, 700, 0.74, true);
    scrimSmooth(ctx, f, 880, 0.88, false);
    vignette(ctx, W, H, 0.2);

    const items = (f.items && f.items.length) ? f.items : (f.capLines || []);
    const n = items.length || 3;
    const pad2 = (v) => String(v).padStart(2, '0');

    /* 상단 라벨 — 작은 유리 칩 + 제목 800 */
    const e0 = riseIn(f, 0.02);
    ctx.save();
    ctx.globalAlpha = e0.a;
    ctx.translate(0, e0.dy);
    ctx.font = fontStr(600, 25);
    glassPill(ctx, f, `${pad2(n)} ITEMS · TOP LIST`, 64, SAFE.top + 8, {
      size: 25, weight: 600, spacing: 4, fg: 'rgba(255,255,255,0.9)', padX: 26, padY: 15,
    });
    ctx.restore();

    const title = f.text.title || f.text.hook || '알아두면 좋은 TOP 3';
    const tsize = fitRichSize(ctx, title, 78, W - 128, 2, 800);
    const e1 = riseIn(f, 0.06);
    ctx.save();
    ctx.globalAlpha = e1.a;
    ctx.translate(0, e1.dy);
    titleRich(ctx, title, {
      x: 64, y: 330, size: tsize, weight: 800, align: 'left', maxW: W - 128,
      lineHeight: 1.12, maxLines: 2, shadow: 28,
    });
    ctx.restore();

    /* 하단: 크고 얇은 숫자 01·02·03 + 항목 600 + 진행 점 */
    const idx = f.duration && items.length ? lineIndexAt(f.t, f.duration, n) : 0;
    const local = f.duration && items.length ? (f.t / f.duration) * n - idx : 1;
    const a = easeOut(Math.max(0, local) * 3.6);
    const rank = idx + 1;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(0, (1 - a) * 8);
    thinNumeral(ctx, pad2(rank), 60, 1424, 232, { weight: 300, color: 'rgba(255,255,255,0.96)' });
    captionClean(ctx, items[idx] || '', {
      x: 372, y: 1300, size: 72, weight: 600, align: 'left', maxW: W - 436,
      maxLines: 2, lineHeight: 1.24, shadow: 24, plain: true,
    });
    ctx.restore();

    progressDots(ctx, n, idx, 372, 1512, { r: 8, gap: 26, color: DS.lime });
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
    const W = f.W, H = f.H;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const ar = f.media.aspect || 1;
    if (ar < 0.95) {
      f.media.blurBg(ctx, f);
      const bw = Math.min(W, H * ar);
      const bx = (W - bw) / 2;
      f.media.draw(ctx, 0, 0, W, H, 'contain');
      const gL = ctx.createLinearGradient(bx, 0, bx + 60, 0);
      gL.addColorStop(0, 'rgba(0,0,0,0.4)');
      gL.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gL;
      ctx.fillRect(bx, 0, 60, H);
      const gR = ctx.createLinearGradient(bx + bw - 60, 0, bx + bw, 0);
      gR.addColorStop(0, 'rgba(0,0,0,0)');
      gR.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = gR;
      ctx.fillRect(bx + bw - 60, 0, 60, H);
    } else {
      f.media.draw(ctx, 0, 0, W, H, 'cover');
    }

    const handle = f.text.channel || (f.deal && f.deal.channel);
    if (handle) {
      ctx.font = fontStr(600, 26);
      glassPill(ctx, f, String(handle).replace(/^@/, ''), W - 96, 60, {
        size: 26, weight: 600, align: 'right', fg: 'rgba(255,255,255,0.86)', padX: 24, padY: 14,
      });
    }

    const intro = 2.5;
    if (f.t < intro) {
      const a2 = f.t < intro - 0.5 ? 1 : (intro - f.t) / 0.5;
      ctx.save();
      ctx.globalAlpha = a2;
      ctx.fillStyle = 'rgba(10,10,14,0.72)';
      ctx.fillRect(0, 0, W, H);
      const e = riseIn(f, 0, 0.2);
      ctx.globalAlpha = a2 * e.a;
      ctx.translate(0, e.dy);
      hairlineRule(ctx, 148, 470, 76, DS.lime, 5);
      const title = f.text.title || f.text.hook || '제목을 입력하세요';
      const size = fitRichSize(ctx, title, 106, W * 0.74, 2, 800);
      const r = titleRich(ctx, title, {
        x: 148, y: 514, size, weight: 800, align: 'left', maxW: W * 0.74,
        lineHeight: 1.12, maxLines: 2, shadow: 36,
      });
      if (handle) {
        drawTracked(ctx, String(handle).replace(/^@/, ''), 150, 514 + (r.h || size * 1.12) + 40, {
          size: 25, weight: 600, spacing: 7, color: 'rgba(255,255,255,0.5)',
        });
      }
      ctx.restore();
    } else {
      const cap = timedCaption2(f);
      if (cap) {
        scrimSmooth(ctx, f, 360, 0.34, false);
        const parts = (f.capLines && f.capLines.length) ? f.capLines : [cap];
        const idx = Math.max(0, parts.indexOf(cap));
        const m = riseIn(f, (idx * (f.duration || 1)) / parts.length);
        ctx.save();
        ctx.globalAlpha = m.a;
        ctx.translate(0, m.dy);
        captionClean(ctx, cap, {
          x: W / 2, bottom: H - 96, size: 52, weight: 600, maxW: W * 0.72, maxLines: 2, lineHeight: 1.3,
        });
        ctx.restore();
      }
    }

    const outro = 4;
    if (f.duration > outro + intro && f.t > f.duration - outro) {
      const a3 = easeOut((f.t - (f.duration - outro)) / 0.6);
      ctx.save();
      ctx.globalAlpha = a3;
      ctx.fillStyle = 'rgba(6,6,10,0.68)';
      ctx.fillRect(0, 0, W, H);
      drawTracked(ctx, 'NEXT VIDEO', W / 2, 322, { size: 24, weight: 600, spacing: 9, color: 'rgba(255,255,255,0.45)', align: 'center' });
      titleRich(ctx, '시청해 주셔서 감사합니다', {
        x: W / 2, y: 372, size: 74, weight: 800, align: 'center', maxW: W * 0.7,
        lineHeight: 1.2, maxLines: 1, shadow: 24,
      });
      const bw = 344, bh = 100, bx = (W - bw) / 2, by = 528;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      roundRect(ctx, bx, by, bw, bh, bh / 2);
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = fontStr(600, 40);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fillTxt(ctx, '구독하기', bx + bw / 2, by + bh / 2 + 1);
      ctx.restore();
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
    const W = f.W, H = f.H;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const bar = Math.round(H * 0.125 * easeOut(f.t / 1.4));
    f.media.draw(ctx, 0, 0, W, H, 'cover');
    vignette(ctx, W, H, 0.4);
    grain(ctx, W, H, 0.04);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, bar);
    ctx.fillRect(0, H - bar, W, bar);

    /* 상단: 타임코드 · 채널 */
    drawTracked(ctx, `${timecode(f.t)} / ${timecode(f.duration)}`, W - 132, bar + 40, {
      size: 23, weight: 600, spacing: 4, color: 'rgba(255,255,255,0.5)', align: 'right',
    });
    const handle = f.text.channel || (f.deal && f.deal.channel);
    if (handle) {
      drawTracked(ctx, String(handle).replace(/^@/, '').toUpperCase(), 132, bar + 40, {
        size: 23, weight: 600, spacing: 7, color: 'rgba(255,255,255,0.5)',
      });
    }

    /* 타이틀 — 얇은 라임 규칙 하나만 */
    const title = f.text.title || f.text.hook || (f.deal && f.deal.name);
    const show = f.t > 0.8 && f.t < 6;
    if (show && title) {
      const a = Math.min(easeOut((f.t - 0.8) / 0.6), f.t > 5.4 ? (6 - f.t) / 0.6 : 1);
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      const bx = 132, by = H - bar - 262;
      hairlineRule(ctx, bx, by, 68, DS.lime, 4);
      const r = titleRich(ctx, title, {
        x: bx, y: by + 34, size: 72, weight: 800, align: 'left', maxW: W * 0.62,
        lineHeight: 1.14, maxLines: 2, shadow: 22,
      });
      if (handle) {
        drawTracked(ctx, '@' + String(handle).replace(/^@/, ''), bx + 2, by + 34 + (r.h || 72 * 1.14) + 24, {
          size: 25, weight: 600, spacing: 3, color: 'rgba(255,255,255,0.55)',
        });
      }
      ctx.restore();
    }

    /* 자막 — 레터박스 위, 넓은 여백 */
    const cap = f.t >= 6 ? timedCaption2(f) : '';
    if (cap) {
      const parts = (f.capLines && f.capLines.length) ? f.capLines : [cap];
      const idx = Math.max(0, parts.indexOf(cap));
      const m = riseIn(f, (idx * (f.duration || 1)) / parts.length);
      ctx.save();
      ctx.globalAlpha = m.a;
      ctx.translate(0, m.dy);
      captionClean(ctx, cap, {
        x: W / 2, bottom: H - bar - 44, size: 44, weight: 600, maxW: W * 0.7, maxLines: 2,
        lineHeight: 1.5, trackingForce: 1,
      });
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
    scrimSmooth(ctx, f, 980, 0.48, true);
    scrimSmooth(ctx, f, 780, 0.54, false);
    vignette(ctx, f.W, f.H, 0.16);
    const t = f.text;

    /* 상단 라벨 — 작은 반투명 유리 칩 */
    if (t.title) {
      const e0 = riseIn(f, 0.03);
      ctx.save();
      ctx.globalAlpha = e0.a;
      ctx.translate(0, e0.dy);
      ctx.font = fontStr(600, 27);
      glassPill(ctx, f, truncate(ctx, t.title, 640), f.W / 2, 452, {
        size: 27, weight: 600, align: 'center', fg: 'rgba(255,255,255,0.92)', padX: 28, padY: 16,
      });
      ctx.restore();
    }

    /* 메인 훅 — 800 · 자간 타이트 · 강조 단어만 형광 마커 */
    if (t.hook) {
      const size = fitRichSize(ctx, t.hook, 94, f.W * 0.86, 3, 800);
      const e1 = riseIn(f, 0.06);
      ctx.save();
      ctx.globalAlpha = e1.a;
      ctx.translate(0, e1.dy);
      titleRich(ctx, t.hook, {
        x: f.W / 2, y: 560, size, weight: 800, align: 'center',
        maxW: f.W * 0.86, lineHeight: 1.14, maxLines: 3, shadow: 32, hl: true,
      });
      ctx.restore();
    }

    drawCaptionArea(ctx, f, { bottom: f.H - 380, size: 56, weight: 600, maxLines: 2, maxW: f.W * 0.78 });
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
    scrimSmooth(ctx, f, 920, 0.5, true);
    scrimSmooth(ctx, f, 720, 0.48, false);
    vignette(ctx, f.W, f.H, 0.18);

    /* 리뷰 배지 — 유리 칩 */
    const badge = (f.text.title || '리뷰 2주차').trim();
    const e0 = riseIn(f, 0.02);
    ctx.save();
    ctx.globalAlpha = e0.a;
    ctx.translate(0, e0.dy);
    ctx.font = fontStr(600, 26);
    glassPill(ctx, f, truncate(ctx, badge, f.W - 260), 64, 440, {
      size: 26, weight: 600, fg: 'rgba(255,255,255,0.92)', padX: 26, padY: 15, spacing: 1,
    });
    ctx.restore();

    /* 훅 — 800 · 좌측 정렬 */
    if (f.text.hook) {
      const size = fitRichSize(ctx, f.text.hook, 86, f.W * 0.86, 3, 800);
      const e1 = riseIn(f, 0.06);
      ctx.save();
      ctx.globalAlpha = e1.a;
      ctx.translate(0, e1.dy);
      titleRich(ctx, f.text.hook, {
        x: 64, y: 540, size, weight: 800, align: 'left', maxW: f.W * 0.86,
        lineHeight: 1.12, maxLines: 3, shadow: 28, hl: true,
      });
      ctx.restore();
    }

    /* 가격 비교 — 유리 카드 · 숫자만 900 · 할인 배지 1개 */
    const price = String(f.text.price || '').trim();
    if (price) {
      const [wasRaw, nowRaw] = price.split(/→|->|~>/).map((s) => (s || '').trim());
      const px = 64, pw = f.W - 128, ph = 196, py = f.H - 880;
      const pop = riseIn(f, 0.12, 0.2);
      ctx.save();
      ctx.globalAlpha = pop.a;
      ctx.translate(0, pop.dy);
      frostedPanel(ctx, f, px, py, pw, ph, 24, { tint: DS.glassDeep, border: DS.hairline, lineWidth: 1.5 });
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const num = (s) => parseFloat(String(s).replace(/[^0-9.]/g, ''));
      const o = num(wasRaw), nN = num(nowRaw || price);
      const pct = (o && nN && nN < o) ? Math.round((1 - nN / o) * 100) : 0;

      if (wasRaw && nowRaw) {
        const split = px + Math.round(pw * 0.46);
        trackLabel(ctx, '정가', px + 40, py + 36, { size: 21, color: 'rgba(255,255,255,0.5)', spacing: 5 });
        ctx.font = fontStr(600, 44);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const ow = widthOf(ctx, wasRaw);
        fillTxt(ctx, wasRaw, px + 40, py + 76);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px + 36, py + 108);
        ctx.lineTo(px + 40 + Math.min(ow, split - px - 76), py + 108);
        ctx.stroke();
        ctx.restore();
        hairlineRule(ctx, split, py + 40, 1.2, DS.hairlineSoft, ph - 80);
        trackLabel(ctx, '지금', split + 36, py + 36, { size: 21, color: 'rgba(255,255,255,0.5)', spacing: 5 });
        ctx.font = fontStr(900, 86);
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'top';
        fillTxt(ctx, truncate(ctx, nowRaw, pw - (split - px) - 160), split + 36, py + 70);
      } else {
        trackLabel(ctx, '가격', px + 40, py + 36, { size: 21, color: 'rgba(255,255,255,0.5)', spacing: 5 });
        ctx.font = fontStr(900, 76);
        ctx.fillStyle = '#FFFFFF';
        fillTxt(ctx, truncate(ctx, price, pw - 140), px + 40, py + 72);
      }
      if (pct) {
        ctx.save();
        ctx.font = fontStr(900, 28);
        const bt = `-${pct}%`;
        const bw = widthOf(ctx, bt) + 36;
        ctx.fillStyle = DS.lime;
        roundRect(ctx, px + pw - bw - 32, py + 34, bw, 52, 26);
        ctx.fill();
        ctx.fillStyle = '#14160C';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        fillTxt(ctx, bt, px + pw - 32 - bw / 2, py + 61);
        ctx.restore();
      }
      ctx.restore();
    }

    drawCaptionArea(ctx, f, { bottom: f.H - 380, size: 54, weight: 600, maxLines: 2, maxW: f.W * 0.78 });
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
    scrimSmooth(ctx, f, 880, 0.34, true);
    scrimSmooth(ctx, f, 820, 0.7, false);

    /* 질문 — 인스타 댓글 카드 (유리 표면 + 헤어라인) */
    const q = (f.text.hook || '이거 어디서 사셨어요?').trim();
    ctx.font = fontStr(600, 50);
    const innerW = f.W - 176 - 80;
    const lines = [];
    for (const para of q.split('\n')) {
      let cur = '';
      for (const w of para.split(' ').filter(Boolean)) {
        const test = cur ? cur + ' ' + w : w;
        if (widthOf(ctx, test) <= innerW) cur = test;
        else { if (cur) lines.push(cur); cur = w; }
      }
      if (cur) lines.push(cur);
    }
    const shown = lines.slice(0, 3);
    const bx = 88, bw = f.W - 176, by = 470;
    const bh = 132 + Math.max(1, shown.length) * 70;
    const e = riseIn(f, 0.02, 0.2);
    ctx.save();
    ctx.globalAlpha = e.a;
    ctx.translate(0, e.dy);
    ctx.save();
    softShadow(ctx, 46, 0.36);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, bx, by, bw, bh, 24);
    ctx.fill();
    ctx.restore();
    frostedPanel(ctx, f, bx, by, bw, bh, 24, { tint: DS.glassDeep, border: DS.hairline, lineWidth: 1.5 });
    ctx.save();
    ctx.fillStyle = 'rgba(14,14,18,0.66)';
    ctx.beginPath();
    ctx.moveTo(bx + 84, by + bh - 2);
    ctx.lineTo(bx + 100, by + bh + 24);
    ctx.lineTo(bx + 142, by + bh - 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const av = 64, ax = bx + 40, ay = by + 32;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(ax + av / 2, ay + av / 2, av / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ax + av / 2, ay + av / 2, av / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = fontStr(600, 28);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    fillTxt(ctx, String(f.text.channel || 'living.jip').replace(/^@/, ''), ax + av + 20, ay + 21);
    ctx.font = fontStr(600, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    fillTxt(ctx, f.text.title ? truncate(ctx, f.text.title, bw - 260) : '댓글 · 방금', ax + av + 20, ay + 50);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = fontStr(600, 50);
    ctx.textBaseline = 'top';
    shown.forEach((l, i) => fillTxt(ctx, l, bx + 40, by + 124 + i * 70));
    ctx.restore();

    /* 답변 — 얇은 라임 세로 규칙 하나 + 박스 없는 자막 */
    if (f.caption) {
      const rx = 88;
      const m = riseIn(f, 0.1);
      ctx.save();
      ctx.globalAlpha = m.a;
      ctx.translate(0, m.dy);
      ctx.fillStyle = accentNow();
      ctx.fillRect(rx, 962, 3, 132);
      drawTracked(ctx, 'REPLY', rx + 28, 966, { size: 22, weight: 600, spacing: 7, color: 'rgba(255,255,255,0.6)' });
      drawRich(ctx, f.caption, {
        x: rx + 28, y: 1014, size: 52, weight: 600, align: 'left', maxW: f.W - rx * 2 - 28,
        maxLines: 3, lineHeight: 1.32, color: 'rgba(255,255,255,0.98)', stroke: false, shadow: 20,
        shadowCol: 'rgba(0,0,0,0.35)',
      });
      ctx.restore();
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
    const og = ctx.createLinearGradient(0, 0, 0, f.H);
    og.addColorStop(0, 'rgba(10,11,14,0.30)');
    og.addColorStop(0.55, 'rgba(10,11,14,0.44)');
    og.addColorStop(1, 'rgba(10,11,14,0.62)');
    ctx.fillStyle = og;
    ctx.fillRect(0, 0, f.W, f.H);

    if (f.text.hook) {
      const size = fitRichSize(ctx, f.text.hook, 66, f.W * 0.86, 2, 800);
      const e0 = riseIn(f, 0.02);
      ctx.save();
      ctx.globalAlpha = e0.a;
      ctx.translate(0, e0.dy);
      titleRich(ctx, f.text.hook, {
        x: f.W / 2, y: 470, size, weight: 800, align: 'center', maxW: f.W * 0.86,
        lineHeight: 1.14, maxLines: 2, shadow: 28, hl: true,
      });
      ctx.restore();
    }

    const items = String(f.text.items || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3);
    const rows = items.length || 3;
    const x = 64, w = f.W - 128, h = 206 + rows * 124, y = 736;
    frostedPanel(ctx, f, x, y, w, h, 26, { tint: 'rgba(14,14,18,0.56)', border: DS.hairline, lineWidth: 1.5 });

    drawTracked(ctx, 'CHECK LIST', x + 52, y + 40, { size: 22, weight: 600, spacing: 8, color: 'rgba(255,255,255,0.5)' });
    titleRich(ctx, f.text.title || '체크리스트', {
      x: x + 52, y: y + 84, size: 56, weight: 800, align: 'left', maxW: w - 104,
      maxLines: 2, lineHeight: 1.14, shadow: 0,
    });

    const rowH = 124, areaTop = y + 224;
    const visible = f.duration ? Math.min(rows, 1 + Math.floor((f.t / f.duration) * rows * 1.05)) : rows;
    items.forEach((it, i) => {
      const ry = areaTop + i * rowH;
      const on = i < visible;
      ctx.save();
      ctx.globalAlpha = on ? 1 : 0.3;
      /* 단계 번호만 900 */
      ctx.font = fontStr(900, 26);
      ctx.fillStyle = on ? accentNow() : 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      fillTxt(ctx, String(i + 1).padStart(2, '0'), x + 52, ry + 38);
      ctx.fillStyle = on ? '#FFFFFF' : 'rgba(255,255,255,0.6)';
      ctx.font = fontStr(600, 42);
      fillTxt(ctx, truncate(ctx, it, w - 250), x + 120, ry + 38);
      const cx = x + w - 74, cy = ry + 38;
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.strokeStyle = on ? accentNow() : 'rgba(255,255,255,0.24)';
      ctx.lineWidth = on ? 2.2 : 1.4;
      ctx.stroke();
      if (on) {
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy + 1);
        ctx.lineTo(cx - 2, cy + 5);
        ctx.lineTo(cx + 7, cy - 5);
        ctx.strokeStyle = accentNow();
        ctx.lineWidth = 2.6;
        ctx.stroke();
      }
      if (i < items.length - 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x + 52, ry + 88, w - 104, 1.2);
      }
      ctx.restore();
    });

    drawCaptionArea(ctx, f, { bottom: f.H - 380, size: 52, weight: 600, maxLines: 2, maxW: f.W * 0.78 });
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
    const W = f.W, H = f.H;
    drawFullFrame(ctx, f);
    vignette(ctx, W, H, 0.5);
    grain(ctx, W, H, 0.05);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, 110);
    ctx.fillRect(0, H - 110, W, 110);
    filmFrame(ctx, f, 42, 'rgba(255,255,255,0.18)');

    /* 타임코드 · 채널 — 흑백만 */
    drawTracked(ctx, `${timecode(f.t)} / ${timecode(f.duration)}`, 84, 268, {
      size: 22, weight: 600, spacing: 4, color: 'rgba(255,255,255,0.5)',
    });
    drawTracked(ctx, (f.text.channel || 'HOME').replace(/^@/, '').toUpperCase(), W - 84, 268, {
      size: 21, weight: 600, spacing: 8, color: 'rgba(255,255,255,0.5)', align: 'right',
    });

    /* 인트로 라벨 — 얇은 규칙 + 넓은 자간 */
    const head = (f.text.hook || '').trim();
    if (head && f.t < 4.6) {
      const a = f.t < 0.7 ? f.t / 0.7 : f.t > 3.6 ? Math.max(0, (4.6 - f.t) / 1) : 1;
      ctx.save();
      ctx.globalAlpha = a;
      hairlineRule(ctx, W / 2 - 24, 556, 48, 'rgba(255,255,255,0.5)', 1.4);
      drawTracked(ctx, head, W / 2, 590, {
        size: 28, weight: 600, spacing: 6, color: 'rgba(255,255,255,0.9)', align: 'center',
      });
      if (f.text.title) {
        captionClean(ctx, f.text.title, {
          x: W / 2, y: 652, size: 50, weight: 600, align: 'center', maxW: W * 0.8,
          maxLines: 1, lineHeight: 1.5, color: 'rgba(255,255,255,0.88)', shadow: 12, plain: true,
        });
      }
      ctx.restore();
    }

    /* 자막 — 감성 한 줄 */
    if (f.caption) {
      const m = riseIn(f, 0.05, 0.2);
      ctx.save();
      ctx.globalAlpha = m.a * 0.55;
      hairlineRule(ctx, W / 2 - 20, H - 486, 40, 'rgba(255,255,255,0.75)', 1.2);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = m.a;
      ctx.translate(0, m.dy);
      drawRich(ctx, f.caption, {
        x: W / 2, bottom: H - 380, size: 48, weight: 600, align: 'center',
        maxW: W * 0.78, maxLines: 2, lineHeight: 1.6, color: 'rgba(255,255,255,0.94)',
        stroke: false, shadow: 14, opacity: Math.min(1, 0.3 + f.captionP * 5), trackingForce: 1.2,
        shadowCol: 'rgba(0,0,0,0.35)',
        opacity: 1,
      });
      ctx.restore();
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
    const W = f.W, H = f.H;
    drawFullFrame(ctx, f);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(9,10,14,0.44)');
    g.addColorStop(0.5, 'rgba(9,10,14,0.3)');
    g.addColorStop(1, 'rgba(9,10,14,0.56)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    vignette(ctx, W, H, 0.3);

    const text = f.text.hook || f.text.title || '';
    const size = fitRichSize(ctx, text, 140, W * 0.86, 3, 800);
    const lay = layoutRich(ctx, text, size, 800, W * 0.86, spacingNow() + tight(size));
    const lh = size * 1.12;
    const totalH = lay.lines.length * lh;
    const y0 = 880 - totalH / 2;
    const e = riseIn(f, 0.02, 0.2);

    ctx.save();
    ctx.globalAlpha = e.a;
    ctx.translate(0, e.dy);
    hairlineRule(ctx, W / 2 - 28, y0 - 44, 56, DS.lime, 4);
    titleRich(ctx, text, {
      x: W / 2, y: y0, size, weight: 800, align: 'center', maxW: W * 0.86,
      lineHeight: 1.12, maxLines: 3, shadow: 28, hl: true,
    });
    if (f.text.title) {
      drawTracked(ctx, String(f.text.title).toUpperCase(), W / 2, y0 + totalH + 42, {
        size: 24, weight: 600, spacing: 9, color: 'rgba(255,255,255,0.55)', align: 'center',
      });
    }
    ctx.restore();

    drawCaptionArea(ctx, f, { bottom: f.H - 380, size: 54, weight: 600, maxLines: 2, maxW: f.W * 0.78 });
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
    const W = f.W, H = f.H;
    drawFullFrame(ctx, f);
    scrimSmooth(ctx, f, 320, 0.2, true);
    scrimSmooth(ctx, f, 820, 0.42, false);

    /* 형광 라벨 — 둥근 모서리 + 블랙 볼드 (이 틀의 포인트 컬러) */
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
      const size = 56, lh = size * 1.2, padX = 44, padY = 24;
      const innerMax = W - 88 - padX * 2;
      ctx.font = fontStr(800, size);
      const lay = layoutRich(ctx, label, size, 800, innerMax, spacingNow() + tight(size));
      const rows = lay.lines.slice(0, 2);
      const widest = rows.reduce((m, l) => Math.max(m, l.width), 0);
      const bh = rows.length * lh + padY * 2;
      const bw = Math.min(W - 88, widest + padX * 2);
      const bx = (W - bw) / 2;
      const by = Math.round(H * 0.2);
      const e = riseIn(f, 0.02, 0.2);
      ctx.save();
      ctx.globalAlpha = e.a;
      ctx.translate(0, e.dy - 8);
      ctx.save();
      softShadow(ctx, 30, 0.18);
      ctx.fillStyle = DS.lime;
      roundRect(ctx, bx, by, bw, bh, 18);
      ctx.fill();
      ctx.restore();
      drawRich(ctx, label, {
        x: W / 2, y: by + padY, size, weight: 800, align: 'center',
        maxW: bw - padX * 2 + 2, maxLines: 2, lineHeight: 1.2,
        color: '#12140B', accent: '#12140B', stroke: false, shadow: 0,
        trackingForce: tight(size),
      });
      ctx.restore();
    }

    if (sub) {
      const m = riseIn(f, 0.1);
      ctx.save();
      ctx.globalAlpha = m.a;
      ctx.translate(0, m.dy);
      captionClean(ctx, sub, {
        x: W / 2, bottom: safeSubBottom(f), size: 56, weight: 600, maxW: W * 0.82,
        maxLines: 2, lineHeight: 1.3,
      });
      ctx.restore();
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

/* ---------- 샘플 미리보기: 실제 제품 사진 3장 ----------
   예전에는 창문·잎사귀를 벡터로 그렸지만, 릴스 화면처럼 보이도록
   실사 제품 컷(demo_product_1~3.jpg)을 천천히 밀어 넣으며 크로스페이드합니다. */
const DEMO_SHOTS = ['demo_product_1.jpg', 'demo_product_2.jpg', 'demo_product_3.jpg'];
const DEMO_IMGS = DEMO_SHOTS.map((src) => {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img;
});
const DEMO_LOOP = 9; // 3장 × 3초
const demoLoaded = () => DEMO_IMGS.filter((i) => i.complete && i.naturalWidth > 0);
function makeSampleSource(aspect = 'portrait') {
  const land = aspect !== 'portrait';
  const c = document.createElement('canvas');
  c.width = land ? 960 : 540;
  c.height = land ? 540 : 960;
  const x = c.getContext('2d');
  return {
    canvas: c,
    shots: DEMO_IMGS,
    draw(t) {
      const W = c.width, H = c.height;
      const ready = demoLoaded();
      if (!ready.length) {
        /* 사진이 아직 안 열렸을 때만 쓰는 단색 바탕 (가짜 배경 없음) */
        const g = x.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#2b2724');
        g.addColorStop(1, '#151310');
        x.fillStyle = g;
        x.fillRect(0, 0, W, H);
        return;
      }
      const n = ready.length;
      const seg = DEMO_LOOP / n;
      const cyc = ((t % DEMO_LOOP) + DEMO_LOOP) % DEMO_LOOP;
      const idx = Math.min(n - 1, Math.floor(cyc / seg));
      const local = cyc - idx * seg;
      const fade = Math.min(0.8, seg * 0.32);
      const drawShot = (im, p, alpha, dir) => {
        const sw = im.naturalWidth || 1, sh = im.naturalHeight || 1;
        const zoom = 1.06 + 0.1 * clamp(p, 0, 1);
        const base = Math.max(W / sw, H / sh) * zoom;
        const dw = sw * base, dh = sh * base;
        const fx = clamp(0.5 + dir * (clamp(p, 0, 1) - 0.5) * 0.5, 0, 1);
        const fy = clamp(0.5 + (clamp(p, 0, 1) - 0.5) * 0.3, 0, 1);
        x.save();
        x.globalAlpha = alpha;
        x.imageSmoothingQuality = 'high';
        x.drawImage(im, -(dw - W) * fx, -(dh - H) * fy, dw, dh);
        x.restore();
      };
      if (local < fade && n > 1) {
        const prev = (idx - 1 + n) % n;
        drawShot(ready[prev], 1, 1, prev % 2 ? -1 : 1);
        drawShot(ready[idx], local / fade, local / fade, idx % 2 ? -1 : 1);
      } else {
        const p = (local - fade) / Math.max(0.001, seg - fade);
        drawShot(ready[idx], p, 1, idx % 2 ? -1 : 1);
      }
      /* 자막이 읽히도록 위·아래만 살짝 어둡게 */
      const top = x.createLinearGradient(0, 0, 0, H * 0.32);
      top.addColorStop(0, 'rgba(0,0,0,0.32)');
      top.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = top;
      x.fillRect(0, 0, W, H * 0.32);
      const bot = x.createLinearGradient(0, H * 0.6, 0, H);
      bot.addColorStop(0, 'rgba(0,0,0,0)');
      bot.addColorStop(1, 'rgba(0,0,0,0.38)');
      x.fillStyle = bot;
      x.fillRect(0, H * 0.6, W, H * 0.4);
    },
  };
}

/* ---------- P18 · 🖤 띵띵 볼드 아울라인 ----------
   @thingthing.kr 참고: 상단 중앙 두 줄, 굵은 고딕 흰 글씨 + 두꺼운 검정 외곽선/그림자 */
TEMPLATES.push({
  id: 'bold-outline',
  presetId: 'P18',
  name: '🖤 굵은 외곽선 고딕',
  label: '제목·훅 강조',
  platform: 'reels',
  cats: ['review', 'living', 'info'],
  arc: 'R1',
  dur: 20,
  W: 1080, H: 1920,
  tagBg: '#ffffff', tagFg: '#111111',
  isNew: true,
  trend: '@thingthing.kr 참고 · 상단 중앙 두 줄 굵은 흰 글씨 + 두꺼운 검정 테두리',
  desc: '사진은 그대로 두고 상단 중앙에 두 줄 체목만 딱. 굵은 고딕 흰 글씨에 두꺼운 검정 외곽선을 넣어 밝은 배경에서도 또렷하게 읽혀요.',
  tips: '제목을 비우면 첫 3초 훅이 그대로 제목이 돼요. 자막은 한 줄로 짧게 — 글자가 적을수록 제품이 더 커 보여요.',
  sample: { hook: '반으로 쪼개봤어요', title: '진짜 속이 다르네', price: '', items: '', channel: 'thingthing.kr' },
  sampleCaptions: ['겉만 봐선 몰라요', '단면이 말해줍니다'],
  draw(ctx, f) {
    const W = f.W, H = f.H;
    drawFullFrame(ctx, f);
    scrimSmooth(ctx, f, 520, 0.3, true);
    scrimSmooth(ctx, f, 420, 0.3, false);
    vignette(ctx, W, H, 0.26);

    const text = f.text.hook || '';
    const sub = String(f.text.title || '').trim();
    const size = fitRichSize(ctx, text, 104, W * 0.84, 2, 900);
    const e = riseIn(f, 0.02, 0.22);
    ctx.save();
    ctx.globalAlpha = e.a;
    ctx.translate(0, e.dy);
    const lay = layoutRich(ctx, text, size, 900, W * 0.84, spacingNow() + tight(size));
    const lh = size * 1.14;
    const total = lay.lines.length * lh;
    const y0 = Math.round(H * 0.145);
    drawRich(ctx, text, {
      x: W / 2, y: y0, size, weight: 900, align: 'center', maxW: W * 0.84,
      color: '#FFFFFF',
      stroke: true, strokeW: Math.max(6, size * 0.13), strokeCol: '#000000',
      shadow: 18, shadowCol: 'rgba(0,0,0,0.55)',
      lineHeight: 1.14, maxLines: 2,
      trackingForce: tight(size),
    });
    if (sub) {
      drawTracked(ctx, sub, W / 2, y0 + total + 34, {
        size: 30, weight: 800, spacing: 2, color: 'rgba(255,255,255,0.92)', align: 'center',
      });
    }
    ctx.restore();

    drawCaptionArea(ctx, f, { bottom: f.H - 360, size: 50, weight: 700, maxLines: 1, maxW: f.W * 0.8 });
  },
});

/* ---------- P19 · 🔍 미니멀 클로즈업 ----------
   @_bbangya_bbangya_ 참고: 자막을 최소화하고 제품 클로즈업 + 잔잔한 줌인 */
TEMPLATES.push({
  id: 'minimal-closeup',
  presetId: 'P19',
  name: '🔍 무자막 클로즈업',
  label: '제품 단면·클로즈업',
  platform: 'reels',
  cats: ['review', 'living'],
  arc: 'R1',
  dur: 15,
  W: 1080, H: 1920,
  tagBg: '#f1efe8', tagFg: '#3a3a34',
  isNew: true,
  trend: '@_bbangya_bbangya_ 참고 · 자막 최소화 + 제품 클로즈업(반으로 쪼개기·단면) + 경쾌한 팝 BGM',
  desc: '글자를 거의 빼고 화면을 제품으로 가득 채워요. 천천히 밀어 넣는 줌인 한 번, 아래 한 줄만.',
  tips: '제품을 반으로 자르거나 단면을 보여주는 컷을 넣으면 훨씬 잘 보여요. 자막은 한 줄, 채널 이름만 위에 작게.',
  sample: { hook: '', title: '한입에 반으로', price: '', items: '', channel: 'bbangya.bbangya' },
  sampleCaptions: [],
  draw(ctx, f) {
    const W = f.W, H = f.H;
    const zoom = 1.03 + 0.07 * clamp((f.t || 0) / Math.max(0.6, (f.duration || 1)), 0, 1);
    const r = fit(f.srcW, f.srcH, W, H, 'cover');
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.drawImage(f.src, r.x - W / 2, r.y - H / 2, r.w, r.h);
    ctx.restore();
    vignette(ctx, W, H, 0.3);

    const ch = String(f.text.channel || '').trim();
    if (ch) {
      drawTracked(ctx, ch, 56, 96, {
        size: 26, weight: 700, spacing: 5, color: 'rgba(255,255,255,0.8)', align: 'left',
      });
    }
    const cap = String(f.caption || '').trim();
    if (cap) {
      const e = riseIn(f, 0.05, 0.24);
      ctx.save();
      ctx.globalAlpha = e.a;
      drawRich(ctx, cap, {
        x: W / 2, bottom: f.H - 300, size: 48, weight: 700, align: 'center',
        color: '#FFFFFF', stroke: true, strokeW: 3, strokeCol: 'rgba(0,0,0,0.55)',
        shadow: 20, shadowCol: 'rgba(0,0,0,0.4)', maxW: W * 0.8, maxLines: 1,
      });
      ctx.restore();
    }
  },
});

/* =========================================================================
   클로드4 실측 3종 (2026-11-21 셋톡 · 1080×1920 프레임 단위 실측 스펙)
   · P20 💛 리뷰 BEST 3   : 노랑 훅 + "N. 제품명" 섹션 + 말 자막 (따뜻·밝게)
   · P21 🍠 ASMR 박스      : 2줄 제목 고정 + 흰 각진 박스 자막 + 📢 ASMR 📢
   · P22 🪴 인테리어 찐템  : 3초 타자 인트로 + 라임 번호/브랜드 라벨 (매트 톤)
   글꼴은 fonts.css의 눈누 CDN을 먼저 쓰고, 없으면 내장 한글 폰트로 폴백합니다.
   ========================================================================= */

/* ---------- P20 · 💛 리뷰 BEST 3 ---------- */
TEMPLATES.push({
  id: 'review-best3',
  presetId: 'P20',
  name: '💛 리뷰 BEST 3',
  label: '리뷰·BEST 3',
  platform: 'reels',
  cats: ['review', 'living', 'info'],
  arc: 'R2',
  dur: 30,
  W: 1080, H: 1920,
  need: ['price'],
  tagBg: '#fff9c9', tagFg: '#7a5a00',
  isNew: true,
  trend: '클로드4 실측 · 쿠팡 뷰티템 BEST 3 리뷰(컷 30개 · 평균 1.8초)',
  desc: '노란 훅이 0.1초에 톡 튀고, 컷마다 "1. 제품명" 섹션 제목과 말 자막이 번갈아 들어가요. 리뷰 3개를 한 편에 담을 때 가장 잘 맞아요.',
  tips: '자막 칸에 "1. 수분 크림 | 바르면 촉촉해요"처럼 쓰면 위에는 섹션 제목, 아래에는 말 자막이 따로 나와요. 한 줄만 쓰면 윗줄은 제목 칸, 아래는 그 자막이 돼요.',
  sample: { hook: '쿠팡 뷰티\n*이거 3개*', title: '수분 크림', price: '내돈내산 리뷰', items: '', channel: 'beauty.pick' },
  sampleCaptions: ['바르면 촉촉, 다음 날까지', '가성비 생각하면 이게 1등'],
  draw(ctx, f) {
    const W = f.W, H = f.H;
    const S = Math.min(W / 1080, H / 1920);
    const px = (v) => Math.round(v * S);
    drawTonedFrame(ctx, f, 'warmBright');
    scrimSmooth(ctx, f, px(420), 0.2, true);
    scrimSmooth(ctx, f, px(460), 0.3, false);

    /* 상단 로고 — 2줄, 오른쪽 끝 x1010 · 위 y300 (영상 내내 고정)
       채널명에 점이 있으면(review.pick) 점 기준으로 두 줄로 나눕니다. */
    const chRaw = String(f.text.channel || '').trim().toUpperCase();
    const logo = chRaw
      ? (chRaw.split('.').length === 2 ? chRaw.split('.').join('\n') : chRaw)
      : 'BEST 3';
    withFont(FONT_STACK.kkubulim, () => {
      const size = fitRichSize(ctx, logo, px(96), W * 0.46, 2, 900);
      drawRich(ctx, logo, {
        x: W - px(70), y: px(300), size, weight: 900, align: 'right', maxW: W * 0.46,
        color: '#F6E996', stroke: true, strokeW: px(20), strokeCol: '#F6E996', shadow: 0,
        lineHeight: 1.0, maxLines: 2,
      });
      drawRich(ctx, logo, {
        x: W - px(70), y: px(300), size, weight: 900, align: 'right', maxW: W * 0.46,
        color: '#FFFFFF', stroke: true, strokeW: px(11), strokeCol: '#3A2620', shadow: 14,
        shadowCol: 'rgba(0,0,0,0.35)', lineHeight: 1.0, maxLines: 2,
      });
    });

    /* 0~3.3초 — 노랑 훅 + 훅 위 작은 줄 + BEST 3 슬라이드
       (틀 카드·빈 미리보기에서는 틀의 얼굴인 훅을 계속 보여 줍니다) */
    if ((f.clipIndex || 0) === 0 && (f.sample || (f.t || 0) < 3.3)) {
      const pop = 1.32 - 0.32 * ease(clamp(((f.t || 0) - 0.1) / 0.17, 0, 1));
      const small = String(f.text.price || '').trim() || '리뷰 BEST 3';
      withFont(FONT_STACK.wavvepado, () => {
        drawRich(ctx, small, {
          x: W / 2, bottom: px(990), size: px(64), weight: 700, align: 'center',
          maxW: W * 0.88, color: '#FFFFFF', stroke: true, strokeW: px(4), strokeCol: '#111111',
          shadow: 12, lineHeight: 1.1, maxLines: 1,
        });
      });
      ctx.save();
      ctx.translate(W / 2, px(1390));
      ctx.scale(pop, pop);
      withFont(FONT_STACK.kukdae, () => {
        const hook = String(f.text.hook || '').trim() || '리뷰 BEST 3';
        const size = fitRichSize(ctx, hook, px(200), W * 0.9, 2, 900);
        drawRich(ctx, hook, {
          x: 0, bottom: 0, size, weight: 900, align: 'center', maxW: W * 0.9,
          color: '#FBF972', stroke: true, strokeW: Math.max(6, size * 0.045), strokeCol: '#111111',
          shadow: 18, shadowCol: 'rgba(0,0,0,0.5)', lineHeight: 0.92, maxLines: 2, accent: '#FFFFFF',
        });
      });
      ctx.restore();
      if ((f.t || 0) >= 1.75) {
        const p = ease(clamp(((f.t || 0) - 1.75) / 0.35, 0, 1));
        const x = -W * 0.22 + (W / 2 + W * 0.22) * p;
        withFont(FONT_STACK.gmarket, () => {
          for (let i = 0; i < 3; i += 1) {
            ctx.save();
            ctx.globalAlpha = i === 0 ? 1 : 0.16;
            ctx.translate(x - i * px(18), px(880));
            ctx.transform(1, 0, -0.2, 1, 0, 0);
            drawRich(ctx, 'BEST 3', {
              x: 0, y: 0, size: px(120), weight: 900, align: 'center', maxW: W,
              color: '#FFFFFF', stroke: true, strokeW: px(10), strokeCol: '#111111',
              shadow: 10, maxLines: 1, lineHeight: 1,
            });
            ctx.restore();
          }
        });
      }
    }

    /* 섹션 "N. 제품명"(컷 앞 0.9초) ↔ 말 자막 */
    const raw = String(f.caption || '').trim();
    const pipe = raw.split('|').map((s) => s.trim());
    let secTitle = pipe.length > 1 ? pipe[0] : '';
    let talk = pipe.length > 1 ? pipe.slice(1).join(' ').trim() : raw;
    if (!secTitle) secTitle = String(f.text.title || '').trim();
    if (secTitle && !/^\d+[.)]/.test(secTitle)) secTitle = `${(f.clipIndex || 0) + 1}. ${secTitle}`;
    if (secTitle && (f.t || 0) < 0.9) {
      /* 컷 앞 0.9초 — "N. 제품명" 섹션 제목 (흰 + 노랑 글로우, 0.15초 슬라이드) */
      const e = riseIn(f, 0, 0.15);
      ctx.save();
      ctx.globalAlpha = e.a;
      ctx.translate(W / 2, e.dy);
      ctx.transform(1, 0, -0.18, 1, 0, 0);
      withFont(FONT_STACK.dangdang, () => {
        const size = fitRichSize(ctx, secTitle, px(108), W * 0.84, 2, 900);
        drawRich(ctx, secTitle, {
          x: 0, bottom: px(1555), size, weight: 900, align: 'center', maxW: W * 0.84,
          color: '#FFFFFF', stroke: false, shadow: 0, glow: '#F0E23C',
          lineHeight: 1.06, maxLines: 2,
        });
      });
      ctx.restore();
    } else if (talk) {
      withFont(FONT_STACK.wavvepado, () => {
        const size = px(72);
        drawRich(ctx, talk, {
          x: W / 2, bottom: px(1555), size, weight: 700, align: 'center', maxW: W * 0.86,
          color: '#FFFFFF', stroke: true, strokeW: Math.max(2, size * 0.05), strokeCol: '#3A2620',
          shadow: 16, shadowCol: 'rgba(0,0,0,0.45)', lineHeight: 1.22, maxLines: 3,
          accent: '#FBF972', trackingForce: px(-1.5),
        });
      });
    }
  },
});

/* ---------- P21 · 🍠 ASMR 박스 ---------- */
TEMPLATES.push({
  id: 'asmr-box',
  presetId: 'P21',
  name: '🍠 ASMR 박스',
  label: 'ASMR·과자',
  platform: 'reels',
  cats: ['review', 'living'],
  arc: 'R1',
  dur: 17,
  W: 1080, H: 1920,
  tagBg: '#f2ece4', tagFg: '#4a3a2a',
  isNew: true,
  trend: '클로드4 실측 · 과자 ASMR 17.2초(컷 9개 · 평균 1.9초)',
  desc: '위에는 두 줄 제목만 딱 고정, 아래에는 각진 흰 박스 자막. 제품 옆에서 바삭한 소리를 들려주는 ASMR 릴스에 맞춰요.',
  tips: '훅 칸에 제목 두 줄을 쓰세요(예: "봉 뜯자마자\n바삭 소리"). 자막은 한 번에 두 줄까지, 컷이 바뀔 때 같이 바뀌어요.',
  sample: { hook: '봉 뜯자마자\n바삭 소리 🍠', title: '', price: '', items: '', channel: 'snack.asmr' },
  sampleCaptions: ['한 봉에 1,800원이에요', '소리가 진짜 다르죠'],
  draw(ctx, f) {
    const W = f.W, H = f.H;
    const S = Math.min(W / 1080, H / 1920);
    const px = (v) => Math.round(v * S);
    drawTonedFrame(ctx, f, 'crispWarm');
    scrimSmooth(ctx, f, px(560), 0.34, true);

    /* 제목 2줄 — 영상 내내 고정 (흰 + 진회색 #282828 테두리) */
    const title = String(f.text.hook || f.text.title || '').trim();
    if (title) {
      withFont(FONT_STACK.kkubulim, () => {
        const size = fitRichSize(ctx, title, px(93), W * 0.9, 2, 800);
        drawRich(ctx, title, {
          x: W / 2, y: px(198), size, weight: 800, align: 'center', maxW: W * 0.9,
          color: '#FFFFFF', stroke: true, strokeW: Math.max(2, size * 0.027), strokeCol: '#282828',
          shadow: 14, shadowCol: 'rgba(0,0,0,0.35)', lineHeight: 1.04, maxLines: 2,
        });
      });
    }

    /* 각진 흰 박스 자막 — 불투명 78%, 검정 #111 글자, 컷과 함께 교체 */
    const cap = String(f.caption || '').trim();
    const boxTop = Math.round(H * 0.655);
    if (cap) {
      withFont(FONT_STACK.nanumcoding, () => {
        const size = px(33);
        const padX = px(22), padY = px(13);
        const lay = layoutRich(ctx, cap, size, 700, Math.min(W * 0.62, W * 0.5) - padX * 2, 0);
        const rows = lay.lines.slice(0, 2);
        const widest = rows.reduce((m, l) => Math.max(m, l.width), 0);
        const bw = Math.min(W * 0.62, widest + padX * 2);
        const lh = size * 1.28;
        const bh = rows.length * lh + padY * 2;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.fillRect((W - bw) / 2, boxTop, bw, bh);
        ctx.restore();
        drawRich(ctx, cap, {
          x: W / 2, y: boxTop + padY, size, weight: 700, align: 'center',
          maxW: bw - padX * 2 + 2, color: '#111111', stroke: false, shadow: 0,
          lineHeight: 1.28, maxLines: 2, tracking: 0,
        });
      });
    }

    /* 📢 ASMR 📢 스티커 — 이모지는 글자의 1.9배 */
    withFont(FONT_STACK.kkubulim, () => {
      const core = px(64), em = Math.round(core * 1.9);
      const y = boxTop - px(26);
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = `${core}px ${FONT_STACK.kkubulim}`;
      const wCore = ctx.measureText('ASMR').width;
      ctx.font = `${em}px ${FONT_STACK.kkubulim}`;
      const wEm = ctx.measureText('📢').width;
      const gap = px(10);
      let cx = W / 2 - (wEm * 2 + wCore + gap * 4) / 2;
      const put = (txt, font, strokeW) => {
        ctx.font = font;
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = 'rgba(120,120,120,0.75)';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeText(txt, cx, y);
        ctx.fillText(txt, cx, y);
      };
      put('📢', `${em}px ${FONT_STACK.kkubulim}`, px(1.5));
      cx += wEm + gap;
      put('ASMR', `${core}px ${FONT_STACK.kkubulim}`, px(1.5));
      cx += wCore + gap;
      put('📢', `${em}px ${FONT_STACK.kkubulim}`, px(1.5));
      ctx.restore();
    });
  },
});

/* ---------- P22 · 🪴 인테리어 찐템 ---------- */
TEMPLATES.push({
  id: 'interior-plant',
  presetId: 'P22',
  name: '🪴 인테리어 찐템',
  label: '인테리어·찐템',
  platform: 'reels',
  cats: ['living', 'mood', 'review'],
  arc: 'R5',
  dur: 16,
  W: 1080, H: 1920,
  tagBg: '#e9f6dd', tagFg: '#3f6b1e',
  isNew: true,
  trend: '클로드4 실측 · 인테리어 찐템 16초(3초마다 베이스 드롭 컷 · 평균 편차율 0.04)',
  desc: '3초 타자 인트로로 "3년째 잘 쓰고 있는 찐템"을 열고, 컷마다 라임 번호·제품명·한줄평이 붙어요. 매트하고 차분한 인테리어 톤.',
  tips: '자막 칸에 "브랜드 | 제품명 | 한줄평"처럼 쓰면 라임 번호 박스·제품명·흰 한줄평 박스로 나뉘어요. 컷은 3초에 맞춰 끊으면 박자와 딱 맞아요.',
  sample: { hook: '3년째', title: '원목 수납장', price: '', items: '', channel: 'living.plant' },
  sampleCaptions: ['이케아 | 원목 수납장 | 3년째 안 바꿔요', '무인양품 | 라탄 바구니 | 수납이 예뻐져요'],
  draw(ctx, f) {
    const W = f.W, H = f.H;
    const S = Math.min(W / 1080, H / 1920);
    const px = (v) => Math.round(v * S);
    drawTonedFrame(ctx, f, 'matte');
    vignette(ctx, W, H, 0.16);
    const INTRO = 3.0;

    /* 틀 카드·빈 미리보기에서는 인트로와 컷 라벨을 6초 주기로 번갈아 보여 줍니다 */
    const showIntro = f.sample ? ((f.t || 0) % 6) < INTRO : (f.t || 0) < INTRO;
    if (showIntro) {
      /* 인트로 — 초당 11자 타자 + 흰 커서, 3.0초에 한 번에 사라짐 */
      let line1 = String(f.text.hook || '').split('\n')[0].trim() || '3년째';
      if (!/년째/.test(line1) || line1.length > 12) line1 = '3년째';
      const line3 = '찐템을 소개합니다';
      const cps = 11;
      const tt = f.sample ? ((f.t || 0) % 6) : (f.t || 0);
      const n1 = Math.min(line1.length, Math.floor(tt * cps));
      const typed1 = line1.slice(0, n1);
      const done1 = n1 >= line1.length;
      const t3 = Math.max(0, tt - (line1.length + 1) / cps);
      const n3 = done1 ? Math.min(line3.length, Math.floor(t3 * cps)) : 0;
      const typed3 = line3.slice(0, n3);
      const cursorOn = Math.floor(tt * 2) % 2 === 0;

      withFont(FONT_STACK.nanumbarun, () => {
        const sp1 = Math.round(px(128) * 0.12);
        if (typed1) {
          drawTracked(ctx, typed1, px(180), px(742), {
            size: px(128), weight: 700, spacing: sp1,
            color: '#DDF7BC', align: 'left', baseline: 'alphabetic',
          });
        }
        if (typed3) {
          drawTracked(ctx, typed3, px(66), px(1080), {
            size: px(124), weight: 700, spacing: 0,
            color: '#FFFFFF', align: 'left', baseline: 'alphabetic',
          });
        }
        /* 흰 커서 — 지금 타자 중인 줄 끝에서 깜박입니다 */
        if (cursorOn) {
          const cur = done1
            ? { text: typed3, x: px(66), base: px(1080), size: px(124), sp: 0 }
            : { text: typed1, x: px(180), base: px(742), size: px(128), sp: sp1 };
          ctx.save();
          ctx.font = `700 ${cur.size}px ${FONT_STACK.nanumbarun}`;
          const cw = measureSpaced(ctx, cur.text, cur.sp);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(cur.x + cw + px(8), cur.base - cur.size * 0.82, px(4), cur.size * 0.9);
          ctx.restore();
        }
      });
      withFont(FONT_STACK.gmarket, () => {
        drawTracked(ctx, '잘쓰고있는', px(975), px(880), {
          size: px(75), weight: 500, spacing: 0, color: '#FFFFFF',
          align: 'right', baseline: 'alphabetic',
        });
      });
    } else {
      /* 라벨 가독성 — 흰 글씨가 밝은 배경에서도 읽히도록 아주 옅은 매트 밴드 */
      const band = ctx.createLinearGradient(0, H * 0.44, 0, H * 0.65);
      band.addColorStop(0, 'rgba(0,0,0,0)');
      band.addColorStop(0.5, 'rgba(0,0,0,0.16)');
      band.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.fillStyle = band;
      ctx.fillRect(0, H * 0.44, W, H * 0.21);
      ctx.restore();
      /* 컷 라벨 — 라임 번호/브랜드 박스 + 제품명 + 흰 한줄평 박스 87% */
      const raw = String(f.caption || '').trim();
      const parts = raw.split('|').map((s) => s.trim());
      let brand = parts.length > 1 ? parts[0] : String(f.text.title || '').trim();
      const product = parts.length > 1 ? (parts[1] || '') : '';
      const review = parts.length > 2 ? parts[2] : (parts.length === 1 ? raw : '');
      brand = brand.replace(/^\d+[.)]\s*/, '');
      const label = `${(f.clipIndex || 0) + 1}. ${brand || '아이템'}`;
      const e = riseIn(f, 0, 0.22);

      ctx.save();
      ctx.globalAlpha = e.a;
      ctx.translate(0, e.dy);
      withFont(FONT_STACK.nanumbarun, () => {
        const size = px(33);
        const padX = px(24), padY = px(17);
        ctx.font = `${700} ${size}px ${FONT_STACK.nanumbarun}`;
        const tw = measureSpaced(ctx, label, 0);
        const bw = tw + padX * 2;
        const bh = size + padY * 2;
        const bx = (W - bw) / 2;
        const by = px(955) - bh / 2;
        ctx.save();
        ctx.fillStyle = '#DDF7BC';
        roundRect(ctx, bx, by, bw, bh, px(4));
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#111111';
        ctx.font = `700 ${size}px ${FONT_STACK.nanumbarun}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, W / 2, by + bh / 2 + size * 0.02);
        ctx.restore();
      });
      if (product) {
        withFont(FONT_STACK.gmarket, () => {
          drawRich(ctx, product, {
            x: W / 2, y: px(1047), size: px(33), weight: 500, align: 'center',
            maxW: W * 0.8, color: '#FFFFFF', stroke: false, shadow: 10,
            shadowCol: 'rgba(0,0,0,0.35)', maxLines: 1,
          });
        });
      }
      if (review) {
        withFont(FONT_STACK.nanumbarun, () => {
          const size = px(23);
          const padX = px(20), padY = px(12);
          const lay = layoutRich(ctx, review, size, 700, W * 0.72 - padX * 2, 0);
          const rows = lay.lines.slice(0, 2);
          const widest = rows.reduce((m, l) => Math.max(m, l.width), 0);
          const bw = Math.min(W * 0.86, widest + padX * 2);
          const lh = size * 1.3;
          const bh = rows.length * lh + padY * 2;
          const bx = (W - bw) / 2;
          const by = px(1097);
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.87)';
          ctx.fillRect(bx, by, bw, bh);
          ctx.restore();
          drawRich(ctx, review, {
            x: W / 2, y: by + padY, size, weight: 700, align: 'center',
            maxW: bw - padX * 2 + 2, color: '#111111', stroke: false, shadow: 0,
            lineHeight: 1.3, maxLines: 2, tracking: 0,
          });
        });
      }
      ctx.restore();
    }
  },
});

refreshSans();
