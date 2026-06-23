// netlify/functions/login.js
const { getAccounts, sign } = require('./_auth-utils');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Bad request' }; }

  const { username, password } = body;
  const accounts = getAccounts();
  const account = accounts.find(a => a.username === username && a.password === password);

  if (!account) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Неверный логин или пароль' }),
    };
  }

  const exp = Date.now() + 1000 * 60 * 60 * 24 * 14; // 14 дней
  const token = sign({ id: account.id, role: account.role, name: account.name, exp });

  const cookie = `kolybel_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    multiValueHeaders: {
      'Set-Cookie': [cookie],
    },
    body: JSON.stringify({ ok: true, role: account.role, name: account.name, id: account.id }),
  };
};
