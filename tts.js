/* =========================================================================
   tts.js — 외부 TTS API 연결 (스튜디오 2.0 · PC 에디터 공용)
   · API 키는 이 브라우저의 localStorage에만 저장합니다.
     프로젝트 자동저장(IndexedDB)·공유 JSON·내보내기 파일에는 절대 넣지 않습니다.
   · 생성된 음성은 MP3/WAV Blob 그대로 돌려주고, 각 앱이 보이스 트랙(WebAudio)에
     연결해 미리보기와 MP4/WebM 내보내기에 함께 섞습니다.
   ========================================================================= */

const TTS_STORE_KEY = 'studio2.tts.v1';
const TTS_PROVIDERS = [
  {
    id: 'openai', name: 'OpenAI TTS',
    endpoint: 'https://api.openai.com/v1/audio/speech',
    voice: 'nova', voiceHint: 'onyx · nova · alloy · shimmer · echo',
    model: 'gpt-4o-mini-tts', modelHint: 'tts-1 · tts-1-hd · gpt-4o-mini-tts',
    note: 'OpenAI는 브라우저 직접 호출을 막아 두었어요(CORS). 막히면 아래 “직접 입력”에 프록시 주소를 넣어 주세요.',
  },
  {
    id: 'elevenlabs', name: 'ElevenLabs',
    endpoint: 'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}',
    voice: '', voiceHint: 'Voice ID (예: 21m00Tcm4TlvDq8ikWAM)',
    model: 'eleven_multilingual_v2', modelHint: 'eleven_multilingual_v2 · eleven_turbo_v2_5',
    note: '보이스 ID는 ElevenLabs → Voices → 보이스 → ID에서 복사해요. 한국어는 multilingual 모델을 쓰세요.',
  },
  {
    id: 'typecast', name: 'Typecast',
    endpoint: 'https://api.typecast.ai/v1/text-to-speech',
    voice: '', voiceHint: 'Actor ID (예: tc_60e5426de8b95f0d1fd9c1f0)',
    model: 'ssfm-v21', modelHint: 'ssfm-v21 · ssfm-v30',
    note: 'Typecast는 계정 문서의 필드명이 바뀔 수 있어요. 오류가 나면 “직접 입력”에 같은 주소를 넣고 필드를 맞춰 주세요.',
  },
  {
    id: 'custom', name: '직접 입력',
    endpoint: '', voice: '', voiceHint: 'voice (선택)',
    model: '', modelHint: 'model (선택)',
    note: '내 프록시·자체 TTS 서버 주소를 넣어요. POST JSON {text, voice, model} 로 보내고 오디오 바이트(또는 {"audio": base64})를 돌려받으면 됩니다.',
  },
];
const ttsProviderOf = (id) => TTS_PROVIDERS.find((p) => p.id === id) || TTS_PROVIDERS[0];

function ttsLoad() {
  const base = { provider: 'openai', key: '', voice: '', model: '', endpoint: '' };
  try {
    const raw = localStorage.getItem(TTS_STORE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) || {};
    const p = ttsProviderOf(saved.provider);
    return {
      provider: p.id,
      key: typeof saved.key === 'string' ? saved.key : '',
      voice: saved.voice != null ? String(saved.voice) : '',
      model: saved.model != null ? String(saved.model) : '',
      endpoint: saved.endpoint != null ? String(saved.endpoint) : '',
    };
  } catch {
    return base;
  }
}
function ttsSave(patch = {}) {
  const cur = ttsLoad();
  const next = { ...cur, ...patch };
  try { localStorage.setItem(TTS_STORE_KEY, JSON.stringify(next)); } catch { /* 저장 실패는 조용히 */ }
  ttsPanels.forEach((fn) => { try { fn(); } catch { /* 무시 */ } });
  return next;
}
function ttsClearKey() {
  const cur = ttsLoad();
  const next = { ...cur, key: '' };
  try { localStorage.setItem(TTS_STORE_KEY, JSON.stringify(next)); } catch { /* 무시 */ }
  ttsPanels.forEach((fn) => { try { fn(); } catch { /* 무시 */ } });
  return next;
}

const ttsPanels = [];

