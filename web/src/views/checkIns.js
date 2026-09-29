import { listCheckIns, checkOut, NetworkError } from '../api.js';
import { escapeHtml } from '../router.js';

export async function renderCheckIns(app) {
  let status = 'active';
  let state = { kind: 'loading' };

  const paint = () => { app.innerHTML = view(status, state); wire(); };

  async function load() {
    state = { kind: 'loading' };
    paint();
    try {
      const { data } = await listCheckIns({ status });
      state = data.length === 0
        ? { kind: 'empty' }
        : { kind: 'content', items: data, fetchedAt: new Date() };
    } catch (err) {
      state = err instanceof NetworkError
        ? { kind: 'error', message: 'Could not reach the server.', willRetry: true }
        : { kind: 'error', message: err.problem?.detail ?? 'Something went wrong.', willRetry: true };
    }
    paint();
  }

  function wire() {
    document.querySelectorAll('[data-status]').forEach((btn) => {
      btn.addEventListener('click', () => { status = btn.dataset.status; load(); });
    });
    document.getElementById('retry-btn')?.addEventListener('click', load);
    document.querySelectorAll('[data-checkout]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Checking out…';
        try {
          await checkOut(btn.dataset.checkout);
          await load(); // re-fetch: simplest correct way to reflect the new state
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Check out';
          alert(err.problem?.detail ?? 'Could not check out.'); // acceptable for a first pass; a toast can replace this later
        }
      });
    });
  }

  await load();
}

function view(status, state) {
  const tabs = `
    <div class="tabs">
      <button data-status="active" class="${status === 'active' ? 'active' : ''}">Active</button>
      <button data-status="completed" class="${status === 'completed' ? 'active' : ''}">Completed</button>
    </div>`;

  if (state.kind === 'loading') {
    return `<section class="workflow"><h1>Who's in the gym</h1>${tabs}
      <div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row short"></div>
    </section>`;
  }

  if (state.kind === 'empty') {
    return `<section class="workflow"><h1>Who's in the gym</h1>${tabs}
      <p class="empty-state">${status === 'active' ? 'No one is checked in right now.' : 'No completed check-ins yet.'}</p>
    </section>`;
  }

  if (state.kind === 'error') {
    return `<section class="workflow"><h1>Who's in the gym</h1>${tabs}
      <p class="error-state">${escapeHtml(state.message)}</p>
      ${state.willRetry ? '<button id="retry-btn">Try again</button>' : ''}
    </section>`;
  }

  const rows = state.items.map((c) => `
    <li class="checkin-row">
      <span class="checkin-time">${new Date(c.checkedInAt).toLocaleTimeString()}</span>
      <span class="checkin-id">${escapeHtml(c.membershipId.slice(0, 8))}…</span>
      ${c.status === 'active'
        ? `<button data-checkout="${c.id}">Check out</button>`
        : `<span class="checkin-done">Out ${c.checkedOutAt ? new Date(c.checkedOutAt).toLocaleTimeString() : ''}</span>`}
    </li>`).join('');

  return `<section class="workflow"><h1>Who's in the gym</h1>${tabs}
    <p class="hint">As of ${state.fetchedAt.toLocaleTimeString()}.</p>
    <ul class="checkin-list">${rows}</ul>
  </section>`;
}
