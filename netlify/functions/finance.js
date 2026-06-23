// netlify/functions/finance.js
const { getStore, connectLambda } = require('@netlify/blobs');
const { requireAuth } = require('./_auth-utils');
const crypto = require('crypto');

exports.handler = async (event) => {
  connectLambda(event);
  const session = requireAuth(event);
  if (!session) return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Не авторизован' }) };
  if (session.role !== 'director') return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Доступно только директору' }) };

  try {
    const store = getStore('kolybel-finance');

    if (event.httpMethod === 'GET') {
      const entries = await store.get('entries', { type: 'json' }) || [];
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, entries }) };
    }

    if (event.httpMethod === 'POST') {
      let body;
      try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Bad request' }) }; }
      const entries = await store.get('entries', { type: 'json' }) || [];

      if (body.action === 'delete') {
        const filtered = entries.filter(e => e.id !== body.id);
        await store.setJSON('entries', filtered);
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
      }

      const entry = {
        id: crypto.randomUUID(),
        type: body.type === 'expense' ? 'expense' : 'income',
        amount: Number(body.amount) || 0,
        description: body.description || '',
        date: body.date || new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
      };
      entries.push(entry);
      await store.setJSON('entries', entries);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, entry }) };
    }

    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  } catch (err) {
    console.error('finance.js error:', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Server error: ' + err.message }) };
  }
};