/* ---------- 실제 요청 ---------- */
function ttsHeaders(provider, key) {
  if (!key) return {};
  if (provider === 'elevenlabs') return { 'xi-api-key': key };
  return { Authorization: 'Bearer ' + key };
}
function ttsEndpointOf(p, cfg) {
  if (p.id === 'custom') return String(cfg.endpoint || '').trim();
  if (p.id === 'elevenlabs') {
    const id = encodeURIComponent(String(cfg.voice || '').trim() || '21m00Tcm4TlvDq8ikWAM');
    return p.endpoint.replace('{voice_id}', id) + '?output_format=mp3_44100_128';
  }
  return p.endpoint;
}
function ttsBodyOf(p, cfg, text) {
  const voice = String(cfg.voice || '').trim() || p.voice;
  const model = String(cfg.model || '').trim() || p.model;
  if (p.id === 'openai') {
    return { model: model || 'gpt-4o-mini-tts', voice: voice || 'nova', input: text, response_format: 'mp3' };
  }
  if (p.id === 'elevenlabs') {
    return { text, model_id: model || 'eleven_multilingual_v2' };
  }
  if (p.id === 'typecast') {
    return { text, voice_id: voice, actor_id: voice, model: model || 'ssfm-v21', lang: 'kor', language: 'kor', audio_format: 'mp3' };
  }
  return { text, voice, model };
}
function b64ToBytes(b64) {
  const bin = atob(String(b64).replace(/^data:[^,]*,/, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}
function ttsErrorText(p, err) {
  const raw = String((err && err.message) || err || '');
  if (/^(TypeError|Failed to fetch)/i.test(raw) || /networkerror|load failed/i.test(raw)) {
    return `${p.name}을 브라우저에서 직접 부르지 못했어요(주소·CORS). 키가 맞아도 막히는 제공자가 있어요 — “직접 입력”에 프록시 주소를 넣으면 됩니다.`;
  }
  return raw || '음성을 만들지 못했어요';
}

async function ttsGenerate(cfg, text, opt = {}) {
  const p = ttsProviderOf(cfg.provider);
  const clean = String(text || '').trim();
  if (!clean) throw new Error('대본을 먼저 적어 주세요');
  if (!cfg.key && p.id !== 'custom') throw new Error(`${p.name} API 키를 넣어 주세요`);
  const url = ttsEndpointOf(p, cfg);
  if (!url) throw new Error('요청 주소(엔드포인트)를 넣어 주세요');
  const headers = { 'Content-Type': 'application/json', ...ttsHeaders(p.id, cfg.key) };
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(ttsBodyOf(p, cfg, clean)),
      signal: opt.signal,
    });
  } catch (e) {
    throw new Error(ttsErrorText(p, e));
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.text()).slice(0, 220); } catch { /* 무시 */ }
    throw new Error(`${p.name} 오류 ${res.status}${detail ? ' · ' + detail : ''}`);
  }
  const type = String(res.headers.get('content-type') || '').toLowerCase();
  let blob;
  if (type.includes('json')) {
    /* 일부 서버는 JSON 안에 base64 오디오를 돌려줍니다 */
    const data = await res.json().catch(() => ({}));
    const b64 = data.audio || data.audioContent || data.audio_base64 || data.data || '';
    if (!b64) throw new Error(`${p.name} 응답에 오디오가 없어요`);
    blob = new Blob([b64ToBytes(b64)], { type: 'audio/mpeg' });
  } else {
    blob = await res.blob();
  }
  if (!blob || !blob.size) throw new Error('빈 오디오가 돌아왔어요');
  const ext = /wav/i.test(blob.type) ? 'wav' : /ogg/i.test(blob.type) ? 'ogg' : 'mp3';
  return { blob, provider: p.id, providerName: p.name, ext, bytes: blob.size };
}

