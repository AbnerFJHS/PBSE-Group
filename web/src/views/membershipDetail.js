import { getMembership, createCheckIn, NetworkError } from '../api.js';
import { escapeHtml } from '../router.js';

const STATUS_COPY = {
  active: 'Active',
  frozen: 'Frozen',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export async function renderMembershipDetail(app, { id }) {
  let state = { kind: 'loading' };
  let idempotencyKey = crypto.randomUUID(); // one key per attempt; regenerated after success or a genuinely new click

  const paint = () => { app.innerHTML = view(id, state); wire(); };

  async function load() {
    state = { kind: 'loading' };
    paint();
    try {
      const membership = await getMembership(id);
      state = { kind: 'content', membership, fetchedAt: new Date() };
    } catch (err) {
      if (err instanceof NetworkError) {
        state = { kind: 'error', message: 'Could not reach the server.', willRetry: true };
      } else if (err.status === 404) {
        state = { kind: 'error', message: 'not-found' }; // A.3: show "not found", never explain why
      } else {
        state = { kind: 'error', message: err.problem?.detail ?? 'Something went wrong.' };
      }
    }
    paint();
  }

  function wire() {
    document.getElementById('retry-btn')?.addEventListener('click', load);
    document.getElementById('checkin-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('checkin-submit');
      const errEl = document.getElementById('checkin-error');
      btn.disabled = true; // A.6 §3: prevent double-submit while in flight
      errEl.hidden = true;
      try {
        const checkIn = await createCheckIn(id, idempotencyKey);
        state = { ...state, checkedIn: checkIn };
        idempotencyKey = crypto.randomUUID(); // this attempt is done; a future click is a new one
        paint();
      } catch (err) {
        btn.disabled = false;
        const detail = err.problem?.detail ?? 'The check-in could not be completed.';
        errEl.textContent = detail; // domain terms, not "Request failed with status 409" (A.6 §4)
        errEl.hidden = false;
      }
    });
  }

  await load();
}

function view(id, state) {
  if (state.kind === 'loading') {
    return `
      <section class="workflow">
        <h1>Membership</h1>
        <div class="skeleton-row"></div>
        <div class="skeleton-row short"></div>
      </section>`;
  }

  if (state.kind === 'error') {
    if (state.message === 'not-found') {
      // A.3: absent and "not yours" are indistinguishable on purpose — the
      // client shows the same thing either way and explains nothing further.
      return `<section class="workflow"><h1>Membership</h1><p class="empty-state">Not found.</p></section>`;
    }
    return `
      <section class="workflow">
        <h1>Membership</h1>
        <p class="error-state">${escapeHtml(state.message)}</p>
        ${state.willRetry ? '<button id="retry-btn">Try again</button>' : ''}
      </section>`;
  }

  const m = state.membership;
  return `
    <section class="workflow">
      <h1>Membership</h1>
      <dl class="detail">
        <dt>Plan</dt><dd>${escapeHtml(m.planName)}</dd>
        <dt>Status</dt><dd><span class="status status-${m.status}">${STATUS_COPY[m.status] ?? m.status}</span></dd>
        <dt>Renews</dt><dd>${m.renewsOn ? escapeHtml(m.renewsOn) : '—'}</dd>
      </dl>

      ${state.checkedIn ? confirmation(state.checkedIn) : checkInForm(m)}
    </section>`;
}

function checkInForm(m) {
  const disabled = m.status !== 'active';
  return `
    <form id="checkin-form">
      <p class="field-error" id="checkin-error" hidden></p>
      <button id="checkin-submit" type="submit" ${disabled ? 'disabled' : ''}>Check in</button>
      ${disabled ? `<p class="hint">This membership is ${STATUS_COPY[m.status]?.toLowerCase() ?? m.status} and cannot check in.</p>` : ''}
    </form>`;
}

function confirmation(checkIn) {
  return `
    <p class="success-state">Checked in at ${new Date(checkIn.checkedInAt).toLocaleTimeString()}.</p>
    <a href="/check-ins" data-nav>View who's in the gym</a>`;
}
