import { navigate } from '../router.js';

export function renderLookup(app) {
  app.innerHTML = `
    <section class="workflow">
      <h1>Check a member in</h1>
      <p class="hint">Enter the membership ID from the member's card or app.</p>
      <form id="lookup-form" novalidate>
        <label for="membershipId">Membership ID</label>
        <input id="membershipId" name="membershipId" autocomplete="off" placeholder="e.g. cccccccc-cccc-cccc-cccc-ccccccccccc1" />
        <p class="field-error" id="membershipId-error" hidden></p>
        <button type="submit">Look up</button>
      </form>
    </section>
  `;

  const form = document.getElementById('lookup-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = form.membershipId.value.trim();
    const errorEl = document.getElementById('membershipId-error');
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(id)) {
      errorEl.textContent = 'Enter the full membership ID.';
      errorEl.hidden = false;
      return;
    }
    navigate(`/memberships/${id}`);
  });
}
