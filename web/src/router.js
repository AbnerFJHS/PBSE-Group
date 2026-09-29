const routes = [];

export function route(pattern, render) {
  const paramNames = [];
  const regex = new RegExp(
    '^' + pattern.replace(/:([A-Za-z]+)/g, (_, name) => { paramNames.push(name); return '([^/]+)'; }) + '$',
  );
  routes.push({ regex, paramNames, render });
}

export function navigate(path) {
  history.pushState(null, '', path);
  render();
}

async function render() {
  const path = location.pathname;
  const match = routes.find((r) => r.regex.test(path));
  const app = document.getElementById('app');
  setActiveNav(path);

  if (!match) {
    app.innerHTML = `<p class="empty-state">Nothing lives at ${escapeHtml(path)}.</p>`;
    return;
  }
  const values = match.regex.exec(path).slice(1);
  const params = Object.fromEntries(match.paramNames.map((name, i) => [name, values[i]]));
  await match.render(app, params);
}

function setActiveNav(path) {
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('href') === path);
  });
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function startRouter() {
  document.body.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="/"]');
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    navigate(a.getAttribute('href'));
  });
  window.addEventListener('popstate', render);
  render();
}
