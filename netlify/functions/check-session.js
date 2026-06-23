// netlify/functions/check-session.js
const { requireAuth } = require('./_auth-utils');

exports.handler = async (event) => {
  const session = requireAuth(event);
  if (!session) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false }) };
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, id: session.id, role: session.role, name: session.name }),
  };
};
