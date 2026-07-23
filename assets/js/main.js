/* =========================================================
   Gold Sweep Academy — interactions
   Vanilla JS, no dependencies.
   ========================================================= */
(function () {
  "use strict";

  /* ---- Mobile nav toggle ---- */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    });
    // Close on link click (mobile)
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Ouvrir le menu");
      }
    });
  }

  /* ---- Header shadow on scroll ---- */
  var header = document.querySelector(".site-header");
  var onScroll = function () {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Reveal on scroll ---- */
  var reveals = document.querySelectorAll(".reveal");
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- Animated counters ---- */
  var counters = document.querySelectorAll(".stat-num[data-count]");
  var animateCount = function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    var duration = 1400;
    var start = null;
    var step = function (ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target).toLocaleString("fr-FR") + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (counters.length) {
    if (prefersReduced || !("IntersectionObserver" in window)) {
      counters.forEach(function (el) {
        el.textContent = (parseInt(el.getAttribute("data-count"), 10) || 0).toLocaleString("fr-FR") + (el.getAttribute("data-suffix") || "");
      });
    } else {
      var co = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { animateCount(entry.target); co.unobserve(entry.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { co.observe(el); });
    }
  }

  /* ---- Signup form (front-end only demo) ---- */
  var form = document.getElementById("signupForm");
  var msg = document.getElementById("formMsg");
  if (form && msg) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("email");
      var value = (input.value || "").trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!valid) {
        msg.textContent = "Merci d'entrer une adresse e-mail valide.";
        msg.className = "form-msg err";
        input.focus();
        return;
      }
      msg.textContent = "Merci ! Vérifiez votre boîte mail pour accéder à la première leçon.";
      msg.className = "form-msg ok";
      form.reset();
    });
  }

  /* ---- Current year in footer ---- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
