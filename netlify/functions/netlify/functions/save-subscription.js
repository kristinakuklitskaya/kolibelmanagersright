// netlify/functions/save-subscription.js
const { getStore, connectLambda } = require('@netlify/blobs');
const { requireAuth } = require('./_auth-utils');

exports.handler = async (event) => {
  connectLambda(event);
  const session = requireAuth(event);
  if (!session) return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Bad request' }) }; }

  try {
    const store = getStore('kolybel-push');
    await store.setJSON(`subscription:${session.id}`, body.subscription);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('save-subscription.js error:', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Server error: ' + err.message }) };
  }
};
