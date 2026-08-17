(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
  }

  /* ---------- Footer year ---------- */
  function initFooterYear() {
    const el = $('#year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------- Preloader ---------- */
  function initPreloader() {
    const pre = $('#preloader');
    const ring = $('#preloaderRing');
    const pctEl = $('#preloaderPct');
    if (!pre) return;

    const R = 54, C = 2 * Math.PI * R; // 339.29
    if (ring) { ring.style.strokeDasharray = C.toFixed(1); ring.style.strokeDashoffset = C.toFixed(1); }

    if (prefersReducedMotion) {
      window.addEventListener('load', () => setTimeout(() => pre.classList.add('is-done'), 300));
      setTimeout(() => pre.classList.add('is-done'), 1200);
      return;
    }

    let pct = 0, target = 0, finished = false;
    function paint() {
      const shown = Math.min(Math.round(pct), 100);
      if (pctEl) pctEl.innerHTML = shown + '<i>%</i>';
      if (ring) ring.style.strokeDashoffset = (C * (1 - Math.min(pct, 100) / 100)).toFixed(1);
    }
    const timer = setInterval(() => {
      target = Math.min(target + Math.random() * 16, finished ? 100 : 90);
      pct += (target - pct) * 0.2;
      paint();
      if (finished && pct >= 99.3) { pct = 100; paint(); done(); clearInterval(timer); }
    }, 90);

    function done() { pre.classList.add('is-done'); }

    window.addEventListener('load', () => {
      finished = true; target = 100;
      setTimeout(() => { if (!pre.classList.contains('is-done')) { pct = 100; paint(); done(); clearInterval(timer); } }, 700);
    });
    setTimeout(() => { finished = true; }, 3500);
  }

  /* ---------- Theme toggle (light/dark, saved + system-aware) ---------- */
  function initThemeToggle() {
    const toggle = $('#themeToggle');
    const root = document.documentElement;

    function setTheme(theme, animate, manual) {
      if (animate && !prefersReducedMotion) {
        root.classList.add('theme-anim');
        window.setTimeout(() => root.classList.remove('theme-anim'), 480);
      }
      root.setAttribute('data-theme', theme);
      try {
        localStorage.setItem('agq-theme', theme);
        if (manual) localStorage.setItem('agq-theme-manual', theme); // user's explicit pick
      } catch (e) {}
      const meta = $('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'light' ? '#f6f7fb' : '#05060c');
      if (toggle) toggle.setAttribute('aria-pressed', String(theme === 'light'));
    }

    function toggleTheme() {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      setTheme(next, true, true); // manual override
      if (window.__agqSound) window.__agqSound.play('theme');
      if (window.__agqUnlock) window.__agqUnlock('theme');
    }

    toggle?.addEventListener('click', toggleTheme);

    // keyboard shortcut: "t"
    document.addEventListener('keydown', (e) => {
      const inField = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (!inField && e.key.toLowerCase() === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        toggleTheme();
      }
    });

    // Auto-switch by time of day, but ONLY if the user hasn't manually chosen.
    function autoThemeByTime() {
      try { if (localStorage.getItem('agq-theme-manual')) return; } catch (e) {}
      const h = new Date().getHours();
      const want = (h >= 6 && h < 18) ? 'light' : 'dark';
      if (root.getAttribute('data-theme') !== want) setTheme(want, true, false);
    }
    autoThemeByTime();
    setInterval(autoThemeByTime, 60 * 1000); // re-check each minute so it flips at 6AM/6PM

    // expose for command palette
    window.__agqToggleTheme = toggleTheme;
    window.__agqSetTheme = setTheme;
  }

  /* ---------- Header scrolled state + scroll progress (single rAF) ---------- */
  function initScrollEffects() {
    const header = $('#siteHeader');
    const progressFill = $('#progressFill');
    let ticking = false;

    function update() {
      const y = window.scrollY;
      if (header) header.classList.toggle('is-scrolled', y > 10);

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? clamp((y / docHeight) * 100, 0, 100) : 0;
      if (progressFill) progressFill.style.width = pct + '%';

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });

    update();
  }

  /* ---------- Mobile nav toggle ---------- */
  function initNavToggle() {
    const navToggle = $('#navToggle');
    const navMenu = $('#navMenu');
    if (!navToggle || !navMenu) return;

    const closeMenu = () => {
      navMenu.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    $$('.nav-link, .nav-cta', navMenu).forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------- Scroll cue ---------- */
  function initScrollCue() {
    const cue = $('#scrollCue');
    if (!cue) return;
    cue.addEventListener('click', () => {
      $('#about')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Active section tracking: top nav + side dot-nav ---------- */
  function initActiveSection() {
    const sections = $$('main section[id], .hero[id]');
    const navLinks = $$('.nav-link');
    const dotItems = $$('.dot-nav__item');
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute('id');

        navLinks.forEach(link => link.classList.toggle('active', link.dataset.section === id));
        dotItems.forEach(dot => dot.classList.toggle('active', dot.dataset.section === id));
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(sec => observer.observe(sec));
  }

  /* ---------- Reveal on scroll ---------- */
  function initRevealOnScroll() {
    const els = $$('[data-reveal]');
    if (!els.length) return;

    if (prefersReducedMotion) {
      els.forEach(el => el.classList.add('in-view'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    els.forEach(el => observer.observe(el));
  }

  /* ---------- Timeline rail fill, tied to how far through the section is scrolled ---------- */
  function initTimelineFill() {
    const timeline = $('.timeline');
    const fill = $('#timelineFill');
    if (!timeline || !fill) return;
    let ticking = false;

    function update() {
      const rect = timeline.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const total = rect.height;
      const visibleStart = viewportH * 0.85;
      const progressed = clamp(visibleStart - rect.top, 0, total);
      const pct = total > 0 ? (progressed / total) * 100 : 0;
      fill.style.height = pct + '%';
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', debounce(update, 150), { passive: true });

    update();
  }

  /* ---------- Typed role text ---------- */
  function initTypedRole() {
    const el = $('#typedRole');
    if (!el) return;

    const roles = [
      'Junior UI/UX Designer',
      'Junior QA Engineer',
      'Junior Business Analyst',
      'Junior Project Coordinator'
    ];

    if (prefersReducedMotion) {
      el.textContent = roles[0];
      return;
    }

    let roleIndex = 0, charIndex = 0, deleting = false;

    function tick() {
      const current = roles[roleIndex];
      if (!deleting) {
        charIndex++;
        el.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) { deleting = true; setTimeout(tick, 1500); return; }
      } else {
        charIndex--;
        el.textContent = current.slice(0, charIndex);
        if (charIndex === 0) { deleting = false; roleIndex = (roleIndex + 1) % roles.length; }
      }
      setTimeout(tick, deleting ? 40 : 80);
    }
    tick();
  }

  /* ---------- Count-up stats ---------- */
  function initCountUp() {
    const els = $$('.count-up');
    if (!els.length) return;

    function animateCount(el) {
      const target = parseInt(el.dataset.target, 10) || 0;
      if (prefersReducedMotion) { el.textContent = target; return; }

      const duration = 1200;
      const start = performance.now();

      function step(now) {
        const t = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(eased * target);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    els.forEach(el => observer.observe(el));
  }

  /* ---------- Magnetic buttons ---------- */
  function initMagneticButtons() {
    if (!supportsFinePointer || prefersReducedMotion) return;

    $$('.magnetic').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        btn.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- Spotlight cursor tracking on any .spot element ---------- */
  function initCardSpotlight() {
    if (!supportsFinePointer) return;

    // delegate so dynamically-added .spot elements work too
    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest && e.target.closest('.spot');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--spot-x', x + '%');
      card.style.setProperty('--spot-y', y + '%');
    }, { passive: true });
  }

  /* ---------- Playful visitor counter (per-browser, localStorage) ---------- */
  function initVisitorCounter() {
    const line = $('#dashVisits');
    const sub = $('#dashVisitsSub');
    if (!line) return;

    const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

    // --- Per-browser visit count (always accurate for this device) ---
    let myVisits = 0;
    try { myVisits = parseInt(localStorage.getItem('agq-visits') || '0', 10) || 0; } catch (e) {}
    let countedThisSession = false;
    try { countedThisSession = sessionStorage.getItem('agq-counted') === '1'; } catch (e) {}
    if (!countedThisSession) {
      myVisits += 1;
      try { localStorage.setItem('agq-visits', String(myVisits)); sessionStorage.setItem('agq-counted', '1'); } catch (e) {}
    }

    function personalMessage() {
      if (myVisits <= 1) return { msg: 'Welcome — glad you\'re here.', sub: '' };
      if (myVisits <= 3) return { msg: `Welcome back — visit ${myVisits}.`, sub: '' };
      if (myVisits <= 9) return { msg: `Your ${ordinal(myVisits)} visit — thank you.`, sub: '' };
      return { msg: `${ordinal(myVisits)} visit — a regular.`, sub: '' };
    }

    // Show the honest per-browser message immediately
    const pm = personalMessage();
    line.textContent = pm.msg;
    if (sub) sub.textContent = pm.sub;

    // --- Real global count (best-effort) via a free hosted counter ---
    // Tries counterapi v2, falls back to v1; if all fail we keep the personal message.
    const NS = 'allyssa-geanne-quinit-portfolio';
    const KEY = 'site-visits';
    const shouldIncrement = !countedThisSession;

    function showGlobal(total) {
      if (typeof total === 'number' && total > 0) {
        line.textContent = `Visitor ${total.toLocaleString()}.`;
        if (sub) sub.textContent = myVisits > 1 ? `Your ${ordinal(myVisits)} visit.` : '';
      }
    }

    // counterapi v2: /v2/{namespace}/{key}/up  (increment) or /v2/{namespace}/{key}  (read)
    const v2Base = `https://api.counterapi.dev/v2/${NS}/${KEY}`;
    const v2Url = shouldIncrement ? `${v2Base}/up` : v2Base;
    fetch(v2Url, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        // v2 returns { data: { up_count / count } }
        const d = data && data.data ? data.data : data;
        const total = d && (d.up_count ?? d.count ?? d.value);
        if (typeof total === 'number' && total > 0) showGlobal(total);
        else return Promise.reject();
      })
      .catch(() => {
        // Fallback to v1 endpoint format
        const v1Url = shouldIncrement
          ? `https://api.counterapi.dev/v1/${NS}/${KEY}/up`
          : `https://api.counterapi.dev/v1/${NS}/${KEY}/`;
        fetch(v1Url, { cache: 'no-store' })
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(data => { const total = data && (data.count ?? data.value); showGlobal(total); })
          .catch(() => { /* offline/blocked → keep accurate per-browser message */ });
      });
  }

  /* ---------- Guided tour ---------- */
  function initTour() {
    const btn = $('#tourBtn');
    if (!btn) return;
    const stops = [
      { sel: '#about', text: 'Start here — who Allyssa is and what she does.' },
      { sel: '#experience', text: 'Her internship and hands-on experience at Twala.' },
      { sel: '#projects', text: 'Real projects across UX, QA, and development.' },
      { sel: '#skills', text: 'Skills grouped by discipline — tip: use the role filter on the hero.' },
      { sel: '#highlights', text: 'Selected highlights and standout work.' },
      { sel: '#honors', text: 'Education, certifications, and honors.' },
      { sel: '#contact', text: 'Like what you see? Reach out here. 👋' }
    ];
    let running = false;
    let voiceOn = true;

    const cap = document.createElement('div');
    cap.className = 'tour-caption'; cap.hidden = true;
    cap.innerHTML = '<span class="tour-step mono"></span><p class="tour-text"></p><div class="tour-controls"><button class="tour-voice" aria-label="Toggle narration">🔊 Voice on</button><button class="tour-skip">Skip tour</button></div>';
    document.body.appendChild(cap);
    const capStep = cap.querySelector('.tour-step');
    const capText = cap.querySelector('.tour-text');
    const voiceBtn = cap.querySelector('.tour-voice');

    function pickFemaleVoice() {
      const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
      return vs.find(v => /female|samantha|victoria|karen|zira|susan|hazel|eva|google uk english female|google us english/i.test(v.name)) || vs.find(v => /^en/i.test(v.lang)) || null;
    }
    // Speak a line; resolve when done (or immediately if voice is off/unavailable)
    function speak(textToSay) {
      return new Promise((resolve) => {
        if (!voiceOn || !('speechSynthesis' in window)) { resolve(); return; }
        try {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(textToSay.replace(/[👋🎉📚🛠️🎯]/g, ''));
          const fv = pickFemaleVoice();
          if (fv) u.voice = fv;
          u.rate = 1; u.pitch = 1.1; u.volume = 1;
          let done = false;
          const finish = () => { if (!done) { done = true; resolve(); } };
          u.onend = finish; u.onerror = finish;
          // safety timeout so the tour never stalls if speech hangs
          setTimeout(finish, Math.max(3500, textToSay.length * 90));
          speechSynthesis.speak(u);
        } catch (e) { resolve(); }
      });
    }

    function highlight(el, on) { if (el) el.classList.toggle('tour-focus', on); }
    function end() {
      running = false; cap.hidden = true;
      if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
      document.querySelectorAll('.tour-focus').forEach(e => e.classList.remove('tour-focus'));
      document.body.classList.remove('tour-active');
      btn.classList.remove('is-active');
    }
    cap.querySelector('.tour-skip').addEventListener('click', end);
    voiceBtn.addEventListener('click', () => {
      voiceOn = !voiceOn;
      voiceBtn.textContent = voiceOn ? '🔊 Voice on' : '🔇 Voice off';
      if (!voiceOn && 'speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
    });

    async function run() {
      if (running) { end(); return; }
      running = true; btn.classList.add('is-active');
      document.body.classList.add('tour-active');
      cap.hidden = false;
      // warm up voices (some browsers load them lazily)
      if ('speechSynthesis' in window) { try { speechSynthesis.getVoices(); } catch (e) {} }
      for (let i = 0; i < stops.length; i++) {
        if (!running) return;
        const el = $(stops[i].sel);
        if (!el) continue;
        document.querySelectorAll('.tour-focus').forEach(e => e.classList.remove('tour-focus'));
        highlight(el, true);
        el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
        capStep.textContent = `Step ${i + 1} / ${stops.length}`;
        capText.textContent = stops[i].text;
        if (window.__agqSound) window.__agqSound.play('nav');
        // Narrate the step; advance when narration finishes (fallback to a timed pause if voice off)
        if (voiceOn && ('speechSynthesis' in window)) {
          await speak(stops[i].text);
          if (!running) return;
          await new Promise(r => setTimeout(r, 500));
        } else {
          await new Promise(r => setTimeout(r, 2600));
        }
      }
      end();
    }
    btn.addEventListener('click', run);
  }

  /* ---------- Elevator pitch (30-second typed + spoken intro) ---------- */
  function initPitch() {
    const btn = $('#pitchBtn'), line = $('#pitchLine');
    if (!btn || !line) return;
    const text = "I'm Allyssa — an IT graduate who designs user-centered interfaces, tests them until they're solid, and writes the documentation that keeps a team aligned. I work across UI/UX design, QA, and business analysis, and I'm looking for a role where I can help ship thoughtful, reliable products. Let's build something great together.";
    const label = btn.querySelector('span');
    const origLabel = label ? label.textContent : '';
    let typing = false, speaking = false;

    function pickFemale() {
      const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
      return vs.find(v => /female|samantha|victoria|karen|zira|susan|hazel|eva|google uk english female|google us english/i.test(v.name)) || vs.find(v => /^en/i.test(v.lang)) || null;
    }
    function stopPitch() {
      speaking = false; typing = false;
      if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
      btn.classList.remove('is-playing');
      if (label) label.textContent = origLabel;
      if (line) { line.textContent = ''; line.hidden = true; }  // clear the displayed text
    }
    // Stop the voice if the user navigates away or closes the tab
    window.addEventListener('beforeunload', () => { if ('speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) {} });

    btn.addEventListener('click', () => {
      // Toggle: clicking while playing stops it
      if (typing || speaking) { stopPitch(); return; }
      typing = true;
      line.hidden = false; line.textContent = '';
      btn.classList.add('is-playing');
      if (label) label.textContent = '■ Stop pitch';
      if (window.__agqSound) window.__agqSound.play('click');

      // Speak (female voice)
      if ('speechSynthesis' in window) {
        try {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          const fv = pickFemale();
          if (fv) u.voice = fv;
          u.rate = 1; u.pitch = 1.12; u.volume = 1;
          speaking = true;
          u.onend = () => { speaking = false; if (!typing) { btn.classList.remove('is-playing'); if (label) label.textContent = origLabel; } };
          speechSynthesis.speak(u);
        } catch (e) {}
      }

      // Type in sync
      if (prefersReducedMotion) {
        line.textContent = text; typing = false;
        if (!speaking) { btn.classList.remove('is-playing'); if (label) label.textContent = origLabel; }
        return;
      }
      let i = 0;
      (function step() {
        if (!typing) return; // stopped
        if (i <= text.length) { line.textContent = text.slice(0, i); i++; setTimeout(step, 34); }
        else { typing = false; if (!speaking) { btn.classList.remove('is-playing'); if (label) label.textContent = origLabel; } }
      })();
    });
  }

  /* ---------- Skills grid/list view toggle ---------- */
  /* ---------- Rotating hero eyebrow ---------- */
  /* ---------- Scroll progress bar ---------- */
  /* ---------- "Currently" card: live PH time ---------- */
  /* ---------- Move hero photo into About on mobile, back to hero on desktop ---------- */
  function initHeroPhotoRelocate() {
    const photo = document.getElementById('heroPhotoCol');
    const mount = document.getElementById('aboutPhotoMount');
    if (!photo || !mount) return;
    const heroParent = photo.parentNode;               // original hero container
    const heroNextSibling = photo.nextSibling;         // original position anchor
    const mq = window.matchMedia('(max-width: 720px)');
    function place(isMobile) {
      if (isMobile) {
        if (photo.parentNode !== mount) mount.appendChild(photo);
      } else {
        if (photo.parentNode !== heroParent) {
          if (heroNextSibling && heroNextSibling.parentNode === heroParent) heroParent.insertBefore(photo, heroNextSibling);
          else heroParent.appendChild(photo);
        }
      }
    }
    place(mq.matches);
    // update on viewport changes (resize / rotate)
    if (mq.addEventListener) mq.addEventListener('change', (e) => place(e.matches));
    else if (mq.addListener) mq.addListener((e) => place(e.matches));
  }

  function initNowCard() {
    const el = $('#nowTime');
    if (!el) return;
    function tick() {
      try {
        const t = new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });
        el.textContent = '· ' + t + ' PH';
      } catch (e) {
        el.textContent = '';
      }
    }
    tick();
    setInterval(tick, 30000);
  }

  function initScrollProgress() {
    const bar = $('#scrollProgress');
    if (!bar) return;
    let ticking = false;
    function update() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  function initEyebrowRotate() {
    const wrap = $('#eyebrowRotate');
    if (!wrap) return;
    const phrases = $$('.eyebrow-phrase', wrap);
    if (phrases.length < 2) return;
    let i = 0;
    setInterval(() => {
      phrases[i].classList.remove('is-active');
      i = (i + 1) % phrases.length;
      phrases[i].classList.add('is-active');
    }, 3200);
  }

  function initSkillsView() {
    const toggle = $('#skillsViewToggle');
    const groups = $('#skillGroups');
    if (!toggle || !groups) return;
    toggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.view-toggle-btn');
      if (!btn) return;
      const view = btn.dataset.view;
      $$('.view-toggle-btn', toggle).forEach(b => b.classList.toggle('is-active', b === btn));
      groups.classList.toggle('is-list', view === 'list');
      if (window.__agqSound) window.__agqSound.play('click');
    });
  }

  /* ---------- Role-match highlighter ---------- */
  function initRoleMatch() {
    const box = $('#roleMatch');
    if (!box) return;
    const groups = $$('.skill-group[data-rolegroup]');
    const skillsSection = $('#skills');

    function clearHighlight() {
      groups.forEach(g => g.classList.remove('role-hi', 'role-dim'));
      $$('.role-chip', box).forEach(c => c.classList.remove('is-active'));
    }
    box.addEventListener('click', (e) => {
      const chip = e.target.closest('.role-chip');
      if (!chip) return;
      const role = chip.dataset.role;
      if (window.__agqSound) window.__agqSound.play('click');
      if (role === 'clear') { clearHighlight(); return; }
      $$('.role-chip', box).forEach(c => c.classList.toggle('is-active', c === chip));
      groups.forEach(g => {
        const match = g.dataset.rolegroup === role;
        g.classList.toggle('role-hi', match);
        g.classList.toggle('role-dim', !match);
      });
      if (skillsSection) skillsSection.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      if (window.__agqToast) {
        const names = { uxui: 'UI/UX', qa: 'QA', ba: 'Business Analyst', fe: 'Frontend' };
        window.__agqToast(`🎯 Highlighting skills for ${names[role] || role}`);
      }
    });
  }

  /* ---------- Feature: copy-link-to-section on heading hover ---------- */
  function initSectionShare() {
    const heads = document.querySelectorAll('section[id] .section-head h2, section[id] .section-title');
    heads.forEach(h => {
      const sec = h.closest('section[id]');
      if (!sec) return;
      const btn = document.createElement('button');
      btn.className = 'sec-share';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Copy link to this section');
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      btn.addEventListener('click', async () => {
        const url = location.origin + location.pathname + '#' + sec.id;
        try { await navigator.clipboard.writeText(url); } catch (e) {}
        btn.classList.add('copied');
        if (window.__agqToast) window.__agqToast('🔗 Section link copied');
        if (window.__agqSound) window.__agqSound.play('click');
        setTimeout(() => btn.classList.remove('copied'), 1400);
      });
      h.appendChild(btn);
    });
  }

  /* ---------- Feature: Focus / reading mode (key "F") ---------- */

  /* ---------- Feature: idle friendly nudge ---------- */
  function initIdleGreeter() {
    let timer = null, shown = false;
    const nudge = document.createElement('div');
    nudge.className = 'idle-nudge'; nudge.hidden = true;
    nudge.innerHTML = '<span class="idle-emoji">👋</span><div><b>Still exploring?</b><span>Try the “Take a tour” button, or ask the assistant anything about Allyssa.</span></div><button class="idle-x" aria-label="Dismiss">&times;</button>';
    document.body.appendChild(nudge);
    nudge.querySelector('.idle-x').addEventListener('click', () => { nudge.hidden = true; });
    function reset() {
      clearTimeout(timer);
      if (shown) return;
      timer = setTimeout(() => {
        if (document.hidden) return;
        nudge.hidden = false; shown = true;
        if (window.__agqSound) window.__agqSound.play('nav');
        setTimeout(() => { nudge.hidden = true; }, 9000);
      }, 45000);
    }
    ['scroll', 'mousemove', 'keydown', 'click', 'touchstart'].forEach(ev =>
      window.addEventListener(ev, reset, { passive: true }));
    reset();
  }


  /* ---------- Accessibility toggles (contrast + text size) ---------- */
  function initA11y() {
    const root = document.documentElement;
    function bind(id, cls, key) {
      const btn = document.getElementById(id);
      if (!btn) return;
      let on = false;
      try { on = localStorage.getItem(key) === '1'; } catch (e) {}
      function reflect() { root.classList.toggle(cls, on); btn.classList.toggle('is-on', on); btn.setAttribute('aria-checked', String(on)); }
      reflect();
      btn.addEventListener('click', () => {
        on = !on;
        try { localStorage.setItem(key, on ? '1' : '0'); } catch (e) {}
        reflect();
        if (window.__agqSound) window.__agqSound.play('toggle');
      });
    }
    bind('contrastToggle', 'a11y-contrast', 'agq-a11y-contrast');
    bind('bigTextToggle', 'a11y-bigtext', 'agq-a11y-bigtext');
  }

  /* ---------- Recruiter Snapshot ---------- */
  function initSnapshot() {
    const fab = $('#snapFab'), overlay = $('#snapOverlay');
    if (!fab || !overlay) return;
    function open() { overlay.hidden = false; document.body.style.overflow = 'hidden'; if (window.__agqSound) window.__agqSound.play('modal'); }
    function close() { overlay.hidden = true; document.body.style.overflow = ''; }
    fab.addEventListener('click', open);
    $('#snapClose')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) close(); });
    $('#snapPrint')?.addEventListener('click', () => { window.print(); });
    const urlEl = $('#snapUrl'), copyBtn = $('#snapCopyLink');
    if (urlEl) urlEl.textContent = location.href;
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        copyBtn.textContent = 'Copied!';
        if (window.__agqSound) window.__agqSound.play('success');
        setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1800);
      } catch (e) {
        if (window.__agqToast) window.__agqToast('Copy failed — select the link manually');
      }
    });
    $('#snapVcard')?.addEventListener('click', () => {
      const vcard = [
        'BEGIN:VCARD', 'VERSION:3.0',
        'FN:Allyssa Geanne Quinit',
        'N:Quinit;Allyssa Geanne;;;',
        'TITLE:UI/UX Designer · QA Engineer · Business Analyst',
        'EMAIL;TYPE=INTERNET:allyssageannequinit@gmail.com',
        'URL:https://www.linkedin.com/in/allyssa-geanne-quinit-a01793378',
        'END:VCARD'
      ].join('\r\n');
      const blob = new Blob([vcard], { type: 'text/vcard' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'Allyssa-Geanne-Quinit.vcf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (window.__agqSound) window.__agqSound.play('success');
      if (window.__agqToast) window.__agqToast('📇 Contact card downloaded');
    });
  }

  /* ---------- CV password gate ---------- */
  function initCvLock() {
    const overlay = $('#cvlockOverlay');
    const form = $('#cvlockForm');
    const input = $('#cvlockInput');
    const errEl = $('#cvlockError');
    if (!overlay || !form) return;

    const CV_URL = 'assets/Allyssa-Geanne-Quinit-CV.pdf';
    const CODE = 'AGQ2026';                     // ← change this to your chosen code
    let unlocked = false;
    try { unlocked = sessionStorage.getItem('agq-cv-ok') === '1'; } catch (e) {}

    function open() {
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      if (errEl) errEl.hidden = true;
      setTimeout(() => input && input.focus(), 60);
    }
    function close() { overlay.hidden = true; document.body.style.overflow = ''; if (input) input.value = ''; }
    function openCv() { window.open(CV_URL, '_blank', 'noopener'); }

    // Intercept every CV trigger
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-cv-lock]');
      if (!trigger) return;
      e.preventDefault();
      if (unlocked) { openCv(); return; }
      open();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if ((input.value || '').trim().toLowerCase() === CODE.toLowerCase()) {
        unlocked = true;
        try { sessionStorage.setItem('agq-cv-ok', '1'); } catch (e) {}
        if (window.__agqSound) window.__agqSound.play('success');
        close(); openCv();
      } else {
        if (errEl) errEl.hidden = false;
        input.value = ''; input.focus();
        form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      }
    });
    $('#cvlockClose')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) close(); });

    // Expose for the command palette CV action
    window.__agqOpenCv = () => { if (unlocked) openCv(); else open(); };
  }

  /* ---------- Profile photo: fallback avatar + tilt-on-hover ---------- */
  function initProfilePhoto() {
    const frame = $('#photoFrame');
    const img = $('#profileImg');
    const sleepImg = $('#profileImgSleep');
    const fallback = $('#photoFallback');
    if (!frame || !img) return;

    const sleepyImg = $('#profileImgSleepy');

    // Normal photo: if it truly fails, show the AGQ fallback
    if (img.complete && img.naturalWidth === 0) { img.style.display = 'none'; if (fallback) fallback.style.display = 'flex'; }
    img.addEventListener('error', () => { img.style.display = 'none'; if (fallback) fallback.style.display = 'flex'; });
    img.addEventListener('load', () => { img.style.display = ''; if (fallback) fallback.style.display = 'none'; });

    // SELF-HEALING sleep/sleepy loader: test each file with an off-DOM Image().
    // If it decodes -> point the real <img> at it. If it can't -> mark missing so the
    // normal photo shows in that window (never a blank frame).
    function healImage(realImgEl, url, missingClass) {
      if (!realImgEl) return;
      const test = new Image();
      test.onload = () => {
        if (test.naturalWidth > 0) { realImgEl.src = url; frame.classList.remove(missingClass); }
        else { frame.classList.add(missingClass); }
        apply();
      };
      test.onerror = () => { frame.classList.add(missingClass); apply(); };
      test.src = url;
    }
    healImage(sleepImg, 'assets/profile-sleeping.jpg', 'sleep-img-missing');
    healImage(sleepyImg, 'assets/profile-sleepy.jpg', 'sleepy-img-missing');

    // Night = 7:00 PM (19) through 5:59 AM  |  Sleepy = 12 PM through 2:59 PM
    function isNightNow() { const h = new Date().getHours(); return h >= 19 || h < 6; }
    function isSleepyNow() { const h = new Date().getHours(); return h >= 12 && h < 15; }

    let hovering = false;
    let manualHint = false;   // when true, apply() won't overwrite the sleep-note text
    function apply() {
      const night = isNightNow();
      const sleepy = !night && isSleepyNow();
      let state = 'day';
      if (!hovering) { if (night) state = 'sleeping'; else if (sleepy) state = 'sleepy'; }
      frame.setAttribute('data-avatar', state);
      frame.classList.toggle('is-night', night);
      frame.classList.toggle('is-sleepy', sleepy);
      frame.classList.toggle('is-awake', state === 'day');
      // Explicit visibility as a hard backup to the CSS (so nothing can leave a blank frame)
      const sleepMissing = frame.classList.contains('sleep-img-missing');
      const sleepyMissing = frame.classList.contains('sleepy-img-missing');
      const showSleep = state === 'sleeping' && !sleepMissing;
      const showSleepy = state === 'sleepy' && !sleepyMissing;
      img.style.opacity = (showSleep || showSleepy) ? '0' : '1';
      if (sleepImg) sleepImg.style.opacity = showSleep ? '1' : '0';
      if (sleepyImg) sleepyImg.style.opacity = showSleepy ? '1' : '0';
      // Friendly sleeping caption — only while actually sleeping (night, not awake).
      // But don't clobber a manual hint (e.g. "Tap again to let me rest") when one is active.
      const note = $('#avatarSleepNote');
      if (note && !manualHint) {
        if (state === 'sleeping') {
          note.innerHTML = '<span class="asn-emoji">😴</span> Shhh… I\'m asleep. <b>Tap to wake me up!</b>';
          note.classList.add('is-show');
        } else {
          note.classList.remove('is-show');
        }
      }
    }
    apply();
    // Re-check every 30s so it flips automatically if the clock crosses the boundary
    setInterval(apply, 30000);

    // (Desktop mouse-tilt removed — the avatar is tap/click only now.)

    // (hover handlers are defined below, after the message pools)

    // Click: wave + sparkle + greeting bubble (both day and night)
    const bubble = $('#avatarBubble');
    const sparkles = $('#avatarSparkles');
    const greetings = ['Hi there! 👋', 'Thanks for visiting!', 'Feel free to explore!', "Let's build something great!", 'Nice to meet you! ✨'];
    // State-aware messages shown on hover
    const hoverMsgs = {
      day:      ['Hi! Thanks for stopping by 👋', 'Great to see you here! ✨', 'Feel free to look around 😊'],
      sleepy:   ['Oh! *yawn* — you caught me mid-break ☕', 'Just recharging… but I\'m up! 🙂', 'A little sleepy, but ready to chat 💛'],
      sleeping: ['Mmm… you woke me up! Hi there 😊', 'Good timing — I\'m awake now! ✨', 'Oh, hello! Thanks for the wake-up 👋']
    };
    let bubbleTimer = null;
    function showBubble(text) {
      if (!bubble) return;
      bubble.textContent = text;
      bubble.classList.add('is-show');
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => bubble.classList.remove('is-show'), 2600);
    }
    function currentState() { return frame.getAttribute('data-avatar') || 'day'; }

    // ----- Wake / sleep interaction -----
    // `hovering` (reused as "awake override") forces the normal photo when true.
    // Desktop: hover wakes, leave sleeps (only meaningful outside daytime).
    // Touch: tap runs a sequence — at night: sleeping -> (tap) sleepy -> (tap) awake,
    //        with a "tap again to let me sleep" hint; tapping once more returns to sleep.
    let nightWakeStep = 0; // 0=asleep, 1=sleepy shown, 2=awake
    let wakeHintTimer = null;

    function setHint(text) {
      const note = $('#avatarSleepNote');
      if (!note) return;
      if (text) { manualHint = true; note.textContent = text; note.classList.add('is-show'); }
      else { manualHint = false; note.classList.remove('is-show'); }
    }

    // Profile is TAP/CLICK only (no hover-to-wake) so it behaves the same on
    // mobile and desktop. Hover no longer changes the avatar state.

    function playWakeFx() {
      if (prefersReducedMotion) return;
      frame.style.transform = '';
      frame.classList.remove('is-waving'); void frame.offsetWidth; frame.classList.add('is-waving');
      setTimeout(() => frame.classList.remove('is-waving'), 900);
      if (sparkles) {
        sparkles.innerHTML = '';
        for (let i = 0; i < 7; i++) {
          const s = document.createElement('i');
          s.style.left = (15 + Math.random() * 70) + '%';
          s.style.top = (10 + Math.random() * 70) + '%';
          s.style.animationDelay = (Math.random() * 0.2).toFixed(2) + 's';
          sparkles.appendChild(s);
        }
        setTimeout(() => { sparkles.innerHTML = ''; }, 1100);
      }
    }

    frame.addEventListener('click', () => {
      const night = isNightNow();
      const sleepy = !night && isSleepyNow();

      if (night) {
        // Night wake sequence: asleep -> sleepy -> awake -> (tap) back to sleep
        if (nightWakeStep === 0) {
          nightWakeStep = 1;
          hovering = false;            // still not fully awake
          frame.setAttribute('data-avatar', 'sleepy'); // show sleepy pic first
          applyVisibilityFor('sleepy');
          showBubble('Mmm… *yawn* who\'s there? 😴');
          setHint('Tap again to fully wake me up ☀️');
          return;
        }
        if (nightWakeStep === 1) {
          nightWakeStep = 2;
          hovering = true;             // fully awake -> normal photo
          apply();
          playWakeFx();
          showBubble('I\'m up! Thanks for the wake-up 👋');
          setHint('Tap again to let me sleep 🌙');
          return;
        }
        // step 2 -> back to sleep
        nightWakeStep = 0;
        hovering = false;
        setHint('');        // clear manual hint so apply() can restore the sleep caption
        apply();
        showBubble('Goodnight… 😴💤');
        return;
      }

      // Daytime / sleepy: tap wakes; if in sleepy window, a second tap lets her rest again
      if (sleepy) {
        if (!hovering) {
          // wake up from the sleepy state
          hovering = true; apply(); playWakeFx();
          showBubble(greetings[Math.floor(Math.random() * greetings.length)]);
          setHint('Tap again to let me rest ☕');
        } else {
          // let her rest again → back to the sleepy photo
          hovering = false; apply();
          showBubble('Mmm… back to my break ☕😴');
          setHint('');
        }
      } else {
        // Pure daytime: just a friendly greeting + sparkle each tap
        hovering = true; apply(); playWakeFx();
        showBubble(greetings[Math.floor(Math.random() * greetings.length)]);
        setHint('');
      }
      if (window.__agqUnlock) window.__agqUnlock('avatar');
    });

    // Helper: force which layer shows (used by the night sequence's sleepy step)
    function applyVisibilityFor(state) {
      const sleepMissing = frame.classList.contains('sleep-img-missing');
      const sleepyMissing = frame.classList.contains('sleepy-img-missing');
      const showSleep = state === 'sleeping' && !sleepMissing;
      const showSleepy = state === 'sleepy' && !sleepyMissing;
      img.style.opacity = (showSleep || showSleepy) ? '0' : '1';
      if (sleepImg) sleepImg.style.opacity = showSleep ? '1' : '0';
      if (sleepyImg) sleepyImg.style.opacity = showSleepy ? '1' : '0';
    }

    // Manual preview for testing regardless of time:
    window.__agqPreviewNight = function (on) { isNightNow = () => !!on; if (on) isSleepyNow = () => false; nightWakeStep = 0; hovering = false; apply(); };
    window.__agqPreviewSleepy = function (on) { isSleepyNow = () => !!on; if (on) isNightNow = () => false; hovering = false; apply(); };
  }

  /* ---------- Sliding nav pill (desktop only) ---------- */
  function initNavPill() {
    const menu = $('#navMenu');
    const pill = $('#navPill');
    const links = $$('.nav-link', menu);
    if (!menu || !pill || !links.length) return;

    let activeLink = null;

    function moveTo(link) {
      if (!link) { pill.style.opacity = '0'; return; }
      const menuRect = menu.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      pill.style.opacity = '1';
      pill.style.width = linkRect.width + 'px';
      pill.style.transform = `translateX(${linkRect.left - menuRect.left}px)`;
    }

    links.forEach(link => {
      link.addEventListener('mouseenter', () => moveTo(link));
    });
    menu.addEventListener('mouseleave', () => moveTo(activeLink));

    const observer = new MutationObserver(() => {
      const current = links.find(l => l.classList.contains('active'));
      if (current) { activeLink = current; moveTo(current); }
      else { pill.style.opacity = '0'; }
    });
    links.forEach(l => observer.observe(l, { attributes: true, attributeFilter: ['class'] }));

    window.addEventListener('resize', debounce(() => moveTo(activeLink), 150), { passive: true });
  }

  /* ---------- Custom cursor ring (desktop, fine pointer only) ---------- */
  function initCursorRing() {
    if (!supportsFinePointer || prefersReducedMotion) return;
    const ring = $('#cursorRing');
    if (!ring) return;

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { x: pointer.x, y: pointer.y };
    let rafId = null;

    window.addEventListener('mousemove', (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }, { passive: true });

    const interactiveSelector = 'a, button, .chip, .spot, input, textarea, .pcard, .tool-pill, .filter-btn';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest && e.target.closest(interactiveSelector)) ring.classList.add('is-active');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest && e.target.closest(interactiveSelector)) ring.classList.remove('is-active');
    });

    function frame() {
      pos.x += (pointer.x - pos.x) * 0.2;
      pos.y += (pointer.y - pos.y) * 0.2;
      ring.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(frame);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(rafId); rafId = null; }
      else if (!rafId) rafId = requestAnimationFrame(frame);
    });

    rafId = requestAnimationFrame(frame);
  }

  /* =========================================================
     PROJECTS DATA + RENDER + FILTER/SEARCH + MODAL
  ========================================================= */
  const PROJECTS = [
    {
      id: 'portfolio',
      title: 'Personal Portfolio',
      category: 'Website',
      role: 'Designer · Front-End',
      year: '2025',
      status: 'Live',
      featured: true,
      tagline: 'This very site — a hand-built, interactive portfolio designed and coded from scratch.',
      desc: 'A responsive personal portfolio featuring 50+ interactive touches: theming, smart avatar, project narrator, and more.',
      accent: ['#7C5CFC', '#33E5C4'],
      tech: ['HTML/CSS', 'JavaScript', 'UI/UX', 'Responsive Design'],
      overview: 'The site you\'re on right now. Designed and built end-to-end to showcase both design sensibility and front-end skill — from the theming system and smart day/night avatar to the guided tour, project narrator, and fully responsive layout across all devices.',
      features: [
        '50+ accent themes with live customization, motion, and background styles.',
        'Smart avatar that reacts to time of day and to visitor interaction.',
        'Fully responsive across mobile, tablet, and desktop with a mobile design popup.',
        'Accessibility controls, guided tour, and a recruiter snapshot card.'
      ],
      process: [
        { title: 'Design', body: 'Defined the visual language, typography, and a flexible theming system.' },
        { title: 'Build', body: 'Coded the layout, components, and interactions in vanilla HTML, CSS, and JavaScript.' },
        { title: 'Polish', body: 'Tuned responsiveness, micro-interactions, and accessibility across devices.' }
      ],
      gallery: ['Hero', 'Projects', 'Theming'],
      links: []
    },
    {
      id: 'moodmenu',
      title: 'MoodMenu',
      category: 'UI/UX Design',
      role: 'UI/UX Designer',
      year: '2024',
      status: 'Academic Project',
      featured: false,
      tagline: 'A mood-driven food discovery concept that recommends meals based on how you feel.',
      desc: 'HCI final project pairing emotional states with food recommendations through a warm, approachable interface.',
      accent: ['#7C5CFC', '#FF6FB5'],
      tech: ['Figma', 'Prototyping', 'User Research'],
      overview: 'MoodMenu reframes meal choice around emotion rather than cuisine. Built as the final project for an HCI course, it maps a user\'s current mood to curated meal suggestions, reducing decision fatigue for people who "don\'t know what they want."',
      features: [
        'Mood-based selection flow that translates feelings into food categories.',
        'Curated recommendation cards with imagery, tags, and quick actions.',
        'Friendly onboarding that sets tone and expectations in seconds.',
        'Consistent design system with reusable components and states.'
      ],
      process: [
        { title: 'Research', body: 'Studied decision fatigue around food and mapped emotional triggers to eating patterns.' },
        { title: 'Wireframe', body: 'Sketched low-fi flows for the mood picker and recommendation screens.' },
        { title: 'Design', body: 'Built a high-fidelity system in Figma with a warm, inviting palette.' },
        { title: 'Prototype', body: 'Linked screens into an interactive prototype for usability walkthroughs.' }
      ],
      gallery: ['Mood picker', 'Recommendations', 'Meal detail'],
      links: [{ label: 'View Design', type: 'figma', url: 'https://www.figma.com/design/GiiNgs7aYh83eRqMRggmj5/HCI-323---Final-Project?node-id=12-11076&t=X6JutBqj4yY9joQJ-1' }]
    },
    {
      id: 'mobile-banking',
      title: 'Mobile Banking',
      category: 'Mobile',
      role: 'UI/UX Designer',
      year: '2024',
      status: 'Concept',
      featured: false,
      tagline: 'A clean, trust-first mobile banking app concept focused on clarity and speed.',
      desc: 'Mobile banking interface concept covering dashboard, transfers, and transaction history with a focus on legibility.',
      accent: ['#4FA0FF', '#33E5C4'],
      tech: ['Figma', 'Mobile UI', 'Design System'],
      overview: 'A mobile banking app concept built around trust and glanceability. The design prioritizes a clear balance overview, fast transfers, and readable transaction history — the moments users hit most often.',
      features: [
        'At-a-glance dashboard with balance, cards, and quick actions.',
        'Streamlined transfer flow with confirmation and status states.',
        'Transaction history with clear grouping and filtering.',
        'Accessible typography and color contrast for financial clarity.'
      ],
      process: [
        { title: 'Define', body: 'Prioritized the core banking jobs-to-be-done for a mobile-first user.' },
        { title: 'Structure', body: 'Set navigation and information hierarchy for frequent tasks.' },
        { title: 'Design', body: 'Created a cohesive component library and screen set in Figma.' }
      ],
      gallery: ['Dashboard', 'Transfer', 'History'],
      links: [{ label: 'View Design', type: 'figma', url: 'https://www.figma.com/design/UFEFIYDbAWUrb8xFoWuIXZ/Mobile-Banking?node-id=0-1&t=zUUb8VUpLgK2VVbD-1' }]
    },
    {
      id: 'classiq',
      title: 'ClassIQ Web Application',
      category: 'Web App',
      role: 'UI/UX Designer · QA',
      year: '2024',
      status: 'Academic Project',
      featured: false,
      tagline: 'A classroom-focused web app with a full visual system built from the ground up.',
      desc: 'Web application with a complete design language, plus a manual QA pass across all features.',
      accent: ['#7C5CFC', '#4FA0FF'],
      tech: ['Figma', 'HTML/CSS', 'Manual Testing'],
      overview: 'ClassIQ is a classroom-oriented web application. I created the graphics and visual elements and helped shape the layout and navigation, then did a manual QA pass to check features against requirements.',
      features: [
        'Cohesive design language across all graphics and visual elements.',
        'Interface layout and navigation designed for intuitive use.',
        'Enhanced micro-animations for feedback and polish.',
        'Full manual QA coverage against defined requirements.'
      ],
      process: [
        { title: 'Design system', body: 'Created graphics, icons, and a consistent visual language.' },
        { title: 'Layout & nav', body: 'Structured screens and navigation for clarity.' },
        { title: 'Motion', body: 'Refined micro-animations and transitions.' },
        { title: 'QA', body: 'Manually tested all features against requirements.' }
      ],
      gallery: ['Home', 'Dashboard', 'Detail'],
      links: [{ label: 'View Design', type: 'figma', url: 'https://www.figma.com/design/tDMvFcjHOfQZItGLO3zoZN/classIQ-WebApp?node-id=0-1&t=VhooiP1Z1P5s6JMv-1' }]
    },
    {
      id: 'signor',
      title: 'Signor Website',
      category: 'Website',
      role: 'UI/UX Designer · QA',
      year: '2025',
      status: 'Live · Capstone',
      featured: true,
      tagline: 'Capstone web app where I handled UI/UX design and manual QA — now live.',
      desc: 'Capstone web application. I worked on the UI/UX design and ran a manual QA pass across its features before release.',
      accent: ['#33E5C4', '#4FA0FF'],
      tech: ['Figma', 'HTML/CSS', 'Manual Testing'],
      overview: 'Signor is our capstone web product, now on a live domain. I contributed to the UI/UX design — producing graphics, icons, and interface assets, and helping define layout and interaction flows — then manually tested the features before release.',
      features: [
        'Graphics, icons, and interface assets for the web app.',
        'Layout and interaction flows for clearer navigation.',
        'Refined animations and visual transitions.',
        'Manual testing across features before release.'
      ],
      process: [
        { title: 'Design', body: 'Produced interface assets and graphics in Figma.' },
        { title: 'Flows', body: 'Helped define navigation and interaction patterns.' },
        { title: 'Polish', body: 'Refined animations and transitions.' },
        { title: 'QA', body: 'Manually tested features ahead of the live release.' }
      ],
      gallery: ['Landing', 'Features', 'Live site'],
      links: [
        { label: 'Visit Website', type: 'web', url: 'https://signor.website/' },
        { label: 'View Design', type: 'figma', url: 'https://www.figma.com/design/9qJUxNPPWHPf5OQzEznIEE/Signor?node-id=0-1&t=NTOaN7zy82YdWWm9-1' }
      ]
    },
    {
      id: 'golden-pups',
      title: 'Golden Pups',
      category: 'Website',
      role: 'UI/UX Designer',
      year: '2024',
      status: 'Academic Project',
      featured: false,
      tagline: 'A high-fidelity, mobile-first website prototype with a friendly, playful tone.',
      desc: 'High-fidelity responsive website prototype designed for mobile viewing, with an interactive click-through flow.',
      accent: ['#FF6FB5', '#7C5CFC'],
      tech: ['Figma', 'Prototyping', 'Responsive Design'],
      overview: 'Golden Pups is a high-fidelity website prototype built for an ITELEC course, designed mobile-first with a warm, playful personality. The prototype is fully clickable with a defined starting point and navigable flow.',
      features: [
        'High-fidelity mobile-first layouts.',
        'Interactive prototype with a defined entry point and flow.',
        'Playful, friendly visual identity.',
        'Responsive-minded component structure.'
      ],
      process: [
        { title: 'Concept', body: 'Set a warm, approachable brand direction.' },
        { title: 'Design', body: 'Built high-fidelity mobile screens in Figma.' },
        { title: 'Prototype', body: 'Wired an interactive click-through flow.' }
      ],
      gallery: ['Home', 'Gallery', 'Contact'],
      links: [{ label: 'View Prototype', type: 'figma', url: 'https://www.figma.com/proto/CLkhJVc1NRE0m1U9eR8hOe/Itelec-4---High-Fi--Website--Mobile-Vie?node-id=66-955&starting-point-node-id=1%3A2&t=xyMhJs4gjMjslsm1-1' }]
    },
    {
      id: 'busybee',
      title: 'BusyBee',
      category: 'UI/UX Design',
      role: 'UI/UX Designer',
      year: '2025',
      status: 'Prototype',
      featured: false,
      tagline: 'A to-do list app that lets users create, edit, and manage their own tasks.',
      desc: 'A high-fidelity mobile app design for creating and editing personal to-do lists, with a clean and friendly interface.',
      accent: ['#FFB800', '#7C5CFC'],
      tech: ['Figma', 'UI/UX', 'Prototyping', 'Mobile Design'],
      overview: 'BusyBee is a to-do list app designed in Figma to help users create and manage their own tasks. The focus was a clean, approachable interface that makes adding, editing, and organizing to-dos quick and effortless.',
      features: [
        'Create and add new to-do items.',
        'Edit and update existing tasks.',
        'Organize and manage a personal task list.',
        'Clean, friendly, mobile-first interface.'
      ],
      process: [
        { title: 'Concept', body: 'Focused the app around simple, everyday task management.' },
        { title: 'Design', body: 'Built high-fidelity mobile screens for creating and editing to-dos in Figma.' },
        { title: 'Refine', body: 'Polished the flow so adding and managing tasks feels effortless.' }
      ],
      gallery: ['Task List', 'Add Task', 'Edit Task'],
      links: [{ label: 'View Design', type: 'figma', url: 'https://www.figma.com/design/LmSYpHNDLDR8LczsAFsDcO/BusyBee?node-id=0-1&t=yvIsWCw0DkD153Mi-1' }]
    }
  ];

  const ICONS = {
    figma: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    web: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  function initProjects() {
    const grid = $('#projectGrid');            // collapsed preview grid (in section)
    const allGrid = $('#allprojGrid');          // full grid (in popup)
    const empty = $('#projectEmpty');
    const filters = $('#projectFilters');
    const search = $('#projectSearch');
    if (!grid) return;

    let activeFilter = 'all';
    let query = '';

    function gradFor(p) { return `linear-gradient(135deg, ${p.accent[0]}, ${p.accent[1]})`; }

    function cardHtml(p) {
      const techChips = p.tech.slice(0, 4).map(t => `<span class="chip">${escapeHtml(t)}</span>`).join('');
      const liveLink = p.links.find(l => l.type === 'web');
      const status = p.status ? `<span class="pcard-status">${escapeHtml(p.status)}</span>` : '';
      const liveBadge = liveLink ? '<span class="pcard-live" aria-hidden="true"><span class="pcard-live-dot"></span>Live</span>' : '';
      return `
        <button class="pcard spot${p.featured ? ' pcard--featured' : ''}" data-id="${p.id}" data-category="${escapeHtml(p.category)}" aria-label="Open ${escapeHtml(p.title)} details">
          ${p.featured ? '<span class="pcard-featured-tag">★ Featured</span>' : ''}
          <div class="pcard-thumb">
            <div class="pcard-mock" aria-hidden="true">
              <div class="pcard-mock-bar"><i></i><i></i><i></i><span class="pcard-mock-url mono">${escapeHtml(p.title.toLowerCase().split(' ')[0])}</span></div>
              <div class="pcard-mock-screen" style="background:${gradFor(p)}">
                <span class="pcard-mock-logo">${escapeHtml(p.title.split(' ')[0])}</span>
                <span class="pcard-mock-lines"><i></i><i></i><i></i></span>
              </div>
            </div>
            ${liveBadge}
            <span class="pcard-cat">${escapeHtml(p.category)}</span>
            <span class="pcard-open" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </div>
          <div class="pcard-body">
            <div class="pcard-title-row">
              <h3>${escapeHtml(p.title)}</h3>
              ${status}
            </div>
            <span class="pcard-role">${escapeHtml(p.role)} · ${escapeHtml(p.year)}</span>
            <p class="pcard-desc">${escapeHtml(p.desc)}</p>
            <div class="pcard-tech">${techChips}</div>
          </div>
        </button>`;
    }

    // Mobile (<=760px) shows 2 collapsed cards; desktop shows 3.
    function collapsedCount() {
      return window.matchMedia('(max-width:760px)').matches ? 2 : 3;
    }
    let COLLAPSED_COUNT = collapsedCount();
    const viewAllBtn = $('#projectsViewAll');

    // ----- Collapsed preview grid (in the section) -----
    function renderPreview() {
      COLLAPSED_COUNT = collapsedCount();
      const shown = PROJECTS.slice(0, COLLAPSED_COUNT);
      grid.innerHTML = shown.map(cardHtml).join('');
      grid.querySelectorAll('.pcard').forEach(card => {
        card.addEventListener('click', () => openModal(card.dataset.id));
      });
    }

    // ----- Full grid inside the popup -----
    function renderAll() {
      if (!allGrid) return;
      allGrid.innerHTML = PROJECTS.map(cardHtml).join('');
      allGrid.querySelectorAll('.pcard').forEach(card => {
        card.addEventListener('click', () => openModal(card.dataset.id));
      });
      applyFilters();
    }

    function applyFilters() {
      if (!allGrid) return;
      let visible = 0;
      allGrid.querySelectorAll('.pcard').forEach(card => {
        const p = PROJECTS.find(x => x.id === card.dataset.id);
        const matchesFilter = activeFilter === 'all' || p.category === activeFilter;
        const haystack = (p.title + ' ' + p.desc + ' ' + p.tech.join(' ') + ' ' + p.role + ' ' + p.category).toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const show = matchesFilter && matchesQuery;
        card.classList.toggle('is-hidden', !show);
        if (show) visible++;
      });
      if (empty) empty.hidden = visible !== 0;
      const countEl = $('#allprojCount');
      if (countEl) countEl.textContent = `${visible} of ${PROJECTS.length} project${PROJECTS.length === 1 ? '' : 's'}`;
    }

    // ----- All-projects popup open/close -----
    const overlayAll = $('#allprojOverlay');
    function openAll() {
      if (!overlayAll) return;
      overlayAll.hidden = false;
      document.body.style.overflow = 'hidden';
      if (window.__agqSound) window.__agqSound.play('modal');
      const c = $('#allprojClose'); if (c) setTimeout(() => c.focus(), 60);
    }
    function closeAll() {
      if (!overlayAll) return;
      overlayAll.hidden = true;
      document.body.style.overflow = '';
      if (viewAllBtn) viewAllBtn.focus();
    }
    viewAllBtn?.addEventListener('click', openAll);
    $('#allprojClose')?.addEventListener('click', closeAll);
    overlayAll?.addEventListener('click', (e) => { if (e.target === overlayAll) closeAll(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlayAll && !overlayAll.hidden) closeAll(); });

    // Re-render preview when crossing the mobile/desktop breakpoint
    const widthMq = window.matchMedia('(max-width:760px)');
    const onWidth = () => renderPreview();
    if (widthMq.addEventListener) widthMq.addEventListener('change', onWidth);
    else if (widthMq.addListener) widthMq.addListener(onWidth);

    filters?.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      activeFilter = btn.dataset.filter;
      $$('.filter-btn', filters).forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
      });
      applyFilters();
    });

    search?.addEventListener('input', () => {
      query = search.value.trim().toLowerCase();
      applyFilters();
    });

    // Grid / list view toggle (inside popup)
    const viewToggle = $('#projViewToggle');
    viewToggle?.addEventListener('click', (e) => {
      const btn = e.target.closest('.view-toggle-btn');
      if (!btn || !allGrid) return;
      const view = btn.dataset.view;
      $$('.view-toggle-btn', viewToggle).forEach(b => b.classList.toggle('is-active', b === btn));
      allGrid.classList.toggle('is-list', view === 'list');
      if (window.__agqSound) window.__agqSound.play('click');
    });

    function render() { renderPreview(); renderAll(); }

    /* ---------- Modal ---------- */
    const overlay = $('#pmodalOverlay');
    const scroll = $('#pmodalScroll');
    let modalProject = null;
    const closeBtn = $('#pmodalClose');
    let lastFocused = null;

    function modalHtml(p) {
      const actions = p.links.map(l => {
        const primary = l.type === 'web';
        return `<a class="pmodal-btn ${primary ? 'pmodal-btn--primary' : 'pmodal-btn--ghost'}" href="${l.url}" target="_blank" rel="noopener noreferrer">
          ${ICONS[l.type] || ICONS.figma}<span>${escapeHtml(l.label)}</span></a>`;
      }).join('');

      const features = p.features.map(f => `<li>${escapeHtml(f)}</li>`).join('');
      const tech = p.tech.map(t => `<span class="chip">${escapeHtml(t)}</span>`).join('');
      const steps = (p.process || []).map((s, i) => `
        <div class="pmodal-step">
          <span class="pmodal-step-num">${i + 1}</span>
          <p><b>${escapeHtml(s.title)}</b>${escapeHtml(s.body)}</p>
        </div>`).join('');

      const processBlock = steps ? `
        <div class="pmodal-block">
          <h3>Design Process</h3>
          <div class="pmodal-steps">${steps}</div>
        </div>` : '';

      return `
        <div class="pmodal-hero" style="border-bottom:1px solid var(--border)">
          <span class="pmodal-cat">${escapeHtml(p.category)}</span>
          <h2 id="pmodalTitle">${escapeHtml(p.title)}</h2>
          <p class="pmodal-tagline">${escapeHtml(p.tagline)}</p>
          <div class="pmodal-meta">
            <div><span>Role</span><b>${escapeHtml(p.role)}</b></div>
            <div><span>Category</span><b>${escapeHtml(p.category)}</b></div>
            <div><span>Year</span><b>${escapeHtml(p.year)}</b></div>
            ${p.status ? `<div><span>Status</span><b>${escapeHtml(p.status)}</b></div>` : ''}
          </div>
          <div class="pmodal-actions">
            <button type="button" class="pmodal-btn pmodal-btn--narrate" id="narrateBtn" data-project="${p.id}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M15.5 8.5a5 5 0 010 7M18 6a9 9 0 010 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            <span>🎙 Listen to Walkthrough</span></button>
            ${actions}
          </div>
        </div>
        <div class="pmodal-content">
          <div class="pmodal-block">
            <h3>Overview</h3>
            <p>${escapeHtml(p.overview)}</p>
          </div>
          <div class="pmodal-block">
            <h3>Features</h3>
            <ul>${features}</ul>
          </div>
          <div class="pmodal-block">
            <h3>Technologies Used</h3>
            <div class="pmodal-tech-row">${tech}</div>
          </div>
          ${processBlock}
        </div>`;
    }

    const openedProjects = new Set();
    function openModal(id) {
      const p = PROJECTS.find(x => x.id === id);
      if (!p || !overlay || !scroll) return;
      modalProject = p;
      openedProjects.add(id);
      if (openedProjects.size >= PROJECTS.length && window.__agqUnlock) window.__agqUnlock('projects');
      lastFocused = document.activeElement;
      scroll.innerHTML = modalHtml(p);
      scroll.scrollTop = 0;
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      if (window.__agqSound) window.__agqSound.play('modal');
      setTimeout(() => closeBtn?.focus(), 50);
    }

    function closeModal() {
      if (!overlay || overlay.hidden) return;
      overlay.hidden = true;
      document.body.style.overflow = '';
      if (window.__agqSound) window.__agqSound.play('close');
      if (window.__agqStopNarration) window.__agqStopNarration();
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    closeBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // expose for command palette
    window.__agqOpenProject = openModal;

    render();
  }

  /* =========================================================
     TOOLS INFINITE MARQUEE
  ========================================================= */
  function initToolsMarquee() {
    const track = $('#toolsTrack');
    if (!track) return;

    // Official logos via simpleicons CDN; if one fails, a colored monogram shows instead
    const tools = [
      { name: 'Figma', slug: 'figma', color: 'F24E1E' },
      { name: 'Canva', slug: 'canva', color: '00C4CC' },
      { name: 'Photoshop', slug: 'adobephotoshop', color: '31A8FF' },
      { name: 'Illustrator', slug: 'adobeillustrator', color: 'FF9A00' },
      { name: 'MySQL', slug: 'mysql', color: '4479A1' },
      { name: 'Webflow', slug: 'webflow', color: '146EF5' },
      { name: 'VS Code', slug: 'visualstudiocode', color: '007ACC' },
      { name: 'ClickUp', slug: 'clickup', color: '7B68EE' },
      { name: 'Microsoft Office', slug: 'microsoft', color: 'D83B01' },
      { name: 'Google Workspace', slug: 'google', color: '4285F4' },
      { name: 'Supabase', slug: 'supabase', color: '3FCF8E' },
      { name: 'Vercel', slug: 'vercel', color: '000000' }
    ];

    function pill(t) {
      const src = `https://cdn.simpleicons.org/${t.slug}`;
      const mono = escapeHtml(t.name.charAt(0));
      const adapt = t.color === '000000' ? ' data-adapt="1"' : '';
      return `<div class="tool-pill" title="${escapeHtml(t.name)}"${adapt}>
        <span class="tool-ico" style="--tc:#${t.color}">
          <img src="${src}" alt="${escapeHtml(t.name)} logo" loading="lazy"
               onerror="this.style.display='none';this.nextElementSibling.style.display='grid';">
          <span class="tool-mono" style="display:none">${mono}</span>
        </span>
        <span>${escapeHtml(t.name)}</span>
      </div>`;
    }

    // duplicate the set so the -50% scroll loops seamlessly
    const set = tools.map(pill).join('');
    track.innerHTML = set + set;
  }

  /* ---------- Command palette (press "/" or Cmd/Ctrl+K) ---------- */
  function initCommandPalette() {
    const trigger = $('#cmdkTrigger');
    const overlay = $('#cmdkOverlay');
    const input = $('#cmdkInput');
    const list = $('#cmdkList');
    if (!overlay || !input || !list) return;

    const I = {
      nav: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" opacity=".0"/><path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      proj: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9h17" stroke="currentColor" stroke-width="1.6"/></svg>',
      theme: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M20 14.5A8 8 0 019.5 4a7 7 0 108.5 10.5c.7-.1 1.4-.3 2-.5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
      doc: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M7 3.5h7l4 4V20a1 1 0 01-1 1H7a1 1 0 01-1-1V4.5a1 1 0 011-1z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13.5 3.5V8h4.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      link: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M10 14a4 4 0 006 .5l3-3a4 4 0 00-5.5-5.5L12 7.5M14 10a4 4 0 00-6-.5l-3 3A4 4 0 009.5 18L11 16.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      mail: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M4 7l8 6 8-6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      phone: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M6 3.5h3l1.5 5-2 1.5a12 12 0 005.5 5.5l1.5-2 5 1.5v3a2 2 0 01-2 2A16 16 0 014 5.5a2 2 0 012-2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      chat: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M4 5h16v11H8l-4 4V5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      paint: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="10" r="1.1" fill="currentColor"/><circle cx="15" cy="10" r="1.1" fill="currentColor"/><circle cx="12" cy="15" r="1.1" fill="currentColor"/></svg>',
      key: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
    };

    const items = [
      { label: 'Intro', hint: 'Top of page', group: 'Navigate', icon: I.arrow, target: '#top' },
      { label: 'About', hint: 'Profile & background', group: 'Navigate', icon: I.arrow, target: '#about' },
      { label: 'Experience', hint: 'Roles at Twala', group: 'Navigate', icon: I.arrow, target: '#experience' },
      { label: 'Projects', hint: 'Design & web work', group: 'Navigate', icon: I.arrow, target: '#projects' },
      { label: 'Skills', hint: 'Tools & toolkit', group: 'Navigate', icon: I.arrow, target: '#skills' },
      { label: 'Highlights', hint: 'Skills & certifications', group: 'Navigate', icon: I.arrow, target: '#highlights' },
      { label: 'Forum', hint: 'Community live chat', group: 'Navigate', icon: I.arrow, target: '#community' },
      { label: 'Contact', hint: 'Email, socials & form', group: 'Navigate', icon: I.arrow, target: '#contact' },

      { label: 'MoodMenu', hint: 'UI/UX · 2024', group: 'Open project', icon: I.proj, run: () => window.__agqOpenProject && window.__agqOpenProject('moodmenu') },
      { label: 'Mobile Banking', hint: 'Mobile · 2024', group: 'Open project', icon: I.proj, run: () => window.__agqOpenProject && window.__agqOpenProject('mobile-banking') },
      { label: 'ClassIQ Web Application', hint: 'Web App · 2024', group: 'Open project', icon: I.proj, run: () => window.__agqOpenProject && window.__agqOpenProject('classiq') },
      { label: 'Signor Website', hint: 'Live · Capstone', group: 'Open project', icon: I.proj, run: () => window.__agqOpenProject && window.__agqOpenProject('signor') },
      { label: 'Golden Pups', hint: 'Website · 2024', group: 'Open project', icon: I.proj, run: () => window.__agqOpenProject && window.__agqOpenProject('golden-pups') },

      { label: 'Toggle light / dark mode', hint: 'T', group: 'Actions', icon: I.theme, run: () => window.__agqToggleTheme && window.__agqToggleTheme() },
      { label: 'Cycle accent gradient', hint: 'Next color theme', group: 'Actions', icon: I.paint, run: () => window.__agqCycleAccent && window.__agqCycleAccent() },
      { label: 'Keyboard shortcuts', hint: '?', group: 'Actions', icon: I.key, run: () => window.__agqShortcuts && window.__agqShortcuts() },
      { label: 'Preview CV (PDF)', hint: 'New tab', group: 'Actions', icon: I.doc, run: () => { if (window.__agqOpenCv) window.__agqOpenCv(); else window.open('assets/Allyssa-Geanne-Quinit-CV.pdf', '_blank', 'noopener'); } },
      { label: 'Open LinkedIn', hint: 'Professional profile', group: 'Actions', icon: I.link, run: () => { window.open('https://www.linkedin.com/in/allyssa-geanne-quinit-a01793378', '_blank', 'noopener'); } },
      { label: 'Copy email address', hint: 'allyssageannequinit@gmail.com', group: 'Actions', icon: I.mail, run: () => $('#copyEmailBtn')?.click() },
      { label: 'Call phone number', hint: '+63 966-136-6539', group: 'Actions', icon: I.phone, run: () => { window.location.href = 'tel:+639661366539'; } },
      { label: 'Ask the assistant', hint: 'Open the quick chat', group: 'Actions', icon: I.chat, run: () => $('#chatToggle')?.click() },
    ];

    let filtered = items.slice();
    let activeIndex = 0;

    function render() {
      list.innerHTML = '';
      if (!filtered.length) {
        const li = document.createElement('li');
        li.className = 'cmdk-empty';
        li.textContent = 'No matches — try another word.';
        list.appendChild(li);
        return;
      }
      let lastGroup = null;
      filtered.forEach((item, i) => {
        if (item.group !== lastGroup) {
          lastGroup = item.group;
          const head = document.createElement('li');
          head.className = 'cmdk-group';
          head.setAttribute('aria-hidden', 'true');
          head.textContent = item.group;
          list.appendChild(head);
        }
        const li = document.createElement('li');
        li.className = 'cmdk-item' + (i === activeIndex ? ' is-active' : '');
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === activeIndex));

        const icon = document.createElement('span');
        icon.className = 'cmdk-item-icon';
        icon.innerHTML = item.icon || I.arrow;

        const labelSpan = document.createElement('span');
        labelSpan.className = 'cmdk-item-label';
        labelSpan.textContent = item.label;

        const hintSpan = document.createElement('span');
        hintSpan.className = 'cmdk-item-hint mono';
        hintSpan.textContent = item.hint;

        li.appendChild(icon);
        li.appendChild(labelSpan);
        li.appendChild(hintSpan);
        li.addEventListener('mouseenter', () => { activeIndex = i; paintActive(); });
        li.addEventListener('click', () => activate(item));
        list.appendChild(li);
      });
      paintActive();
    }

    function paintActive() {
      const nodes = Array.from(list.querySelectorAll('.cmdk-item'));
      nodes.forEach((n, i) => {
        const on = i === activeIndex;
        n.classList.toggle('is-active', on);
        n.setAttribute('aria-selected', String(on));
        if (on) n.scrollIntoView({ block: 'nearest' });
      });
    }

    function activate(item) {
      close();
      if (item.run) { item.run(); return; }
      if (item.target) {
        const el = $(item.target);
        if (el) el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }

    function open() {
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      input.value = '';
      filtered = items.slice();
      activeIndex = 0;
      render();
      setTimeout(() => input.focus(), 10);
    }

    function close() {
      overlay.hidden = true;
      document.body.style.overflow = '';
      trigger?.focus();
    }

    trigger?.addEventListener('click', open);
    const triggerMobile = $('#cmdkTriggerMobile');
    triggerMobile?.addEventListener('click', open);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      filtered = items.filter(item =>
        item.label.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q)
      );
      activeIndex = 0;
      render();
    });

    document.addEventListener('keydown', (e) => {
      const isOpen = !overlay.hidden;
      const inField = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);

      if (!isOpen && e.key === '/' && !inField) {
        e.preventDefault();
        open();
        return;
      }
      if (!isOpen && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
        return;
      }
      if (!isOpen) return;

      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, filtered.length - 1); paintActive(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); paintActive(); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIndex]) activate(filtered[activeIndex]); return; }
    });
  }

  /* ---------- Status ticker: rotating "right now" line ---------- */
  function initStatusTicker() {
    const el = $('#statusTicker');
    if (!el) return;

    const statuses = [
      'Junior UI/UX Designer roles',
      'Junior QA Engineer roles',
      'Junior Business Analyst roles',
      'Junior Product roles',
    ];

    let i = 0;
    el.textContent = statuses[0];

    if (prefersReducedMotion) return;

    setInterval(() => {
      i = (i + 1) % statuses.length;
      el.style.opacity = '0';
      setTimeout(() => {
        el.textContent = statuses[i];
        el.style.opacity = '1';
      }, 250);
    }, 3200);
  }

  /* ---------- Skills & certifications carousel ---------- */
  function initSkillsCarousel() {
    const viewport = $('#carouselViewport');
    const track = $('#carouselTrack');
    const dotsContainer = $('#carouselDots');
    const prevBtn = $('#carouselPrev');
    const nextBtn = $('#carouselNext');
    const carousel = $('.carousel');
    const filters = $('#highlightFilters');
    const viewToggle = $('#highlightViewToggle');
    if (!viewport || !track || !dotsContainer) return;

    const allSlides = $$('.slide', track);
    if (!allSlides.length) return;

    let index = 0;
    let autoplayId = null;
    let slideWidth = 0;
    let gap = 20;
    let visibleCount = 1;
    let currentOffset = 0;
    let activeFilter = 'all';
    let listMode = false;

    function slides() { return allSlides.filter(s => !s.classList.contains('is-filtered')); }

    function applyFilter(f) {
      activeFilter = f;
      allSlides.forEach(s => {
        const hide = f !== 'all' && s.dataset.htype !== f;
        s.classList.toggle('is-filtered', hide);
      });
      index = 0;
      computeMetrics(); renderDots(); goTo(0);
      restartAutoplay();
    }

    function computeMetrics() {
      const vis = slides();
      if (!vis.length) return;
      const rect = vis[0].getBoundingClientRect();
      slideWidth = rect.width;
      const styles = getComputedStyle(track);
      gap = parseFloat(styles.gap || styles.columnGap) || 20;
      visibleCount = Math.max(1, Math.floor((viewport.clientWidth + gap) / (slideWidth + gap)));
    }

    function maxIndex() {
      return Math.max(0, slides().length - visibleCount);
    }

    function renderDots() {
      dotsContainer.innerHTML = '';
      if (listMode) return;
      const dotCount = maxIndex() + 1;
      for (let i = 0; i < dotCount; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot' + (i === index ? ' is-active' : '');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dot.addEventListener('click', () => { goTo(i); restartAutoplay(); });
        dotsContainer.appendChild(dot);
      }
    }

    function goTo(i) {
      if (listMode) return;
      index = clamp(i, 0, maxIndex());
      // Base offset to bring slide[index] to the left edge
      let offset = index * (slideWidth + gap);
      // If only one slide is visible (mobile), center it within the viewport
      if (visibleCount <= 1) {
        const centerPad = (viewport.clientWidth - slideWidth) / 2;
        offset -= Math.max(0, centerPad);
      }
      currentOffset = offset;
      track.style.transform = `translateX(${-currentOffset}px)`;
      $$('.carousel-dot', dotsContainer).forEach((d, di) => d.classList.toggle('is-active', di === index));
    }

    function next() { goTo(index + 1 > maxIndex() ? 0 : index + 1); }
    function prev() { goTo(index - 1 < 0 ? maxIndex() : index - 1); }

    function startAutoplay() {
      if (listMode) return;
      stopAutoplay();
      if (slides().length <= visibleCount) return; // nothing to scroll
      autoplayId = setInterval(next, 4200);
    }
    function stopAutoplay() { if (autoplayId) clearInterval(autoplayId); autoplayId = null; }
    function restartAutoplay() { stopAutoplay(); startAutoplay(); }

    // Filter buttons
    filters?.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      $$('.filter-btn', filters).forEach(b => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', String(on)); });
      applyFilter(btn.dataset.hfilter);
      if (window.__agqSound) window.__agqSound.play('click');
    });

    // Carousel / list view toggle
    function setView(view) {
      listMode = (view === 'list');
      if (carousel) carousel.classList.toggle('is-list', listMode);
      track.style.transform = listMode ? 'none' : `translateX(-${currentOffset}px)`;
      if (listMode) stopAutoplay(); else { computeMetrics(); goTo(0); startAutoplay(); }
      renderDots();
    }
    viewToggle?.addEventListener('click', (e) => {
      const btn = e.target.closest('.view-toggle-btn');
      if (!btn) return;
      $$('.view-toggle-btn', viewToggle).forEach(b => b.classList.toggle('is-active', b === btn));
      setView(btn.dataset.hview);
      if (window.__agqSound) window.__agqSound.play('click');
    });

    prevBtn?.addEventListener('click', () => { prev(); restartAutoplay(); });
    nextBtn?.addEventListener('click', () => { next(); restartAutoplay(); });

    // Pause on hover for fine-pointer (desktop) devices only; touch keeps auto-playing
    if (supportsFinePointer) {
      viewport.addEventListener('mouseenter', stopAutoplay);
      viewport.addEventListener('mouseleave', startAutoplay);
    }
    // Pause while the tab is hidden, resume when visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoplay(); else startAutoplay();
    });

    // drag / swipe support
    let isDragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;

    track.addEventListener('pointerdown', (e) => {
      if (listMode) return;
      isDragging = true;
      track.classList.add('is-dragging');
      dragStartX = e.clientX;
      dragStartOffset = currentOffset;
      stopAutoplay();
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', (e) => {
      if (!isDragging || listMode) return;
      const dx = e.clientX - dragStartX;
      const maxOffset = maxIndex() * (slideWidth + gap);
      const newOffset = clamp(dragStartOffset - dx, 0, maxOffset);
      track.style.transform = `translateX(-${newOffset}px)`;
    });

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      track.classList.remove('is-dragging');
      const dx = e.clientX - dragStartX;
      if (dx < -50) next();
      else if (dx > 50) prev();
      else goTo(index);
      restartAutoplay();
    }

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    window.addEventListener('resize', debounce(() => {
      if (listMode) return;
      computeMetrics();
      renderDots();
      goTo(Math.min(index, maxIndex()));
    }, 200), { passive: true });

    computeMetrics();
    renderDots();
    goTo(0);
    startAutoplay();
  }

  /* ---------- Chat widget: canned Q&A assistant, not a live AI ---------- */
  function initChatWidget() {
    const toggle = $('#chatToggle');
    const panel = $('#chatPanel');
    const closeBtn = $('#chatClose');
    const body = $('#chatBody');
    const quickReplies = $('#chatQuickReplies');
    const form = $('#chatForm');
    const input = $('#chatInput');
    if (!toggle || !panel || !body || !form || !input) return;

    // Voice state (declared early so respond()/speakAnswer() can use them)
    const voiceToggle = $('#chatVoiceToggle');
    const volSlider = $('#chatVol');
    let voiceOn = true;                 // auto-on by default
    let voiceVol = 0.9;                 // 0..1
    let currentUtterance = null;
    try {
      const sv = localStorage.getItem('agq-chat-voice');
      if (sv === '0') voiceOn = false;
      const svv = localStorage.getItem('agq-chat-vol');
      if (svv != null) voiceVol = Math.max(0, Math.min(1, parseFloat(svv)));
    } catch (e) {}

    const knowledge = [
      { keywords: ['skill', 'skills', 'toolkit', 'tech stack', 'technologies', 'kakayahan', 'kasanayan', 'alam niya'],
        answer: "Allyssa's toolkit spans four areas: Design & UI/UX (Figma, Photoshop, Illustrator, Canva, wireframing, prototyping, layout, graphic design, video editing); Front-End (basic HTML, CSS, Webflow); Quality Assurance (manual testing, bug reporting); and Project Management & Analysis (backlog creation, product documentation, competitive analysis). She also uses Word, Excel, Google Sheets, PowerPoint, and ClickUp.",
        fil: "Ang toolkit ni Allyssa ay nasa apat na bahagi: Design & UI/UX (Figma, Photoshop, Illustrator, Canva, wireframing, prototyping, layout, graphic design, video editing); Front-End (basic na HTML, CSS, Webflow); Quality Assurance (manual testing, bug reporting); at Project Management & Analysis (backlog creation, product documentation, competitive analysis). Gumagamit din siya ng Word, Excel, Google Sheets, PowerPoint, at ClickUp." },
      { keywords: ['experience', 'work', 'job', 'career', 'twala', 'internship', 'ohelio', 'karanasan', 'trabaho', 'nagtrabaho'],
        answer: "All four of her roles were at Twala (Ohelio, Inc.) in Manila, run in parallel — not one after another. As Business Analyst (Mar–Jul 2026) she built competitive matrices for TwalaSign, developed feature backlogs for TwalaSign and Doxu.AI, and drafted product docs. As QA Engineer she ran manual tests on Doxu.AI's mobile responsiveness and filed bug tickets. In Project Management she monitored Doxu.AI (Twala v2) responsiveness tasks. Earlier, as UI/UX Designer (Feb–May 2025) she redesigned landing pages in Webflow and restructured Twala's help center in Intercom.",
        fil: "Lahat ng apat na tungkulin niya ay sa Twala (Ohelio, Inc.) sa Manila, sabay-sabay — hindi sunud-sunod. Bilang Business Analyst (Mar–Jul 2026) gumawa siya ng competitive matrices para sa TwalaSign, feature backlogs para sa TwalaSign at Doxu.AI, at product docs. Bilang QA Engineer, nag-manual test siya sa mobile responsiveness ng Doxu.AI at nag-file ng bug tickets. Sa Project Management, minonitor niya ang responsiveness tasks ng Doxu.AI (Twala v2). Dati, bilang UI/UX Designer (Feb–May 2025), nag-redesign siya ng landing pages sa Webflow at nag-ayos ng help center sa Intercom." },
      { keywords: ['project', 'projects', 'signor', 'classiq', 'moodmenu', 'mood menu', 'banking', 'golden', 'pups', 'portfolio', 'built', 'proyekto', 'ginawa'],
        answer: "Her projects include: MoodMenu (a mood-driven food discovery UI/UX concept), Mobile Banking (a clean banking app concept), ClassIQ Web Application (a classroom app with a full visual system + manual QA), Signor Website (her capstone — UI/UX + QA, now live), Golden Pups, and this Personal Portfolio itself. Open the Projects section and tap 'View all projects' for the full breakdown of each.",
        fil: "Kasama sa mga proyekto niya: MoodMenu (mood-driven food discovery UI/UX concept), Mobile Banking (malinis na banking app concept), ClassIQ Web Application (classroom app na may kompletong visual system + manual QA), Signor Website (ang capstone niya — UI/UX + QA, live na), Golden Pups, at itong Personal Portfolio mismo. Buksan ang Projects section at pindutin ang 'View all projects' para sa buong detalye." },
      { keywords: ['education', 'school', 'university', 'study', 'studied', 'degree', 'psu', 'course', 'pampanga state', 'pag-aaral', 'eskwela', 'kurso'],
        answer: "She's completing a BS in Information Technology at Pampanga State University (2022–2026) as a Cum Laude. She finished Senior High (ABM) at Pampanga State University with High Honors (2020–2022), and Junior High at Wenceslao Village High School, also with High Honors (2016–2020).",
        fil: "Tinatapos niya ang BS in Information Technology sa Pampanga State University (2022–2026) bilang Cum Laude. Natapos niya ang Senior High (ABM) sa Pampanga State University nang may High Honors (2020–2022), at Junior High sa Wenceslao Village High School, may High Honors din (2016–2020)." },
      { keywords: ['certification', 'certifications', 'certificate', 'certificates', 'sertipiko', 'kurso online'],
        answer: "Her certifications include: Project Management: Beginner to PM (Udemy, 2026), Business Analysis Fundamentals — IIBA Endorsed (Udemy, 2026), AI Learning Modules (AIClassASEAN.org, 2026), Project Management & Business Analysis Basics (SimpliLearn, 2026), UI/UX Design (Udemy, 2025), and Cloud Computing Fundamentals (IBM SkillsBuild, 2025).",
        fil: "Kasama sa mga sertipiko niya: Project Management: Beginner to PM (Udemy, 2026), Business Analysis Fundamentals — IIBA Endorsed (Udemy, 2026), AI Learning Modules (AIClassASEAN.org, 2026), Project Management at Business Analysis Basics (SimpliLearn, 2026), UI/UX Design (Udemy, 2025), at Cloud Computing Fundamentals (IBM SkillsBuild, 2025)." },
      { keywords: ['award', 'awards', 'honor', 'honors', 'lister', 'dean', 'president', 'recognition', 'parangal', 'karangalan'],
        answer: "She's graduating Cum Laude, and has earned several honors at CCS: Top 19 Awardee (3rd Year, 2nd Sem, 2025), President's Lister (3rd Year 1st Sem 2025, and 2nd Year 2024), and Dean's Lister (1st Year, 2023) — plus High Honors in both senior and junior high.",
        fil: "Magtatapos siya nang Cum Laude, at may ilang karangalan siya sa CCS: Top 19 Awardee (3rd Year, 2nd Sem, 2025), President's Lister (3rd Year 1st Sem 2025, at 2nd Year 2024), at Dean's Lister (1st Year, 2023) — pati High Honors noong senior at junior high." },
      { keywords: ['tool', 'tools', 'software', 'app', 'apps', 'ginagamit', 'gamit'],
        answer: "Day-to-day she works with Figma, Adobe Photoshop and Illustrator, Canva, Webflow, Intercom, ClickUp, and the Microsoft/Google productivity suites — covering design, development, testing, and delivery.",
        fil: "Araw-araw, gumagamit siya ng Figma, Adobe Photoshop at Illustrator, Canva, Webflow, Intercom, ClickUp, at ng Microsoft/Google productivity suites — para sa design, development, testing, at delivery." },
      { keywords: ['contact', 'email', 'phone', 'reach', 'call', 'number', 'kontak', 'tawag', 'makipag-ugnayan', 'numero'],
        answer: "You can reach Allyssa at allyssageannequinit@gmail.com or +63 966-136-6539. There's a one-click copy button in the Contact section, plus links to her LinkedIn and Facebook.",
        fil: "Maaari mong kontakin si Allyssa sa allyssageannequinit@gmail.com o +63 966-136-6539. May one-click copy button sa Contact section, pati links sa LinkedIn at Facebook niya." },
      { keywords: ['available', 'availability', 'open to work', 'hiring', 'looking for', 'hire', 'bakante', 'available ba', 'kukuha'],
        answer: "Yes — she's open to junior roles in UI/UX design, QA, or business analysis, and she's happy to talk through a project, an internship, or just compare notes on good design.",
        fil: "Oo — bukas siya sa junior roles sa UI/UX design, QA, o business analysis, at masaya siyang pag-usapan ang isang proyekto, internship, o kahit magpalitan lang ng ideya tungkol sa magandang design." },
      { keywords: ['language', 'languages', 'speak', 'english', 'filipino', 'tagalog', 'wika', 'salita'],
        answer: "She's fluent in English and a native Filipino speaker.",
        fil: "Bihasa siya sa English at katutubong nagsasalita ng Filipino." },
      { keywords: ['cv', 'resume', 'résumé', 'download'],
        answer: "You can preview her CV via the 'Preview CV' button in the hero and contact areas — it may ask for an access code. Recruiters can request the code at allyssageannequinit@gmail.com.",
        fil: "Maaari mong tingnan ang CV niya sa pamamagitan ng 'Preview CV' button sa hero at contact sections — maaaring humingi ito ng access code. Ang mga recruiter ay maaaring humingi ng code sa allyssageannequinit@gmail.com." },
      { keywords: ['location', 'where', 'based', 'pampanga', 'manila', 'philippines', 'saan', 'lugar', 'tirahan'],
        answer: "She's based in San Roque Dau, Lubao, Pampanga, Philippines, and comfortable working with Manila-based teams remotely or on-site.",
        fil: "Nakabase siya sa San Roque Dau, Lubao, Pampanga, Philippines, at kaya niyang makipagtrabaho sa mga Manila-based na team nang remote o on-site." },
      { keywords: ['theme', 'dark', 'light', 'mode', 'font', 'tema', 'madilim', 'maliwanag'],
        answer: "This site has light and dark modes plus font and accent options — use the controls in the top nav and the design panel. You can also press the T key to toggle the theme.",
        fil: "May light at dark mode ang site pati font at accent options — gamitin ang mga kontrol sa itaas at sa design panel. Maaari mo ring pindutin ang T key para palitan ang tema." },
      { keywords: ['who', 'about', 'herself', 'sino', 'tungkol'],
        answer: "Allyssa Geanne Quinit is an Information Technology graduate with experience in UI/UX design, manual QA, business analysis, and product documentation — built through academic projects and an internship at Twala (Ohelio, Inc.). She's now seeking a junior role where she can apply her skills and keep growing.",
        fil: "Si Allyssa Geanne Quinit ay isang Information Technology graduate na may karanasan sa UI/UX design, manual QA, business analysis, at product documentation — mula sa academic projects at internship sa Twala (Ohelio, Inc.). Naghahanap siya ngayon ng junior role kung saan magagamit niya ang kanyang kasanayan at patuloy na matututo." },
      { keywords: ['hello', 'hi', 'hey', 'sup', 'kumusta', 'kamusta', 'musta'],
        answer: "Hi! Ask me anything about Allyssa's skills, experience, projects, education, certifications, or how to get in touch.",
        fil: "Kumusta! Magtanong ka tungkol sa skills, karanasan, proyekto, pag-aaral, sertipiko ni Allyssa, o kung paano siya makokontak." },
    ];

    const fallback = "I don't have a canned answer for that one — but you can reach Allyssa directly through the Contact section, or try asking about her skills, experience, projects, education, or certifications.";
    const fallbackFil = "Wala akong handang sagot para diyan — pero maaari mong kontakin si Allyssa sa Contact section, o magtanong tungkol sa kanyang skills, karanasan, proyekto, pag-aaral, o sertipiko.";
    const quickPrompts = ['What are her skills?', 'Tell me about her experience', 'Is she available for work?', 'How do I contact her?'];
    const quickPromptsFil = ['Ano ang mga skills niya?', 'Kwentuhan mo ako tungkol sa karanasan niya', 'Available ba siya magtrabaho?', 'Paano siya kontakin?'];

    let chatLang = 'en';
    try { chatLang = localStorage.getItem('agq-chat-lang') || 'en'; } catch (e) {}

    let hasOpenedOnce = false;

    function addMessage(text, from) {
      const msg = document.createElement('div');
      msg.className = 'chat-msg chat-msg--' + from;
      msg.textContent = text;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    function findAnswer(text) {
      const q = text.toLowerCase();
      let best = null, bestScore = 0;
      knowledge.forEach(entry => {
        let score = 0;
        entry.keywords.forEach(k => { if (q.includes(k)) score++; });
        if (score > bestScore) { bestScore = score; best = entry; }
      });
      if (!best) return chatLang === 'fil' ? fallbackFil : fallback;
      return (chatLang === 'fil' && best.fil) ? best.fil : best.answer;
    }

    // Adaptive follow-up suggestions based on the last question's topic
    function followupsFor(text) {
      const q = text.toLowerCase();
      if (chatLang === 'fil') {
        if (/skill|tool|tech|kasanayan|kakayahan|ginagamit/.test(q)) return ['Anong design tools ang gamit niya?', 'Kwento tungkol sa QA niya', 'Tingnan ang mga proyekto'];
        if (/experience|work|intern|twala|role|karanasan|trabaho/.test(q)) return ['Ano ginawa niya sa Twala?', 'Ano ang top skills niya?', 'Available ba siya?'];
        if (/project|proyekto/.test(q)) return ['Anong tools ang ginamit?', 'Kwento tungkol sa karanasan', 'Paano siya kontakin?'];
        if (/cert|sertipiko/.test(q)) return ['Anong mga parangal niya?', 'Ano ang mga skills niya?', 'Available ba siya?'];
        if (/contact|email|kontak|hire|available/.test(q)) return ['Saan siya nakabase?', 'Pwede bang makita ang CV?', 'Anong roles ang bukas?'];
        return ['Ano ang mga skills niya?', 'Kwento tungkol sa karanasan', 'Tingnan ang mga proyekto', 'Paano siya kontakin?'];
      }
      if (/skill|tool|tech/.test(q)) return ['Which design tools does she use?', 'Tell me about her QA experience', 'See her projects'];
      if (/experience|work|intern|twala|role/.test(q)) return ['What did she do at Twala?', 'What are her top skills?', 'Is she available for work?'];
      if (/project/.test(q)) return ['What tools were used?', 'Tell me about her experience', 'How do I contact her?'];
      if (/cert/.test(q)) return ['What awards has she won?', 'What are her skills?', 'Is she available for work?'];
      if (/contact|email|reach|hire|available/.test(q)) return ['Where is she based?', 'Can I see her CV?', 'What roles is she open to?'];
      if (/education|school|study|degree/.test(q)) return ['What are her skills?', 'Tell me about her experience', 'See her projects'];
      if (/cv|resume|résumé/.test(q)) return ['How do I contact her?', 'What are her skills?', 'Is she available for work?'];
      return ['What are her skills?', 'Tell me about her experience', 'See her projects', 'How do I contact her?'];
    }

    function speakAnswer(answer) {
      if (!voiceOn || !('speechSynthesis' in window)) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(answer);
        const vs = speechSynthesis.getVoices() || [];
        let fv;
        if (chatLang === 'fil') {
          // Prefer a Filipino/Tagalog voice, then any female, then English
          fv = vs.find(v => /fil|tl-|tl_|tagalog|filipino/i.test(v.lang + ' ' + v.name))
            || vs.find(v => /female|samantha|victoria|karen|zira/i.test(v.name))
            || vs[0];
          u.lang = (fv && fv.lang) || 'fil-PH';
        } else {
          fv = vs.find(v => /female|samantha|victoria|karen|zira|susan|hazel|eva|google uk english female|google us english/i.test(v.name)) || vs.find(v => /^en/i.test(v.lang));
        }
        if (fv) u.voice = fv;
        u.rate = 1; u.pitch = 1.15; u.volume = voiceVol;
        u.onstart = () => { toggle.classList.add('is-speaking'); voiceToggle && voiceToggle.classList.add('is-speaking'); };
        u.onend = () => { toggle.classList.remove('is-speaking'); voiceToggle && voiceToggle.classList.remove('is-speaking'); };
        currentUtterance = u;
        speechSynthesis.speak(u);
      } catch (e) {}
    }
    function stopSpeaking() {
      if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
      toggle.classList.remove('is-speaking');
      voiceToggle && voiceToggle.classList.remove('is-speaking');
    }

    function respond(userText) {
      addMessage(userText, 'user');

      const typing = document.createElement('div');
      typing.className = 'chat-typing';
      const d1 = document.createElement('span');
      const d2 = document.createElement('span');
      const d3 = document.createElement('span');
      typing.append(d1, d2, d3);
      body.appendChild(typing);
      body.scrollTop = body.scrollHeight;

      const delay = 500 + Math.random() * 500;
      setTimeout(() => {
        typing.remove();
        const answer = findAnswer(userText);
        addMessage(answer, 'bot');
        speakAnswer(answer);
        renderQuickReplies(followupsFor(userText)); // adaptive follow-up suggestions
      }, delay);
    }

    function renderQuickReplies(prompts) {
      const list = prompts || (chatLang === 'fil' ? quickPromptsFil : quickPrompts);
      quickReplies.innerHTML = '';
      list.forEach(prompt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chat-quick-reply';
        btn.textContent = prompt;
        btn.addEventListener('click', () => {
          if (/see her projects|see projects|tingnan ang mga proyekto/i.test(prompt)) {
            const sec = document.getElementById('projects');
            if (sec) sec.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
            addMessage(prompt, 'user');
            addMessage(chatLang === 'fil'
              ? 'Mag-scroll pababa sa Projects section — pindutin ang "View all projects" para makita lahat na may filter at search.'
              : 'Scroll down to the Projects section — tap "View all projects" to browse everything with filters and search.', 'bot');
            return;
          }
          if (/can i see her cv|see her cv|her cv|makita ang cv/i.test(prompt)) {
            addMessage(prompt, 'user');
            addMessage(chatLang === 'fil'
              ? 'Mabubuksan mo ang CV niya sa "Preview CV" button sa hero o contact area (maaaring humingi ng access code).'
              : 'You can open her CV from the "Preview CV" button in the hero or contact area (it may ask for an access code).', 'bot');
            return;
          }
          respond(prompt);
        });
        quickReplies.appendChild(btn);
      });
    }

    function openChat() {
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      if (!hasOpenedOnce) {
        hasOpenedOnce = true;
        const greet = chatLang === 'fil'
          ? "Kumusta! Ako ang mabilis na assistant na may sagot tungkol kay Allyssa — ang kanyang skills, karanasan, proyekto, at kung paano siya kontakin. Magtanong sa ibaba, o mag-type ng sarili mong tanong."
          : "Hi! I'm a quick assistant with answers about Allyssa — her skills, experience, projects, and how to reach her. Try a question below, or type your own.";
        addMessage(greet, 'bot');
        renderQuickReplies();
      }
      setTimeout(() => input.focus(), 100);
    }

    // Language toggle (EN / FIL)
    const langToggle = $('#chatLangToggle');
    function reflectLang() {
      if (langToggle) langToggle.textContent = chatLang === 'fil' ? 'FIL' : 'EN';
      if (input) input.placeholder = chatLang === 'fil' ? 'Magtanong tungkol sa kanya…' : 'Ask about her skills, experience…';
    }
    reflectLang();
    langToggle?.addEventListener('click', () => {
      chatLang = chatLang === 'fil' ? 'en' : 'fil';
      try { localStorage.setItem('agq-chat-lang', chatLang); } catch (e) {}
      reflectLang();
      renderQuickReplies();
      const note = chatLang === 'fil' ? 'Nakalipat sa Filipino 🇵🇭 — magtanong ka lang!' : 'Switched to English 🇬🇧 — ask away!';
      addMessage(note, 'bot');
      if (window.__agqSound) window.__agqSound.play('toggle');
    });

    function closeChat() {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      stopSpeaking();          // stop any ongoing voice when the bot is closed
      toggle.focus();
    }

    toggle.addEventListener('click', () => {
      if (panel.hidden) openChat(); else closeChat();
    });
    closeBtn?.addEventListener('click', closeChat);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) closeChat();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      respond(text);
    });

    // Voice: read answers aloud (TTS) — on/off + volume, persisted
    function reflectVoice() {
      if (!voiceToggle) return;
      voiceToggle.setAttribute('aria-checked', String(voiceOn));
      voiceToggle.classList.toggle('is-on', voiceOn);
      voiceToggle.classList.toggle('is-off', !voiceOn);
      voiceToggle.title = voiceOn ? 'Voice: on' : 'Voice: off';
      const wrap = $('#chatVolWrap');
      if (wrap) wrap.style.display = voiceOn ? '' : 'none';
    }
    reflectVoice();
    if (volSlider) volSlider.value = String(Math.round(voiceVol * 100));

    voiceToggle?.addEventListener('click', () => {
      voiceOn = !voiceOn;
      try { localStorage.setItem('agq-chat-voice', voiceOn ? '1' : '0'); } catch (e) {}
      reflectVoice();
      if (!voiceOn) stopSpeaking();
      if (window.__agqSound) window.__agqSound.play('toggle');
    });
    volSlider?.addEventListener('input', () => {
      voiceVol = Math.max(0, Math.min(1, (parseInt(volSlider.value, 10) || 0) / 100));
      try { localStorage.setItem('agq-chat-vol', String(voiceVol)); } catch (e) {}
    });
    // On release, preview the new volume by speaking a short cue (so it feels responsive)
    function previewVolume() {
      if (!voiceOn || !('speechSynthesis' in window)) return;
      speakAnswer(voiceVol === 0 ? '' : 'Volume set.');
    }
    volSlider?.addEventListener('change', previewVolume);   // fires on release (mouse/touch)
    volSlider?.addEventListener('keyup', previewVolume);    // keyboard adjust

    // Voice: speech-to-text mic input (improved)
    const mic = $('#chatMic');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (mic && SR) {
      const rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = true;   // live transcription as you speak
      rec.continuous = false;
      rec.maxAlternatives = 1;
      let listening = false;
      let finalText = '';

      function stopListening() {
        listening = false;
        mic.classList.remove('is-listening');
        mic.setAttribute('aria-pressed', 'false');
      }

      rec.onstart = () => {
        finalText = '';
        listening = true;
        mic.classList.add('is-listening');
        mic.setAttribute('aria-pressed', 'true');
        input.placeholder = 'Listening… speak now';
      };
      rec.onresult = (ev) => {
        let interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) finalText += t; else interim += t;
        }
        input.value = (finalText + ' ' + interim).trim(); // show live text, editable
      };
      rec.onerror = (ev) => {
        stopListening();
        input.placeholder = 'Ask me anything…';
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          if (window.__agqToast) window.__agqToast('🎤 Microphone access blocked — enable it in your browser settings.');
        } else if (ev.error === 'no-speech') {
          if (window.__agqToast) window.__agqToast("🎤 Didn't catch that — try again.");
        }
      };
      rec.onend = () => {
        stopListening();
        input.placeholder = 'Ask me anything…';
        // Auto-send only if we captured something final; leave editable otherwise
        const text = input.value.trim();
        if (text && finalText.trim()) { respond(text); input.value = ''; }
        else if (text) { input.focus(); }
      };
      mic.addEventListener('click', () => {
        if (listening) { rec.stop(); return; }
        try { rec.start(); } catch (e) { /* already started */ }
      });
    } else if (mic) {
      // No speech support (e.g. Firefox) — keep the button but explain on click
      mic.addEventListener('click', () => {
        if (window.__agqToast) window.__agqToast('🎤 Voice input isn\'t supported in this browser — try Chrome, Edge, or Safari.');
      });
    }
  }

  /* ---------- Copy email button ---------- */
  function initCopyEmail() {
    const btn = $('#copyEmailBtn');
    const label = $('#copyEmailLabel');
    if (!btn || !label) return;

    btn.addEventListener('click', async () => {
      const email = btn.dataset.email;
      try {
        await navigator.clipboard.writeText(email);
        label.textContent = 'Copied!';
      } catch (err) {
        window.location.href = `mailto:${email}`;
        return;
      }
      setTimeout(() => { label.textContent = 'Copy'; }, 2000);
    });
  }

  /* ---------- Easter egg: Konami code ---------- */
  function initEasterEgg() {
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let pos = 0;

    function showToast(msg) {
      if (window.__agqToast) window.__agqToast(msg, { duration: 3200 });
    }

    document.addEventListener('keydown', (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const want = seq[pos].length === 1 ? seq[pos].toLowerCase() : seq[pos];
      if (key === want) {
        pos++;
        if (pos === seq.length) {
          pos = 0;
          document.body.classList.toggle('konami');
          if (window.__agqUnlock) window.__agqUnlock('egg');
          if (window.__agqConfetti) window.__agqConfetti();
          if (!prefersReducedMotion) {
            document.querySelectorAll('.aurora').forEach(a => { a.style.filter = 'blur(60px) saturate(2)'; });
            setTimeout(() => document.querySelectorAll('.aurora').forEach(a => { a.style.filter = ''; }), 3000);
          }
          showToast('✦ You found it — thanks for exploring! ✦');
        }
      } else {
        pos = 0;
      }
    });

    // Easier discoverable secret: click the AGQ logo 3× quickly
    const brand = document.querySelector('.brand-mark');
    if (brand) {
      let clicks = 0, timer = null;
      brand.style.cursor = 'pointer';
      brand.addEventListener('click', (e) => {
        clicks++;
        brand.classList.add('brand-pop');
        setTimeout(() => brand.classList.remove('brand-pop'), 200);
        clearTimeout(timer);
        timer = setTimeout(() => { clicks = 0; }, 800);
        if (clicks >= 3) {
          clicks = 0;
          document.body.classList.add('konami');
          if (window.__agqUnlock) window.__agqUnlock('egg');
          if (window.__agqConfetti) window.__agqConfetti();
          showToast('✦ Secret unlocked — nice find! ✦');
        }
      });
    }

    // console greeting easter egg
    try {
      console.log('%c👋 Hello, fellow developer!', 'font-size:18px;font-weight:800;color:#33E5C4');
      console.log('%cThanks for checking out my portfolio.', 'font-size:13px;color:#9298ab');
      console.log('%cBuilt with passion by Allyssa Geanne Quinit.', 'font-size:13px;color:#9298ab');
      console.log('%cLet\'s connect → allyssageannequinit@gmail.com', 'font-size:13px;font-weight:600;color:#7C5CFC');
    } catch (e) {}
  }

  /* ---------- Init ---------- */
  /* ---------- Accent / gradient selector ---------- */
  function initAccentSelector() {
    const root = document.documentElement;
    const panel = $('#themePanel');
    const openBtn = $('#themePanelToggle');
    // Move the panel to <body> so it isn't trapped inside the nav drawer's
    // transform (a transformed ancestor breaks position:fixed centering).
    if (panel && panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }
    const swatches = $$('.accent-swatch');
    if (!openBtn || !panel) return;

    function setAccent(name) {
      // A preset accent should clear any inline custom-color overrides
      if (name !== 'custom') {
        root.style.removeProperty('--grad-1'); root.style.removeProperty('--grad-2');
        root.style.removeProperty('--grad-3'); root.style.removeProperty('--grad-accent');
      }
      root.setAttribute('data-accent', name);
      try { localStorage.setItem('agq-accent', name); } catch (e) {}
      swatches.forEach(s => {
        const on = s.dataset.accent === name;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-pressed', String(on));
      });
    }

    let current = 'aurora';
    try { current = localStorage.getItem('agq-accent') || 'aurora'; } catch (e) {}
    setAccent(current);

    swatches.forEach(s => s.addEventListener('click', () => {
      if (s.dataset.accent !== 'mono') { root.removeAttribute('data-clean'); try { localStorage.removeItem('agq-clean'); } catch (e) {} }
      setAccent(s.dataset.accent); pushRecent(s.dataset.accent); if (window.__agqUnlock) window.__agqUnlock('theme');
    }));

    /* ----- Custom color picker ----- */
    const customInput = $('#customColorInput');
    const customPreview = $('#customColorPreview');
    const customHex = $('#customColorHex');
    const customApply = $('#customColorApply');
    // Convert hex → HSL so we can derive harmonious gradient stops
    function hexToHsl(hex) {
      let r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2;
      if (mx !== mn) {
        const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
        h /= 6;
      }
      return { h: h * 360, s: s * 100, l: l * 100 };
    }
    function hsl(h, s, l) { return `hsl(${((h % 360) + 360) % 360} ${Math.max(0, Math.min(100, s))}% ${Math.max(0, Math.min(100, l))}%)`; }
    // Build a pleasing 3-stop analogous gradient from one base color
    function stopsFromHex(hex) {
      const { h, s, l } = hexToHsl(hex);
      const c1 = hsl(h - 18, Math.max(s, 60), Math.min(l + 4, 62));
      const c2 = hsl(h, Math.max(s, 62), Math.min(Math.max(l, 52), 60));
      const c3 = hsl(h + 22, Math.max(s, 58), Math.min(l + 10, 68));
      return { c1, c2, c3 };
    }
    function previewCustom(hex) {
      const { c1, c2, c3 } = stopsFromHex(hex);
      if (customPreview) {
        customPreview.style.setProperty('--custom-c1', c1);
        customPreview.style.setProperty('--custom-c2', c2);
        customPreview.style.setProperty('--custom-c3', c3);
      }
    }
    // normalize typed input into a valid #RRGGBB, or return null
    function normalizeHex(raw) {
      let v = (raw || '').trim().replace(/^#/, '');
      if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.split('').map(c => c + c).join('');
      if (/^[0-9a-fA-F]{6}$/.test(v)) return '#' + v.toUpperCase();
      return null;
    }
    function applyCustom(hex) {
      const { c1, c2, c3 } = stopsFromHex(hex);
      root.style.setProperty('--grad-1', c1);
      root.style.setProperty('--grad-2', c2);
      root.style.setProperty('--grad-3', c3);
      root.style.setProperty('--grad-accent', c2);
      root.setAttribute('data-accent', 'custom');
      root.removeAttribute('data-clean');
      try {
        localStorage.setItem('agq-accent', 'custom');
        localStorage.setItem('agq-custom-color', hex);
      } catch (e) {}
      // sync inputs
      if (customInput) customInput.value = hex;
      if (customHex) { customHex.value = hex.toUpperCase(); customHex.classList.remove('is-invalid'); }
      // clear active state on preset swatches
      swatches.forEach(s => { s.classList.remove('is-active'); s.setAttribute('aria-pressed', 'false'); });
      if (window.__agqUnlock) window.__agqUnlock('theme');
      if (window.__agqSound) window.__agqSound.play('click');
    }
    // restore a previously chosen custom color
    let savedAccent = 'aurora';
    try { savedAccent = localStorage.getItem('agq-accent') || 'aurora'; } catch (e) {}
    if (savedAccent === 'custom') {
      let cc = '#7C5CFC';
      try { cc = localStorage.getItem('agq-custom-color') || '#7C5CFC'; } catch (e) {}
      if (customInput) customInput.value = cc;
      if (customHex) customHex.value = cc.toUpperCase();
      previewCustom(cc);
      applyCustom(cc);
    } else {
      if (customInput) previewCustom(customInput.value);
    }
    // color picker → live preview + sync hex field
    customInput?.addEventListener('input', (e) => {
      const v = e.target.value; previewCustom(v);
      if (customHex) { customHex.value = v.toUpperCase(); customHex.classList.remove('is-invalid'); }
    });
    // typed hex → validate + live preview
    customHex?.addEventListener('input', () => {
      const norm = normalizeHex(customHex.value);
      if (norm) { customHex.classList.remove('is-invalid'); previewCustom(norm); if (customInput) customInput.value = norm; }
      else { customHex.classList.add('is-invalid'); }
    });
    customHex?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); const norm = normalizeHex(customHex.value); if (norm) applyCustom(norm); }
    });
    customApply?.addEventListener('click', () => {
      const norm = normalizeHex(customHex ? customHex.value : (customInput ? customInput.value : ''));
      if (norm) applyCustom(norm);
      else if (customHex) customHex.classList.add('is-invalid');
    });

    /* ----- Theme gallery: categories, favorites, recent, search ----- */
    const CATS = {
      cool: ['aurora','ocean','sky','aqua','lagoon','arctic','futuretech','royal','midnight','neon','mint','teal'],
      warm: ['sunset','ember','coral','amber','gold','goldenhour','peach','coffee','cocoa','crimson','ruby','fireice'],
      vibrant: ['grape','fuchsia','candy','cyberpunk','vaporwave','nebula','galaxy','neon','rose','sakura'],
      nature: ['forest','emerald','sage','lime','mint','tropical','ocean','lavender'],
      neutral: ['mono','midnight','coffee'],
      fun: ['seasponge','webslinger','speedhero','plumberbros','ogre','starknight','candycat','pikapop','sugarpop','skyhero','mouseclub','bluepup','spookjelly','explorer','avatarair','dragonz','candycloud','spongepants','patrickstar','bathero','webhero','ironsuit','hulksmash','frozenqueen','minionpop','unicornmagic','turtlepizza','pinkpanther','scoobysnack','looneytune','simpsonyellow','rickportal','captainshield','thundergod','pantherking','wandavision','aquahero','flashspeed','wonderhero','jokerchaos','sonicblue','pokeball','adventuretime','gravityfalls','stevenuniverse'],
      girly: ['ballerina','strawberry','bubblegum','cottoncandy','rosegold','lilacdream','peachy','sakurabloom','candycat','candycloud','sakura','rose','flamingo','sugarpop','unicornmagic'],
      marvel: ['mvl-red','mvl-iron','mvl-cap','mvl-hulk','mvl-thor','mvl-thanos','mvl-strange','mvl-panther','mvl-venom','mvl-deadpool','mvl-wanda','mvl-loki'],
      plain: ['flatblue','flatviolet','flatteal','flatgreen','flatrose','flatamber','flatindigo','flatcyan','flatplum','flatcoral','flatslate','flatink','mono']
    };
    function catsFor(name) { return Object.keys(CATS).filter(c => CATS[c].includes(name)); }
    swatches.forEach(s => { s.dataset.cats = catsFor(s.dataset.accent).join(' '); });

    let favs = new Set(), recent = [];
    try { favs = new Set(JSON.parse(localStorage.getItem('agq-accent-fav') || '[]')); } catch (e) {}
    try { recent = JSON.parse(localStorage.getItem('agq-accent-recent') || '[]'); } catch (e) {}
    function saveFav() { try { localStorage.setItem('agq-accent-fav', JSON.stringify([...favs])); } catch (e) {} }
    function pushRecent(name) {
      recent = [name, ...recent.filter(n => n !== name)].slice(0, 8);
      try { localStorage.setItem('agq-accent-recent', JSON.stringify(recent)); } catch (e) {}
    }

    // Add a favorite star to each swatch
    swatches.forEach(s => {
      const star = document.createElement('button');
      star.type = 'button'; star.className = 'accent-fav'; star.setAttribute('aria-label', 'Favorite ' + s.dataset.accent);
      star.textContent = '★';
      star.classList.toggle('is-fav', favs.has(s.dataset.accent));
      star.addEventListener('click', (e) => {
        e.stopPropagation();
        const n = s.dataset.accent;
        if (favs.has(n)) favs.delete(n); else favs.add(n);
        star.classList.toggle('is-fav', favs.has(n));
        saveFav(); applyFilter();
      });
      s.appendChild(star);
    });

    const catRow = $('#accentCats');
    const search = $('#accentSearch');
    const emptyMsg = $('#accentEmpty');
    let activeCat = 'all';

    function applyFilter() {
      const q = (search && search.value.trim().toLowerCase()) || '';
      let shown = 0;
      swatches.forEach(s => {
        const name = s.dataset.accent;
        const label = (s.querySelector('em')?.textContent || name).toLowerCase();
        let ok = true;
        if (activeCat === 'fav') ok = favs.has(name);
        else if (activeCat === 'recent') ok = recent.includes(name);
        else if (activeCat !== 'all') ok = (s.dataset.cats || '').includes(activeCat);
        if (ok && q) ok = label.includes(q) || name.includes(q);
        s.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      if (emptyMsg) emptyMsg.hidden = shown !== 0;
    }
    catRow?.addEventListener('click', (e) => {
      const b = e.target.closest('.accent-cat');
      if (!b) return;
      activeCat = b.dataset.cat;
      $$('.accent-cat', catRow).forEach(x => { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', String(on)); });
      applyFilter();
    });
    search?.addEventListener('input', applyFilter);
    applyFilter();

    // Cycle through accents (used by command palette + Shift+A)
    const order = swatches.map(s => s.dataset.accent);
    function cycleAccent() {
      const idx = order.indexOf(root.getAttribute('data-accent'));
      const next = order[(idx + 1) % order.length];
      setAccent(next);
      const label = swatches.find(s => s.dataset.accent === next)?.querySelector('em')?.textContent || next;
      window.__agqToast && window.__agqToast('Accent · ' + label);
    }
    window.__agqCycleAccent = cycleAccent;

    document.addEventListener('keydown', (e) => {
      const inField = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (!inField && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); cycleAccent(); }
    });

    // Backdrop element for the centered popup
    let backdrop = document.querySelector('.theme-panel-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'theme-panel-backdrop';
      document.body.appendChild(backdrop);
    }
    function isMobile() { return window.matchMedia('(max-width:860px)').matches; }
    function open() {
      // close the mobile nav drawer so the popup is centered over the page
      const navMenu = document.getElementById('navMenu');
      const navToggle = document.getElementById('navToggle');
      if (navMenu && navMenu.classList.contains('is-open')) {
        navMenu.classList.remove('is-open');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
      }
      panel.hidden = false;
      openBtn.setAttribute('aria-expanded', 'true');
      if (isMobile()) {
        backdrop.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      }
      if (window.__agqSound) window.__agqSound.play('modal');
    }
    function close() {
      panel.hidden = true;
      backdrop.classList.remove('is-open');
      document.body.style.overflow = '';
      openBtn.setAttribute('aria-expanded', 'false');
    }
    openBtn.addEventListener('click', () => (panel.hidden ? open() : close()));
    backdrop.addEventListener('click', close);
    document.getElementById('themePanelClose')?.addEventListener('click', close);
    // Desktop: click outside the dropdown closes it
    document.addEventListener('click', (e) => {
      if (panel.hidden || isMobile()) return;
      if (!panel.contains(e.target) && e.target !== openBtn && !openBtn.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });

    // theme toggle mirror inside the panel
    const panelThemeBtn = $('#panelThemeToggle');
    panelThemeBtn?.addEventListener('click', () => window.__agqToggleTheme && window.__agqToggleTheme());

    // gradient motion style selector
    const animBox = $('#animOptions');
    function setAnim(name) {
      if (name && name !== 'off') root.setAttribute('data-anim', name);
      else root.removeAttribute('data-anim');
      try { localStorage.setItem('agq-accent-anim', name || 'off'); } catch (e) {}
      if (animBox) $$('.anim-opt', animBox).forEach(b => {
        const on = b.dataset.anim === (name || 'off');
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
    let animName = 'off';
    try { animName = localStorage.getItem('agq-accent-anim') || 'off'; } catch (e) {}
    setAnim(animName);
    animBox?.addEventListener('click', (e) => {
      const btn = e.target.closest('.anim-opt');
      if (btn) setAnim(btn.dataset.anim);
    });

    // font family selector
    const fontBox = $('#fontOptions');
    function setFont(name) {
      if (name && name !== 'default') root.setAttribute('data-font', name);
      else root.removeAttribute('data-font');
      try { localStorage.setItem('agq-font', name || 'default'); } catch (e) {}
      if (fontBox) $$('.anim-opt', fontBox).forEach(b => {
        const on = b.dataset.font === (name || 'default');
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
    let fontName = 'default';
    try { fontName = localStorage.getItem('agq-font') || 'default'; } catch (e) {}
    setFont(fontName);
    fontBox?.addEventListener('click', (e) => {
      const btn = e.target.closest('.anim-opt');
      if (btn) { setFont(btn.dataset.font); if (window.__agqSound) window.__agqSound.play('click'); }
    });

    // corner-radius style selector
    const radBox = $('#radiusOptions');
    function setRadius(name) {
      if (name && name !== 'default') root.setAttribute('data-radius', name);
      else root.removeAttribute('data-radius');
      try { localStorage.setItem('agq-radius', name || 'default'); } catch (e) {}
      if (radBox) $$('.anim-opt', radBox).forEach(b => {
        const on = b.dataset.radius === (name || 'default');
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
    let radName = 'default';
    try { radName = localStorage.getItem('agq-radius') || 'default'; } catch (e) {}
    setRadius(radName);
    radBox?.addEventListener('click', (e) => {
      const btn = e.target.closest('.anim-opt');
      if (btn) setRadius(btn.dataset.radius);
    });

    // cursor style selector — custom cursor follower
    const cursorBox = $('#cursorOptions');
    let cursorEl = null, cursorRAF = null, cx = -100, cy = -100, tx = -100, ty = -100;
    function ensureCursorEl() {
      if (cursorEl) return cursorEl;
      cursorEl = document.createElement('div');
      cursorEl.className = 'agq-cursor';
      cursorEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cursorEl);
      window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; if (cursorEl) cursorEl.style.opacity = '1'; });
      window.addEventListener('mouseleave', () => { if (cursorEl) cursorEl.style.opacity = '0'; });
      // grow on interactive hover
      document.addEventListener('mouseover', (e) => {
        if (e.target.closest('a, button, input, textarea, select, .accent-swatch, [role="button"]')) cursorEl.classList.add('is-hover');
        else cursorEl.classList.remove('is-hover');
      });
      function loop() {
        // ease toward target (trailing motion)
        cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
        if (cursorEl) cursorEl.style.transform = `translate(${cx}px, ${cy}px)`;
        cursorRAF = requestAnimationFrame(loop);
      }
      loop();
      return cursorEl;
    }
    function setCursor(name) {
      const isCustom = name && name !== 'default';
      // Follower-based cursors need the JS element; CSS-based ones (arrow/pointer/cross) don't.
      const followerTypes = ['dot', 'ring', 'glow', 'trail'];
      if (isCustom) {
        root.setAttribute('data-cursor', name);
        if (followerTypes.includes(name)) ensureCursorEl();
        else if (cursorEl) { cursorEl.remove(); cursorEl = null; if (cursorRAF) cancelAnimationFrame(cursorRAF); cursorRAF = null; }
      } else {
        root.removeAttribute('data-cursor');
        if (cursorEl) { cursorEl.remove(); cursorEl = null; if (cursorRAF) cancelAnimationFrame(cursorRAF); cursorRAF = null; }
      }
      try { localStorage.setItem('agq-cursor', name || 'default'); } catch (e) {}
      if (cursorBox) $$('.anim-opt', cursorBox).forEach(b => {
        const on = b.dataset.cursor === (name || 'default');
        b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
      });
    }
    let cursorName = 'default';
    try { cursorName = localStorage.getItem('agq-cursor') || 'default'; } catch (e) {}
    // only enable custom cursors on devices with a fine pointer (mouse)
    const hasFinePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (hasFinePointer) setCursor(cursorName); else setCursor('default');
    cursorBox?.addEventListener('click', (e) => {
      const btn = e.target.closest('.anim-opt');
      if (btn) { if (!hasFinePointer && btn.dataset.cursor !== 'default') { if (window.__agqToast) window.__agqToast('Custom cursors need a mouse.'); return; } setCursor(btn.dataset.cursor); if (window.__agqSound) window.__agqSound.play('click'); }
    });

    // gradient motion speed
    const speedBox = $('#speedOptions');
    const speedMap = { slow: '1.7', medium: '1', fast: '0.5' };
    function setSpeed(name) {
      root.style.setProperty('--anim-speed', speedMap[name] || '1');
      try { localStorage.setItem('agq-anim-speed', name); } catch (e) {}
      if (speedBox) $$('.anim-opt', speedBox).forEach(b => {
        const on = b.dataset.speed === name;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
    let speedName = 'medium';
    try { speedName = localStorage.getItem('agq-anim-speed') || 'medium'; } catch (e) {}
    setSpeed(speedName);
    speedBox?.addEventListener('click', (e) => {
      const btn = e.target.closest('.anim-opt');
      if (btn) setSpeed(btn.dataset.speed);
    });

    // Default preset: clean, minimal, professional
    $('#themeDefaultBtn')?.addEventListener('click', () => {
      if (window.__agqSetTheme) window.__agqSetTheme('light', true);  // white-dominant
      root.setAttribute('data-clean', 'on');                          // pure-white surfaces
      try { localStorage.setItem('agq-clean', '1'); } catch (e) {}
      setAccent('mono');          // clean neutral slate accent
      pushRecent('mono');
      setAnim('off');             // no gradient motion
      setRadius('default');       // standard corners
      setSpeed('medium');
      document.dispatchEvent(new CustomEvent('agq:set-bg', { detail: 'none' }));
      if (window.__agqToast) window.__agqToast('✨ Reset to clean white default');
      if (window.__agqSound) window.__agqSound.play('theme');
    });
    // restore clean flag; clear it if the user picks another accent
    try { if (localStorage.getItem('agq-clean') === '1') root.setAttribute('data-clean', 'on'); } catch (e) {}
  }

  /* ---------- Back to top ---------- */
  function initBackToTop() {
    const btn = $('#backToTop');
    if (!btn) return;
    const onScroll = () => btn.classList.toggle('is-visible', window.scrollY > 700);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Contact form validation ---------- */
  /* ---------- Community forum: live chat + visitor log (Supabase) ---------- */
  // ============================================================
  //  SUPABASE SETUP — paste your project's values here.
  //  Leave them blank to keep the section in "not connected" mode.
  //  (See the setup steps Allyssa was given.)
  const SUPABASE_URL = 'https://hvfkebtjamejvdtzjgoz.supabase.co';       // e.g. 'https://abcdxyz.supabase.co'
  const SUPABASE_ANON_KEY = 'sb_publishable_aoS1sMUbtifmtTfZ1oGTzQ_8-78yq2k';  // your project's public anon key
  // ============================================================

  function initCommunity() {
    const section = document.getElementById('community');
    if (!section) return;
    const feed = $('#communityFeed');
    const emptyMsg = $('#communityEmpty');
    const form = $('#communityForm');
    const nameInput = $('#communityName');
    const msgInput = $('#communityMessage');
    const statusEl = $('#communityStatus');
    const setupEl = $('#communitySetup');
    const visitorList = $('#communityVisitorList');
    const visitorCount = $('#communityVisitorCount');

    const configured = SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase;
    if (!configured) {
      // Not connected yet — show a gentle setup note, disable the form.
      if (setupEl) setupEl.hidden = false;
      if (emptyMsg) emptyMsg.hidden = false;
      if (form) form.querySelectorAll('input,button').forEach(el => el.disabled = true);
      if (statusEl) statusEl.textContent = 'Live chat is not connected yet.';
      return;
    }

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Restore a saved display name
    try { const n = localStorage.getItem('agq-community-name'); if (n && nameInput) nameInput.value = n; } catch (e) {}

    // ---- Reply-to state + preview banner above the composer ----
    let replyingTo = null;
    let replyBanner = null;
    function ensureReplyBanner() {
      if (replyBanner) return replyBanner;
      replyBanner = document.createElement('div');
      replyBanner.className = 'community-reply-banner';
      replyBanner.hidden = true;
      replyBanner.innerHTML = '<div class="community-reply-info"><span class="community-reply-to"></span><span class="community-reply-snip"></span></div><button type="button" class="community-reply-x" aria-label="Cancel reply">✕</button>';
      // insert at top of the form
      if (form) form.insertBefore(replyBanner, form.firstChild);
      replyBanner.querySelector('.community-reply-x').addEventListener('click', cancelReply);
      return replyBanner;
    }
    function startReply(name, snippet) {
      replyingTo = { name: name || 'Anonymous', snippet: (snippet || '').trim() };
      const b = ensureReplyBanner();
      b.querySelector('.community-reply-to').textContent = 'Replying to ' + replyingTo.name;
      b.querySelector('.community-reply-snip').textContent = replyingTo.snippet.slice(0, 90);
      b.hidden = false;
      if (msgInput) msgInput.focus();
    }
    function cancelReply() {
      replyingTo = null;
      if (replyBanner) replyBanner.hidden = true;
    }

    // Prominent inline alert for blocked (inappropriate/spam) messages
    let blockedAlertEl = null, blockedAlertTimer = null;
    function showBlockedAlert(msg) {
      if (!form) return;
      if (!blockedAlertEl) {
        blockedAlertEl = document.createElement('div');
        blockedAlertEl.className = 'community-blocked-alert';
        blockedAlertEl.setAttribute('role', 'alert');
        blockedAlertEl.innerHTML = '<span class="cba-icon" aria-hidden="true">🚫</span><span class="cba-text"></span>';
        form.insertBefore(blockedAlertEl, form.firstChild);
      }
      blockedAlertEl.querySelector('.cba-text').textContent = msg;
      blockedAlertEl.hidden = false;
      // retrigger shake animation
      blockedAlertEl.classList.remove('is-shake');
      void blockedAlertEl.offsetWidth;
      blockedAlertEl.classList.add('is-shake');
      // flash the message input red
      if (msgInput) { msgInput.classList.add('is-error'); }
      clearTimeout(blockedAlertTimer);
      blockedAlertTimer = setTimeout(() => {
        if (blockedAlertEl) blockedAlertEl.hidden = true;
        if (msgInput) msgInput.classList.remove('is-error');
      }, 5000);
    }

    function fmtTime(ts) {
      try { return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
      catch (e) { return ''; }
    }

    function initials(name) {
      const n = (name && name.trim()) ? name.trim() : 'Anonymous';
      return n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }
    function colorFor(name) {
      const n = (name && name.trim()) ? name.trim() : 'Anonymous';
      let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
      return `hsl(${h} 65% 55%)`;
    }
    // Clean default profile picture as an SVG (uses the active accent colors).
    // gender: 'female' | 'male'  → a simple, modern avatar silhouette.
    function genderAvatarSVG(gender) {
      const c1 = 'var(--grad-1)', c2 = 'var(--grad-2)';
      const bg = `<defs><linearGradient id="agqAv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="40" height="40" rx="20" fill="url(#agqAv)"/>`;
      if (gender === 'female') {
        // minimal: head + shoulders + subtle hair framing, all in soft white
        return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">${bg}<g fill="#fff"><path d="M13.5 18.5c0-4.6 2.7-7.5 6.5-7.5s6.5 2.9 6.5 7.5c0 1.2-.2 2-.5 3 .8.3 1.3.9 1.3 1.9v.6h-2.4c-.1-.5-.3-1-.6-1.4.7-1 1.2-2.3 1.2-3.9 0-3.4-2.3-5.2-5.5-5.2s-5.5 1.8-5.5 5.2c0 1.6.5 2.9 1.2 3.9-.3.4-.5.9-.6 1.4H12.7v-.6c0-1 .5-1.6 1.3-1.9-.3-1-.5-1.8-.5-3z" opacity=".9"/><circle cx="20" cy="18.5" r="4.6"/><path d="M29.5 30.5c0-4.2-4.3-6.2-9.5-6.2s-9.5 2-9.5 6.2V31h19z"/></g></svg>`;
      }
      // male: minimal head + shoulders
      return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">${bg}<g fill="#fff"><circle cx="20" cy="17" r="5.2"/><path d="M29.5 30.5c0-4.4-4.3-6.6-9.5-6.6s-9.5 2.2-9.5 6.6V31h19z"/></g></svg>`;
    }
    function setGenderAvatar(el, gender) {
      el.classList.add('is-profile');
      el.innerHTML = genderAvatarSVG(gender);
    }

    // Track the current user's display name to align their own messages
    function myName() {
      // Prefer the live name field, fall back to the saved name
      const live = (nameInput && nameInput.value ? nameInput.value : '').trim();
      if (live) return live;
      try { return (localStorage.getItem('agq-community-name') || '').trim(); } catch (e) { return ''; }
    }
    // Track IDs of messages this browser created, so they can be deleted/aligned right.
    // Uses an in-memory Set (always works, even when iOS blocks localStorage) plus
    // localStorage for persistence across reloads. IDs are normalized to strings so
    // number-vs-string mismatches never cause a missed match.
    const mineMem = new Set();
    function mineIds() {
      let stored = [];
      try { stored = JSON.parse(localStorage.getItem('agq-community-mine') || '[]'); } catch (e) {}
      return [...new Set([...mineMem, ...stored.map(String)])];
    }
    function rememberMine(id) {
      if (id == null) return;
      const s = String(id);
      mineMem.add(s);
      try { const a = mineIds(); if (!a.includes(s)) { a.push(s); } localStorage.setItem('agq-community-mine', JSON.stringify(a.slice(-300))); } catch (e) {}
    }
    function isMineId(id) { if (id == null) return false; return mineMem.has(String(id)) || mineIds().includes(String(id)); }

    // ---- Edit your own message ----
    let editingId = null;
    function startEdit(row, wrap, textEl, currentText) {
      if (!textEl || row.id == null) return;
      // Preserve a reply marker prefix (if any) so editing doesn't drop reply context
      const raw = String(row.message || '');
      const replyMatch = raw.match(/^(⤷\{\{reply:[^:]*::[\s\S]*?\}\}\n?)/);
      const replyPrefix = replyMatch ? replyMatch[1] : '';
      editingId = row.id;
      // Build an inline editor
      const editor = document.createElement('div');
      editor.className = 'community-edit';
      const ta = document.createElement('textarea');
      ta.className = 'community-edit-input'; ta.value = currentText; ta.maxLength = 500;
      ta.setAttribute('aria-label', 'Edit your message');
      const bar = document.createElement('div'); bar.className = 'community-edit-bar';
      const save = document.createElement('button'); save.type = 'button'; save.className = 'community-edit-save'; save.textContent = 'Save';
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'community-edit-cancel'; cancel.textContent = 'Cancel';
      // Emoji button inside the editor (inserts into the textarea)
      const emo = document.createElement('button'); emo.type = 'button'; emo.className = 'community-edit-emoji'; emo.textContent = '😊';
      emo.setAttribute('aria-label', 'Add emoji to your edit');
      emo.addEventListener('click', (ev) => {
        ev.stopPropagation();
        activeEmojiTarget = ta;
        if (typeof openEmojiFor === 'function') openEmojiFor(ta);
      });
      bar.append(emo, save, cancel);
      editor.append(ta, bar);
      textEl.style.display = 'none';
      textEl.parentNode.insertBefore(editor, textEl.nextSibling);
      ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
      function close() { editor.remove(); textEl.style.display = ''; editingId = null; }
      cancel.addEventListener('click', close);
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSave(); }
      });
      async function doSave() {
        const next = ta.value.trim();
        if (!next) { close(); return; }
        if (next === currentText) { close(); return; }
        // Reuse the profanity/spam check
        if (typeof hasProfanity === 'function' && (hasProfanity(next))) {
          showBlockedAlert('Please keep it respectful — that language isn\'t allowed here.');
          return;
        }
        const newMessage = replyPrefix + next;
        // Use the node's live id (a temp row may have been upgraded to a real id)
        const liveId = wrap.getAttribute('data-mid') || row.id;
        // If still a temp id (not saved yet), just update the view locally.
        if (String(liveId).startsWith('tmp-')) {
          row.message = newMessage; textEl.textContent = next;
          wrap.setAttribute('data-optmsg', newMessage);
          close(); return;
        }
        save.textContent = 'Saving…'; save.disabled = true;
        try {
          const { error } = await sb.from('messages').update({ message: newMessage }).eq('id', liveId);
          if (error) { save.textContent = 'Save'; save.disabled = false; alert('Edit failed: ' + (error.message || 'error') + '\n\nYou may need to add an UPDATE policy in Supabase.'); return; }
          // Update local view immediately
          row.message = newMessage;
          textEl.textContent = next;
          // add an "edited" marker if not present
          const head = wrap.querySelector('.community-msg-head');
          if (head && !head.querySelector('.community-msg-edited')) {
            const em = document.createElement('span'); em.className = 'community-msg-edited'; em.textContent = '(edited)';
            head.appendChild(em);
          }
          close();
        } catch (e) { save.textContent = 'Save'; save.disabled = false; alert('Edit failed.'); }
      }
      save.addEventListener('click', doSave);
    }

    // ---- Saved / bookmarked messages (per browser) ----
    function savedIds() {
      try { return JSON.parse(localStorage.getItem('agq-community-saved') || '[]'); } catch (e) { return []; }
    }
    function isSaved(id) { return savedIds().includes(id); }
    function toggleSaved(id) {
      try {
        let a = savedIds();
        if (a.includes(id)) a = a.filter(x => x !== id);
        else a.push(id);
        localStorage.setItem('agq-community-saved', JSON.stringify(a.slice(-300)));
      } catch (e) {}
    }
    let savedOnly = false;
    function applySavedFilter() {
      if (!feed) return;
      feed.querySelectorAll('.community-msg').forEach(m => {
        const id = m.getAttribute('data-mid');
        m.style.display = (!savedOnly || (id && isSaved(Number(id)))) ? '' : 'none';
      });
    }

    // Jump to the original message a reply is quoting (matched by author + text)
    function jumpToOriginal(name, snippet, fromEl) {
      if (!feed) return;
      const wantName = (name || '').trim().toLowerCase();
      const wantText = (snippet || '').trim().toLowerCase();
      const msgs = [...feed.querySelectorAll('.community-msg')];
      // search upward from the reply for the closest matching original
      let target = null;
      const fromIdx = fromEl ? msgs.indexOf(fromEl) : msgs.length;
      for (let i = (fromIdx === -1 ? msgs.length : fromIdx) - 1; i >= 0; i--) {
        const m = msgs[i];
        const who = (m.querySelector('.community-msg-who')?.textContent || '').trim().toLowerCase();
        const txt = (m.querySelector('.community-msg-text')?.textContent || '').trim().toLowerCase();
        const nameOk = !wantName || who === wantName || (who === 'you');
        if (nameOk && wantText && txt.includes(wantText.slice(0, 40))) { target = m; break; }
      }
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.remove('is-jump-highlight');
      void target.offsetWidth;
      target.classList.add('is-jump-highlight');
      setTimeout(() => target.classList.remove('is-jump-highlight'), 1600);
    }

    // ---- Owner / moderator mode ----
    // Allyssa can unlock owner mode to delete ANY message. Unlock by visiting
    // the site with ?owner=AGQ2026 once, or by running __agqOwner('AGQ2026') in the console.
    const OWNER_CODE = 'AGQ2026';
    function isOwner() { try { return localStorage.getItem('agq-community-owner') === OWNER_CODE; } catch (e) { return false; } }
    (function checkOwnerUnlock() {
      try {
        const p = new URLSearchParams(location.search).get('owner');
        if (p && p === OWNER_CODE) { localStorage.setItem('agq-community-owner', OWNER_CODE); }
      } catch (e) {}
    })();
    window.__agqOwner = function (code) {
      if (code === OWNER_CODE) { try { localStorage.setItem('agq-community-owner', OWNER_CODE); } catch (e) {} if (window.__agqToast) window.__agqToast('Owner mode on — reopen the forum'); return 'owner mode ON'; }
      try { localStorage.removeItem('agq-community-owner'); } catch (e) {} return 'owner mode OFF';
    };

    // ---- Reactions (shared via Supabase, realtime) ----
    // A stable per-browser id so each visitor reacts once per emoji.
    function clientId() {
      let c;
      try { c = localStorage.getItem('agq-client-id'); } catch (e) {}
      if (!c) { c = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36); try { localStorage.setItem('agq-client-id', c); } catch (e) {} }
      return c;
    }
    const CID = clientId();
    // reactionData[messageId][emoji] = Set of client ids
    const reactionData = {};
    function ensureR(mid) { if (!reactionData[mid]) reactionData[mid] = {}; return reactionData[mid]; }
    function countReacts(id, em) { const m = reactionData[id]; return (m && m[em]) ? m[em].size : 0; }
    function iReacted(id, em) { const m = reactionData[id]; return !!(m && m[em] && m[em].has(CID)); }

    function applyReaction(mid, em, cid, add) {
      const m = ensureR(mid);
      if (!m[em]) m[em] = new Set();
      if (add) m[em].add(cid); else m[em].delete(cid);
      // update any visible button for this message+emoji
      const node = feed && feed.querySelector(`[data-mid="${mid}"]`);
      if (node) {
        const btn = node.querySelector(`.community-react[data-em="${em}"]`);
        if (btn) {
          btn.classList.toggle('is-picked', iReacted(mid, em));
          const n = btn.querySelector('.community-react-n');
          const c = countReacts(mid, em);
          if (n) n.textContent = c > 0 ? c : '';
        }
      }
    }

    async function toggleReact(id, em, btn) {
      if (id == null) return;
      // A just-sent message may still have a temporary id (not saved yet).
      if (String(id).startsWith('tmp-')) { if (statusEl) statusEl.textContent = 'Give it a second — still saving…'; return; }
      const had = iReacted(id, em);
      // optimistic UI
      applyReaction(id, em, CID, !had);
      try {
        if (had) {
          await sb.from('reactions').delete().eq('message_id', id).eq('emoji', em).eq('client_id', CID);
        } else {
          await sb.from('reactions').insert({ message_id: id, emoji: em, client_id: CID });
        }
      } catch (e) {
        console.error('[community] reaction failed:', e);
        applyReaction(id, em, CID, had); // revert
      }
    }

    // Load existing reactions once, then keep them live
    (async function loadReactions() {
      try {
        const { data } = await sb.from('reactions').select('message_id,emoji,client_id').limit(5000);
        (data || []).forEach(r => { const m = ensureR(r.message_id); if (!m[r.emoji]) m[r.emoji] = new Set(); m[r.emoji].add(r.client_id); });
        // refresh any already-rendered buttons
        Object.keys(reactionData).forEach(mid => Object.keys(reactionData[mid]).forEach(em => applyReaction(mid, em, '__noop__', false)));
      } catch (e) {}
    })();
    sb.channel('public:reactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' }, (p) => {
        const r = p.new; if (r) applyReaction(r.message_id, r.emoji, r.client_id, true);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reactions' }, (p) => {
        const r = p.old; if (r) applyReaction(r.message_id, r.emoji, r.client_id, false);
      })
      .subscribe();

    // ---- Live "online now" presence ----
    const onlineEl = $('#communityOnline');
    const presence = sb.channel('community-presence', { config: { presence: { key: CID } } });
    presence.on('presence', { event: 'sync' }, () => {
      const state = presence.presenceState();
      const n = Object.keys(state).length;
      if (onlineEl) { onlineEl.hidden = false; onlineEl.textContent = '● ' + n + (n === 1 ? ' online' : ' online'); }
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') { try { await presence.track({ at: Date.now() }); } catch (e) {} }
    });

    // ---- "Someone is typing…" indicator (broadcast, ephemeral) ----
    const typingEl = $('#communityTyping');
    const typingChan = sb.channel('community-typing');
    const typers = new Map(); // cid -> {name, timer}
    function renderTyping() {
      if (!typingEl) return;
      const names = [...typers.values()].map(t => t.name).filter(Boolean);
      if (!names.length) { typingEl.hidden = true; return; }
      let label;
      if (names.length === 1) label = `${names[0]} is typing`;
      else if (names.length === 2) label = `${names[0]} and ${names[1]} are typing`;
      else label = `${names.length} people are typing`;
      typingEl.querySelector('.ct-text').textContent = label;
      typingEl.hidden = false;
    }
    typingChan.on('broadcast', { event: 'typing' }, (payload) => {
      const p = payload.payload || {};
      if (!p.cid || p.cid === CID) return;
      const prev = typers.get(p.cid);
      if (prev) clearTimeout(prev.timer);
      const timer = setTimeout(() => { typers.delete(p.cid); renderTyping(); }, 3500);
      typers.set(p.cid, { name: (p.name || 'Someone').slice(0, 24), timer });
      renderTyping();
    }).subscribe();
    // Emit typing (throttled) as the user types a message
    let typingSentAt = 0;
    msgInput?.addEventListener('input', () => {
      const now = Date.now();
      if (now - typingSentAt < 1200) return;
      typingSentAt = now;
      const nm = (nameInput?.value || '').trim() || 'Someone';
      try { typingChan.send({ type: 'broadcast', event: 'typing', payload: { cid: CID, name: nm } }); } catch (e) {}
    });

    async function deleteMessage(id, el) {
      // Remove locally right away for instant feedback (optimistic)
      if (el && el.parentNode) el.parentNode.removeChild(el);
      msgCount = Math.max(0, msgCount - 1);
      if (msgCountEl) msgCountEl.textContent = msgCount.toLocaleString();
      // Temp/optimistic rows have no real DB id yet — nothing to delete server-side.
      if (id == null || String(id).startsWith('tmp-')) return;
      const { error } = await sb.from('messages').delete().eq('id', id);
      if (error) {
        console.error('[community] delete failed:', error);
        if (window.__agqToast) window.__agqToast('⚠ Delete needs a Supabase DELETE policy on "messages".');
        else if (statusEl) statusEl.textContent = 'Delete failed (add a DELETE policy in Supabase): ' + (error.message || 'unknown');
      }
    }
    let lastSender = null;
    let msgCount = 0;
    const msgCountEl = $('#communityMsgCount');
    const statsBar = $('#communityStats');
    const jumpBtn = $('#communityJump');

    function nearBottom() {
      if (!feed) return true;
      return feed.scrollHeight - feed.scrollTop - feed.clientHeight < 80;
    }

    function addMessageEl(row, opts) {
      if (!feed) return;
      // De-dupe by id: skip if this id is already rendered.
      if (row.id != null && feed.querySelector(`[data-mid="${row.id}"]`)) return;
      // De-dupe optimistic temp rows: when the real echo arrives (real id + same
      // name+message), replace the temp node instead of adding a duplicate.
      if (row.id != null && !String(row.id).startsWith('tmp-')) {
        const temps = feed.querySelectorAll('[data-mid^="tmp-"]');
        for (const t of temps) {
          if (t.getAttribute('data-optmsg') === String(row.message) && t.getAttribute('data-optname') === String(row.name || 'Anonymous')) {
            // upgrade the temp node's id so future edits/deletes work
            t.setAttribute('data-mid', row.id);
            t.removeAttribute('data-optmsg'); t.removeAttribute('data-optname');
            rememberMine(row.id);
            return;
          }
        }
      }
      if (emptyMsg) emptyMsg.hidden = true;
      const who = row.name && row.name.trim() ? row.name.trim() : 'Anonymous';
      const mine = row._mineHint === true || row._optimistic === true || (myName() && who.toLowerCase() === myName().toLowerCase()) || (row.id != null && isMineId(row.id));
      const grouped = lastSender === who; // consecutive message from same person
      const wasNear = nearBottom();

      const wrap = document.createElement('div');
      wrap.className = 'community-msg' + (mine ? ' is-mine' : '') + (grouped ? ' is-grouped' : '');
      if (row.id != null) wrap.setAttribute('data-mid', row.id);
      // Tag optimistic temp rows so the realtime echo can find & upgrade them
      if (row._optimistic) { wrap.setAttribute('data-optmsg', String(row.message)); wrap.setAttribute('data-optname', String(who)); }
      const av = document.createElement('span');
      av.className = 'community-msg-av';
      // Default profile avatar: if we know this sender's gender, show a
      // female/male profile glyph; otherwise fall back to initials.
      const avGender = (mine ? myGender() : (row._gender || row.gender || '')) || '';
      if (avGender === 'female') { setGenderAvatar(av, 'female'); }
      else if (avGender === 'male') { setGenderAvatar(av, 'male'); }
      else { av.textContent = initials(who); av.style.background = colorFor(who); }
      if (grouped) av.style.visibility = 'hidden';
      const bubble = document.createElement('div'); bubble.className = 'community-msg-bubble';
      if (!grouped) {
        const head = document.createElement('div'); head.className = 'community-msg-head';
        const nameEl = document.createElement('span'); nameEl.className = 'community-msg-who'; nameEl.textContent = mine ? 'You' : who;
        const time = document.createElement('span'); time.className = 'community-msg-time mono'; time.textContent = fmtTime(row.created_at);
        head.append(nameEl, time);
        bubble.append(head);
      }

      // Parse an optional reply marker:  ⤷{{reply:Name::snippet}}\nactual message
      let bodyText = String(row.message);
      const rm = bodyText.match(/^⤷\{\{reply:([^:]*)::([\s\S]*?)\}\}\n?([\s\S]*)$/);
      if (rm) {
        const rName = rm[1] || 'someone';
        const rSnippet = rm[2] || '';
        bodyText = rm[3] || '';
        const quote = document.createElement('button');
        quote.type = 'button';
        quote.className = 'community-msg-quote';
        quote.setAttribute('aria-label', 'Jump to the message being replied to');
        quote.innerHTML = `<span class="community-quote-name">${escapeHtml(rName)}</span><span class="community-quote-text">${escapeHtml(rSnippet)}</span>`;
        quote.addEventListener('click', () => jumpToOriginal(rName, rSnippet, wrap));
        bubble.append(quote);
      }

      // Sticker marker:  🎯{{sticker:ID}}  (built-in animated stickers, never broken)
      const sm = String(bodyText).match(/^🎯\{\{sticker:([a-z0-9_]+)\}\}$/i);
      if (sm) {
        const stk = (window.__agqStickerById || {})[sm[1]];
        if (stk) {
          const fig = document.createElement('div'); fig.className = 'community-msg-sticker';
          fig.innerHTML = `<span class="stk ${stk.a}">${stk.e}</span>`;
          bubble.append(fig);

          // Actions for stickers: Reply + Delete (own or owner)
          const sActions = document.createElement('div');
          sActions.className = 'community-msg-actions';
          const sReply = document.createElement('button');
          sReply.type = 'button'; sReply.className = 'community-msg-reply'; sReply.textContent = 'Reply';
          sReply.setAttribute('aria-label', 'Reply to this sticker');
          sReply.addEventListener('click', () => startReply(who, stk.e));
          sActions.append(sReply);
          const sCanDelete = mine || (row.id != null && isMineId(row.id));
          const sOwner = isOwner();
          if ((sCanDelete || sOwner) && row.id != null) {
            const sDel = document.createElement('button');
            sDel.type = 'button';
            sDel.className = 'community-msg-del' + (!sCanDelete && sOwner ? ' is-mod' : '');
            sDel.textContent = (!sCanDelete && sOwner) ? 'Delete (mod)' : 'Delete';
            sDel.setAttribute('aria-label', 'Delete this sticker');
            sDel.addEventListener('click', () => {
              const m = (!sCanDelete && sOwner) ? 'Delete this visitor\'s sticker?' : 'Delete this sticker?';
              if (confirm(m)) deleteMessage(wrap.getAttribute('data-mid'), wrap);
            });
            sActions.append(sDel);
          }
          bubble.append(sActions);

          wrap.append(av, bubble);
          feed.appendChild(wrap);
          lastSender = who; msgCount++;
          if (msgCountEl) msgCountEl.textContent = msgCount.toLocaleString();
          if (statsBar) statsBar.hidden = false;
          if (wasNear || mine || (opts && opts.initial)) { feed.scrollTop = feed.scrollHeight; if (jumpBtn) jumpBtn.hidden = true; }
          else if (jumpBtn) { jumpBtn.hidden = false; jumpBtn.classList.add("has-new"); jumpBtn.textContent = "↓ New messages"; }
          return;
        }
      }

      const text = document.createElement('p'); text.className = 'community-msg-text';
      // Auto-linkify URLs (safe: build via DOM, escape everything else)
      const parts = String(bodyText).split(/(https?:\/\/[^\s]+)/g);
      parts.forEach(part => {
        if (/^https?:\/\//.test(part)) {
          const a = document.createElement('a');
          a.href = part; a.target = '_blank'; a.rel = 'noopener noreferrer nofollow';
          a.className = 'community-msg-link'; a.textContent = part;
          text.appendChild(a);
        } else if (part) {
          text.appendChild(document.createTextNode(part));
        }
      });
      bubble.append(text);

      // Reactions row
      const reactRow = document.createElement('div');
      reactRow.className = 'community-msg-reacts';
      const REACTS = ['👍','❤️','😂','🎉','👏'];
      REACTS.forEach(em => {
        const rb = document.createElement('button');
        rb.type = 'button'; rb.className = 'community-react' + (iReacted(row.id, em) ? ' is-picked' : '');
        rb.setAttribute('data-em', em);
        const c0 = countReacts(row.id, em);
        rb.innerHTML = `<span class="community-react-em">${em}</span><span class="community-react-n">${c0 > 0 ? c0 : ''}</span>`;
        rb.setAttribute('aria-label', 'React ' + em);
        rb.addEventListener('click', () => toggleReact(row.id, em, rb));
        reactRow.appendChild(rb);
      });
      bubble.append(reactRow);

      // Action buttons row (Reply + Copy + Delete)
      const actions = document.createElement('div');
      actions.className = 'community-msg-actions';
      const replyBtn = document.createElement('button');
      replyBtn.type = 'button'; replyBtn.className = 'community-msg-reply'; replyBtn.textContent = 'Reply';
      replyBtn.setAttribute('aria-label', 'Reply to this message');
      replyBtn.addEventListener('click', () => startReply(who, bodyText));
      actions.append(replyBtn);

      // Copy message text
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button'; copyBtn.className = 'community-msg-copy'; copyBtn.textContent = 'Copy';
      copyBtn.setAttribute('aria-label', 'Copy this message');
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(bodyText);
          if (window.__agqToast) window.__agqToast('📋 Message copied');
          else { copyBtn.textContent = 'Copied!'; setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1400); }
        } catch (e) {
          copyBtn.textContent = 'Copied!'; setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1400);
        }
      });
      actions.append(copyBtn);

      // Save / bookmark this message (stored per-browser)
      if (row.id != null) {
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button'; saveBtn.className = 'community-msg-save';
        const setSaveLabel = () => {
          const saved = isSaved(row.id);
          saveBtn.textContent = saved ? '★ Saved' : '☆ Save';
          saveBtn.classList.toggle('is-saved', saved);
          wrap.classList.toggle('is-saved-msg', saved);
        };
        setSaveLabel();
        saveBtn.setAttribute('aria-label', 'Save this message');
        saveBtn.addEventListener('click', () => { toggleSaved(row.id); setSaveLabel(); if (savedOnly) applySavedFilter(); });
        actions.append(saveBtn);
      }

      // Edit button: own text messages only (not GIFs)
      const canEditOwn = (mine || (row.id != null && isMineId(row.id))) && row.id != null && !gm;
      if (canEditOwn) {
        const editBtn = document.createElement('button');
        editBtn.type = 'button'; editBtn.className = 'community-msg-edit'; editBtn.textContent = 'Edit';
        editBtn.setAttribute('aria-label', 'Edit this message');
        editBtn.addEventListener('click', () => startEdit(row, wrap, text, bodyText));
        actions.append(editBtn);
      }

      // Delete button: own messages (by stored id OR name match), or ANY message in owner mode
      const canDeleteOwn = mine || (row.id != null && isMineId(row.id));
      const owner = isOwner();
      if (canDeleteOwn || owner) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'community-msg-del' + (!canDeleteOwn && owner ? ' is-mod' : '');
        del.textContent = (!canDeleteOwn && owner) ? 'Delete (mod)' : 'Delete';
        del.setAttribute('aria-label', 'Delete this message');
        del.addEventListener('click', () => {
          const msg = (!canDeleteOwn && owner) ? 'Delete this visitor\'s message?' : 'Delete this message?';
          if (!confirm(msg)) return;
          // Use the node's live data-mid (a temp row may have been upgraded to a real id)
          const liveId = wrap.getAttribute('data-mid');
          deleteMessage(liveId, wrap);
        });
        actions.append(del);
      }
      bubble.append(actions);
      wrap.append(av, bubble);
      feed.appendChild(wrap);
      lastSender = who;
      msgCount++;
      if (msgCountEl) msgCountEl.textContent = msgCount.toLocaleString();
      if (statsBar) statsBar.hidden = false;
      // If a search filter is active, apply it to this new message
      if (searchInput && searchInput.value.trim() && searchBar && !searchBar.hidden) {
        const q = searchInput.value.trim().toLowerCase();
        const match = String(row.message).toLowerCase().includes(q) || who.toLowerCase().includes(q);
        if (!match) wrap.style.display = 'none';
      }

      // Auto-scroll only if the user is already near the bottom (or it's their own message)
      if (wasNear || mine || (opts && opts.initial)) { feed.scrollTop = feed.scrollHeight; if (jumpBtn) jumpBtn.hidden = true; }
      else if (jumpBtn) { jumpBtn.hidden = false; jumpBtn.classList.add("has-new"); jumpBtn.textContent = "↓ New messages"; }
    }

    // Load recent messages
    sb.from('messages').select('*').order('created_at', { ascending: true }).limit(100)
      .then(({ data, error }) => {
        if (error) { if (statusEl) statusEl.textContent = 'Could not load messages.'; return; }
        if (!data || !data.length) { if (emptyMsg) emptyMsg.hidden = false; return; }
        data.forEach(row => addMessageEl(row, { initial: true }));
      });

    // Polling fallback: even if Supabase Realtime is off/unreliable, re-fetch
    // Polling fallback: even if Supabase Realtime is off/unreliable, re-fetch
    // recent messages periodically so everyone eventually sees new posts.
    // addMessageEl de-dupes by id, so already-shown messages are skipped.
    // NOTE: polling only ADDS messages — it never removes them (deletions are
    // handled by the realtime DELETE listener). This avoids wiping messages if
    // a fetch returns partial/empty results.
    let pollTimer = null;
    async function pollMessages() {
      try {
        const { data, error } = await sb.from('messages').select('*').order('created_at', { ascending: true }).limit(100);
        if (error || !data || !data.length) return;
        data.forEach(row => addMessageEl(row));
      } catch (e) {}
    }
    pollTimer = setInterval(pollMessages, 6000); // every 6s
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
      else if (!pollTimer) { pollMessages(); pollTimer = setInterval(pollMessages, 6000); }
    });

    // Jump-to-newest button
    jumpBtn?.addEventListener('click', () => {
      if (feed) feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
      if (jumpBtn) { jumpBtn.hidden = true; jumpBtn.classList.remove('has-new'); jumpBtn.textContent = '↓ Latest'; }
    });
    // Show the button whenever the user has scrolled up to read older messages
    feed?.addEventListener('scroll', () => {
      if (!jumpBtn) return;
      if (nearBottom()) {
        jumpBtn.hidden = true;
        jumpBtn.classList.remove('has-new');
        jumpBtn.textContent = '↓ Latest';
      } else if (!jumpBtn.classList.contains('has-new')) {
        // scrolled up, no new message pending → offer a jump-to-latest
        jumpBtn.hidden = false;
        jumpBtn.textContent = '↓ Latest';
      }
    });

    // ---- Message search / filter ----
    const searchToggle = $('#communitySearchToggle');
    const searchBar = $('#communitySearchBar');
    const searchInput = $('#communitySearchInput');
    const searchCount = $('#communitySearchCount');
    const searchClear = $('#communitySearchClear');
    function runSearch(q) {
      if (!feed) return;
      const query = (q || '').trim().toLowerCase();
      const msgs = feed.querySelectorAll('.community-msg');
      if (!query) {
        msgs.forEach(m => { m.style.display = ''; m.classList.remove('is-search-hit'); });
        if (searchCount) searchCount.textContent = '';
        if (searchClear) searchClear.hidden = true;
        return;
      }
      if (searchClear) searchClear.hidden = false;
      let hits = 0;
      msgs.forEach(m => {
        const txt = (m.querySelector('.community-msg-text')?.textContent || '').toLowerCase();
        const who = (m.querySelector('.community-msg-who')?.textContent || '').toLowerCase();
        const match = txt.includes(query) || who.includes(query);
        m.style.display = match ? '' : 'none';
        m.classList.toggle('is-search-hit', match);
        if (match) hits++;
      });
      if (searchCount) searchCount.textContent = hits ? `${hits} match${hits === 1 ? '' : 'es'}` : 'No matches';
    }

    // Saved-messages filter toggle
    const savedToggle = $('#communitySavedToggle');
    savedToggle?.addEventListener('click', () => {
      savedOnly = !savedOnly;
      savedToggle.classList.toggle('is-active', savedOnly);
      savedToggle.setAttribute('aria-pressed', savedOnly ? 'true' : 'false');
      savedToggle.title = savedOnly ? 'Show all messages' : 'Show saved messages';
      applySavedFilter();
      if (window.__agqToast) {
        const n = savedIds().length;
        window.__agqToast(savedOnly ? (n ? `★ Showing ${n} saved` : '☆ No saved messages yet') : 'Showing all messages');
      }
    });

    searchToggle?.addEventListener('click', () => {
      if (!searchBar) return;
      const opening = searchBar.hidden;
      searchBar.hidden = !opening;
      searchToggle.classList.toggle('is-active', opening);
      if (opening) { setTimeout(() => searchInput?.focus(), 50); }
      else { if (searchInput) searchInput.value = ''; runSearch(''); }
    });
    searchInput?.addEventListener('input', () => runSearch(searchInput.value));
    searchClear?.addEventListener('click', () => { if (searchInput) { searchInput.value = ''; runSearch(''); searchInput.focus(); } });
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { searchInput.value = ''; runSearch(''); if (searchBar) searchBar.hidden = true; searchToggle?.classList.remove('is-active'); }
    });

    // Realtime: new messages appear instantly for everyone
    const liveEl = $('#communityLive');
    sb.channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        addMessageEl(payload.new);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        const id = payload.old && payload.old.id;
        if (id == null || !feed) return;
        const node = feed.querySelector(`[data-mid="${id}"]`);
        if (node && node.parentNode) { node.parentNode.removeChild(node); msgCount = Math.max(0, msgCount - 1); if (msgCountEl) msgCountEl.textContent = msgCount.toLocaleString(); }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const r = payload.new;
        if (!r || r.id == null || !feed) return;
        if (editingId === r.id) return; // don't clobber our own open editor
        const node = feed.querySelector(`[data-mid="${r.id}"]`);
        if (!node) return;
        const textEl = node.querySelector('.community-msg-text');
        if (!textEl) return;
        // strip reply marker for display
        let disp = String(r.message || '');
        const rm = disp.match(/^⤷\{\{reply:[^:]*::[\s\S]*?\}\}\n?([\s\S]*)$/);
        if (rm) disp = rm[1] || '';
        textEl.textContent = disp;
        const head = node.querySelector('.community-msg-head');
        if (head && !head.querySelector('.community-msg-edited')) {
          const em = document.createElement('span'); em.className = 'community-msg-edited'; em.textContent = '(edited)';
          head.appendChild(em);
        }
      })
      .subscribe((status) => {
        if (liveEl) {
          if (status === 'SUBSCRIBED') { liveEl.textContent = '● live'; liveEl.classList.add('is-live'); }
          else { liveEl.textContent = 'connecting…'; liveEl.classList.remove('is-live'); }
        }
      });

    // Live character counter
    const charCount = $('#communityCharCount');
    function updateCount() {
      if (!charCount || !msgInput) return;
      const n = msgInput.value.length;
      charCount.textContent = n ? `${n}/500` : '';
      charCount.classList.toggle('is-near', n > 440);
    }
    msgInput?.addEventListener('input', updateCount);

    // ---- Emoji picker for the composer ----
    const emojiToggle = $('#communityEmojiToggle');
    const emojiPanel = $('#communityEmojiPanel');
    // Track which field emojis should insert into (main input, or an open edit box)
    let activeEmojiTarget = msgInput || null;
    msgInput?.addEventListener('focus', () => { activeEmojiTarget = msgInput; });
    // Delegated: when any edit textarea is focused, target it
    document.addEventListener('focusin', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('community-edit-input')) {
        activeEmojiTarget = e.target;
      }
    });
    const EMOJI_GROUPS = [
      { label: 'Smileys', items: ['😀','😃','😄','😁','😊','🙂','😉','😍','🥰','😘','😎','🤩','🤗','🤔','😌','😴','😅','😂','🤣','😇','🙃','😋','😜','🤪','😏','🥳','😭','😳','🥺','😤','😱'] },
      { label: 'Gestures', items: ['👍','👎','👏','🙌','🙏','🤝','👋','✌️','🤞','🤟','👌','🤙','💪','🫶','👀','🧠','💯'] },
      { label: 'Hearts', items: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💖','💗','💓','💞','💕','💔','❣️'] },
      { label: 'Fun', items: ['🎉','🎊','✨','🔥','⭐','🌟','💫','⚡','🌈','🎯','🏆','🥇','💡','🚀','🎨','💻','📚','☕','🍕','🎂','🐶','🐱','🌸','🌼'] },
    ];
    let emojiBuilt = false;
    function buildEmojiPanel() {
      if (emojiBuilt || !emojiPanel) return;
      emojiBuilt = true;
      EMOJI_GROUPS.forEach(group => {
        const h = document.createElement('p'); h.className = 'cep-group-label mono'; h.textContent = group.label;
        emojiPanel.appendChild(h);
        const grid = document.createElement('div'); grid.className = 'cep-grid';
        group.items.forEach(em => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'cep-emoji'; b.textContent = em;
          b.setAttribute('aria-label', 'Insert ' + em);
          b.addEventListener('click', () => insertEmoji(em));
          grid.appendChild(b);
        });
        emojiPanel.appendChild(grid);
      });
    }
    function insertEmoji(em) {
      // Insert into whichever field is active: an open edit textarea, else the main input
      const target = (activeEmojiTarget && document.body.contains(activeEmojiTarget)) ? activeEmojiTarget : msgInput;
      if (!target) return;
      const start = target.selectionStart != null ? target.selectionStart : target.value.length;
      const end = target.selectionEnd != null ? target.selectionEnd : target.value.length;
      const v = target.value;
      const max = target.maxLength && target.maxLength > 0 ? target.maxLength : 500;
      const next = (v.slice(0, start) + em + v.slice(end)).slice(0, max);
      target.value = next;
      const pos = Math.min(start + em.length, next.length);
      target.focus();
      try { target.setSelectionRange(pos, pos); } catch (e) {}
      // fire input so counters/handlers update
      target.dispatchEvent(new Event('input', { bubbles: true }));
      if (target === msgInput) updateCount();
    }
    function openEmoji() {
      if (!emojiPanel) return;
      buildEmojiPanel();
      emojiPanel.hidden = false;
      emojiToggle?.setAttribute('aria-expanded', 'true');
      emojiToggle?.classList.add('is-active');
    }
    // Open the emoji panel targeting a specific field (used by the edit editor)
    function openEmojiFor(field) {
      if (!emojiPanel) return;
      activeEmojiTarget = field || msgInput;
      buildEmojiPanel();
      emojiPanel.hidden = false;
    }
    function closeEmoji() {
      if (!emojiPanel) return;
      emojiPanel.hidden = true;
      emojiToggle?.setAttribute('aria-expanded', 'false');
      emojiToggle?.classList.remove('is-active');
    }
    emojiToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (emojiPanel && emojiPanel.hidden) openEmoji(); else closeEmoji();
    });
    // close on outside click or Escape
    document.addEventListener('click', (e) => {
      if (emojiPanel && !emojiPanel.hidden && !emojiPanel.contains(e.target) && e.target !== emojiToggle && !emojiToggle?.contains(e.target)) closeEmoji();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && emojiPanel && !emojiPanel.hidden) closeEmoji(); });

    // ---- GIF picker (curated, no API key needed) ----
    // A hand-picked set of safe, fun GIFs served from Giphy's public media CDN.
    // Each is chosen manually, so nothing inappropriate can appear.
    // Built-in animated stickers — generated in code, so they NEVER break (no external URLs).
    // Each renders as a large emoji with a CSS animation. id is stored in the message.
    const STICKER_SET = [
      { id: 'wave',   e: '👋', a: 'stk-wave',   k: 'hi hello wave greetings bye' },
      { id: 'thumb',  e: '👍', a: 'stk-pop',    k: 'thumbs up yes good ok nice approve' },
      { id: 'clap',   e: '👏', a: 'stk-clap',   k: 'clap applause bravo well done' },
      { id: 'party',  e: '🎉', a: 'stk-spin',   k: 'party celebrate congrats yay woohoo' },
      { id: 'confetti', e: '🎊', a: 'stk-pop',  k: 'confetti celebrate party congrats' },
      { id: 'heart',  e: '❤️', a: 'stk-beat',   k: 'love heart like' },
      { id: 'sparkle',e: '✨', a: 'stk-twinkle',k: 'sparkle shine amazing magic' },
      { id: 'fire',   e: '🔥', a: 'stk-flicker',k: 'fire lit hot awesome' },
      { id: 'laugh',  e: '😂', a: 'stk-shake',  k: 'laugh lol funny haha' },
      { id: 'wow',    e: '😮', a: 'stk-pop',    k: 'wow surprised shocked omg' },
      { id: 'cool',   e: '😎', a: 'stk-pop',    k: 'cool awesome sunglasses' },
      { id: 'love',   e: '🥰', a: 'stk-beat',   k: 'love adore cute happy' },
      { id: 'cry',    e: '😭', a: 'stk-shake',  k: 'cry sad tears' },
      { id: 'think',  e: '🤔', a: 'stk-tilt',   k: 'think hmm thinking' },
      { id: 'pray',   e: '🙏', a: 'stk-pop',    k: 'pray thanks please good luck' },
      { id: 'muscle', e: '💪', a: 'stk-pop',    k: 'strong power you got this support' },
      { id: 'rocket', e: '🚀', a: 'stk-launch', k: 'rocket launch lets go hype fast' },
      { id: 'star',   e: '⭐', a: 'stk-twinkle',k: 'star favorite great top' },
      { id: 'hundred',e: '💯', a: 'stk-pop',    k: 'hundred perfect real facts' },
      { id: 'coffee', e: '☕', a: 'stk-tilt',   k: 'coffee work morning busy' },
      { id: 'laptop', e: '💻', a: 'stk-tilt',   k: 'coding work laptop dev' },
      { id: 'trophy', e: '🏆', a: 'stk-twinkle',k: 'trophy win winner best' },
      { id: 'wink',   e: '😉', a: 'stk-pop',    k: 'wink cute playful' },
      { id: 'sleepy', e: '😴', a: 'stk-tilt',   k: 'sleepy tired sleep' }
    ];
    const stickerById = Object.fromEntries(STICKER_SET.map(s => [s.id, s]));
    const gifToggle = $('#communityGifToggle');
    const gifPanel = $('#communityGifPanel');
    const gifInput = $('#communityGifInput');
    const gifResults = $('#communityGifResults');
    function renderGifs(query) {
      if (!gifResults) return;
      const q = (query || '').trim().toLowerCase();
      const list = q ? STICKER_SET.filter(s => s.k.includes(q) || s.id.includes(q)) : STICKER_SET;
      gifResults.innerHTML = '';
      if (!list.length) { gifResults.innerHTML = '<p class="community-gif-loading">No stickers match — try “happy”, “clap”, “love”…</p>'; return; }
      list.forEach(s => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'community-sticker-item';
        b.setAttribute('aria-label', s.id);
        b.innerHTML = `<span class="stk ${s.a}">${s.e}</span>`;
        b.addEventListener('click', () => { sendGif(s.id); closeGif(); });
        gifResults.appendChild(b);
      });
    }
    function openGif() {
      if (!gifPanel) return;
      if (emojiPanel && !emojiPanel.hidden) closeEmoji();
      gifPanel.hidden = false;
      gifToggle?.setAttribute('aria-expanded', 'true');
      gifToggle?.classList.add('is-active');
      renderGifs('');
      if (gifInput) gifInput.focus();
    }
    function closeGif() {
      if (!gifPanel) return;
      gifPanel.hidden = true;
      gifToggle?.setAttribute('aria-expanded', 'false');
      gifToggle?.classList.remove('is-active');
    }
    async function sendGif(id) {
      if (!id || !stickerById[id]) return;
      const name = (nameInput?.value || '').trim().slice(0, 40) || 'Anonymous';
      const now = Date.now();
      if (now - lastPostAt < COOLDOWN_MS) { if (statusEl) statusEl.textContent = 'Please wait a few seconds before posting again.'; return; }
      const message = `🎯{{sticker:${id}}}`;
      // Render immediately (optimistic) so the sender sees it right away
      const tempId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      try { addMessageEl({ id: tempId, name, message, created_at: new Date().toISOString(), _optimistic: true, _mineHint: true }); } catch (e) {}
      lastPostAt = Date.now();
      // Persist
      try {
        const { data, error } = await sb.from('messages').insert({ name, message }).select();
        if (error) throw error;
        if (data && data[0] && data[0].id != null) {
          rememberMine(data[0].id);
          const tempNode = feed && feed.querySelector(`[data-mid="${tempId}"]`);
          if (tempNode) { tempNode.setAttribute('data-mid', data[0].id); tempNode.removeAttribute('data-optmsg'); tempNode.removeAttribute('data-optname'); }
        }
      } catch (e) {
        console.error('[community] sticker insert failed:', e);
        if (statusEl) statusEl.textContent = 'Sticker could not be saved (check connection / Supabase policies).';
      }
    }
    // expose sticker lookup for the message renderer
    window.__agqStickerById = stickerById;
    gifToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (gifPanel && gifPanel.hidden) openGif(); else closeGif();
    });
    gifInput?.addEventListener('input', () => renderGifs(gifInput.value));
    document.addEventListener('click', (e) => {
      if (gifPanel && !gifPanel.hidden && !gifPanel.contains(e.target) && e.target !== gifToggle && !gifToggle?.contains(e.target)) closeGif();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && gifPanel && !gifPanel.hidden) closeGif(); });

    // ---- Basic anti-spam safeguards (front-end) ----
    let lastPostAt = 0;
    let lastPostText = '';
    let postsThisSession = 0;
    const COOLDOWN_MS = 8000;       // min gap between messages
    const MAX_PER_SESSION = 25;     // soft cap per browser session
    const SPAM = ['viagra', 'casino', 'crypto pump', 'free money', 'click here', 'buy now', 'loan offer'];
    // Normalize a single token: lowercase, map leetspeak, collapse long repeats.
    function normToken(s) {
      let t = (s || '').toLowerCase();
      const map = { '@':'a','4':'a','8':'b','3':'e','1':'i','!':'i','0':'o','$':'s','5':'s','7':'t','+':'t','9':'g' };
      t = t.replace(/[@480!13$57+9]/g, c => map[c] || c);
      t = t.replace(/[^a-z]/g, '');
      t = t.replace(/(.)\1{2,}/g, '$1$1');
      return t;
    }
    // Words we match as WHOLE words only (they appear inside innocent words otherwise).
    const PROF_EXACT = new Set([
      'fuck','shit','bitch','ass','asshole','bastard','dick','pussy','cunt','cock','slut','whore',
      'nigger','nigga','faggot','fag','retard','retarded','motherfucker','jerkoff','wank','twat',
      'bollocks','rape','rapist','molest','pedophile','pedo','porn','jizz','boobs','tits',
      // Tagalog / Filipino
      'putangina','tangina','puta','gago','tanga','ulol','bobo','pakyu','tarantado','punyeta',
      'kupal','pakshet','burat','tite','iyot','kantot','pakingshet','bwiset','bwisit',
      // Kapampangan (Pampanga) profanity / vulgar terms
      'pestang','pesteng','buring','burit','buriti','luksu','luksung','kaluluku',
      'gaga','gagu','ogli','taratsu','kingnang','pota','potah','tibulan','pukingnan','babuyan',
      'bugok','buguk','nimal','nimals','tado','tadu','taddo',
      'letse','letche','pisti','pukyu','pukingina','pukinginang','tangnang','tangnank'
    ]);
    // Phrases matched anywhere (multi-word, safe to substring-match).
    const PROF_PHRASES = ['putang ina','tang ina','pota ina','child porn','pesteng anak','king nang mibaya'];
    // Core words also checked against spaced/punctuated evasion like "f u c k".
    const PROF_CORE = ['fuck','shit','bitch','cunt','nigger','nigga','faggot','putangina','rape','gago','pota','bugok','buguk','nimal','pukingina','tangnang'];
    function hasProfanity(text) {
      const raw = (text || '').toLowerCase();
      if (PROF_PHRASES.some(p => raw.includes(p))) return true;
      // Whole-word check (defeats leetspeak, avoids innocent substrings)
      const tokens = raw.split(/[^a-z0-9@!$+]+/).filter(Boolean);
      if (tokens.some(tok => PROF_EXACT.has(normToken(tok)))) return true;
      // Spaced-out evasion like "f u c k": only collapse RUNS of single letters
      // separated by spaces/dots, so normal prose ("and grape") is never merged.
      const deSpaced = raw.replace(/\b([a-z0-9@!$+])(?:[\s._\-*]+([a-z0-9@!$+])){2,}\b/g, (m) => m.replace(/[\s._\-*]+/g, ''));
      if (deSpaced !== raw) {
        const collapsed = normToken(deSpaced);
        if (PROF_CORE.some(w => collapsed.includes(w))) return true;
      }
      return false;
    }

    function spamReason(name, message) {
      const now = Date.now();
      if (now - lastPostAt < COOLDOWN_MS) {
        const wait = Math.ceil((COOLDOWN_MS - (now - lastPostAt)) / 1000);
        return { type: 'info', msg: `Please wait ${wait}s before posting again.` };
      }
      if (postsThisSession >= MAX_PER_SESSION) return { type: 'info', msg: 'You\'ve posted a lot this session — take a short break 🙂' };
      if (message.length < 2) return { type: 'info', msg: 'Message is too short.' };
      if (message === lastPostText) return { type: 'info', msg: 'That looks like a duplicate.' };
      // Inappropriate language — check BOTH the name and the message
      if (hasProfanity(message) || hasProfanity(name)) return { type: 'blocked', msg: 'Please keep it respectful — that language isn\'t allowed here.' };
      const low = message.toLowerCase();
      if (SPAM.some(w => low.includes(w))) return { type: 'blocked', msg: 'That message looks like spam and wasn\'t posted.' };
      const links = (message.match(/https?:\/\//g) || []).length;
      if (links > 2) return { type: 'info', msg: 'Too many links.' };
      // crude "shouting/spam" check: excessive repeated characters
      if (/(.)\1{9,}/.test(message)) return { type: 'info', msg: 'Please avoid spammy repeated characters.' };
      return null;
    }

    // Send a message
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (nameInput?.value || '').trim().slice(0, 40);
      let message = (msgInput?.value || '').trim().slice(0, 500);
      if (!message) return;

      const reason = spamReason(name, message);
      if (reason) {
        if (reason.type === 'blocked') { showBlockedAlert(reason.msg); }
        else if (statusEl) { statusEl.textContent = reason.msg; }
        return;
      }

      // If replying, prepend a compact reply marker the renderer understands
      if (replyingTo) {
        const snip = replyingTo.snippet.replace(/[\r\n]+/g, ' ').slice(0, 90);
        message = `⤷{{reply:${replyingTo.name.slice(0,40)}::${snip}}}\n` + message;
      }

      try { if (name) localStorage.setItem('agq-community-name', name); } catch (err) {}

      // 1) Render the message IMMEDIATELY (optimistic), before touching the DB.
      //    This guarantees the sender always sees their message, even if the
      //    network/DB is slow, throws, or the realtime echo never arrives.
      const tempId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      const optimisticRow = {
        id: tempId,
        name: name || 'Anonymous',
        message,
        created_at: new Date().toISOString(),
        _optimistic: true,
        _mineHint: true
      };
      try { addMessageEl(optimisticRow); } catch (e) { console.error(e); }
      // Guarantee the just-sent message is visible: clear any active filter state
      // on it and scroll the feed to the bottom so the sender always sees it.
      if (feed) {
        let justSent = feed.querySelector(`[data-mid="${tempId}"]`);
        // Failsafe: if the rich renderer didn't produce a node (threw), append a
        // simple bubble so the sender ALWAYS sees their message.
        if (!justSent) {
          if (emptyMsg) emptyMsg.hidden = true;
          const w = document.createElement('div');
          w.className = 'community-msg is-mine';
          w.setAttribute('data-mid', tempId);
          w.setAttribute('data-optmsg', String(message));
          w.setAttribute('data-optname', String(name || 'Anonymous'));
          const b = document.createElement('div'); b.className = 'community-msg-bubble';
          const h = document.createElement('div'); h.className = 'community-msg-head';
          const nm = document.createElement('span'); nm.className = 'community-msg-who'; nm.textContent = 'You';
          h.append(nm); b.append(h);
          // If this is a reply, render the quote block too (same parser as the rich renderer)
          let plainBody = String(message);
          const frm = plainBody.match(/^⤷\{\{reply:([^:]*)::([\s\S]*?)\}\}\n?([\s\S]*)$/);
          if (frm) {
            const q = document.createElement('button');
            q.type = 'button'; q.className = 'community-msg-quote';
            q.innerHTML = `<span class="community-quote-name">${escapeHtml(frm[1] || 'someone')}</span><span class="community-quote-text">${escapeHtml(frm[2] || '')}</span>`;
            q.addEventListener('click', () => jumpToOriginal(frm[1] || '', frm[2] || '', w));
            b.append(q);
            plainBody = frm[3] || '';
          }
          const p = document.createElement('p'); p.className = 'community-msg-text';
          p.textContent = plainBody;
          b.append(p);
          // actions with a working Delete button
          const acts = document.createElement('div'); acts.className = 'community-msg-actions';
          const dl = document.createElement('button'); dl.type = 'button'; dl.className = 'community-msg-del'; dl.textContent = 'Delete';
          dl.setAttribute('aria-label', 'Delete this message');
          dl.addEventListener('click', () => { if (confirm('Delete this message?')) deleteMessage(w.getAttribute('data-mid'), w); });
          acts.append(dl); b.append(acts);
          const avs = document.createElement('span'); avs.className = 'community-msg-av';
          avs.textContent = initials(name || 'Anonymous'); avs.style.background = colorFor(name || 'Anonymous');
          w.append(avs, b);
          feed.appendChild(w);
          justSent = w;
        }
        if (justSent) { justSent.style.display = ''; }
        feed.scrollTop = feed.scrollHeight;
        if (jumpBtn) { jumpBtn.hidden = true; jumpBtn.classList.remove('has-new'); }
      }

      // Clear the composer right away for a snappy feel
      const sentMessage = message;
      if (msgInput) msgInput.value = '';
      cancelReply();
      updateCount();
      if (name) updateVisitorName(name);
      lastPostAt = Date.now(); lastPostText = sentMessage; postsThisSession++;
      if (statusEl) statusEl.textContent = '';

      // 2) Persist to Supabase. On success, upgrade the temp node to the real id.
      //    On failure, flag the message so the sender knows it didn't save.
      try {
        const myG = myGender();
        let ins = await sb.from('messages').insert(myG ? { name: name || 'Anonymous', message: sentMessage, gender: myG } : { name: name || 'Anonymous', message: sentMessage }).select();
        // If the DB has no "gender" column yet, retry without it so posting still works.
        if (ins.error && myG && /gender/i.test(ins.error.message || '')) {
          ins = await sb.from('messages').insert({ name: name || 'Anonymous', message: sentMessage }).select();
        }
        const { data, error } = ins;
        if (error) throw error;
        if (data && data[0] && data[0].id != null) {
          rememberMine(data[0].id);
          // upgrade the optimistic node with the real id (so edit/delete work + de-dup)
          const tempNode = feed && feed.querySelector(`[data-mid="${tempId}"]`);
          if (tempNode) {
            tempNode.setAttribute('data-mid', data[0].id);
            tempNode.removeAttribute('data-optmsg'); tempNode.removeAttribute('data-optname');
          }
        }
      } catch (err) {
        console.error('[community] message insert failed:', err);
        const tempNode = feed && feed.querySelector(`[data-mid="${tempId}"]`);
        if (tempNode) {
          tempNode.classList.add('is-failed');
          const b = tempNode.querySelector('.community-msg-text');
          if (b && !tempNode.querySelector('.community-msg-failed')) {
            const f = document.createElement('span');
            f.className = 'community-msg-failed';
            f.textContent = ' · not sent';
            b.appendChild(f);
          }
        }
        if (statusEl) statusEl.textContent = 'Message could not be saved (check connection / Supabase policies).';
      }
    });

    // ---- Visitor log ----
    function relTime(ts) {
      const d = new Date(ts).getTime();
      if (isNaN(d)) return '';
      const s = Math.floor((Date.now() - d) / 1000);
      if (s < 60) return 'just now';
      if (s < 3600) return Math.floor(s / 60) + 'm ago';
      if (s < 86400) return Math.floor(s / 3600) + 'h ago';
      return Math.floor(s / 86400) + 'd ago';
    }
    function renderVisitors(rows) {
      if (!visitorList) return;
      visitorList.innerHTML = '';
      // De-duplicate by name (keep most recent), so the list feels like "who's around"
      const seen = new Set(); const uniq = [];
      (rows || []).forEach(v => {
        const key = (v.name && v.name.trim() ? v.name.trim() : 'Anonymous').toLowerCase();
        if (key !== 'anonymous' && seen.has(key)) return;
        if (key !== 'anonymous') seen.add(key);
        uniq.push(v);
      });
      uniq.slice(0, 14).forEach(v => {
        const nm = v.name && v.name.trim() ? v.name.trim() : 'Anonymous';
        const li = document.createElement('li');
        li.className = 'community-visitor';
        const av = document.createElement('span');
        av.className = 'community-visitor-av';
        const g = (v.gender || '').toLowerCase();
        if (g === 'female') { setGenderAvatar(av, 'female'); }
        else if (g === 'male') { setGenderAvatar(av, 'male'); }
        else { av.textContent = initials(nm); av.style.background = colorFor(nm); }
        const info = document.createElement('div'); info.className = 'community-visitor-info';
        const name = document.createElement('span'); name.className = 'community-visitor-name'; name.textContent = nm;
        const t = document.createElement('span'); t.className = 'community-visitor-time mono'; t.textContent = relTime(v.created_at);
        info.append(name, t);
        li.append(av, info);
        visitorList.appendChild(li);
      });
    }

    // Log this visit ONCE per browser (not per session), so each visitor is
    // counted a single time. The visit id is stored in localStorage so repeat
    // sessions reuse the same row instead of creating duplicates.
    let myVisitId = null;
    try { myVisitId = localStorage.getItem('agq-visit-id') || sessionStorage.getItem('agq-visit-id'); } catch (e) {}

    // Gender helper — used to pick a default forum profile avatar.
    function myGender() {
      try { return (localStorage.getItem('agq-gender') || '').trim().toLowerCase(); } catch (e) { return ''; }
    }

    // Custom on-brand welcome dialog that collects name + gender in one step.
    // Returns a Promise resolving to the chosen name (may be '' if skipped).
    function runWelcomeDialog() {
      return new Promise((resolve) => {
        let known = '';
        try { known = (localStorage.getItem('agq-community-name') || '').trim(); } catch (e) {}
        let asked = false;
        try { asked = localStorage.getItem('agq-welcome-done') === '1'; } catch (e) {}
        // If we already have a name or already asked, don't show again.
        if (known || asked) {
          if (known && nameInput && !nameInput.value.trim()) nameInput.value = known;
          return resolve(known);
        }
        const overlay = $('#welcomeOverlay');
        const nameEl = $('#welcomeName');
        const errEl = $('#welcomeErr');
        const genderBox = $('#welcomeGender');
        const goBtn = $('#welcomeGo');
        const skipBtn = $('#welcomeSkip');
        if (!overlay || !nameEl) { // fallback: no dialog in DOM
          try { localStorage.setItem('agq-welcome-done', '1'); } catch (e) {}
          return resolve('');
        }
        let chosenGender = '';
        overlay.hidden = false;
        // Fill the gender option previews with the same SVG avatars used in the forum
        try {
          const wf = $('#wgFemale'), wm = $('#wgMale');
          if (wf) wf.innerHTML = genderAvatarSVG('female');
          if (wm) wm.innerHTML = genderAvatarSVG('male');
        } catch (e) {}
        setTimeout(() => { try { nameEl.focus(); } catch (e) {} }, 100);

        genderBox?.addEventListener('click', (e) => {
          const opt = e.target.closest('.welcome-gender-opt');
          if (!opt) return;
          chosenGender = opt.dataset.gender || '';
          $$('.welcome-gender-opt', genderBox).forEach(b => b.classList.toggle('is-selected', b === opt));
        });

        function finish(nameVal) {
          try { localStorage.setItem('agq-welcome-done', '1'); } catch (e) {}
          if (nameVal) { try { localStorage.setItem('agq-community-name', nameVal); } catch (e) {} }
          if (chosenGender) { try { localStorage.setItem('agq-gender', chosenGender); } catch (e) {} }
          overlay.hidden = true;
          if (nameVal && nameInput && !nameInput.value.trim()) nameInput.value = nameVal;
          resolve(nameVal || '');
        }

        function submit() {
          const clean = (nameEl.value || '').trim().slice(0, 40);
          if (clean && typeof hasProfanity === 'function' && hasProfanity(clean)) {
            if (errEl) { errEl.hidden = false; errEl.textContent = 'Please choose a friendlier name.'; }
            return;
          }
          if (errEl) errEl.hidden = true;
          finish(clean);
        }
        goBtn?.addEventListener('click', submit);
        skipBtn?.addEventListener('click', () => finish(''));
        nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      });
    }

    (async function logVisit() {
      // Wait until the page has loaded (preloader gone) before prompting, so the
      // name popup doesn't appear over the loading screen.
      function ready(cb) {
        if (document.readyState === 'complete') setTimeout(cb, 600);
        else window.addEventListener('load', () => setTimeout(cb, 600), { once: true });
      }
      const vname = await new Promise((resolve) => { ready(() => resolve(runWelcomeDialog())); }).then(r => r);
      if (!myVisitId) {
        try {
          const myG = myGender();
          let vins = await sb.from('visitors').insert(myG ? { name: vname || 'Anonymous', gender: myG } : { name: vname || 'Anonymous' }).select();
          if (vins.error && myG && /gender/i.test(vins.error.message || '')) {
            vins = await sb.from('visitors').insert({ name: vname || 'Anonymous' }).select();
          }
          const data = vins.data;
          if (data && data[0]) {
            myVisitId = data[0].id;
            try { localStorage.setItem('agq-visit-id', String(myVisitId)); sessionStorage.setItem('agq-visit-id', String(myVisitId)); } catch (e) {}
          }
        } catch (e) {}
      }
      // Load recent visitors + total count
      const { data } = await sb.from('visitors').select('*').order('created_at', { ascending: false }).limit(20);
      renderVisitors(data);
      const { count } = await sb.from('visitors').select('*', { count: 'exact', head: true });
      if (visitorCount && typeof count === 'number') visitorCount.textContent = '· ' + count.toLocaleString() + ' total';
      const vStat = $('#communityVisitorStat');
      if (vStat && typeof count === 'number') { vStat.textContent = count.toLocaleString(); if (statsBar) statsBar.hidden = false; }
    })();

    // When the user types/sets their name, update their visitor row so it isn't "Anonymous"
    async function refreshVisitors() {
      const { data } = await sb.from('visitors').select('*').order('created_at', { ascending: false }).limit(20);
      renderVisitors(data);
    }
    async function updateVisitorName(newName) {
      const n = (newName || '').trim();
      if (!n) return;
      // If we somehow don't have a visit row yet, create one with the name
      if (!myVisitId) {
        try {
          const { data, error } = await sb.from('visitors').insert({ name: n }).select();
          if (error) console.error('[community] visitor insert failed:', error);
          if (data && data[0]) { myVisitId = data[0].id; try { localStorage.setItem('agq-visit-id', String(myVisitId)); sessionStorage.setItem('agq-visit-id', String(myVisitId)); } catch (e) {} }
        } catch (e) { console.error('[community] visitor insert threw:', e); }
      } else {
        try {
          const { data, error } = await sb.from('visitors').update({ name: n }).eq('id', myVisitId).select();
          if (error) console.error('[community] visitor name update failed (check UPDATE policy):', error);
          // If the update matched no rows (row gone or RLS blocked), create a fresh named row
          if (!error && (!data || !data.length)) {
            const ins = await sb.from('visitors').insert({ name: n }).select();
            if (ins.data && ins.data[0]) { myVisitId = ins.data[0].id; try { localStorage.setItem('agq-visit-id', String(myVisitId)); sessionStorage.setItem('agq-visit-id', String(myVisitId)); } catch (e) {} }
          }
        } catch (e) { console.error('[community] visitor update threw:', e); }
      }
      refreshVisitors();
    }
    let nameSaveTimer = null;
    nameInput?.addEventListener('input', () => {
      clearTimeout(nameSaveTimer);
      nameSaveTimer = setTimeout(() => {
        const n = (nameInput.value || '').trim();
        if (n) { try { localStorage.setItem('agq-community-name', n); } catch (e) {} updateVisitorName(n); }
      }, 600);
    });

    // Realtime visitor updates (INSERT and UPDATE both refresh the list)
    sb.channel('public:visitors')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitors' }, () => { refreshVisitors(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'visitors' }, () => { refreshVisitors(); })
      .subscribe();
  }

  function initContactForm() {
    const form = $('#contactForm');
    if (!form) return;
    const status = $('#formStatus');
    const fields = {
      name: $('#cfName'),
      email: $('#cfEmail'),
      message: $('#cfMessage')
    };
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setError(input, msg) {
      const wrap = input.closest('.field');
      if (!wrap) return;
      const el = wrap.querySelector('.field-error');
      wrap.classList.toggle('has-error', !!msg);
      if (el) el.textContent = msg || '';
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }

    function validate(input) {
      const v = input.value.trim();
      if (input === fields.name) return v.length >= 2 ? '' : 'Please enter your name.';
      if (input === fields.email) return emailRe.test(v) ? '' : 'Enter a valid email address.';
      if (input === fields.message) return v.length >= 10 ? '' : 'A few more words, please (10+ characters).';
      return '';
    }

    Object.values(fields).forEach(input => {
      input?.addEventListener('blur', () => setError(input, validate(input)));
      input?.addEventListener('input', () => {
        if (input.closest('.field')?.classList.contains('has-error')) setError(input, validate(input));
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      Object.values(fields).forEach(input => {
        const err = validate(input);
        setError(input, err);
        if (err) ok = false;
      });
      if (!ok) {
        if (status) { status.textContent = 'Please fix the highlighted fields.'; status.className = 'form-status is-error'; }
        return;
      }
      // Real delivery via Formspree — message is emailed straight to the inbox.
      const name = fields.name.value.trim(), mail = fields.email.value.trim(), msg = fields.message.value.trim();
      const submitBtn = form.querySelector('button[type="submit"]');
      const btnLabel = submitBtn ? submitBtn.querySelector('span') : null;
      const origLabel = btnLabel ? btnLabel.textContent : '';
      if (submitBtn) submitBtn.disabled = true;
      if (btnLabel) btnLabel.textContent = 'Sending…';
      if (status) { status.textContent = 'Sending your message…'; status.className = 'form-status'; }

      const ENDPOINT = 'https://formspree.io/f/xbdnrlan';
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: (() => { const fd = new FormData();
          fd.append('name', name); fd.append('email', mail); fd.append('message', msg);
          fd.append('_subject', `Portfolio message from ${name}`); return fd; })()
      }).then(res => {
        if (res.ok) {
          if (status) { status.textContent = '✓ Message sent — thank you! Allyssa will reply to your email soon.'; status.className = 'form-status is-ok'; }
          if (window.__agqSound) window.__agqSound.play('success');
          form.reset();
        } else {
          return res.json().then(data => {
            const m = (data && data.errors && data.errors.map(e => e.message).join(', ')) || 'Something went wrong.';
            throw new Error(m);
          });
        }
      }).catch(err => {
        // Network/other failure — offer a direct-email fallback so the message is never lost
        try { navigator.clipboard && navigator.clipboard.writeText(`From: ${name} <${mail}>\n\n${msg}`); } catch (e) {}
        if (status) { status.innerHTML = 'Couldn\'t send automatically. <span class="form-status-note">Your message was copied to the clipboard — please email allyssageannequinit@gmail.com directly.</span>'; status.className = 'form-status is-error'; }
      }).finally(() => {
        if (submitBtn) submitBtn.disabled = false;
        if (btnLabel) btnLabel.textContent = origLabel || 'Send message';
      });
    });
  }

  /* ---------- Reading time indicator ---------- */
  function initReadingTime() {
    $$('[data-reading-time]').forEach(el => {
      const target = document.querySelector(el.dataset.readingTime);
      if (!target) return;
      const words = target.textContent.trim().split(/\s+/).length;
      const mins = Math.max(1, Math.round(words / 200));
      el.textContent = `${mins} min read`;
    });
  }

  /* ---------- Global toast (reuses #eggToast) ---------- */
  function initToast() {
    const toast = $('#eggToast');
    let timer = null;
    if (toast) {
      // Build the inner structure once (icon + message)
      toast.innerHTML = '<span class="egg-toast-icon" aria-hidden="true"></span><span class="egg-toast-msg"></span>';
    }
    const iconEl = toast ? toast.querySelector('.egg-toast-icon') : null;
    const msgEl = toast ? toast.querySelector('.egg-toast-msg') : null;
    // Emoji-prefix detection so a leading emoji becomes the icon
    const emojiRe = /^(\p{Extended_Pictographic}(?:\uFE0F)?)\s*/u;
    window.__agqToast = function (msg, opts) {
      if (!toast || !msgEl) return;
      opts = opts || {};
      let text = String(msg == null ? '' : msg);
      let icon = opts.icon || '';
      if (!icon) {
        const m = text.match(emojiRe);
        if (m) { icon = m[1]; text = text.slice(m[0].length); }
      }
      if (icon) { iconEl.textContent = icon; iconEl.style.display = ''; }
      else if (iconEl) { iconEl.style.display = 'none'; }
      msgEl.textContent = text;
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      // retrigger entrance animation
      toast.classList.remove('is-show');
      void toast.offsetWidth;
      toast.classList.add('is-show');
      clearTimeout(timer);
      timer = setTimeout(() => toast.classList.remove('is-show'), opts.duration || 2800);
    };
  }

  /* ---------- Keyboard shortcuts help overlay ---------- */
  function initShortcuts() {
    document.querySelectorAll('.shortcuts-overlay').forEach(el => el.remove());
    const rows = [
      ['/', 'Open the quick-nav command palette'],
      ['Ctrl / ⌘ + K', 'Open the quick-nav command palette'],
      ['T', 'Toggle light / dark mode'],
      ['Shift + A', 'Cycle the accent gradient'],
      ['?', 'Show this shortcuts panel'],
      ['↑ ↓', 'Move through palette results'],
      ['Enter', 'Run the selected result'],
      ['Esc', 'Close any open panel'],
    ];
    const overlay = document.createElement('div');
    overlay.className = 'shortcuts-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="shortcuts-panel" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <div class="shortcuts-head">
          <h3>Keyboard shortcuts</h3>
          <button class="shortcuts-close" aria-label="Close shortcuts">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <ul class="shortcuts-list">
          ${rows.map(([k, d]) => `<li><span class="shortcuts-desc">${d}</span><kbd class="mono">${k}</kbd></li>`).join('')}
        </ul>
      </div>`;
    document.body.appendChild(overlay);
    const closeBtn = overlay.querySelector('.shortcuts-close');

    function open() { overlay.hidden = false; document.body.style.overflow = 'hidden'; setTimeout(() => closeBtn?.focus(), 30); }
    function close() { overlay.hidden = true; document.body.style.overflow = ''; }
    function toggle() { overlay.hidden ? open() : close(); }

    closeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); close(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    window.__agqShortcuts = toggle;

    document.addEventListener('keydown', (e) => {
      const inField = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (!overlay.hidden) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
        return;
      }
      if (!inField && e.key === '?') { e.preventDefault(); open(); }
    });
  }

  /* ---------- Selectable animated background (opt-in) ---------- */
  function initBackgroundFx() {
    const layer = $('#bgCode');
    const box = $('#bgOptions');
    if (!layer) return;

    function build(style) {
      if (layer._cleanupNet) { layer._cleanupNet(); layer._cleanupNet = null; }
      layer.innerHTML = '';
      layer.className = 'bg-code bg-code--' + style;
      if (prefersReducedMotion || style === 'none') return;

      if (style === 'code') {
        const symbols = ['{ }', '</>', '//', '( )', '< >', '[ ]', '=>', '&&', '::', '*', ';'];
        const count = window.innerWidth < 700 ? 9 : 16;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
          const s = document.createElement('span');
          s.className = 'code-glyph mono';
          s.textContent = symbols[Math.floor(Math.random() * symbols.length)];
          s.style.left = Math.random() * 100 + '%';
          s.style.top = Math.random() * 100 + '%';
          s.style.fontSize = (0.8 + Math.random() * 1.9).toFixed(2) + 'rem';
          s.style.animationDuration = (16 + Math.random() * 20).toFixed(1) + 's';
          s.style.animationDelay = (-Math.random() * 20).toFixed(1) + 's';
          s.style.setProperty('--drift', (Math.random() * 60 - 30).toFixed(0) + 'px');
          frag.appendChild(s);
        }
        layer.appendChild(frag);
      } else if (style === 'dots' || style === 'stars') {
        const count = window.innerWidth < 700 ? 22 : 42;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
          const d = document.createElement('span');
          d.className = style === 'stars' ? 'bg-star' : 'bg-dot';
          const sz = style === 'stars' ? (1.5 + Math.random() * 2.5) : (3 + Math.random() * 6);
          d.style.left = Math.random() * 100 + '%';
          d.style.top = Math.random() * 100 + '%';
          d.style.width = d.style.height = sz.toFixed(1) + 'px';
          d.style.animationDuration = (5 + Math.random() * 9).toFixed(1) + 's';
          d.style.animationDelay = (-Math.random() * 10).toFixed(1) + 's';
          d.style.setProperty('--drift', (Math.random() * 40 - 20).toFixed(0) + 'px');
          frag.appendChild(d);
        }
        layer.appendChild(frag);
      } else if (style === 'mesh') {
        for (let i = 0; i < 3; i++) {
          const b = document.createElement('span');
          b.className = 'bg-mesh-blob bg-mesh-blob--' + (i + 1);
          layer.appendChild(b);
        }
      } else if (style === 'sakura') {
        const count = window.innerWidth < 700 ? 14 : 26;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
          const p = document.createElement('span');
          p.className = 'bg-petal';
          p.style.left = Math.random() * 100 + '%';
          p.style.setProperty('--sz', (7 + Math.random() * 9).toFixed(0) + 'px');
          p.style.animationDuration = (7 + Math.random() * 9).toFixed(1) + 's';
          p.style.animationDelay = (-Math.random() * 12).toFixed(1) + 's';
          p.style.setProperty('--sway', (Math.random() * 80 - 40).toFixed(0) + 'px');
          frag.appendChild(p);
        }
        layer.appendChild(frag);
      } else if (style === 'matrix') {
        const cols = Math.floor(window.innerWidth / 26);
        const frag = document.createDocumentFragment();
        const chars = '01</>{}[]=+*';
        for (let i = 0; i < cols; i++) {
          const c = document.createElement('span');
          c.className = 'bg-matrix-col mono';
          let str = '';
          for (let j = 0; j < 18; j++) str += chars[Math.floor(Math.random() * chars.length)] + '<br>';
          c.innerHTML = str;
          c.style.left = (i * 26) + 'px';
          c.style.animationDuration = (4 + Math.random() * 6).toFixed(1) + 's';
          c.style.animationDelay = (-Math.random() * 8).toFixed(1) + 's';
          frag.appendChild(c);
        }
        layer.appendChild(frag);
      } else if (style === 'grid') {
        // pure CSS animated grid — nothing to inject
      } else if (style === 'constellation') {
        renderConstellation(layer);
      } else if (THEME_MOTIFS[style]) {
        spawnFloaters(layer, style);
      }
    }

    /* ---- Original genre-inspired motifs (abstract SVG, no IP) ---- */
    const S = {
      shuriken: '<path d="M12 2l2.5 7L22 12l-7.5 3L12 22l-2.5-7L2 12l7.5-3z" fill="currentColor"/>',
      swirl: '<path d="M12 3a9 9 0 11-6 15.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M12 7a5 5 0 10-3.5 8.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
      bolt: '<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/>',
      ring: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/>',
      burst: '<path d="M12 2l2 6 6-2-4 5 4 5-6-2-2 6-2-6-6 2 4-5-4-5 6 2z" fill="currentColor"/>',
      compass: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6l2.5 5.5L12 18l-2.5-6.5z" fill="currentColor"/>',
      wave: '<path d="M2 12c3-4 5-4 8 0s5 4 8 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
      anchor: '<circle cx="12" cy="5" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v13M6 13a6 6 0 0012 0M8 11H4M16 11h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      pixel: '<rect x="4" y="4" width="16" height="16" rx="1.5" fill="currentColor"/>',
      sparkle4: '<path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z" fill="currentColor"/>',
      rune: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 5v14M7 8l10 8M17 8L7 16" stroke="currentColor" stroke-width="1.3"/>',
      bubble: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9" r="2" fill="currentColor" opacity=".5"/>',
      star: '<path d="M12 3l2.6 6.3 6.8.5-5.2 4.4 1.7 6.6L12 17.8 6.1 21.3l1.7-6.6L2.6 9.8l6.8-.5z" fill="currentColor"/>',
      squiggle: '<path d="M3 14c2-6 5-6 7 0s5 6 7 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
      heart: '<path d="M12 20s-7-4.6-9-9c-1.4-3 .6-6 3.5-6 2 0 3.5 1.5 5.5 4 2-2.5 3.5-4 5.5-4C20.4 5 22.4 8 21 11c-2 4.4-9 9-9 9z" fill="currentColor"/>',
      cloud: '<path d="M6 16a4 4 0 010-8 5 5 0 019.6-1.5A3.5 3.5 0 0117 16z" fill="currentColor"/>',
      speech: '<path d="M4 5h16v10H9l-4 4v-4H4z" fill="currentColor"/>'
    };
    const THEME_MOTIFS = {
      ninja:   { shapes: ['shuriken','swirl','bolt'], color: 'var(--grad-2)', n: 12, spin: true },
      pirate:  { shapes: ['compass','wave','anchor'], color: 'var(--grad-2)', n: 12 },
      hero:    { shapes: ['bolt','burst','ring'], color: 'var(--grad-1)', n: 12 },
      comic:   { shapes: ['burst','star','speech'], color: 'var(--grad-accent)', n: 12 },
      pixelfx: { shapes: ['pixel'], color: 'var(--grad-3)', n: 20, spin: false },
      fantasy: { shapes: ['sparkle4','rune','ring'], color: 'var(--grad-3)', n: 14 },
      bubbles: { shapes: ['bubble'], color: 'var(--grad-2)', n: 18, rise: true },
      doodle:  { shapes: ['star','squiggle','heart','cloud'], color: 'var(--grad-2)', n: 14 },
      energy:  { shapes: ['ring','swirl','sparkle4'], color: 'var(--grad-1)', n: 12, spin: true }
    };
    function spawnFloaters(host, style) {
      const cfg = THEME_MOTIFS[style];
      const count = window.innerWidth < 700 ? Math.round(cfg.n * 0.6) : cfg.n;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < count; i++) {
        const shape = cfg.shapes[Math.floor(Math.random() * cfg.shapes.length)];
        const el = document.createElement('span');
        el.className = 'bg-motif' + (cfg.spin ? ' bg-motif--spin' : '') + (cfg.rise ? ' bg-motif--rise' : '');
        el.style.color = cfg.color;
        const sz = 20 + Math.random() * 40;
        el.style.width = el.style.height = sz.toFixed(0) + 'px';
        el.style.left = Math.random() * 100 + '%';
        el.style.top = cfg.rise ? '' : Math.random() * 100 + '%';
        if (cfg.rise) el.style.bottom = '-10%';
        el.style.animationDuration = (cfg.rise ? (8 + Math.random() * 8) : (12 + Math.random() * 16)).toFixed(1) + 's';
        el.style.animationDelay = (-Math.random() * 16).toFixed(1) + 's';
        el.style.setProperty('--drift', (Math.random() * 70 - 35).toFixed(0) + 'px');
        el.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">${S[shape]}</svg>`;
        frag.appendChild(el);
      }
      host.appendChild(frag);
    }

    // Particle network on canvas (lightweight, capped)
    let constRAF = null;
    function renderConstellation(host) {
      if (constRAF) cancelAnimationFrame(constRAF);
      const cvs = document.createElement('canvas');
      cvs.className = 'bg-net-canvas';
      host.appendChild(cvs);
      const ctx = cvs.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let W, H, pts;
      function resize() {
        W = cvs.width = innerWidth * dpr; H = cvs.height = innerHeight * dpr;
        cvs.style.width = innerWidth + 'px'; cvs.style.height = innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize();
      const N = innerWidth < 700 ? 26 : 52;
      pts = Array.from({ length: N }, () => ({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35
      }));
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--grad-2').trim() || '#4FA0FF';
      function frame() {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        pts.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > innerWidth) p.vx *= -1;
          if (p.y < 0 || p.y > innerHeight) p.vy *= -1;
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 6.28); ctx.fillStyle = accent; ctx.globalAlpha = .5; ctx.fill();
        });
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
            const d = Math.hypot(dx, dy);
            if (d < 130) {
              ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
              ctx.strokeStyle = accent; ctx.globalAlpha = (1 - d / 130) * 0.18; ctx.lineWidth = 1; ctx.stroke();
            }
          }
        }
        constRAF = requestAnimationFrame(frame);
      }
      frame();
      const onResize = () => resize();
      window.addEventListener('resize', onResize);
      host._cleanupNet = () => { cancelAnimationFrame(constRAF); constRAF = null; window.removeEventListener('resize', onResize); };
    }

    const themeBox = $('#bgThemeOptions');
    function setBg(style) {
      // smooth fade between backgrounds
      layer.style.transition = 'opacity .35s ease';
      layer.style.opacity = '0';
      setTimeout(() => { build(style); layer.style.opacity = '1'; }, 200);
      try { localStorage.setItem('agq-bg', style); } catch (e) {}
      [box, themeBox].forEach(container => {
        if (!container) return;
        $$('.anim-opt', container).forEach(b => {
          const on = b.dataset.bg === style;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });
      });
    }

    let saved = 'none';
    try { saved = localStorage.getItem('agq-bg') || 'none'; } catch (e) {}
    build(saved); layer.style.opacity = '1';
    document.addEventListener('agq:set-bg', (e) => setBg(e.detail || 'none'));
    [box, themeBox].forEach(container => {
      if (!container) return;
      $$('.anim-opt', container).forEach(b => {
        const on = b.dataset.bg === saved;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.anim-opt');
        if (btn) setBg(btn.dataset.bg);
      });
    });
  }

  /* ---------- Confetti burst (used by easter egg) ---------- */
  function confettiBurst() {
    if (prefersReducedMotion) return;
    const cvs = document.createElement('canvas');
    cvs.className = 'confetti-canvas';
    document.body.appendChild(cvs);
    const ctx = cvs.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { cvs.width = innerWidth * dpr; cvs.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size();
    const colors = ['#7C5CFC', '#4FA0FF', '#33E5C4', '#FF6FB5', '#FFD16B'];
    const N = 140;
    const parts = Array.from({ length: N }, () => ({
      x: innerWidth / 2, y: innerHeight / 2,
      vx: (Math.random() - 0.5) * 14, vy: Math.random() * -14 - 4,
      s: 5 + Math.random() * 7, c: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, life: 0
    }));
    let raf;
    (function frame() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      parts.forEach(p => {
        p.vy += 0.32; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr; p.life++;
        if (p.y < innerHeight + 40) alive++;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - p.life / 150); ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      });
      if (alive > 0) raf = requestAnimationFrame(frame);
      else { cancelAnimationFrame(raf); cvs.remove(); }
    })();
    setTimeout(() => { cancelAnimationFrame(raf); cvs.remove(); }, 4000);
  }
  window.__agqConfetti = confettiBurst;

  /* ---------- AI Project Narrator (browser TTS) ---------- */
  function initNarrator() {
    if (!('speechSynthesis' in window)) return; // gracefully absent

    // Build a natural first-person walkthrough from project data
    function buildScript(p) {
      const s = [];
      s.push(`Hi, I'm Allyssa. Let me walk you through ${p.title}.`);
      if (p.overview) s.push(p.overview);
      s.push(`My role here was ${p.role}, and this was a ${(p.status || p.category)} from ${p.year}.`);
      if (p.features && p.features.length) {
        s.push(`Here's what it does. ` + p.features.join(' '));
      }
      if (p.process && p.process.length) {
        s.push(`My process moved through a few stages.`);
        p.process.forEach(st => s.push(`${st.title}: ${st.body}`));
      }
      if (p.tech && p.tech.length) s.push(`The main tools I used were ${p.tech.join(', ')}.`);
      s.push(`The biggest challenge was keeping the experience simple while covering everything it needed to do — I solved that by leaning on a consistent design system and testing early.`);
      s.push(`What I took away from ${p.title} was how much clarity comes from iterating with real feedback. Thanks for listening!`);
      // Flatten into sentences for highlighting/skip
      return s.join(' ').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) || [s.join(' ')];
    }

    const el = document.createElement('div');
    el.className = 'narrator'; el.hidden = true;
    el.innerHTML = `
      <div class="narrator-head">
        <span class="narrator-title mono">🎙 <span id="narrTitle">Walkthrough</span></span>
        <button class="narrator-x" id="narrClose" aria-label="Close player"><svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
      </div>
      <div class="narrator-wave" id="narrWave" aria-hidden="true">${Array.from({length:28}).map(()=>'<i></i>').join('')}</div>
      <div class="narrator-progress"><span id="narrProgress"></span></div>
      <div class="narrator-time mono"><span id="narrElapsed">0:00</span><span id="narrTotal">~0:00</span></div>
      <div class="narrator-controls">
        <button id="narrReplay" aria-label="Replay"><svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M4 12a8 8 0 108-8M4 12V6m0 6h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button id="narrBack" aria-label="Skip back"><svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M11 6L5 12l6 6M19 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button id="narrPlay" class="narrator-play" aria-label="Play or pause"><svg id="narrPlayIcon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
        <button id="narrFwd" aria-label="Skip forward"><svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M13 6l6 6-6 6M5 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button id="narrStop" aria-label="Stop"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>
      </div>
      <div class="narrator-row">
        <div class="narrator-speed">
          ${[0.75,1,1.25,1.5].map(r=>`<button class="narr-speed${r===1?' is-active':''}" data-rate="${r}">${r}x</button>`).join('')}
        </div>
        <button class="narr-transcript-toggle mono" id="narrTranscriptToggle" aria-expanded="false">Transcript</button>
      </div>
      <div class="narrator-transcript" id="narrTranscript" hidden></div>`;
    document.body.appendChild(el);

    const synth = window.speechSynthesis;
    let sentences = [], idx = 0, playing = false, paused = false, rate = 1, project = null;
    const $p = (s) => el.querySelector(s);
    const playIcon = $p('#narrPlayIcon'), progress = $p('#narrProgress'),
      elapsed = $p('#narrElapsed'), total = $p('#narrTotal'), wave = $p('#narrWave'),
      transcript = $p('#narrTranscript'), title = $p('#narrTitle');

    const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
    const ICON_PAUSE = '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>';

    function estTime() {
      const words = sentences.join(' ').split(/\s+/).length;
      const secs = Math.round(words / (2.6 * rate));
      return secs;
    }
    function fmt(s) { const m = Math.floor(s / 60); const ss = String(s % 60).padStart(2, '0'); return `${m}:${ss}`; }
    function renderTranscript() {
      transcript.innerHTML = sentences.map((s, i) => `<span class="narr-line${i === idx ? ' is-current' : ''}" data-i="${i}">${s.trim()}</span>`).join(' ');
    }
    function updateProgress() {
      const pct = sentences.length ? (idx / sentences.length) * 100 : 0;
      progress.style.width = pct + '%';
      const totalSecs = estTime();
      elapsed.textContent = fmt(Math.round(totalSecs * (idx / Math.max(1, sentences.length))));
      total.textContent = '~' + fmt(totalSecs);
      transcript.querySelectorAll('.narr-line').forEach((n, i) => n.classList.toggle('is-current', i === idx));
      const cur = transcript.querySelector('.is-current');
      if (cur && !transcript.hidden) cur.scrollIntoView({ block: 'nearest' });
    }
    // Prefer a female English voice for the walkthrough
    function pickFemaleVoice() {
      const voices = synth.getVoices() || [];
      const byName = voices.find(v => /female|samantha|victoria|karen|moira|tessa|fiona|serena|zira|susan|linda|allison|ava|joanna|salli|kimberly|amy|emma|google uk english female|google us english/i.test(v.name));
      const enFemaleHint = voices.find(v => /en/i.test(v.lang) && /(female|zira|samantha|susan|hazel|eva)/i.test(v.name));
      return byName || enFemaleHint || voices.find(v => /^en/i.test(v.lang)) || voices[0] || null;
    }
    let femaleVoice = pickFemaleVoice();
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.addEventListener?.('voiceschanged', () => { femaleVoice = pickFemaleVoice(); });
    }

    function speakFrom(i) {
      synth.cancel();
      idx = Math.max(0, Math.min(i, sentences.length - 1));
      updateProgress();
      const u = new SpeechSynthesisUtterance(sentences[idx]);
      u.rate = rate;
      if (!femaleVoice) femaleVoice = pickFemaleVoice();
      if (femaleVoice) u.voice = femaleVoice;
      u.pitch = 1.15;
      u.onend = () => {
        if (!playing || paused) return;
        if (idx < sentences.length - 1) { speakFrom(idx + 1); }
        else { stop(); }
      };
      synth.speak(u);
    }
    function play() {
      if (!sentences.length) return;
      playing = true; paused = false;
      el.classList.add('is-playing');
      playIcon.innerHTML = ICON_PAUSE;
      if (synth.paused) { synth.resume(); } else { speakFrom(idx); }
    }
    function pause() {
      paused = true; playing = false;
      el.classList.remove('is-playing');
      playIcon.innerHTML = ICON_PLAY;
      try { synth.pause(); } catch (e) { synth.cancel(); }
    }
    function stop() {
      playing = false; paused = false; idx = 0;
      el.classList.remove('is-playing');
      playIcon.innerHTML = ICON_PLAY;
      synth.cancel(); updateProgress();
    }
    function load(p) {
      project = p; sentences = buildScript(p); idx = 0;
      title.textContent = p.title + ' — Walkthrough';
      renderTranscript(); updateProgress();
    }
    function openFor(p) {
      stop(); load(p); el.hidden = false;
    }

    $p('#narrPlay').addEventListener('click', () => { playing && !paused ? pause() : play(); });
    $p('#narrStop').addEventListener('click', stop);
    $p('#narrReplay').addEventListener('click', () => { stop(); play(); });
    $p('#narrFwd').addEventListener('click', () => { if (idx < sentences.length - 1) { speakFrom(idx + 1); if (!playing) pause(); else play(); } });
    $p('#narrBack').addEventListener('click', () => { speakFrom(Math.max(0, idx - 1)); if (playing) play(); });
    $p('#narrClose').addEventListener('click', () => { stop(); el.hidden = true; });
    el.querySelectorAll('.narr-speed').forEach(b => b.addEventListener('click', () => {
      rate = parseFloat(b.dataset.rate);
      el.querySelectorAll('.narr-speed').forEach(x => x.classList.toggle('is-active', x === b));
      if (playing) { play(); } else { updateProgress(); }
    }));
    $p('#narrTranscriptToggle').addEventListener('click', () => {
      transcript.hidden = !transcript.hidden;
      $p('#narrTranscriptToggle').setAttribute('aria-expanded', String(!transcript.hidden));
      if (!transcript.hidden) updateProgress();
    });
    transcript.addEventListener('click', (e) => {
      const line = e.target.closest('.narr-line');
      if (line) { speakFrom(Number(line.dataset.i)); play(); }
    });

    // Open from any project modal's narrate button (delegated)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#narrateBtn');
      if (!btn) return;
      const p = PROJECTS.find(x => x.id === btn.dataset.project);
      if (p) openFor(p);
    });

    // Stop narration if the project modal closes
    window.__agqStopNarration = () => { if (!el.hidden) { stop(); el.hidden = true; } };
    window.addEventListener('beforeunload', () => synth.cancel());
  }

  /* ---------- Sound engine (synthesized, off by default) ---------- */
  const AGQSound = (function () {
    let enabled = false, volume = 0.5, ctx = null;
    try { enabled = localStorage.getItem('agq-sound') === '1'; } catch (e) {}
    try { const v = localStorage.getItem('agq-sound-vol'); if (v !== null) volume = Math.min(1, Math.max(0, parseInt(v, 10) / 100)); } catch (e) {}

    function ensureCtx() {
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    // Soft blip: quick sine/triangle with gentle envelope
    function blip(freq, dur, type, gainMul) {
      if (!enabled || prefersReducedMotion) return;
      const ac = ensureCtx(); if (!ac) return;
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = type || 'sine'; osc.frequency.value = freq;
      const peak = Math.max(0.0001, volume * (gainMul || 0.14));
      const t = ac.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
      osc.connect(g); g.connect(ac.destination);
      osc.start(t); osc.stop(t + (dur || 0.12) + 0.02);
    }
    const sounds = {
      click: () => blip(430, 0.09, 'sine', 0.13),
      nav: () => blip(520, 0.08, 'triangle', 0.11),
      hover: () => blip(680, 0.05, 'sine', 0.05),
      toggle: () => { blip(360, 0.07, 'sine', 0.12); setTimeout(() => blip(540, 0.07, 'sine', 0.1), 60); },
      modal: () => { blip(300, 0.1, 'sine', 0.12); setTimeout(() => blip(460, 0.12, 'sine', 0.1), 70); },
      close: () => { blip(460, 0.08, 'sine', 0.1); setTimeout(() => blip(300, 0.1, 'sine', 0.1), 60); },
      success: () => { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.14, 'sine', 0.12), i * 90)); },
      achievement: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.13), i * 95)); },
      theme: () => { blip(587, 0.1, 'sine', 0.11); setTimeout(() => blip(880, 0.12, 'sine', 0.1), 80); }
    };
    return {
      play: (name) => { const fn = sounds[name]; if (fn) fn(); },
      setEnabled: (on) => { enabled = on; try { localStorage.setItem('agq-sound', on ? '1' : '0'); } catch (e) {} if (on) ensureCtx(); },
      setVolume: (v) => { volume = Math.min(1, Math.max(0, v)); try { localStorage.setItem('agq-sound-vol', String(Math.round(volume * 100))); } catch (e) {} },
      isEnabled: () => enabled,
      getVolume: () => volume
    };
  })();
  window.__agqSound = AGQSound;

  function initSound() {
    const toggle = $('#soundToggle');
    const volWrap = $('#soundVolumeWrap');
    const vol = $('#soundVolume');
    if (!toggle) return;

    function reflect() {
      const on = AGQSound.isEnabled();
      toggle.setAttribute('aria-checked', String(on));
      toggle.classList.toggle('is-on', on);
      if (volWrap) volWrap.hidden = !on;
      if (vol) vol.value = String(Math.round(AGQSound.getVolume() * 100));
    }
    reflect();

    toggle.addEventListener('click', () => {
      const next = !AGQSound.isEnabled();
      AGQSound.setEnabled(next);
      reflect();
      if (next) AGQSound.play('toggle');
    });
    vol?.addEventListener('input', () => {
      AGQSound.setVolume(parseInt(vol.value, 10) / 100);
    });
    vol?.addEventListener('change', () => AGQSound.play('click'));

    // Global sound wiring (delegated)
    document.addEventListener('click', (e) => {
      if (!AGQSound.isEnabled()) return;
      const t = e.target;
      if (t.closest('.nav-link, .dot-nav__item')) { AGQSound.play('nav'); return; }
      if (t.closest('.pcard, .theme-toggle')) return; // these have dedicated sounds
      if (t.closest('.btn, .filter-btn, .social-btn, .anim-opt, .accent-swatch, .cmdk-item, .ach-fab, .back-to-top, #themePanelToggle')) { AGQSound.play('click'); }
    }, true);
  }

  /* ---------- Visitor achievements ---------- */
  function initAchievements() {
    const fab = $('#achFab'), panel = $('#achPanel'), list = $('#achList'),
      countEl = $('#achCount'), progEl = $('#achProgress'), barFill = $('#achBarFill');
    if (!fab || !panel) return;

    const defs = [
      { id: 'first', icon: '🏆', label: 'First Visit', how: 'Automatic — you just arrived. Welcome!' },
      { id: 'explore', icon: '🔍', label: 'Explorer', how: 'Scroll through and view every section of the site.' },
      { id: 'projects', icon: '📂', label: 'Project Scout', how: 'Open every project card in the Projects section.' },
      { id: 'theme', icon: '🎨', label: 'Stylist', how: 'Open the theme panel (top-right) and change the accent or mode.' },
      { id: 'egg', icon: '⭐', label: 'Secret Finder', how: 'Click the “AGQ” logo (top-left) three times quickly. 🖱️' },
      { id: 'night', icon: '🌙', label: 'Night Owl', how: 'Visit the site after 7 PM your local time.' },
      { id: 'earlybird', icon: '☀️', label: 'Early Bird', how: 'Visit the site between 5 AM and 9 AM.' }
    ];
    const TOTAL = defs.length;
    const surprise = $('#achSurprise');
    const surpriseText = $('#achSurpriseText');
    const surpriseBtn = $('#achSurpriseBtn');
    let unlocked = new Set();
    try { unlocked = new Set(JSON.parse(localStorage.getItem('agq-ach') || '[]')); } catch (e) {}

    function save() { try { localStorage.setItem('agq-ach', JSON.stringify([...unlocked])); } catch (e) {} }
    function render() {
      list.innerHTML = defs.map(d => {
        const on = unlocked.has(d.id);
        return `<li class="ach-item${on ? ' is-unlocked' : ''}">
          <span class="ach-ico">${on ? d.icon : '🔒'}</span>
          <span class="ach-meta"><b>${d.label}</b><em>${on ? 'Unlocked ✓' : d.how}</em></span>
        </li>`;
      }).join('');
      countEl.textContent = String(unlocked.size);
      progEl.textContent = `${unlocked.size} / ${TOTAL}`;
      barFill.style.width = (unlocked.size / TOTAL * 100) + '%';
      fab.classList.toggle('has-all', unlocked.size === TOTAL);
      if (surprise) surprise.hidden = unlocked.size !== TOTAL;
    }
    function revealSurprise() {
      if (surpriseText) surpriseText.innerHTML = 'You explored everything — thank you! As a little reward, here\'s an exclusive <b>“Midnight Gold”</b> theme, and a fast track to reach me: mention <b>“AGQ Explorer”</b> in your email and I\'ll reply first. 💛';
      // apply an exclusive hidden accent + celebrate
      document.documentElement.setAttribute('data-accent', 'goldenhour');
      try { localStorage.setItem('agq-accent', 'goldenhour'); } catch (e) {}
      if (window.__agqConfetti) window.__agqConfetti();
      if (window.__agqSound) window.__agqSound.play('success');
    }
    function unlock(id) {
      if (!defs.some(d => d.id === id) || unlocked.has(id)) return;
      unlocked.add(id); save(); render();
      const d = defs.find(x => x.id === id);
      if (window.__agqToast) window.__agqToast(`${d.icon} Achievement — ${d.label}`);
      if (window.__agqSound) window.__agqSound.play('achievement');
      if (unlocked.size === TOTAL) {
        if (window.__agqConfetti) setTimeout(window.__agqConfetti, 400);
        if (window.__agqToast) setTimeout(() => window.__agqToast('🎁 All badges unlocked — open Achievements for your surprise!'), 1400);
      }
    }
    surpriseBtn?.addEventListener('click', revealSurprise);
    window.__agqUnlock = unlock;
    render();

    // Toggle panel
    function open() { panel.hidden = false; fab.setAttribute('aria-expanded', 'true'); }
    function close() { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); }
    fab.addEventListener('click', () => (panel.hidden ? open() : close()));
    document.addEventListener('click', (e) => {
      if (!panel.hidden && !panel.contains(e.target) && !fab.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });

    // Auto unlocks
    unlock('first');
    const h = new Date().getHours();
    if (h >= 18 || h < 6) unlock('night');
    if (h >= 5 && h < 9) unlock('earlybird');

    // Explored every section
    const sections = $$('section[id]');
    if (sections.length) {
      const seen = new Set();
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(en => { if (en.isIntersecting) seen.add(en.target.id); });
        if (seen.size >= sections.length) { unlock('explore'); obs.disconnect(); }
      }, { threshold: 0.4 });
      sections.forEach(s => obs.observe(s));
    }
  }

  /* ---------- Live Manila clock chip ---------- */
  function initLocalClock() {
    const el = $('#localClock');
    if (!el) return;
    function tick() {
      try {
        const t = new Date().toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true
        });
        el.textContent = t + ' PH';
      } catch (e) { el.textContent = ''; }
    }
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- Live workspace dashboard ---------- */
  function initDashboard() {
    const clock = $('#dashClock');
    if (!clock) return;
    const greetEl = $('#dashGreeting');
    const dateEl = $('#dashDate');
    const dayEl = $('#dashDay');
    const tzEl = $('#dashTz');
    const sessionEl = $('#dashSession');
    const started = Date.now();

    function greeting(h) {
      if (h < 12) return 'Good morning';
      if (h < 18) return 'Good afternoon';
      return 'Good evening';
    }

    // Text-scramble the greeting once on first paint
    function scramble(el, text) {
      if (prefersReducedMotion) { el.textContent = text; return; }
      const chars = '!<>-_\\/[]{}—=+*^?#';
      let frame = 0;
      const queue = text.split('').map((ch, i) => ({ ch, start: Math.floor(Math.random() * 12), end: 12 + Math.floor(Math.random() * 18) + i }));
      (function run() {
        let out = '', done = 0;
        queue.forEach(q => {
          if (frame >= q.end) { out += q.ch; done++; }
          else if (frame >= q.start) { out += chars[Math.floor(Math.random() * chars.length)]; }
          else { out += ''; }
        });
        el.textContent = out;
        if (done < queue.length) { frame++; requestAnimationFrame(run); }
      })();
    }

    let greetShown = '';
    function tick() {
      const now = new Date();
      const h = now.getHours();
      clock.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const g = greeting(h);
      if (g !== greetShown) { greetShown = g; scramble(greetEl, g + ','); }
      dateEl.textContent = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
      dayEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long' });
    }
    try {
      tzEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time';
    } catch (e) { tzEl.textContent = 'Local time'; }
    tick();
    setInterval(tick, 1000);

    // Session duration
    function sessionTick() {
      const s = Math.floor((Date.now() - started) / 1000);
      if (s < 15) sessionEl.textContent = 'Just arrived — welcome.';
      else if (s < 60) sessionEl.textContent = `Exploring for ${s} seconds.`;
      else {
        const m = Math.floor(s / 60);
        sessionEl.textContent = `You've been exploring for ${m} minute${m > 1 ? 's' : ''}.`;
      }
    }
    sessionTick();
    setInterval(sessionTick, 5000);
  }


  /* ---------- 3D tilt on hover ---------- */
  function initTilt() {
    if (!supportsFinePointer || prefersReducedMotion) return;
    const MAX = 8;
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('.tilt');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(700px) rotateX(${(-py * MAX).toFixed(2)}deg) rotateY(${(px * MAX).toFixed(2)}deg)`;
    });
    document.addEventListener('pointerout', (e) => {
      const el = e.target.closest && e.target.closest('.tilt');
      if (el) el.style.transform = '';
    });
  }

  /* ---------- Ripple click effect ---------- */
  function initRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn, .filter-btn, .social-btn');
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const span = document.createElement('span');
      span.className = 'ripple';
      const size = Math.max(r.width, r.height);
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - r.left - size / 2) + 'px';
      span.style.top = (e.clientY - r.top - size / 2) + 'px';
      btn.appendChild(span);
      setTimeout(() => span.remove(), 650);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFooterYear();
    initPreloader();
    initToast();
    initSound();
    initNarrator();
    initAchievements();
    initThemeToggle();
    initAccentSelector();
    initShortcuts();
    initLocalClock();
    initBackgroundFx();
    initDashboard();
    initTilt();
    initRipple();
    initBackToTop();
    initContactForm();
    initReadingTime();
    initScrollEffects();
    initNavToggle();
    initScrollCue();
    initActiveSection();
    initNavPill();
    initRevealOnScroll();
    initTimelineFill();
    initTypedRole();
    initCountUp();
    initMagneticButtons();
    initCardSpotlight();
    initProfilePhoto();
    initCvLock();
    initSnapshot();
    initA11y();
    initRoleMatch();
    initSkillsView();
    initEyebrowRotate();
    initScrollProgress();
    initNowCard();
    initHeroPhotoRelocate();
    initCommunity();
    initSectionShare();
    initIdleGreeter();
    initPitch();
    initTour();
    initVisitorCounter();
    initCursorRing();
    initProjects();
    initToolsMarquee();
    initCommandPalette();
    initStatusTicker();
    initSkillsCarousel();
    initChatWidget();
    initCopyEmail();
    initEasterEgg();
  });
})();