/* ---------- 화면 패널 ---------- */
function mountTtsPanel(host, opts = {}) {
  if (!host) return null;
  const getText = typeof opts.getText === 'function' ? opts.getText : () => '';
  const onAudio = typeof opts.onAudio === 'function' ? opts.onAudio : null;
  host.innerHTML = `
    <div class="sec-head" style="margin-bottom:7px"><h2 style="font-size:13px">🔊 외부 TTS API 연결</h2><span class="side">키는 이 기기에만</span></div>
    <div class="seg tts-prov" role="group" aria-label="TTS 제공자">
      ${TTS_PROVIDERS.map((p) => `<button class="segbtn" type="button" data-tts-provider="${p.id}" aria-pressed="false">${esc(p.name)}</button>`).join('')}
    </div>
    <label class="field" style="margin-top:8px">API Key <small>이 브라우저에만 저장 · 프로젝트 파일에는 안 들어감</small>
      <input data-tts="key" type="password" autocomplete="new-password" spellcheck="false" placeholder="sk-... / xi-api-key / typecast key">
    </label>
    <div class="row" style="margin-top:8px">
      <label class="field">Voice ID <input data-tts="voice" maxlength="80" placeholder=""></label>
      <label class="field">모델 <input data-tts="model" maxlength="60" placeholder=""></label>
    </div>
    <label class="field tts-endpoint" style="margin-top:8px">엔드포인트 <small>직접 입력용 (프록시 주소)</small>
      <input data-tts="endpoint" maxlength="240" placeholder="https://내-프록시/tts" spellcheck="false">
    </label>
    <label class="field" style="margin-top:8px">대본 <small>비우면 만들기 탭 대본을 씁니다</small>
      <textarea data-tts="text" rows="3" placeholder="이 문장으로 목소리를 만들어요"></textarea>
    </label>
    <div class="row" style="margin-top:8px">
      <button class="btn btn-ghost btn-sm" type="button" data-tts-act="preview" style="flex:1">▶ 미리듣기</button>
      <button class="btn btn-accent btn-sm" type="button" data-tts-act="make" style="flex:1.3">🎙 대본으로 생성 → 보이스에 넣기</button>
    </div>
    <p class="hint" data-tts="status" style="margin-top:6px">제공자를 고르고 키를 넣으면 대본을 실제 목소리로 만들어 보이스 트랙과 영상에 넣어요.</p>
    <p class="hint tts-note" data-tts="note" style="margin-top:4px"></p>
  `;
  const q = (sel) => host.querySelector(sel);
  const keyEl = q('[data-tts="key"]');
  const voiceEl = q('[data-tts="voice"]');
  const modelEl = q('[data-tts="model"]');
  const endEl = q('[data-tts="endpoint"]');
  const textEl = q('[data-tts="text"]');
  const statusEl = q('[data-tts="status"]');
  const noteEl = q('[data-tts="note"]');
  let last = null; // { key, result }

  function sync() {
    const cfg = ttsLoad();
    const p = ttsProviderOf(cfg.provider);
    host.querySelectorAll('[data-tts-provider]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ttsProvider === p.id)));
    keyEl.value = cfg.key || '';
    voiceEl.value = cfg.voice || '';
    voiceEl.placeholder = p.voiceHint || '';
    modelEl.value = cfg.model || '';
    modelEl.placeholder = p.modelHint || '';
    endEl.value = cfg.endpoint || '';
    q('.tts-endpoint').hidden = p.id !== 'custom';
    noteEl.textContent = p.note || '';
  }
  ttsPanels.push(sync);
  sync();

  host.querySelectorAll('[data-tts-provider]').forEach((b) => {
    b.onclick = () => {
      const p = ttsProviderOf(b.dataset.ttsProvider);
      ttsSave({ provider: p.id, voice: '', model: p.model || '', endpoint: p.id === 'custom' ? ttsLoad().endpoint : '' });
      last = null;
      statusEl.textContent = `${p.name} 선택 · ${p.note}`;
    };
  });
  [['key', keyEl], ['voice', voiceEl], ['model', modelEl], ['endpoint', endEl]].forEach(([k, el]) => {
    el.addEventListener('change', () => ttsSave({ [k]: el.value.trim() }));
  });
  keyEl.addEventListener('input', () => { /* 저장은 change에서 */ });

  function cfgNow() {
    const p = ttsProviderOf(ttsLoad().provider);
    return {
      provider: p.id,
      key: keyEl.value.trim(),
      voice: voiceEl.value.trim(),
      model: modelEl.value.trim(),
      endpoint: endEl.value.trim(),
    };
  }
  async function make(playOnly) {
    const cfg = cfgNow();
    const text = (textEl.value.trim() || String(getText() || '').trim());
    if (!text) { statusEl.textContent = '대본을 먼저 적어 주세요.'; return; }
    ttsSave({ key: cfg.key, voice: cfg.voice, model: cfg.model, endpoint: cfg.endpoint });
    host.querySelectorAll('[data-tts-act]').forEach((b) => { b.disabled = true; });
    statusEl.textContent = '목소리를 만드는 중…';
    try {
      const cached = last && last.text === text && last.provider === cfg.provider && last.voice === cfg.voice && last.model === cfg.model;
      const result = cached ? last.result : await ttsGenerate(cfg, text);
      last = { text, provider: cfg.provider, voice: cfg.voice, model: cfg.model, result };
      const url = URL.createObjectURL(result.blob);
      if (playOnly) {
        const audio = new Audio(url);
        audio.play().catch(() => {});
        statusEl.textContent = `미리듣기 · ${result.providerName} · ${(result.bytes / 1024).toFixed(0)}KB`;
      } else if (onAudio) {
        await onAudio({ ...result, url, text });
        statusEl.textContent = `생성 완료 · ${result.providerName} · ${(result.bytes / 1024).toFixed(0)}KB · 보이스 트랙에 넣었어요`;
      } else {
        statusEl.textContent = `생성 완료 · ${result.providerName}`;
      }
    } catch (e) {
      statusEl.textContent = '⚠ ' + (e && e.message ? e.message : String(e));
    } finally {
      host.querySelectorAll('[data-tts-act]').forEach((b) => { b.disabled = false; });
    }
  }
  q('[data-tts-act="preview"]').onclick = () => make(true);
  q('[data-tts-act="make"]').onclick = () => make(false);
  return { sync, make, el: host };
}

window.__tts = { ttsLoad, ttsSave, ttsClearKey, ttsGenerate, providers: TTS_PROVIDERS, storeKey: TTS_STORE_KEY };
