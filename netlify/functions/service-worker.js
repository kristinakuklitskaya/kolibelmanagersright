// service-worker.js
const CACHE_NAME = 'kolybel-tool-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push-уведомления о звонках через 30 минут
self.addEventListener('push', (event) => {
  let data = { title: 'Колыбель', body: 'У вас новое уведомление.' };
  try { data = event.data.json(); } catch (e) {}

  const options = {
    body: data.body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('manager-dashboard.html') && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('manager-dashboard.html');
    })
  );
});
