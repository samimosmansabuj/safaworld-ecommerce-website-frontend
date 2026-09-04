/* =========================
   CONTACT US FORM
========================= */

function initContactForm() {
  const form = document.getElementById('contactForm');
  const btn = document.getElementById('cfSubmitBtn');
  const successEl = document.getElementById('cfSuccess');

  if (!form || !btn || !successEl) return;

  function getField(id) { return document.getElementById(id); }
  function getErr(id) { return document.getElementById(id + 'Err'); }

  function showError(fieldId, show) {
    const field = getField(fieldId);
    const err = getErr(fieldId);
    if (!field || !err) return;
    field.classList.toggle('error', show);
    err.classList.toggle('show', show);
  }

  function validateForm() {
    let valid = true;

    const name = getField('cfName')?.value.trim();
    if (!name) { showError('cfName', true); valid = false; } else { showError('cfName', false); }

    const email = getField('cfEmail')?.value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) { showError('cfEmail', true); valid = false; } else { showError('cfEmail', false); }

    const subject = getField('cfSubject')?.value;
    if (!subject) { showError('cfSubject', true); valid = false; } else { showError('cfSubject', false); }

    const msg = getField('cfMessage')?.value.trim();
    if (!msg || msg.length < 10) { showError('cfMessage', true); valid = false; } else { showError('cfMessage', false); }

    return valid;
  }

  // Clear errors on input
  ['cfName', 'cfEmail', 'cfSubject', 'cfMessage'].forEach(function (id) {
    var el = getField(id);
    if (el) {
      el.addEventListener('input', function () { showError(id, false); });
      el.addEventListener('change', function () { showError(id, false); });
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    btn.classList.add('loading');
    btn.disabled = true;

    setTimeout(function () {
      btn.classList.remove('loading');
      btn.disabled = false;
      form.style.display = 'none';
      successEl.classList.add('show');
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 900);
  });
}

window.initContactForm = initContactForm;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContactForm);
} else {
  initContactForm();
}
