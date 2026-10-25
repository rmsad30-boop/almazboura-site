/* =========================================================
   Al Mazboura — app logic
   i18n (AR rtl / EN ltr), menu, reveals, counters, lightbox,
   FAQ, form → mailto/WhatsApp, back-to-top. No dependencies.
   ========================================================= */
(function () {
  'use strict';

  var D = window.ALMAZ_I18N;
  var LANGS = [window.ALMAZ_LANGS[0], window.ALMAZ_LANGS[1]]; // ar, en
  var STORE = D.storageKey;

  var html = document.documentElement;
  var body = document.body;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lang = 'ar';

  /* ---------------- 1. Language engine ---------------- */

  function getDict() { return D[lang]; }

  function refreshStatic(l) {
    var d = getDict();
    html.lang = l;
    html.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.title = d['meta.title'];

    var md = $('meta[name="description"]');
    if (md) md.setAttribute('content', d['meta.desc']);
    var ogT = $('#og-title'); if (ogT) ogT.setAttribute('content', d['meta.title']);
    var ogD = $('#og-desc'); if (ogD) ogD.setAttribute('content', d['meta.desc']);
    var ogL = $('#og-loc'); if (ogL) ogL.setAttribute('content', l === 'ar' ? 'ar_SA' : 'en_US');

    var map = $('#mapFrame');
    if (map) map.setAttribute('title', d['contact.title'] + ' — ' + d['loc.val']);
  }

  function applyI18n() {
    var d = getDict();
    $$('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (k in d) el.textContent = d[k];
    });
    $$('[data-i18n-html]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-html');
      if (k in d) el.innerHTML = d[k];
    });
    $$('[data-i18n-aria]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-aria');
      if (k in d) el.setAttribute('aria-label', d[k]);
    });
    $$('[data-i18n-ph]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-ph');
      if (k in d) el.setAttribute('placeholder', d[k]);
    });
    $$('[data-i18n-alt]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-alt');
      if (k in d) el.setAttribute('alt', d[k]);
    });
    $$('.lang-switch button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
    if (typeof updateXl === 'function') updateXl();
  }

  function setLang(l, opts) {
    opts = opts || {};
    var changed = l !== lang;
    lang = LANGS.indexOf(l) !== -1 ? l : 'ar';
    try { localStorage.setItem(STORE, lang); } catch (e) { /* private mode */ }

    if (changed) {
      html.classList.remove('lang-fade');
      if (opts.animate !== false && !RM) {
        void html.offsetWidth; // reflow so the animation can restart
        html.classList.add('lang-fade');
      }
    }
    refreshStatic(lang);
    applyI18n();
  }

  // initial language: ?lang= override → saved preference → Arabic
  var urlLang = null;
  try {
    urlLang = new URLSearchParams(window.location.search).get('lang');
  } catch (e) { /* older browsers */ }
  var saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  setLang(urlLang || saved || 'ar', { animate: false });

  // bind ALL language buttons (header + mobile panel) at once
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-lang]') : null;
    if (b) setLang(b.getAttribute('data-lang'));
  });

  /* ---------------- 2. Header scroll state ---------------- */

  var header = $('.site-header');
  var backTop = $('#backTop');
  var ticking = false;
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        header.classList.toggle('is-scrolled', window.scrollY > 24);
        backTop.classList.toggle('show', window.scrollY > 560);
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- 3. Mobile menu ---------------- */

  var panel = $('#mobilePanel');
  var menuBtn = $('#menuBtn');
  var menuClose = $('#menuClose');

  function lockScroll(lock) { body.style.overflow = lock ? 'hidden' : ''; }

  function openMenu() {
    panel.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    lockScroll(true);
    menuClose.focus();
  }
  function closeMenu() {
    panel.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    lockScroll(false);
    menuBtn.focus();
  }
  menuBtn.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);
  panel.addEventListener('click', function (e) { if (e.target === panel) closeMenu(); });
  $$('.mobile-link').forEach(function (a) { a.addEventListener('click', closeMenu); });

  /* ---------------- 4. Scroll reveals + counters ---------------- */

  var reducedIO = !('IntersectionObserver' in window) || RM;

  if (reducedIO) {
    html.classList.add('no-io');
    $$('.rv').forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach(function (el) { io.observe(el); });

    var fmt = function (n) { return n.toLocaleString('en-US'); };
    var runCount = function (el) {
      var end = parseInt(el.getAttribute('data-count'), 10) || 0;
      var suf = el.getAttribute('data-suffix') || '';
      var t0 = window.performance.now();
      var dur = 1500;
      (function tick(t) {
        var p = Math.min(1, (t - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(end * eased)) + suf;
        if (p < 1) window.requestAnimationFrame(tick);
      })(t0);
    };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        runCount(en.target);
        cio.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    $$('[data-count]').forEach(function (el) { cio.observe(el); });
  }

  /* ---------------- 5. Active section in nav ---------------- */

  var spyLinks = {};
  $$('.site-nav a').forEach(function (a) {
    var id = (a.getAttribute('href') || '').slice(1);
    if (id) spyLinks[id] = a;
  });
  if ('IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var link = spyLinks[en.target.id];
        if (!link) return;
        if (en.isIntersecting) {
          $$('.site-nav a').forEach(function (a) { a.removeAttribute('aria-current'); });
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    Object.keys(spyLinks).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) sio.observe(sec);
    });
  }

  /* ---------------- 6. Gallery lightbox ---------------- */

  var galItems = $$('#galGrid .gal-item');
  var lb = $('#lightbox');
  var lbImg = $('#lbImg');
  var lbCap = $('#lbCap');
  var lbCount = $('#lbCount');
  var lbLast = null;
  var idx = 0;

  function lbShow() {
    var it = galItems[idx];
    var im = $('img', it);
    lbImg.src = im.currentSrc || im.src;
    lbImg.alt = it.getAttribute('aria-label') || im.alt;
    lbCap.textContent = $('.gal-cap', it).textContent;
    lbCount.textContent = (idx + 1) + ' / ' + galItems.length;
  }
  function lbOpen(i) {
    lbLast = document.activeElement;
    idx = i;
    lbShow();
    lb.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    $('#lbClose').focus();
  }
  function lbClose() {
    lb.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    if (lbLast) lbLast.focus();
  }
  galItems.forEach(function (it, i) {
    it.addEventListener('click', function () { lbOpen(i); });
  });
  $('#lbClose').addEventListener('click', lbClose);
  $('#lbPrev').addEventListener('click', function () {
    idx = (idx - 1 + galItems.length) % galItems.length; lbShow();
  });
  $('#lbNext').addEventListener('click', function () {
    idx = (idx + 1) % galItems.length; lbShow();
  });
  lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });

  /* ---------------- 7. Shared keyboard control ---------------- */

  document.addEventListener('keydown', function (e) {
    var panelOpen = panel.getAttribute('aria-hidden') === 'false';
    var lbOpen = lb.getAttribute('aria-hidden') === 'false';

    if (e.key === 'Escape') {
      if (lbOpen) return lbClose();
      if (panelOpen) return closeMenu();
      return;
    }
    if (lbOpen && e.key === (html.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight')) { idx = (idx - 1 + galItems.length) % galItems.length; lbShow(); }
    if (lbOpen && e.key === (html.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft')) { idx = (idx + 1) % galItems.length; lbShow(); }

    // focus trap for open dialogs
    if (e.key === 'Tab' && (panelOpen || lbOpen)) {
      var box = panelOpen ? $('.mobile-card') : lb;
      var focusables = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', box)
        .filter(function (el) { return el.offsetParent !== null || box === lb; });
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------- 8. FAQ (native exclusive via name, JS fallback) ---------------- */

  var faqs = $$('.faq-item');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      faqs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---------------- 9. Quote form → mailto / WhatsApp ---------------- */

  var form = $('#qForm');
  var toast = $('#formToast');
  var TOAST_TIME = 6500;

  function showToast(kind, key) {
    var d = getDict();
    toast.className = 'form-toast on form-toast--' + kind;
    toast.textContent = d[key];
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      toast.className = 'form-toast';
    }, TOAST_TIME);
  }

  var rules = [
    { id: 'fName', ok: function (v) { return v.trim().length >= 2; } },
    { id: 'fPhone', ok: function (v) { return /^\+?[0-9][0-9\s\-]{7,16}$/.test(v.trim()); } },
    { id: 'fEmail', ok: function (v) { return v.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } },
    { id: 'fService', ok: function (v) { return !!v; } },
    { id: 'fMsg', ok: function (v) { return v.trim().length >= 5; } }
  ];

  rules.forEach(function (r) {
    var el = document.getElementById(r.id);
    r.el = el;
    el.addEventListener('input', function () { clearError(el); });
    el.addEventListener('change', function () { clearError(el); });
  });

  function clearError(el) {
    el.closest('.field').classList.remove('is-invalid');
    el.setAttribute('aria-invalid', 'false');
  }
  function markError(el) {
    el.closest('.field').classList.add('is-invalid');
    el.setAttribute('aria-invalid', 'true');
  }

  function validate() {
    var firstBad = null;
    rules.forEach(function (r) {
      if (!r.ok(r.el.value)) {
        markError(r.el);
        if (!firstBad) firstBad = r.el;
      }
    });
    if (firstBad) {
      firstBad.focus();
      showToast('err', 'form.toast.err');
      return false;
    }
    return true;
  }

  function buildMessage() {
    var d = getDict();
    var lines = [
      d['msg.greet'],
      '',
      d['msg.f.name'] + ': ' + $('#fName').value.trim(),
      d['msg.f.phone'] + ': ' + $('#fPhone').value.trim(),
      $('#fEmail').value.trim() ? d['msg.f.email'] + ': ' + $('#fEmail').value.trim() : null,
      d['msg.f.service'] + ': ' + $('#fService').value,
      d['msg.f.msg'] + ': ' + $('#fMsg').value.trim()
    ];
    return lines.filter(function (l) { return l !== null; }).join('\n');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    var d = getDict();
    var text = buildMessage();
    window.location.assign(
      'mailto:malmossaelec@gmail.com?subject=' + encodeURIComponent(d['msg.subject']) +
      '&body=' + encodeURIComponent(text)
    );
    showToast('ok', 'form.toast.mail');
  });

  $('#waBtn').addEventListener('click', function () {
    if (!validate()) return;
    var text = buildMessage();
    window.open('https://wa.me/966548874072?text=' + encodeURIComponent(text), '_blank', 'noopener');
    showToast('ok', 'form.toast.wa');
  });

  /* ---------------- 10. Back to top + year ---------------- */

  backTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
  });

  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------------- 11. Exceptional loads video ---------------- */

  var updateXl = function () {};
  var xlVideo = $('#xlVideo');
  var xlToggle = $('#xlToggle');

  if (xlVideo && xlToggle) {
    var xlOn = false;

    updateXl = function () {
      var use = $('#xlIcon', xlToggle);
      var d = getDict();
      if (use) use.setAttribute('href', xlOn ? '#i-pause' : '#i-play');
      xlToggle.setAttribute('aria-label', d[xlOn ? 'xl.pause' : 'xl.play']);
    };

    var xlSet = function (on) {
      xlOn = !!on;
      if (xlOn) xlVideo.play().catch(function () { xlOn = false; });
      else xlVideo.pause();
      updateXl();
    };

    xlToggle.addEventListener('click', function () { xlSet(!xlOn); });

    // autoplay muted only while in view; stays paused for reduced-motion users
    if (!RM && 'IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { xlSet(en.isIntersecting); });
      }, { threshold: 0.35 });
      vio.observe(xlVideo);
    }
    updateXl();
  }
})();
