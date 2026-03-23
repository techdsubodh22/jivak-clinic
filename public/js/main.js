/**
 * main.js — Shared JS for all public pages of Jivak Dental Clinic
 */

// ─── Navbar Toggle (Mobile) ───────────────────────────────────────────────────
(function () {
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen.toString());
    });

    // Close menu when a link is clicked
    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !links.contains(e.target)) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();

// ─── Smooth scroll for anchor links ──────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const targetId = anchor.getAttribute('href').slice(1);
    const target   = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      const navHeight = document.querySelector('.navbar')?.offsetHeight || 70;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ─── Navbar scroll shadow ─────────────────────────────────────────────────────
(function () {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  function updateNavbar() {
    if (window.scrollY > 10) {
      navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.25)';
    } else {
      navbar.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
    }
  }

  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();
})();

// ─── Intersection Observer — fade-in on scroll ───────────────────────────────
(function () {
  const style = document.createElement('style');
  style.textContent = `
    .fade-in-el {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.55s ease, transform 0.55s ease;
    }
    .fade-in-el.visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  const selectors = [
    '.service-card', '.service-detail-card', '.testimonial-card',
    '.info-box', '.stat-card', '.doctor-card', '.about-content',
    '.section-header', '.cta-section .container > *',
  ];

  const elements = document.querySelectorAll(selectors.join(', '));
  elements.forEach((el) => el.classList.add('fade-in-el'));

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    elements.forEach((el) => observer.observe(el));
  } else {
    elements.forEach((el) => el.classList.add('visible'));
  }
})();

// ─── Set minimum date on appointment page ─────────────────────────────────────
(function () {
  const dateInput = document.getElementById('preferred_date');
  if (dateInput) {
    const today = new Date();
    // Allow booking from tomorrow
    today.setDate(today.getDate() + 1);
    dateInput.min = today.toISOString().split('T')[0];
    // Max 90 days in the future
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    dateInput.max = maxDate.toISOString().split('T')[0];
  }
})();
