/**
 * appointment.js — Handles the appointment booking form logic
 */

(function () {
  'use strict';

  const form       = document.getElementById('appointmentForm');
  const submitBtn  = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const submitSpinner = document.getElementById('submitSpinner');
  const formError  = document.getElementById('formError');
  const modal      = document.getElementById('successModal');

  if (!form) return;

  // ── Field references ──────────────────────────────────────────────
  const fields = {
    patient_name:   { el: document.getElementById('patient_name'),   errEl: document.getElementById('err_name') },
    phone:          { el: document.getElementById('phone'),           errEl: document.getElementById('err_phone') },
    email:          { el: document.getElementById('email'),           errEl: document.getElementById('err_email') },
    service:        { el: document.getElementById('service'),         errEl: document.getElementById('err_service') },
    preferred_date: { el: document.getElementById('preferred_date'),  errEl: document.getElementById('err_date') },
    preferred_time: { el: document.getElementById('preferred_time'),  errEl: document.getElementById('err_time') },
  };

  // ── Validation helpers ────────────────────────────────────────────
  function showError(key, msg) {
    const { el, errEl } = fields[key];
    el.classList.add('error');
    if (msg) errEl.textContent = msg;
    errEl.style.display = 'block';
  }

  function clearError(key) {
    const { el, errEl } = fields[key];
    el.classList.remove('error');
    errEl.style.display = 'none';
  }

  function validateForm() {
    let valid = true;

    // Name
    const name = fields.patient_name.el.value.trim();
    if (!name || name.length < 2) {
      showError('patient_name', 'Please enter your full name (at least 2 characters).');
      valid = false;
    } else {
      clearError('patient_name');
    }

    // Phone — 10 digits, Indian mobile
    const phone = fields.phone.el.value.trim().replace(/\s/g, '');
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      showError('phone', 'Enter a valid 10-digit Indian mobile number (starts with 6–9).');
      valid = false;
    } else {
      clearError('phone');
    }

    // Email (optional, but validate format if provided)
    const email = fields.email.el.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('email', 'Enter a valid email address.');
      valid = false;
    } else {
      clearError('email');
    }

    // Service
    if (!fields.service.el.value) {
      showError('service', 'Please select the type of service you need.');
      valid = false;
    } else {
      clearError('service');
    }

    // Date
    const date = fields.preferred_date.el.value;
    if (!date) {
      showError('preferred_date', 'Please select your preferred appointment date.');
      valid = false;
    } else {
      const selected = new Date(date);
      const today    = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        showError('preferred_date', 'Please select a future date.');
        valid = false;
      } else {
        // Check not Sunday (day 0)
        if (selected.getDay() === 0) {
          showError('preferred_date', 'We are closed on Sundays. Please choose another day.');
          valid = false;
        } else {
          clearError('preferred_date');
        }
      }
    }

    // Time
    if (!fields.preferred_time.el.value) {
      showError('preferred_time', 'Please select your preferred appointment time.');
      valid = false;
    } else {
      clearError('preferred_time');
    }

    return valid;
  }

  // ── Real-time validation on blur ──────────────────────────────────
  Object.keys(fields).forEach((key) => {
    const el = fields[key].el;
    if (!el) return;
    el.addEventListener('blur', () => {
      // Lightweight real-time checks
      if (key === 'patient_name') {
        const v = el.value.trim();
        if (v.length > 0 && v.length < 2) showError(key);
        else if (v.length >= 2) clearError(key);
      }
      if (key === 'phone') {
        const v = el.value.trim().replace(/\s/g, '');
        if (v.length > 0 && !/^[6-9]\d{9}$/.test(v)) showError(key);
        else if (/^[6-9]\d{9}$/.test(v)) clearError(key);
      }
      if (key === 'email') {
        const v = el.value.trim();
        if (v.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) showError(key);
        else clearError(key);
      }
    });
    el.addEventListener('input', () => {
      if (el.classList.contains('error')) clearError(key);
    });
  });

  // ── Form Submit ───────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.style.display = 'none';

    if (!validateForm()) {
      // Scroll to first error
      const firstError = form.querySelector('.error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstError.focus();
      }
      return;
    }

    // Disable button, show spinner
    submitText.style.display = 'none';
    submitSpinner.style.display = 'inline';
    submitBtn.disabled = true;

    const payload = {
      patient_name:   fields.patient_name.el.value.trim(),
      phone:          fields.phone.el.value.trim(),
      email:          fields.email.el.value.trim() || null,
      service:        fields.service.el.value,
      preferred_date: fields.preferred_date.el.value,
      preferred_time: fields.preferred_time.el.value,
      notes:          document.getElementById('notes').value.trim() || null,
    };

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showSuccessModal(data.appointment);
        form.reset();
      } else {
        formError.textContent = data.error || 'Something went wrong. Please try again.';
        formError.style.display = 'block';
        formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (err) {
      formError.textContent = 'Unable to connect to the server. Please check your connection and try again.';
      formError.style.display = 'block';
    } finally {
      submitText.style.display = 'inline';
      submitSpinner.style.display = 'none';
      submitBtn.disabled = false;
    }
  });

  // ── Success Modal ─────────────────────────────────────────────────
  function showSuccessModal(appt) {
    document.getElementById('appointmentIdDisplay').textContent = '#' + String(appt.id).padStart(4, '0');

    // Format date nicely
    const dateFormatted = new Date(appt.preferred_date + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    document.getElementById('modalSummary').innerHTML =
      `<strong>Patient:</strong> ${appt.patient_name}<br>` +
      `<strong>Service:</strong> ${appt.service}<br>` +
      `<strong>Date:</strong> ${dateFormatted}<br>` +
      `<strong>Time:</strong> ${appt.preferred_time}<br>` +
      `<strong>Status:</strong> ${appt.status}`;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  // ── Expose closeModal globally ────────────────────────────────────
  window.closeModal = function () {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  };

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) window.closeModal();
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      window.closeModal();
    }
  });
})();
