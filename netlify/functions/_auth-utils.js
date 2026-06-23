// netlify/functions/_auth-utils.js
// Общие функции авторизации: подпись/проверка сессионного токена.
// Не отдельная функция Netlify — подключается остальными функциями.

const crypto = require('crypto');

const SECRET = process.env.AUTH_SECRET || 'kolybel-default-secret-change-me-in-env-vars';

// 3 аккаунта. Логины/пароли можно переопределить через переменные окружения Netlify.
function getAccounts() {
  return [
    {
      username: process.env.VALERIA_USER || 'valeria',
      password: process.env.VALERIA_PASS || 'Valeria2026!',
      role: 'manager',
      id: 'valeria',
      name: 'Валерия',
    },
    {
      username: process.env.MANAGER2_USER || 'manager2',
      password: process.env.MANAGER2_PASS || 'Manager2026!',
      role: 'manager',
      id: 'manager2',
      name: 'Менеджер 2',
    },
    {
      username: process.env.DIRECTOR_USER || 'director',
      password: process.env.DIRECTOR_PASS || 'Director2026!',
      role: 'director',
      id: 'director',
      name: 'Директор',
    },
  ];
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlDecode(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString('utf8');
}

function sign(payloadObj) {
  const payload = base64url(JSON.stringify(payloadObj));
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return payload + '.' + sig;
}

function verify(token) {
  if (!token || token.indexOf('.') === -1) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  if (sig !== expected) return null;
  let data;
  try {
    data = JSON.parse(base64urlDecode(payload));
  } catch (e) {
    return null;
  }
  if (!data.exp || Date.now() > data.exp) return null;
  return data;
}

function getCookie(event, name) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
  const match = cookieHeader.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function requireAuth(event) {
  const token = getCookie(event, 'kolybel_session');
  const session = verify(token);
  return session; // null если не авторизован
}

module.exports = { getAccounts, sign, verify, getCookie, requireAuth, base64url, base64urlDecode };
