// netlify/functions/deals.js
const { getStore } = require('@netlify/blobs');
const { requireAuth } = require('./_auth-utils');
const crypto = require('crypto');

exports.handler = async (event) => {
  const session = requireAuth(event);
  if (!session) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Не авторизован' }) };

  const store = getStore('kolybel-crm');

  // Директор видит сделки всех менеджеров; менеджер — только свои.
  async function loadAllDeals() {
    const managerIds = ['valeria', 'manager2'];
    let all = [];
    for (const mid of managerIds) {
      const raw = await store.get(`deals:${mid}`, { type: 'json' });
      if (raw) all = all.concat(raw);
    }
    return all;
  }

  if (event.httpMethod === 'GET') {
    let deals;
    if (session.role === 'director') {
      deals = await loadAllDeals();
    } else {
      deals = await store.get(`deals:${session.id}`, { type: 'json' }) || [];
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, deals }) };
  }

  if (event.httpMethod === 'POST') {
    if (session.role !== 'manager') {
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: 'Только менеджер может изменять сделки' }) };
    }
    let body;
    try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Bad request' }; }

    const deals = await store.get(`deals:${session.id}`, { type: 'json' }) || [];

    if (body.action === 'delete') {
      const filtered = deals.filter(d => d.id !== body.id);
      await store.setJSON(`deals:${session.id}`, filtered);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    }

    const now = new Date().toISOString();
    if (body.id) {
      // обновление существующей сделки
      const idx = deals.findIndex(d => d.id === body.id);
      if (idx === -1) return { statusCode: 404, body: JSON.stringify({ ok: false, error: 'Сделка не найдена' }) };
      const wasClosedBefore = deals[idx].stage === 'Закрыта';
      deals[idx] = {
        ...deals[idx],
        client_name: body.client_name,
        service: body.service,
        amount: Number(body.amount) || 0,
        nanny_sent: body.nanny_sent || '',
        stage: body.stage,
        updated_at: now,
        closed_at: (body.stage === 'Закрыта' && !wasClosedBefore) ? now : (body.stage === 'Закрыта' ? deals[idx].closed_at : null),
      };
      await store.setJSON(`deals:${session.id}`, deals);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, deal: deals[idx] }) };
    } else {
      // новая сделка
      const deal = {
        id: crypto.randomUUID(),
        manager_id: session.id,
        manager_name: session.name,
        client_name: body.client_name || '',
        service: body.service || '',
        amount: Number(body.amount) || 0,
        nanny_sent: body.nanny_sent || '',
        stage: body.stage || 'Новая заявка',
        created_at: now,
        updated_at: now,
        closed_at: body.stage === 'Закрыта' ? now : null,
      };
      deals.push(deal);
      await store.setJSON(`deals:${session.id}`, deals);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, deal }) };
    }
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
