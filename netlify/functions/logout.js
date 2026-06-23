// netlify/functions/logout.js
exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'kolybel_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
    body: JSON.stringify({ ok: true }),
  };
};
