/* 틀편집 스튜디오 2.0 — 앱 셸 서비스워커
   편집 화면·프리셋·아이콘·BGM을 캐시해 오프라인에서도 열립니다.
   (폰트 CDN은 브라우저 캐시에 맡기고 여기서는 가로채지 않아요) */
const VERSION = 'studio2-v4';
const PREFIX = 'studio2-'; // 이 앱 캐시만 골라 지웁니다(같은 오리진의 reels-studio 캐시는 건드리지 않아요)
const SHELL = [
  './studio2.html',
  './pc.html',
  './fonts.css',
  './engine.js',
  './app.js',
  './pc.js',
  './tts.js',
  './presets.js',
  './autogen.js',
  './presets.json',
  './demo_product_1.jpg',
  './demo_product_2.jpg',
  './demo_product_3.jpg',
  './manifest.webmanifest',
  './studio2_icon_180.png',
  './studio2_icon_192.png',
  './studio2_icon_512.png',
  './bgm_chill.mp3',
  './bgm_upbeat.mp3',
  './bgm_vlog.mp3',
  './bgm_hook.mp3',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(SHELL.map((url) => cache.add(url).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    // 버전이 다른 이전 캐시(studio2-v0 등)만 삭제
    await Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 폰트 CDN 등은 그대로 네트워크로

  if (req.mode === 'navigate') {
    const key = url.pathname.endsWith('pc.html') ? './pc.html' : './studio2.html';
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(key, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(VERSION);
        return (await cache.match(key)) || (await cache.match('./studio2.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return hit || Response.error();
    }
  })());
});
