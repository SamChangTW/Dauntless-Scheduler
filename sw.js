/**
 * Dauntless Scheduler v2.7.4 — Service Worker
 * 提供靜態資源預快取，支援 PWA 離線使用（#8）
 */

const CACHE_NAME = 'ds-v2.7.4';

// 需預快取的靜態資源清單
const STATIC_ASSETS = [
    './',
    './index.html',
    './config.js',
    './cors-proxy-helper.js',
    './app.js',
    './style.css',
    './modal.css',
    './theme.css',
    './manifest.json',
    './ui/tsaa_tokens.css',
    './ui/scheduler.css',
    './ui/theme-loader.js',
    './ui/tsaa_theme.json'
];

// install：預快取所有靜態資源
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// activate：刪除舊版快取
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// fetch：Cache-first（靜態資源優先讀快取，找不到再走網路）
self.addEventListener('fetch', e => {
    // 僅快取 GET 請求；POST（API 寫入）直接走網路
    if (e.request.method !== 'GET') return;

    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});