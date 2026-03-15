/**
 * nav.js — Kadence-compatible navigation for Eleventy-migrated sites
 *
 * Features:
 *  - Header height → --kb-header-height CSS custom property (ResizeObserver)
 *  - Sticky header with reveal-on-scroll-up
 *  - Transparent header overlay (is-transparent / is-stuck)
 *  - Mobile nav toggle with focus trap
 *  - Submenu toggle: click (all breakpoints) + hover intent (desktop)
 *  - Viewport edge detection for submenus (sub-menu-right-edge / left-edge)
 *  - Keyboard navigation: Escape closes menus, Tab exits submenu
 *  - Close menus on outside click
 *  - Smooth scroll for hash links with --kb-header-height offset
 */
(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────────
  var DESKTOP_BP     = 1025;  // px — matches Kadence default breakpoint
  var STICKY_OFFSET  = 10;    // px scrolled before sticky activates
  var REVEAL_OFFSET  = 80;    // px scrolled before hide-on-down activates
  var HOVER_DELAY    = 150;   // ms — hover intent delay
  var RESIZE_DELAY   = 200;   // ms — resize debounce

  // ── Utilities ───────────────────────────────────────────────────────────────
  function debounce(fn, delay) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  function isDesktop() { return window.innerWidth >= DESKTOP_BP; }

  // ── Elements ─────────────────────────────────────────────────────────────────
  var header  = document.querySelector(".site-shell-header");
  var toggle  = document.querySelector(".kb-nav-toggle");
  var nav     = document.getElementById("site-nav-menu");
  var heroEl  = document.querySelector(".page-hero-section, .entry-hero");

  // Hero threshold: become sticky after hero is fully scrolled out
  var heroThreshold = heroEl ? heroEl.offsetHeight : 0;

  // ── Header height → CSS custom property ─────────────────────────────────────
  function updateHeaderHeight() {
    if (!header) return;
    document.documentElement.style.setProperty(
      "--kb-header-height",
      header.getBoundingClientRect().height + "px"
    );
  }

  if (header && window.ResizeObserver) {
    new ResizeObserver(updateHeaderHeight).observe(header);
  }
  updateHeaderHeight();

  // ── Sticky + reveal-on-scroll-up ─────────────────────────────────────────────
  var lastScrollY = window.scrollY;
  var scrollTicking = false;

  function onScroll() {
    if (!header) return;
    var y = window.scrollY;

    // On hero pages use hero height as threshold, otherwise use STICKY_OFFSET
    var threshold = heroThreshold > 0 ? heroThreshold : STICKY_OFFSET;

    // Stuck state
    header.classList.toggle("is-stuck", y > threshold);

    // Transparent overlay: remove transparency once hero is scrolled past
    if (header.classList.contains("is-transparent") || header.dataset.wasTransparent) {
      if (y > threshold) {
        header.dataset.wasTransparent = "1";
        header.classList.remove("is-transparent");
      } else {
        header.classList.add("is-transparent");
        delete header.dataset.wasTransparent;
      }
    }

    // Reveal-on-scroll-up: only on non-hero pages — on hero pages header stays visible once stuck
    if (heroThreshold === 0 && y > REVEAL_OFFSET) {
      header.classList.toggle("is-hidden", y > lastScrollY);
    } else {
      header.classList.remove("is-hidden");
    }

    lastScrollY = y;
    scrollTicking = false;
  }

  window.addEventListener("scroll", function () {
    if (!scrollTicking) {
      requestAnimationFrame(onScroll);
      scrollTicking = true;
    }
  }, { passive: true });

  onScroll();

  // ── Focus trap ────────────────────────────────────────────────────────────────
  var FOCUSABLE_SEL = [
    "a[href]", "button:not([disabled])", "input:not([disabled])",
    "select:not([disabled])", "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  var _trapEl = null, _trapHandler = null;

  function trapFocus(container) {
    _trapEl = container;
    var focusable = Array.from(container.querySelectorAll(FOCUSABLE_SEL));
    if (!focusable.length) return;
    _trapHandler = function (e) {
      if (e.key !== "Tab") return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };
    container.addEventListener("keydown", _trapHandler);
    focusable[0].focus();
  }

  function releaseFocus() {
    if (_trapEl && _trapHandler) _trapEl.removeEventListener("keydown", _trapHandler);
    _trapEl = _trapHandler = null;
  }

  // ── Mobile menu open / close ──────────────────────────────────────────────────
  function openMobileMenu() {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", "true");
    nav.classList.add("is-open");
    document.body.classList.add("kb-nav-open");
    trapFocus(nav);
  }

  function closeMobileMenu() {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    document.body.classList.remove("kb-nav-open");
    releaseFocus();
    closeAllSubmenus();
    toggle.focus();
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      toggle.getAttribute("aria-expanded") === "true"
        ? closeMobileMenu()
        : openMobileMenu();
    });
  }

  // ── Submenu helpers ───────────────────────────────────────────────────────────
  function closeAllSubmenus(except) {
    document.querySelectorAll(".kb-nav-item.is-open").forEach(function (item) {
      if (item === except) return;
      item.classList.remove("is-open");
      var btn = item.querySelector(".kb-nav-item-toggle");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function openSubmenu(item, btn) {
    closeAllSubmenus(item);
    item.classList.add("is-open");
    if (btn) btn.setAttribute("aria-expanded", "true");
    if (isDesktop()) detectEdge(item);
  }

  function closeSubmenu(item, btn) {
    item.classList.remove("is-open");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  // ── Viewport edge detection ────────────────────────────────────────────────
  function detectEdge(item) {
    var sub = item.querySelector(".kb-nav-sub-menu, .kb-mega-menu");
    if (!sub) return;
    sub.classList.remove("sub-menu-right-edge", "sub-menu-left-edge");
    var rect = sub.getBoundingClientRect();
    if (rect.right > window.innerWidth - 10) sub.classList.add("sub-menu-right-edge");
    if (rect.left < 10)                      sub.classList.add("sub-menu-left-edge");
  }

  // ── Submenu toggle: click ─────────────────────────────────────────────────────
  document.querySelectorAll(".kb-nav-item-toggle").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var item = btn.closest(".kb-nav-item");
      if (!item) return;
      item.classList.contains("is-open")
        ? closeSubmenu(item, btn)
        : openSubmenu(item, btn);
    });
  });

  // ── Submenu: hover intent (desktop only) ──────────────────────────────────────
  var hoverTimer = null;

  document.querySelectorAll(
    ".kb-nav-item.menu-item-has-children, .kb-nav-item.kb-nav-mega-menu-item"
  ).forEach(function (item) {
    var btn = item.querySelector(".kb-nav-item-toggle");

    item.addEventListener("mouseenter", function () {
      if (!isDesktop()) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { openSubmenu(item, btn); }, HOVER_DELAY);
    });

    item.addEventListener("mouseleave", function () {
      if (!isDesktop()) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { closeSubmenu(item, btn); }, HOVER_DELAY);
    });
  });

  // ── Keyboard navigation ────────────────────────────────────────────────────────
  if (nav) {
    nav.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        var openItem = nav.querySelector(".kb-nav-item.is-open");
        if (openItem) {
          var btn = openItem.querySelector(".kb-nav-item-toggle");
          closeSubmenu(openItem, btn);
          (btn || openItem.querySelector(".kb-nav-link") || openItem).focus();
        } else if (!isDesktop()) {
          closeMobileMenu();
        }
        return;
      }

      // Tab out of last focusable element in an open submenu → close it
      if (e.key === "Tab" && !e.shiftKey) {
        var parentOpen = e.target.closest(".kb-nav-item.is-open");
        if (parentOpen) {
          var focusable = Array.from(parentOpen.querySelectorAll(FOCUSABLE_SEL));
          if (focusable[focusable.length - 1] === e.target) {
            var toggleBtn = parentOpen.querySelector(".kb-nav-item-toggle");
            closeSubmenu(parentOpen, toggleBtn);
          }
        }
      }
    });
  }

  // ── Close on outside click ────────────────────────────────────────────────────
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".site-shell-header")) {
      closeAllSubmenus();
      if (nav && nav.classList.contains("is-open")) closeMobileMenu();
    }
  });

  // ── Global Escape (when focus is outside nav) ─────────────────────────────────
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav && nav.classList.contains("is-open")) {
      closeMobileMenu();
    }
  });

  // ── Resize: close mobile menu on desktop, update height, recalc hero threshold ──
  window.addEventListener("resize", debounce(function () {
    if (isDesktop() && nav && nav.classList.contains("is-open")) closeMobileMenu();
    updateHeaderHeight();
    if (heroEl) heroThreshold = heroEl.offsetHeight;
  }, RESIZE_DELAY));

  // ── Smooth scroll for in-page hash links ──────────────────────────────────────
  document.addEventListener("click", function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute("href").slice(1);
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    var headerH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--kb-header-height") || "0",
      10
    );
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - headerH - 8,
      behavior: "smooth"
    });
    history.pushState(null, "", "#" + id);
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

}());
