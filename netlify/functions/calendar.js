// netlify/functions/calendar.js
const { getStore, connectLambda } = require('@netlify/blobs');
const { requireAuth } = require('./_auth-utils');
const crypto = require('crypto');

exports.handler = async (event) => {
  connectLambda(event);
  const session = requireAuth(event);
  if (!session) return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Не авторизован' }) };

  try {
    const store = getStore('kolybel-crm');

    async function loadAllEvents() {
      const managerIds = ['valeria', 'manager2'];
      let all = [];
      for (const mid of managerIds) {
        const raw = await store.get(`calendar:${mid}`, { type: 'json' });
        if (raw) all = all.concat(raw);
      }
      return all;
    }

    if (event.httpMethod === 'GET') {
      let events;
      if (session.role === 'director') {
        events = await loadAllEvents();
      } else {
        events = await store.get(`calendar:${session.id}`, { type: 'json' }) || [];
      }
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, events }) };
    }

    if (event.httpMethod === 'POST') {
      if (session.role !== 'manager') {
        return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Только менеджер может изменять календарь' }) };
      }
      let body;
      try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Bad request' }) }; }

      const events = await store.get(`calendar:${session.id}`, { type: 'json' }) || [];

      if (body.action === 'delete') {
        const filtered = events.filter(e => e.id !== body.id);
        await store.setJSON(`calendar:${session.id}`, filtered);
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
      }

      const newEvent = {
        id: crypto.randomUUID(),
        manager_id: session.id,
        manager_name: session.name,
        client_name: body.client_name || '',
        datetime: body.datetime, // ISO string
        platform: body.platform || 'Zoom',
        notes: body.notes || '',
        notified: false,
        created_at: new Date().toISOString(),
      };
      events.push(newEvent);
      await store.setJSON(`calendar:${session.id}`, events);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, event: newEvent }) };
    }

    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  } catch (err) {
    console.error('calendar.js error:', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Server error: ' + err.message }) };
  }
};
