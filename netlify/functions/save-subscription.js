// netlify/functions/save-subscription.js
const { getStore } = require('@netlify/blobs');
const { requireAuth } = require('./_auth-utils');

exports.handler = async (event) => {
  const session = requireAuth(event);
  if (!session) return { statusCode: 401, body: JSON.stringify({ ok: false }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Bad request' }; }

  const store = getStore('kolybel-push');
  await store.setJSON(`subscription:${session.id}`, body.subscription);

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
};
