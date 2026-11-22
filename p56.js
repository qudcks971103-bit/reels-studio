/* =========================================================================
   p56.js — P5(음식 리뷰)·P6(리빙 리뷰) 실측 프롬프트 + 공통 5트랙 타임라인 JSON
   셋톡에서 클로드가 제안한 공통 스키마를 PC 에디터(pc.html)가 그대로 읽고 씁니다.

   · EXTRA_STYLES            : omuk_food · living_pill · living_hand · living_editorial
   · buildPrompt(kind, input): GPT·클로드에 붙여넣으면 타임라인 JSON만 나오는 프롬프트
   · local(kind, input)      : OpenAI 키가 없어도 바로 쓰는 내장 생성기 (5트랙 객체)
   · generateAI(kind, input) : OpenAI 키가 있으면 같은 프롬프트로 실제 생성
   · splitShots / parse / parseText / toJSON : 붙여넣은 JSON 정규화·내보내기
   ========================================================================= */
(() => {
  'use strict';

  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const r2 = (v) => Math.round(num(v) * 100) / 100;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------------------------------------------------------- 자막 스타일 4종
     pc.js 가 engine.js 의 CAPTION_STYLES 뒤에 붙여 씁니다(모바일 studio2 는 그대로 13종). */
  const EXTRA_STYLES = [
    {
      id: 'omuk_food', name: '음식 리뷰 · 상단 굵은 흰 고딕',
      hint: 'omuk.official 실측 · 상단 22% · 두꺼운 검정 외곽선',
      ink: '#FFFFFF', stroke: '#000000', strokeW: 0.15, shadow: 16, shadowCol: 'rgba(0,0,0,0.60)',
      geo: { y: 0.22, size: 82, weight: 900, font: 'gmarket', spacing: -1, maxLines: 2, align: 'center' },
    },
    {
      id: 'living_pill', name: '리빙 알약 말풍선',
      hint: '조구하우스 스타일 · 상단 흰 알약 92% + 검정 굵은 글씨',
      ink: '#17181D', bar: { color: 'rgba(255,255,255,0.92)', radius: 999, padX: 34, padY: 16 },
      shadow: 14, shadowCol: 'rgba(0,0,0,0.30)',
      geo: { y: 0.14, size: 56, weight: 800, font: 'nanumbarun', spacing: 0, maxLines: 2, align: 'center' },
    },
    {
      id: 'living_hand', name: '리빙 손글씨 기울기',
      hint: '온오프 스타일 · [직접 써보고 고른] 태그 + 손글씨',
      ink: '#FFFFFF', shadow: 26, shadowCol: 'rgba(0,0,0,0.42)',
      rot: -0.035, tag: '[직접 써보고 고른]',
      geo: { y: 0.17, size: 72, weight: 500, font: 'gaegu', spacing: 1, maxLines: 2, align: 'center' },
    },
    {
      id: 'living_editorial', name: '리빙 에디토리얼 (영문 이탤릭)',
      hint: '우리집·조구하우스 스타일 · 흰 영문 이탤릭 + 작은 한글 부제',
      ink: '#FFFFFF', shadow: 18, shadowCol: 'rgba(0,0,0,0.38)',
      italic: true, subLine: true, subDefault: '우리집 기록',
      geo: { y: 0.40, size: 74, weight: 400, font: 'pretendard', spacing: 6, maxLines: 2, align: 'center' },
    },
  ];

  /* ---------------------------------------------------------------- 공통 스키마
     {"fps":30,"dur":0,"tracks":[
        {"kind":"video","clips":[{"src":"컷번호","start":0,"in":0,"out":0}]},
        {"kind":"caption","clips":[{"text":"","start":0,"out":0,"style":"프리셋이름"}]},
        {"kind":"voice","clips":[{"text":"읽을 문장","start":0,"out":0}]},
        {"kind":"bgm","clips":[{"mood":"분위기","start":0,"out":0,"vol":0.2}]},
        {"kind":"fx","clips":[{"type":"팝|줌|효과음","start":0}]}],
      "need_from_user":["찍어야 할 컷"],"caption_insta":"","hashtags":[]}
     `out` 은 '끝나는 시각'(절대 초)으로 읽고, 없으면 dur·in/out(원본 트림)·기본값 순으로 채웁니다. */

  const KIND_ALIAS = {
    video: 'video', 영상: 'video', 컷: 'video', clip: 'video', clips: 'video', shot: 'video', shots: 'video', media: 'video',
    caption: 'caption', captions: 'caption', text: 'caption', texts: 'caption', subtitle: 'caption', 자막: 'caption', 텍스트: 'caption',
    voice: 'voice', narration: 'voice', 보이스: 'voice', 멘트: 'voice', 대본: 'voice', tts: 'voice', script: 'voice',
    bgm: 'bgm', music: 'bgm', audio: 'bgm', 배경음악: 'bgm', 음악: 'bgm',
    fx: 'fx', effect: 'fx', effects: 'fx', 효과: 'fx', sfx: 'fx',
  };
  const FX_ALIAS = [
    [/플래시|flash|번쩍|섬광/i, 'flash'],
    [/비네트|vignette|가장자리/i, 'vignette'],
    [/마커|marker|형광/i, 'marker'],
    [/줌|zoom|당김/i, 'zoom'],
    [/팝|pop|효과음|sfx|sound|톡/i, 'pop'],
  ];
  const BGM_ALIAS = [
    [/vlog|브이로그|루틴|일상/i, 'vlog'],
    [/잔잔|차분|calm|chill|lo-?fi|로파이|감성|따뜻|warm|acoustic|어쿠스틱|매트|soft|부드/i, 'chill'],
    [/업비트|upbeat|신나|경쾌|에너지|밝|bright|댄스|dance/i, 'upbeat'],
    [/훅|hook|팝|pop|트렌디|trend/i, 'hook'],
  ];
  const STYLE_RULES = [
    [/^omuk_food$/i, 'omuk_food'],
    [/^living_pill$/i, 'living_pill'],
    [/^living_hand$/i, 'living_hand'],
    [/^living_editorial$/i, 'living_editorial'],
    [/omuk|음식|먹방|food/i, 'omuk_food'],
    [/pill|알약|말풍선|jogu|조구/i, 'living_pill'],
    [/hand|손글씨|on_?off|온오프|onyu/i, 'living_hand'],
    [/editorial|이탤릭|italic|영문|우리집|our_?\.?zip/i, 'living_editorial'],
    [/bold|굵은|외곽|thingthing/i, 'boldOutline'],
    [/lime|형광/i, 'lime'],
    [/cream|크림/i, 'cream'],
    [/whitebox|화이트\s*박스/i, 'whiteBox'],
    [/darkpill|다크\s*알약/i, 'darkPill'],
    [/pink|핑크|파스텔/i, 'pinkPuff'],
    [/butter|버터|노랑/i, 'butter'],
    [/coral|코랄/i, 'coral'],
    [/mint|민트/i, 'mint'],
    [/sky|스카이/i, 'sky'],
    [/neon|네온/i, 'neon'],
  ];
  const KNOWN_STYLE_IDS = ['outline', 'pinkPuff', 'butter', 'lime', 'coral', 'mint', 'sky', 'darkPill', 'whiteBox',
    'neon', 'cream', 'butterBox', 'boldOutline', 'omuk_food', 'living_pill', 'living_hand', 'living_editorial'];

  function styleOf(raw) {
    const s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    const low = s.toLowerCase();
    if (KNOWN_STYLE_IDS.includes(low)) return low;
    if (KNOWN_STYLE_IDS.includes(s)) return s;
    for (const [re, id] of STYLE_RULES) if (re.test(low) || re.test(s)) return id;
    return '';
  }
  function fxOf(raw) {
    const s = String(raw == null ? '' : raw).trim();
    if (!s) return 'pop';
    const low = s.toLowerCase();
    if (['zoom', 'pop', 'flash', 'vignette', 'marker'].includes(low)) return low;
    for (const [re, id] of FX_ALIAS) if (re.test(low) || re.test(s)) return id;
    return 'pop';
  }
  function bgmOf(raw) {
    const s = String(raw == null ? '' : raw).trim();
    const low = s.toLowerCase();
    if (['hook', 'upbeat', 'chill', 'vlog'].includes(low)) return low;
    for (const [re, id] of BGM_ALIAS) if (re.test(low) || re.test(s)) return id;
    return 'chill';
  }

  const splitShots = (raw) => String(raw == null ? '' : raw)
    .split(/[\n·|,;]+|\s\/\s/)
    .map((s) => s.replace(/^[\s\-–•*①-⑩0-9.)]+/, '').trim())
    .filter(Boolean)
    .slice(0, 12);

  /* ---------------------------------------------------------------- 정규화(불러오기) */
  function normalizeTrackKind(k) {
    const s = String(k == null ? '' : k).trim().toLowerCase().replace(/\s+/g, '');
    return KIND_ALIAS[s] || '';
  }
  function trackList(root) {
    const out = { video: [], caption: [], voice: [], bgm: [], fx: [] };
    const tracks = Array.isArray(root.tracks) ? root.tracks : [];
    tracks.forEach((t, ti) => {
      if (!t || typeof t !== 'object') return;
      const kind = normalizeTrackKind(t.kind || t.type || t.track || t.name) || (ti === 0 ? 'video' : '');
      if (!kind) return;
      const clips = Array.isArray(t.clips) ? t.clips : (Array.isArray(t.items) ? t.items : []);
      for (const c of clips) {
        if (c == null) continue;
        out[kind].push(typeof c === 'string' ? { text: c } : c);
      }
    });
    /* tracks 배열 없이 {video:[...], caption:[...]} 로 온 경우도 받습니다 */
    for (const kind of ['video', 'caption', 'voice', 'bgm', 'fx']) {
      const direct = root[kind] || root[kind + 's'];
      if (out[kind].length || !Array.isArray(direct)) continue;
      out[kind] = direct.filter((c) => c != null).map((c) => (typeof c === 'string' ? { text: c } : c));
    }
    return out;
  }
  function times(c, defDur) {
    const start = Math.max(0, num(c.start, num(c.at, num(c.from, 0))));
    let dur = num(c.dur, num(c.duration, num(c.len, 0)));
    const out = num(c.out, num(c.end, NaN));
    const inn = num(c.in, num(c.from, NaN));
    if (!dur && out > start) dur = out - start;                 /* out = 타임라인 끝 시각 */
    if (!dur && inn >= 0 && out > inn) dur = out - inn;          /* in/out = 원본 트림 */
    if (!dur) dur = defDur;
    return { start: r2(start), dur: r2(clamp(dur, 0.3, 120)) };
  }
  const textDur = (text, fallback = 2.2) => {
    const n = String(text || '').replace(/\s+/g, '').length;
    return n ? clamp(r2(n / 4.6), 1, 8) : fallback;
  };

  function parse(root) {
    if (typeof root === 'string') return parse(parseText(root));
    const o = (root && typeof root === 'object') ? root : {};
    const raw = trackList(o);
    const videoEnd = () => {
      let e = 0;
      for (const v of raw.video) { const t = times(v, 3); e = Math.max(e, t.start + t.dur); }
      return e;
    };
    const endAll = () => {
      let e = 0;
      for (const k of ['video', 'caption', 'voice', 'bgm', 'fx']) {
        for (const c of raw[k]) {
          const d = k === 'caption' ? textDur(c.text, 2.4) : k === 'voice' ? textDur(c.text, 2.2) : k === 'fx' ? 0.8 : 3;
          const t = times(c, d);
          e = Math.max(e, t.start + t.dur);
        }
      }
      return e;
    };
    const vEnd = videoEnd() || endAll() || r2(o.dur, 0);
    const styleHint = String(o.kind || o.track_kind || o.mode || '').toLowerCase();
    const defaultStyle = styleOf(o.style || o.caption_style)
      || (/p5|food|음식/.test(styleHint) ? 'omuk_food' : /p6|living|리빙/.test(styleHint) ? 'living_pill' : '');

    const tracks = { video: [], caption: [], voice: [], bgm: [], fx: [] };
    raw.video.forEach((c, i) => {
      const t = times(c, 3);
      tracks.video.push({ ...t, in: Math.max(0, r2(num(c.in, 0))), src: String(c.src == null ? (c.id == null ? i + 1 : c.id) : c.src).trim() });
    });
    raw.caption.forEach((c) => {
      const text = String(c.text == null ? (c.caption == null ? '' : c.caption) : c.text).trim();
      if (!text) return;
      const t = times(c, textDur(text, 2.4));
      tracks.caption.push({ ...t, text, style: styleOf(c.style || c.styleId || c.preset) || defaultStyle || 'boldOutline', sub: String(c.sub == null ? '' : c.sub).trim() });
    });
    raw.voice.forEach((c) => {
      const text = String(c.text == null ? (c.line == null ? '' : c.line) : c.text).trim();
      if (!text) return;
      const t = times(c, textDur(text, 2.2));
      tracks.voice.push({ ...t, text });
    });
    raw.bgm.forEach((c) => {
      const mood = String(c.mood == null ? (c.name == null ? '' : c.name) : c.mood).trim();
      const t = times(c, vEnd || 8);
      tracks.bgm.push({ ...t, mood, bgm: bgmOf(c.id || mood), vol: clamp(num(c.vol, num(c.volume, 0.2)), 0, 1) });
    });
    raw.fx.forEach((c) => {
      const type = String(c.type == null ? (c.effect == null ? '' : c.effect) : c.type).trim();
      const effect = fxOf(type || c.id);
      const t = times(c, effect === 'zoom' || effect === 'vignette' ? 1.2 : 0.8);
      tracks.fx.push({ ...t, type, effect, at: r2(num(c.at, num(c.start, 0))) });
    });

    const clips = tracks.video.length + tracks.caption.length + tracks.voice.length + tracks.bgm.length + tracks.fx.length;
    if (!clips) return { error: '트랙(clips)을 찾지 못했어요 · video·caption·voice·bgm·fx 5트랙 JSON인지 확인해 주세요', tracks, clips: 0 };

    const need = (Array.isArray(o.need_from_user) ? o.need_from_user : (typeof o.need_from_user === 'string' ? splitShots(o.need_from_user) : []))
      .map((s) => String(s == null ? '' : s).trim()).filter(Boolean);
    const tags = (Array.isArray(o.hashtags) ? o.hashtags : (typeof o.hashtags === 'string' ? o.hashtags.split(/[\s,]+/) : []))
      .map((t) => String(t == null ? '' : t).trim()).filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t.replace(/^#+/, '')}`));
    const end = Math.max(endAll(), num(o.dur, 0));
    const kind = tracks.caption.some((c) => c.style === 'omuk_food') ? 'p5'
      : tracks.caption.some((c) => c.style.startsWith('living_')) ? 'p6' : 'custom';
    return {
      clips,
      kind,
      fps: num(o.fps, 30),
      dur: r2(end),
      name: String(o.name || o.title || '').trim(),
      tracks,
      need_from_user: need,
      caption_insta: String(o.caption_insta == null ? (o.caption == null ? '' : o.caption) : o.caption_insta).trim(),
      hashtags: tags,
    };
  }

  function parseText(text) {
    let s = String(text == null ? '' : text).trim();
    if (!s) throw new Error('JSON이 비어 있어요');
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a > 0 || (b > -1 && b < s.length - 1)) s = s.slice(Math.max(0, a), b + 1);
    try { return JSON.parse(s); }
    catch (e) {
      const msg = String((e && e.message) || e);
      throw new Error(`JSON을 읽지 못했어요 · ${msg.slice(0, 90)}`);
    }
  }

  /* ---------------------------------------------------------------- 내보내기
     지금 편집한 타임라인을 같은 스키마로 되돌립니다(불러오기 ↔ 내보내기 왕복 가능). */
  const FX_NAME = { zoom: '줌', pop: '팝', flash: '플래시', vignette: '비네트', marker: '형광 마커' };
  function toJSON(blocks, meta = {}) {
    const list = Array.isArray(blocks) ? blocks : [];
    const mediaName = typeof meta.mediaName === 'function' ? meta.mediaName : () => '';
    const T = { video: [], caption: [], voice: [], bgm: [], fx: [] };
    let end = 0;
    for (const b of list) {
      const start = r2(b.start);
      const out = r2(num(b.start) + num(b.dur));
      end = Math.max(end, out);
      if (b.track === 'video') {
        const src = String(b.src || mediaName(b.mediaId) || String(b.label || '').replace(/^컷\s*/, '') || '').trim();
        T.video.push({ src, start, in: r2(num(b.in, num(b.offset, 0))), out });
      } else if (b.track === 'text') {
        const c = { text: String(b.text || ''), start, out, style: String(b.styleId || 'outline') };
        if (b.sub) c.sub = String(b.sub);
        T.caption.push(c);
      } else if (b.track === 'voice') {
        T.voice.push({ text: String(b.text || mediaName(b.mediaId) || b.name || ''), start, out });
      } else if (b.track === 'bgm') {
        T.bgm.push({ mood: String(b.name || mediaName(b.mediaId) || '잔잔한 루프'), start, out, vol: r2(num(b.volume, 0.2)) });
      } else if (b.track === 'fx') {
        T.fx.push({ type: FX_NAME[b.effect] || String(b.effect || '팝'), start, out });
      }
    }
    T.video.sort((a, b) => a.start - b.start);
    T.caption.sort((a, b) => a.start - b.start);
    T.voice.sort((a, b) => a.start - b.start);
    T.bgm.sort((a, b) => a.start - b.start);
    T.fx.sort((a, b) => a.start - b.start);
    const tags = (meta.hashtags || []).map((t) => (String(t).startsWith('#') ? String(t) : `#${t}`));
    return {
      fps: 30,
      dur: r2(end),
      name: String(meta.name || '').trim(),
      tracks: [
        { kind: 'video', clips: T.video },
        { kind: 'caption', clips: T.caption },
        { kind: 'voice', clips: T.voice },
        { kind: 'bgm', clips: T.bgm },
        { kind: 'fx', clips: T.fx },
      ],
      need_from_user: (meta.need || []).map((s) => String(s)),
      caption_insta: String(meta.caption || ''),
      hashtags: tags,
    };
  }

  /* ---------------------------------------------------------------- P5 · P6 스토리보드 */
  const P5_SHOTS = [
    '① 가장 맛있어 보이는 클로즈업 (뜯기·단면)',
    '② 손으로 집어 드는 1인칭 컷',
    '③ 한입 먹는 순간 (입 가까이)',
    '④ 씹는 소리 ASMR 컷 (제품 가까이)',
    '⑤ 포장·가격·판매처 클로즈업',
    '⑥ 다 먹은 뒤 빈 봉·그릇 컷',
  ];
  const P5_CAPS = ['향부터 다르죠', '뜯자마자 소리 실화', '손이 먼저 가요', '한입에 이 소리', '바삭함 그대로', '하나 더 사올 걸'];
  const P5_VOICE = ['포장 뜯자마자 향이 확 올라와요.', '소리가 진짜 다르죠.', '한입 먹으면 바삭한 게 느껴져요.', '이건 하나로는 부족해요.'];
  const P6_SHOTS = [
    '① 정돈된 공간 전경 (웜톤·우드)',
    '② 문제 장면 (지저분함·불편한 자리)',
    '③ 제품 등장 (손에 들고)',
    '④ 설치·사용 장면',
    '⑤ 비포·애프터 비교',
    '⑥ 제품 라벨·디테일 클로즈업',
  ];
  const P6_CAPS = ['이거 하나로 정리 끝', '바꾸고 나서 달라졌어요', '매일 쓰는 이유', '비포·애프터 보세요', '이 자리 그대로', '디테일이 살아있어요'];
  const P6_SUBS = ['우리집 기록', '바꾸고 나서', '매일 쓰는 것', '조용한 변화', '이 자리', '디테일'];
  const P6_VOICE = ['정리하고 나서 진짜 편해졌어요.', '이 자리에 두니까 다 정돈돼요.', '매일 쓰는 물건이라 더 신경 썼어요.'];

  const tagOf = (topic) => String(topic || '').replace(/[^\w가-힣]/g, '').slice(0, 12) || '리뷰';
  const firstLine = (s) => String(s || '').split('\n')[0].trim();

  function captionP5(topic, price) {
    return [
      `🧡 ${topic} 진짜 먹어봤어요`,
      '',
      '한입 먹자마자 소리가 달라서 놀랐어요. 과장 없이 담백하고 끝맛이 깔끔해요.',
      price ? `가격은 ${price}이에요.` : null,
      '📍 판매처: (적어 주세요)',
      `🍽 ${topic}${price ? ` | ${price}` : ''}`,
      '✍️ 에디터: (적어 주세요)',
      '',
      `#${tagOf(topic)} #먹방 #먹스타그램 #음식리뷰 #신상`,
    ].filter((l) => l !== null).join('\n');
  }
  function captionP6(topic, price) {
    return [
      `🪴 ${topic} 바꾸고 나서 달라진 것`,
      '',
      '매일 보는 자리라서 조금만 바꿔도 방 분위기가 확 달라져요.',
      price ? `가격은 ${price}이에요.` : null,
      '📍 구매처: (적어 주세요)',
      `🏷 ${topic}${price ? ` | ${price}` : ''}`,
      '✍️ 에디터: (적어 주세요)',
      '',
      `#${tagOf(topic)} #리빙 #살림템 #집꾸미기 #인테리어소품`,
    ].filter((l) => l !== null).join('\n');
  }

  function localP5(input = {}) {
    const topic = firstLine(input.topic) || '제품';
    const price = String(input.price || '').trim();
    const shots = Array.isArray(input.shots) ? input.shots : splitShots(input.shots);
    /* 컷 자리(플레이스홀더)와 찍어야 할 컷 목록을 1:1로 맞춥니다 */
    const n = clamp(Math.max(shots.length, P5_SHOTS.length), 5, 10);
    const per = 1.3;                                   /* 실측: 1~1.5초 빠른 컷 */
    const video = [];
    const caption = [];
    const voice = [];
    const fx = [];
    for (let i = 0; i < n; i += 1) {
      const start = r2(i * per);
      const out = r2(start + per);
      video.push({ src: String(i + 1), start, in: 0, out });
      const cap = i === 4 ? `${topic}${price ? ` | ${price}` : ''}` : P5_CAPS[i % P5_CAPS.length];
      caption.push({ text: cap, start: r2(start + 0.05), out: r2(out - 0.05), style: 'omuk_food' });
      if (i % 2 === 1) voice.push({ text: P5_VOICE[(i - 1) / 2 % P5_VOICE.length], start, out });
      if (i === 0 || i === 3) fx.push({ type: '팝', start, out: r2(start + 0.5) });
    }
    const end = r2(n * per);
    fx.push({ type: '줌', start: 0, out: end });
    fx.push({ type: '비네트', start: 0, out: end });
    return {
      fps: 30, dur: end, kind: 'p5', name: `P5 음식 리뷰 · ${topic}`,
      tracks: [
        { kind: 'video', clips: video },
        { kind: 'caption', clips: caption },
        { kind: 'voice', clips: voice },
        { kind: 'bgm', clips: [{ mood: '잔잔한 로파이', start: 0, out: end, vol: 0.18 }] },
        { kind: 'fx', clips: fx },
      ],
      need_from_user: shots.length ? P5_SHOTS.slice(shots.length).slice(0, 6) : P5_SHOTS.slice(),
      caption_insta: captionP5(topic, price),
      hashtags: [`#${tagOf(topic)}`, '#먹방', '#먹스타그램', '#음식리뷰', '#신상'],
    };
  }
  function localP6(input = {}) {
    const topic = firstLine(input.topic) || '제품';
    const price = String(input.price || '').trim();
    const style = styleOf(input.style) || 'living_pill';
    const shots = Array.isArray(input.shots) ? input.shots : splitShots(input.shots);
    const n = clamp(Math.max(shots.length, P6_SHOTS.length), 5, 10);
    const per = 2.5;                                   /* 실측: 2~3초 박자 컷 */
    const video = [];
    const caption = [];
    const voice = [];
    const fx = [];
    for (let i = 0; i < n; i += 1) {
      const start = r2(i * per);
      const out = r2(start + per);
      video.push({ src: String(i + 1), start, in: 0, out });
      const clip = { text: i === 5 ? `${topic}${price ? ` | ${price}` : ''}` : P6_CAPS[i % P6_CAPS.length], start: r2(start + 0.1), out: r2(out - 0.1), style };
      if (style === 'living_editorial') clip.sub = P6_SUBS[i % P6_SUBS.length];
      caption.push(clip);
      if (i % 2 === 0) voice.push({ text: P6_VOICE[i / 2 % P6_VOICE.length], start, out });
      if (i === 2) fx.push({ type: '팝', start, out: r2(start + 0.5) });
    }
    const end = r2(n * per);
    fx.push({ type: '줌', start: 0, out: end });
    fx.push({ type: '비네트', start: 0, out: end });
    return {
      fps: 30, dur: end, kind: 'p6', name: `P6 리빙 리뷰 · ${topic}`,
      tracks: [
        { kind: 'video', clips: video },
        { kind: 'caption', clips: caption },
        { kind: 'voice', clips: voice },
        { kind: 'bgm', clips: [{ mood: '따뜻한 어쿠스틱', start: 0, out: end, vol: 0.2 }] },
        { kind: 'fx', clips: fx },
      ],
      need_from_user: shots.length ? P6_SHOTS.slice(shots.length).slice(0, 6) : P6_SHOTS.slice(),
      caption_insta: captionP6(topic, price),
      hashtags: [`#${tagOf(topic)}`, '#리빙', '#살림템', '#집꾸미기', '#인테리어소품'],
    };
  }
  const local = (kind, input) => (String(kind).toLowerCase() === 'p6' ? localP6(input) : localP5(input));

  /* ---------------------------------------------------------------- 프롬프트 (복사용) */
  const SCHEMA_BLOCK = [
    '{',
    '  "fps": 30, "dur": 0, "kind": "p5|p6",',
    '  "tracks": [',
    '    {"kind": "video",   "clips": [{"src": "컷번호", "start": 0, "in": 0, "out": 0}]},',
    '    {"kind": "caption", "clips": [{"text": "", "start": 0, "out": 0, "style": "프리셋이름"}]},',
    '    {"kind": "voice",   "clips": [{"text": "읽을 문장", "start": 0, "out": 0}]},',
    '    {"kind": "bgm",     "clips": [{"mood": "분위기", "start": 0, "out": 0, "vol": 0.2}]},',
    '    {"kind": "fx",      "clips": [{"type": "팝|줌|플래시|비네트|형광 마커", "start": 0, "out": 0}]}',
    '  ],',
    '  "need_from_user": ["찍어야 할 컷"], "caption_insta": "", "hashtags": ["#태그"]',
    '}',
  ].join('\n');

  const RULES = [
    '[출력 규칙]',
    '1. tracks 배열에 video·caption·voice·bgm·fx 5트랙을 모두 넣는다.',
    '2. start·out은 초 단위 숫자. out은 "끝나는 시각"(절대값)이다. in은 영상 원본의 시작점(모르면 0).',
    '3. video.src는 컷 번호("1","2"…) 또는 찍은 컷 이름. 영상 파일은 사용자가 pc.html에서 나중에 연결한다.',
    '4. caption은 한 줄 12자 이내·최대 2줄. 말하듯 짧게, 같은 문장 반복 금지.',
    '5. 숫자(가격·수량·칼로리·판매량)는 [입력]에 적힌 것만 쓴다. 없으면 아예 쓰지 않는다. 효능·수상·재방문 약속 창작 금지.',
    '6. need_from_user에는 이 JSON을 그대로 찍기 위해 사용자가 아직 안 찍은 컷을 적는다.',
    '7. caption_insta는 줄바꿈(\\n)을 포함한 완성 문장으로, hashtags는 4~7개.',
    '8. JSON 외에 인사·설명·마크다운 코드블록을 쓰지 않는다. JSON 하나만 출력한다.',
  ];

  function buildPrompt(kind, input = {}) {
    const isP6 = String(kind).toLowerCase() === 'p6';
    const topic = firstLine(input.topic) || '(제품·주제를 적어 주세요)';
    const price = String(input.price || '').trim();
    const shots = (Array.isArray(input.shots) ? input.shots : splitShots(input.shots)).map((s, i) => `${i + 1}. ${s}`);
    const style = isP6 ? (styleOf(input.style) || 'living_pill') : 'omuk_food';
    const styleLine = {
      living_pill: 'living_pill — 상단 흰 둥근 알약 말풍선(#FFFFFF 92%·검정 굵은 글씨, 조구하우스 스타일)',
      living_hand: 'living_hand — 상단 [직접 써보고 고른] 작은 태그 + 손글씨 기울기 흰 글씨 + 부드러운 그림자(온오프 스타일)',
      living_editorial: 'living_editorial — 흰 영문 이탤릭 + 작은 한글 부제(우리집·조구하우스 스타일)',
    }[style] || style;

    const head = isP6
      ? [
        '너는 한국 인스타 릴스(9:16) 리빙·살림 리뷰 편집자다.',
        '아래 [입력]만 보고 편집 결과를 "타임라인 JSON" 하나로만 출력해라.',
        '',
        '[입력]',
        `- 제품: ${topic}`,
        `- 가격: ${price || '(없음 — 비워 두고 지어내지 말 것)'}`,
        `- 찍은 컷: ${shots.length ? '' : '(아직 없음 — 스토리보드를 제안할 것)'}`,
        ...shots.map((s) => `  ${s}`),
        '',
        '[실측 스타일 — our_.zip · onyu_haus · on_off_zip · jogu_haus]',
        '- 화면은 웜톤·베이지·우드 생활 공간 컷. 사람 얼굴 클로즈업보다 "손 + 제품 + 자리" 중심.',
        '- 컷은 2~3초 박자로 끊고, 매트하고 따뜻한 톤을 유지한다. 급한 줌·과한 효과 금지.',
        `- 자막 스타일은 "${style}" 하나로 통일: ${styleLine}`,
        '  · living_editorial을 고르면 caption마다 "sub"에 짧은 한글 부제(6~10자)를 넣는다.',
        '- 자막은 말을 줄이고 장면 설명 위주. 제품 라벨·가격은 [입력]에 있을 때만.',
        '- BGM은 따뜻한 어쿠스틱/로파이, vol 0.18~0.22.',
        '- 흐름: 정돈된 공간 전경 훅 → 문제 장면(지저분·불편) → 제품 등장 → 설치·사용 → 비포·애프터 → 제품명·가격 라벨 → 저장 유도.',
      ]
      : [
        '너는 한국 인스타 릴스(9:16) 음식 리뷰 편집자다.',
        '아래 [입력]만 보고 편집 결과를 "타임라인 JSON" 하나로만 출력해라.',
        '',
        '[입력]',
        `- 제품·메뉴: ${topic}`,
        `- 가격: ${price || '(없음 — 비워 두고 지어내지 말 것)'}`,
        `- 찍은 컷: ${shots.length ? '' : '(아직 없음 — 스토리보드를 제안할 것)'}`,
        ...shots.map((s) => `  ${s}`),
        '',
        '[실측 스타일 — omuk.official · Df_pRBWxuX6]',
        '- 화면은 1인칭 손 클로즈업: 뜯기 → 단면 → 한입. 얼굴·전신·매장 전경은 쓰지 않는다.',
        '- 자막은 상단 중앙(y≈22%)에 굵은 흰 고딕 + 두꺼운 검정 외곽선. style은 "omuk_food"로 통일.',
        '- 컷은 1~1.5초로 빠르게. 컷마다 짧은 팝/줌, 중간에 형광 마커나 플래시 1~2회.',
        '- 소리는 음식 ASMR(뜯는·바삭·씹는)이 주인공. BGM은 잔잔하게 vol 0.15~0.2.',
        '- 보이스(멘트)는 말하듯 짧게 6~12자, 컷마다 다 읽지 말고 2~3컷에만.',
        '- 흐름: 가장 맛있어 보이는 클로즈업 → 메뉴명(+가격) → 먹는 장면·씹는 소리 → 한줄 맛평 → 총평 → 저장 유도.',
      ];

    const tail = isP6
      ? [
        '[caption_insta 형식]',
        '🪴 (제품) 바꾸고 나서 달라진 것',
        '(생활 장면 묘사 2~3줄, 솔직한 구어체)',
        '📍 구매처: (모르면 "(적어 주세요)")',
        '🏷 제품명 | 가격 (가격 없으면 제품명만)',
        '✍️ 에디터: (모르면 "(적어 주세요)")',
      ]
      : [
        '[caption_insta 형식]',
        '🧡 (제품·메뉴) 진짜 먹어봤어요',
        '(이모지 훅 1줄 + 솔직한 구어체 후기 2~3줄)',
        '📍 판매처: (모르면 "(적어 주세요)")',
        '🍽 제품명 | 가격 (가격 없으면 제품명만)',
        '✍️ 에디터: (모르면 "(적어 주세요)")',
      ];

    return [...head, '', ...tail, '', SCHEMA_BLOCK, '', ...RULES].join('\n');
  }

  /* ---------------------------------------------------------------- OpenAI (선택)
     autogen.js 와 같은 키(localStorage 'studio2.tts.v1')를 씁니다. */
  const AI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  const AI_MODEL = 'gpt-4o-mini';
  function aiKey() {
    try {
      if (window.Autogen && typeof window.Autogen.aiKey === 'function') return String(window.Autogen.aiKey() || '');
    } catch { /* 무시 */ }
    try {
      const cfg = JSON.parse(localStorage.getItem('studio2.tts.v1') || '{}') || {};
      if (cfg.provider && cfg.provider !== 'openai') return '';
      return String(cfg.key || '').trim();
    } catch { return ''; }
  }
  const aiAvailable = () => !!aiKey();

  async function generateAI(kind, input = {}, opts = {}) {
    const key = String(opts.key || '').trim() || aiKey();
    if (!key) return null;
    const prompt = buildPrompt(kind, input);
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '너는 한국 인스타 릴스 타임라인 편집자다. 요청한 공통 5트랙 타임라인 JSON 하나만 출력한다. 숫자는 입력에 있는 것만 쓰고 지어내지 않는다.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: opts.signal,
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 140); } catch { /* 무시 */ }
      throw new Error(`OpenAI 오류 ${res.status}${detail ? ` · ${detail}` : ''}`);
    }
    const data = await res.json();
    const raw = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const obj = parseText(raw || '{}');
    const parsed = parse(obj);
    if (parsed.error) throw new Error(parsed.error);
    return { ...obj, __ai: true, __model: AI_MODEL };
  }

  window.P56 = {
    version: '2026.11.22-v6',
    EXTRA_STYLES,
    SHOTS: { p5: P5_SHOTS, p6: P6_SHOTS },
    styleOf, fxOf, bgmOf,
    splitShots,
    parse, parseText, toJSON,
    buildPrompt,
    local, localP5, localP6,
    captionP5, captionP6,
    aiKey, aiAvailable, generateAI,
    AI_MODEL,
  };
})();
