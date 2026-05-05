/* ============================================================
   BELEZA NA CAPITAL — main.js
   ============================================================ */

(function () {
  'use strict';

  /* ── Header scroll effect ──────────────────────────────── */
  const header = document.querySelector('.header');
  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Hamburger menu ────────────────────────────────────── */
  const hamburger   = document.querySelector('.hamburger');
  const mobileMenu  = document.querySelector('.mobile-menu');
  const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];

  function closeMobile() {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    mobileLinks.forEach(link => link.addEventListener('click', closeMobile));
  }

  /* ── Smooth scroll for anchor links ───────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      closeMobile();
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ── Intersection Observer — scroll animations ─────────── */
  const animEls = document.querySelectorAll('.fade-in-up, .fade-in');
  if ('IntersectionObserver' in window && animEls.length) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    animEls.forEach(el => observer.observe(el));
  } else {
    /* Fallback: show all immediately */
    animEls.forEach(el => el.classList.add('visible'));
  }

  /* ── Stagger delay helper ──────────────────────────────── */
  document.querySelectorAll('.stagger').forEach(parent => {
    Array.from(parent.children).forEach((child, i) => {
      child.style.setProperty('--i', i);
    });
  });

})();
