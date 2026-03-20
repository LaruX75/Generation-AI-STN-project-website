(function () {
  'use strict';

  var STORAGE_KEY = 'genai_a11y';
  var defaults = { fontSize: 0, dyslexia: false, contrast: false, bg: '', spacing: false, guide: false };

  function load() {
    try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
    catch (e) { return Object.assign({}, defaults); }
  }
  function save(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }

  function applyState(s) {
    var h = document.documentElement;
    h.style.fontSize = s.fontSize ? (100 + s.fontSize * 12.5) + '%' : '';
    h.classList.toggle('a11y-dyslexia', !!s.dyslexia);
    h.classList.toggle('a11y-contrast', !!s.contrast);
    h.classList.toggle('a11y-spacing', !!s.spacing);
    h.dataset.a11yBg = s.bg || '';

    var guide = document.getElementById('a11y-guide-line');
    if (guide) guide.hidden = !s.guide;

    setPressed('a11y-dyslexia', s.dyslexia);
    setPressed('a11y-contrast', s.contrast);
    setPressed('a11y-spacing', s.spacing);
    setPressed('a11y-guide', s.guide);

    document.querySelectorAll('.a11y-swatch').forEach(function (el) {
      el.classList.toggle('a11y-swatch--active', el.dataset.bg === (s.bg || ''));
    });
  }

  function setPressed(id, val) {
    var el = document.getElementById(id);
    if (el) el.setAttribute('aria-pressed', val ? 'true' : 'false');
  }

  /* ── Text-to-speech ─────────────────────────────────────────────────── */
  var tts = window.speechSynthesis;
  var ttsActive = false;

  function speak(lang) {
    if (!tts) return;
    tts.cancel();
    var root = document.querySelector('#main-content') || document.querySelector('main') || document.body;
    var text = (root.innerText || root.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    var langMap = { fi: 'fi-FI', en: 'en-GB', sv: 'sv-SE' };
    var chunks = text.match(/.{1,220}(?:\s|$)/g) || [text];
    var idx = 0;
    ttsActive = true;
    setTtsState(true);
    function next() {
      if (!ttsActive || idx >= chunks.length) { ttsActive = false; setTtsState(false); return; }
      var u = new SpeechSynthesisUtterance(chunks[idx++]);
      u.lang = langMap[lang] || 'fi-FI';
      u.rate = 0.88;
      u.onend = next;
      u.onerror = next;
      tts.speak(u);
    }
    next();
  }

  function stopSpeak() {
    ttsActive = false;
    if (tts) tts.cancel();
    setTtsState(false);
  }

  function setTtsState(active) {
    var play = document.getElementById('a11y-tts');
    var stop = document.getElementById('a11y-tts-stop');
    if (play) play.disabled = active;
    if (stop) stop.disabled = !active;
  }

  /* ── Init ───────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    var state = load();
    var lang = document.documentElement.lang || 'fi';
    applyState(state);

    var toolbar = document.getElementById('a11y-toolbar');
    var trigger = document.getElementById('a11y-trigger');
    var panel   = document.getElementById('a11y-panel');
    var closeBtn = document.getElementById('a11y-close');
    var previouslyFocused = null;

    function getFocusable(container) {
      if (!container) return [];
      return Array.prototype.slice.call(
        container.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter(function (el) {
        return !el.hidden && el.offsetParent !== null;
      });
    }

    function trapPanelFocus(e) {
      if (!panel || panel.hidden || e.key !== 'Tab') return;
      var focusable = getFocusable(panel);
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function openPanel() {
      if (!panel) return;
      previouslyFocused = document.activeElement || trigger;
      panel.hidden = false;
      trigger && trigger.setAttribute('aria-expanded', 'true');
      panel.addEventListener('keydown', trapPanelFocus);
      var first = getFocusable(panel)[0];
      if (first) first.focus();
    }
    function closePanel() {
      if (!panel) return;
      panel.hidden = true;
      panel.removeEventListener('keydown', trapPanelFocus);
      trigger && trigger.setAttribute('aria-expanded', 'false');
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      } else {
        trigger && trigger.focus();
      }
    }

    trigger  && trigger.addEventListener('click', function () { panel && (panel.hidden ? openPanel() : closePanel()); });
    closeBtn && closeBtn.addEventListener('click', closePanel);
    document.addEventListener('click', function (e) {
      if (!panel || panel.hidden || !toolbar) return;
      if (!toolbar.contains(e.target)) closePanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel && !panel.hidden) closePanel();
    });

    /* Font size */
    on('a11y-font-dec',   function () { if (state.fontSize > -2) { state.fontSize--; commit(); } });
    on('a11y-font-reset', function () { state.fontSize = 0; commit(); });
    on('a11y-font-inc',   function () { if (state.fontSize < 4)  { state.fontSize++; commit(); } });

    /* Toggles */
    on('a11y-dyslexia', function () { state.dyslexia = !state.dyslexia; commit(); });
    on('a11y-contrast',  function () { state.contrast  = !state.contrast;  commit(); });
    on('a11y-spacing',   function () { state.spacing   = !state.spacing;   commit(); });
    on('a11y-guide',     function () { state.guide     = !state.guide;     commit(); });

    /* Colour swatches */
    document.querySelectorAll('.a11y-swatch').forEach(function (el) {
      el.addEventListener('click', function () { state.bg = el.dataset.bg || ''; commit(); });
    });

    /* Reading guide: follow mouse */
    var guideLine = document.getElementById('a11y-guide-line');
    document.addEventListener('mousemove', function (e) {
      if (state.guide && guideLine && !guideLine.hidden) {
        guideLine.style.top = (e.clientY - 14) + 'px';
      }
    });

    /* TTS */
    on('a11y-tts',      function () { speak(lang); });
    on('a11y-tts-stop', stopSpeak);
    if (!tts) {
      var sec = document.querySelector('.a11y-tts-section');
      if (sec) sec.hidden = true;
    }

    /* Reset */
    on('a11y-reset', function () {
      state = Object.assign({}, defaults);
      document.documentElement.style.fontSize = '';
      stopSpeak();
      commit();
    });

    function commit() { applyState(state); save(state); }
    function on(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', fn); }
  });
})();
