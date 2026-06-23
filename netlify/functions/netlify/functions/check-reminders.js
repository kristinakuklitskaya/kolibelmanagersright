// netlify/functions/check-reminders.js
// Запускается автоматически каждые 5 минут (см. netlify.toml).
// Находит звонки, которые начнутся через 25-35 минут, и присылает push-уведомление менеджеру.

const { getStore, connectLambda } = require('@netlify/blobs');
const webpush = require('web-push');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || 'BJNvOCbaFNp73xT9f-TDub6y45HMratxDr788WCnOVLF5Gb3XtPv88ai3cCvY4um1iRW4g16jQBK1RPiQG3ec-k';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'jzt8Ub3mSKWWGBI6GXsdwANSSviqgCH4HJO0s3OsCH0';

webpush.setVapidDetails('mailto:info@kolibelcare.ru', VAPID_PUBLIC, VAPID_PRIVATE);

exports.handler = async (event) => {
  connectLambda(event);
  try {
    const crmStore = getStore('kolybel-crm');
    const pushStore = getStore('kolybel-push');
    const managerIds = ['valeria', 'manager2'];

    const now = Date.now();
    let sent = 0;

    for (const mid of managerIds) {
      const events = await crmStore.get(`calendar:${mid}`, { type: 'json' }) || [];
      let changed = false;

      for (const ev of events) {
        if (ev.notified) continue;
        const evTime = new Date(ev.datetime).getTime();
        const minutesUntil = (evTime - now) / 60000;

        if (minutesUntil <= 30 && minutesUntil >= 20) {
          const subscription = await pushStore.get(`subscription:${mid}`, { type: 'json' });
          if (subscription) {
            const payload = JSON.stringify({
              title: 'Звонок через 30 минут',
              body: `${ev.client_name || 'Клиент'} · ${ev.platform || ''} в ${new Date(ev.datetime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
            });
            try {
              await webpush.sendNotification(subscription, payload);
              sent++;
            } catch (err) {
              console.error('Push error for', mid, err.message);
            }
          }
          ev.notified = true;
          changed = true;
        }
      }

      if (changed) {
        await crmStore.setJSON(`calendar:${mid}`, events);
      }
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, sent }) };
  } catch (err) {
    console.error('check-reminders.js error:', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Server error: ' + err.message }) };
  }
};
