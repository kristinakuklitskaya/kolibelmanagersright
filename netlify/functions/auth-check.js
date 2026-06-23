// auth-check.js — подключается на каждой защищённой странице.
// Проверяет сессию через серверную функцию, перенаправляет на login.html если не авторизован.

window.KolybelAuth = (function () {
  let currentUser = null;

  async function check() {
    try {
      const res = await fetch('/.netlify/functions/check-session');
      if (!res.ok) { redirectToLogin(); return null; }
      const data = await res.json();
      if (!data.ok) { redirectToLogin(); return null; }
      currentUser = data;
      fixDashboardLink(data);
      return data;
    } catch (e) {
      redirectToLogin();
      return null;
    }
  }

  function fixDashboardLink(user) {
    // Делает ссылку "Личный кабинет" в шапке корректной для роли пользователя,
    // чтобы директор всегда мог вернуться в свой кабинет.
    var link = document.querySelector('.tool-nav a[href="manager-dashboard.html"]');
    if (link && user.role === 'director') {
      link.setAttribute('href', 'director-dashboard.html');
      link.textContent = 'Кабинет директора';
    }
    // Подсветка активного пункта меню для текущей страницы
    var current = window.location.pathname.split('/').pop();
    document.querySelectorAll('.tool-nav a').forEach(function (a) {
      if (a.getAttribute('href') === current) a.classList.add('active');
      else a.classList.remove('active');
    });
  }

  function redirectToLogin() {
    window.location.href = 'login.html';
  }

  async function logout() {
    await fetch('/.netlify/functions/logout', { method: 'POST' });
    window.location.href = 'login.html';
  }

  function getUser() { return currentUser; }

  return { check, logout, getUser };
})();
