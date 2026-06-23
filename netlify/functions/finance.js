// netlify/functions/finance.js
const { getStore } = require('@netlify/blobs');
const { requireAuth } = require('./_auth-utils');
const crypto = require('crypto');

exports.handler = async (event) => {
  const session = requireAuth(event);
  if (!session) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Не авторизован' }) };
  if (session.role !== 'director') return { statusCode: 403, body: JSON.stringify({ ok: false, error: 'Доступно только директору' }) };

  const store = getStore('kolybel-finance');

  if (event.httpMethod === 'GET') {
    const entries = await store.get('entries', { type: 'json' }) || [];
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, entries }) };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Bad request' }; }
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

  return { statusCode: 405, body: 'Method not allowed' };
};
