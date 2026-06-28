(() => {
  'use strict';
  const body = document.body;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Body scroll lock (shared by sheet + viewer) ---------- */
  let lockCount = 0;
  const lock = () => { if (++lockCount === 1) body.setAttribute('data-locked', 'true'); };
  const unlock = () => { if (lockCount > 0 && --lockCount === 0) body.removeAttribute('data-locked'); };

  /* ---------- Sticky header background ---------- */
  const header = document.querySelector('[data-nav]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Scrollspy: active nav link ---------- */
  const navLinks = Array.from(document.querySelectorAll('[data-nav-link]'));
  const sections = navLinks
    .map((link) => document.getElementById((link.getAttribute('href') || '').slice(1)))
    .filter(Boolean);
  const uniqueSections = [...new Set(sections)];

  if (uniqueSections.length) {
    const setActive = (id) => {
      navLinks.forEach((link) => {
        const isActive = (link.getAttribute('href') || '') === `#${id}`;
        link.toggleAttribute('data-active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    uniqueSections.forEach((section) => spy.observe(section));
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if (prefersReduced) {
      revealEls.forEach((el) => el.classList.add('is-in'));
    } else {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-in');
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
      );
      revealEls.forEach((el) => io.observe(el));
    }
  }
  /* signal the head-script failsafe that reveals are being handled */
  window.__revealReady = true;

  /* ---------- Mobile sheet ---------- */
  const sheet = document.getElementById('mobile-nav');
  const openers = document.querySelectorAll('[data-menu-toggle]');
  const closers = document.querySelectorAll('[data-menu-close]');
  let sheetLastFocus = null;

  const setSheet = (open) => {
    if (!sheet) return;
    sheet.dataset.open = open ? 'true' : 'false';
    sheet.toggleAttribute('hidden', !open);
    openers.forEach((b) => b.setAttribute('aria-expanded', open ? 'true' : 'false'));
    if (open) {
      lock();
      sheetLastFocus = document.activeElement;
      requestAnimationFrame(() =>
        sheet.querySelector('.sheet__link, .sheet__close')?.focus()
      );
    } else {
      unlock();
      if (sheetLastFocus instanceof HTMLElement) {
        sheetLastFocus.focus({ preventScroll: true });
        sheetLastFocus = null;
      }
    }
  };

  openers.forEach((b) => b.addEventListener('click', () => setSheet(sheet?.dataset.open !== 'true')));
  closers.forEach((b) => b.addEventListener('click', () => setSheet(false)));
  sheet?.querySelectorAll('[data-nav-link]').forEach((l) =>
    l.addEventListener('click', () => setSheet(false))
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet?.dataset.open === 'true') setSheet(false);
  });

  /* ---------- Project filters ---------- */
  const filters = document.querySelectorAll('[data-filter]');
  const cards = document.querySelectorAll('[data-project-list] [data-tags]');

  const applyFilter = (value) => {
    const filter = value || 'all';
    filters.forEach((btn) =>
      btn.setAttribute('aria-pressed', btn.dataset.filter === filter ? 'true' : 'false')
    );
    cards.forEach((card) => {
      const tags = (card.dataset.tags || '').split(/\s+/);
      card.toggleAttribute('hidden', !(filter === 'all' || tags.includes(filter)));
    });
  };

  filters.forEach((btn) =>
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter))
  );
  if (filters.length) applyFilter('all');

  /* ---------- Full-screen project viewer ---------- */
  const viewer = document.querySelector('[data-viewer]');
  const viewerContent = viewer?.querySelector('[data-viewer-content]');
  const viewerScroll = viewer?.querySelector('[data-viewer-scroll]');
  let viewerLastFocus = null;

  const focusables = (root) =>
    Array.from(root.querySelectorAll('a[href], button:not([disabled])')).filter(
      (el) => el.offsetParent !== null
    );

  const openViewer = (template) => {
    if (!viewer || !viewerContent) return;
    viewerContent.innerHTML = '';
    viewerContent.appendChild(template.content.cloneNode(true));
    viewer.hidden = false;
    requestAnimationFrame(() => { viewer.dataset.open = 'true'; });
    lock();
    viewerLastFocus = document.activeElement;
    if (viewerScroll) viewerScroll.scrollTop = 0;
    requestAnimationFrame(() => viewer.querySelector('.viewer__close')?.focus());
  };

  const closeViewer = () => {
    if (!viewer || viewer.dataset.open !== 'true') return;
    viewer.dataset.open = 'false';
    unlock();
    const done = () => {
      viewer.hidden = true;
      if (viewerContent) viewerContent.innerHTML = '';
    };
    if (prefersReduced) done();
    else setTimeout(done, 400);
    if (viewerLastFocus instanceof HTMLElement) {
      viewerLastFocus.focus({ preventScroll: true });
      viewerLastFocus = null;
    }
  };

  /* Delegated so cloned marquee cards work too */
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest?.('[data-case-open]');
    if (!trigger) return;
    const article = trigger.closest('[data-project]');
    const template = article?.querySelector('template[data-case]');
    if (template) {
      e.preventDefault();
      openViewer(template);
    }
  });

  viewer?.querySelectorAll('[data-viewer-close]').forEach((b) =>
    b.addEventListener('click', closeViewer)
  );

  document.addEventListener('keydown', (e) => {
    if (!viewer || viewer.dataset.open !== 'true') return;
    if (e.key === 'Escape') {
      closeViewer();
      return;
    }
    if (e.key === 'Tab') {
      const items = focusables(viewer);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------- Projects marquee: duplicate cards for a seamless loop ----------
     Only enable the auto-scroll AFTER the clones exist (via .is-marquee), so the
     animation never runs against a half-built track. Without this (or with JS
     disabled / reduced motion) the row stays a plain horizontal scroll. */
  const marqueeTrack = document.querySelector('[data-marquee-track]');
  if (marqueeTrack && !prefersReduced) {
    Array.from(marqueeTrack.children).forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('data-clone', '');
      clone.querySelectorAll('a, button').forEach((el) => el.setAttribute('tabindex', '-1'));
      marqueeTrack.appendChild(clone);
    });
    void marqueeTrack.offsetWidth; // settle layout with the clones present
    marqueeTrack.closest('.work-marquee')?.classList.add('is-marquee');
  }

  /* ---------- Current year ---------- */
  const year = document.querySelector('[data-current-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
