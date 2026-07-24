// =========================================================
// formation.js — interactions des pages de formation
// Vanilla JS, aucune dépendance. Porté depuis le fichier maître :
//   1) moteur de quiz (+ verdict d'examen /20)
//   2) progression par module (localStorage)
//   3) navigation (clavier ◀ ▶, sommaire ☰, glossaire)
//   + outils spécifiques : checklist Setup A+, calculateur d'espérance.
// =========================================================
(function () {
  "use strict";
  var LS = window.localStorage;
  var DONE_PREFIX = "gss:done:";

  // Liste ordonnée des modules d'apprentissage (slugs), pour la progression.
  // Injectée par la page via window.GSS_MODULES ; sinon, dérivée du DOM.
  var MODULES = window.GSS_LEARN_SLUGS || [];

  // ---------- 1. QUIZ ----------
  document.querySelectorAll(".quiz").forEach(function (qz) {
    var qs = [].slice.call(qz.querySelectorAll(".qz-q"));
    var sc = qz.querySelector(".qz-score");
    var good = 0, answered = 0;
    qs.forEach(function (q) {
      var btns = [].slice.call(q.querySelectorAll("button"));
      btns.forEach(function (b) {
        b.addEventListener("click", function () {
          if (q.dataset.done) return;
          q.dataset.done = "1"; answered++;
          var ok = b.dataset.ok === "1";
          if (ok) { b.classList.add("good"); good++; }
          else {
            b.classList.add("bad");
            var right = btns.find(function (x) { return x.dataset.ok === "1"; });
            if (right) right.classList.add("good");
          }
          var fb = q.querySelector(".qz-fb");
          if (fb) {
            fb.style.display = "block";
            fb.style.color = ok ? "#2BA88A" : "#E05252";
            fb.textContent = ok ? "✓ Exact." : "✗ La bonne réponse est surlignée — relis le module concerné.";
          }
          if (sc) {
            sc.textContent = "Score : " + good + " / " + qs.length +
              (answered < qs.length ? " (" + (qs.length - answered) + " restantes)" : "");
          }
          if (answered === qs.length) {
            var pct = good / qs.length;
            if (sc) sc.style.color = pct >= 0.8 ? "#2BA88A" : (pct >= 0.6 ? "#D4AF37" : "#E05252");
            if (qz.id === "exam") {
              var v = document.getElementById("verdict");
              if (v) {
                v.style.display = "block";
                if (good >= 16) v.innerHTML = "🏅 <b style=\"color:#2BA88A\">EXAMEN VALIDÉ — " + good + "/20.</b><br>Tu maîtrises la théorie. Prochaine étape : le protocole de backtest du Module 14 (50 setups minimum), puis les paliers du Module 16.";
                else if (good >= 12) v.innerHTML = "📙 <b style=\"color:#D4AF37\">PRESQUE — " + good + "/20.</b><br>Repère tes erreurs ci-dessus, relis les modules concernés, et repasse l'examen demain à tête reposée.";
                else v.innerHTML = "📕 <b style=\"color:#E05252\">À RETRAVAILLER — " + good + "/20.</b><br>Aucun jugement : reprends la formation partie par partie. La solidité prime sur la vitesse.";
              }
            }
          }
        });
      });
    });
  });

  // ---------- 2. Checklist Setup A+ (module 09) ----------
  var ckBoxes = [].slice.call(document.querySelectorAll(".ck input"));
  var ckScore = document.getElementById("score");
  if (ckBoxes.length && ckScore) {
    var updCk = function () {
      var n = ckBoxes.filter(function (b) { return b.checked; }).length;
      var msg, col;
      if (n >= 8) { msg = "✓ Setup A+ — taille normale autorisée"; col = "#2BA88A"; }
      else if (n >= 6) { msg = "Setup B — demi-taille maximum"; col = "#D4AF37"; }
      else { msg = "pas de trade"; col = "#E05252"; }
      ckScore.textContent = "Score : " + n + " / 10 — " + msg;
      ckScore.style.color = col; ckScore.style.borderColor = col;
    };
    ckBoxes.forEach(function (b) { b.addEventListener("change", updCk); });
    updCk();
  }

  // ---------- 3. Calculateur d'espérance (module 11) ----------
  var calcIns = ["c-wr", "c-rr", "c-risk", "c-n"].map(function (i) { return document.getElementById(i); });
  var calcOut = document.getElementById("c-out");
  if (calcOut && calcIns.every(Boolean)) {
    var calc = function () {
      var vals = calcIns.map(function (i) { return parseFloat(i.value) || 0; });
      var wr = vals[0], rr = vals[1], risk = vals[2], n = vals[3];
      var w = wr / 100;
      var exp = (w * rr) - ((1 - w) * 1);
      var monthR = exp * n;
      var monthPct = monthR * risk;
      var pf = (w * rr) / ((1 - w) * 1 || 1);
      var streak = Math.round(Math.log(1 / 100) / Math.log(1 - w));
      var ok = exp > 0;
      calcOut.innerHTML =
        "Espérance par trade : <b>" + (exp >= 0 ? "+" : "") + exp.toFixed(2) + "R</b><br>" +
        "Projection mensuelle (" + n + " trades) : <b>" + (monthR >= 0 ? "+" : "") + monthR.toFixed(1) + "R</b> ≈ <b>" + (monthPct >= 0 ? "+" : "") + monthPct.toFixed(1) + " %</b> du compte<br>" +
        "Profit factor théorique : <b>" + pf.toFixed(2) + "</b><br>" +
        "Série de pertes probable sur 100 trades : <b>~" + (isFinite(streak) ? streak : "—") + " SL d'affilée</b> (normal, à anticiper)<br>" +
        (ok ? "<span style=\"color:#2BA88A\">✓ Espérance positive — viable si l'échantillon est ≥ 50 trades</span>"
            : "<span style=\"color:#E05252\">✗ Espérance négative — ne pas trader en réel, analyser où ça casse</span>");
      calcOut.style.borderColor = ok ? "#2BA88A" : "#E05252";
    };
    calcIns.forEach(function (i) { i.addEventListener("input", calc); });
    calc();
  }

  // ---------- 4. Progression (localStorage) ----------
  function isDone(slug) { try { return LS.getItem(DONE_PREFIX + slug) === "1"; } catch (e) { return false; } }
  function setDone(slug, on) { try { on ? LS.setItem(DONE_PREFIX + slug, "1") : LS.removeItem(DONE_PREFIX + slug); } catch (e) {} }

  var doneBtn = document.querySelector(".done-btn[data-slug]");
  if (doneBtn) {
    var slug = doneBtn.getAttribute("data-slug");
    var reflect = function (on) {
      doneBtn.classList.toggle("on", on);
      doneBtn.setAttribute("aria-pressed", String(on));
      doneBtn.textContent = on ? "✓ MODULE TERMINÉ — BIEN JOUÉ" : "○ MARQUER CE MODULE COMME TERMINÉ";
    };
    reflect(isDone(slug));
    doneBtn.addEventListener("click", function () {
      var on = !isDone(slug);
      setDone(slug, on); reflect(on);
    });
  }

  // Barre / compteur de progression globale (sommaire + éventuel indicateur page)
  function doneCount() {
    return MODULES.filter(function (s) { return isDone(s); }).length;
  }
  var progFill = document.getElementById("fprogfill");
  var progLabel = document.getElementById("fproglabel");
  if (progFill && MODULES.length) {
    var n = doneCount();
    progFill.style.width = (n / MODULES.length * 100) + "%";
    if (progLabel) progLabel.textContent = n + " / " + MODULES.length + " modules terminés";
  }
  // Sur le sommaire : cocher les modules terminés
  document.querySelectorAll("[data-mod-slug]").forEach(function (el) {
    if (isDone(el.getAttribute("data-mod-slug"))) el.classList.add("is-done");
  });

  // ---------- 5. Sommaire ☰ (tiroir) ----------
  var tocBtn = document.querySelector(".ftoc-btn");
  var toc = document.getElementById("ftoc");
  var scrim = document.getElementById("fscrim");
  function openToc() { if (toc) { toc.classList.add("open"); if (scrim) scrim.classList.add("open"); tocBtn && tocBtn.setAttribute("aria-expanded", "true"); } }
  function closeToc() { if (toc) { toc.classList.remove("open"); if (scrim) scrim.classList.remove("open"); tocBtn && tocBtn.setAttribute("aria-expanded", "false"); } }
  if (tocBtn) tocBtn.addEventListener("click", function () { toc.classList.contains("open") ? closeToc() : openToc(); });
  if (scrim) scrim.addEventListener("click", closeToc);

  // ---------- 6. Glossaire (dialog) ----------
  var gloDlg = document.getElementById("glossaire-dlg");
  document.querySelectorAll("[data-open-glossaire]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      if (gloDlg && gloDlg.showModal) gloDlg.showModal();
      else if (gloDlg) gloDlg.setAttribute("open", "");
    });
  });
  if (gloDlg) {
    var closeGlo = gloDlg.querySelector("[data-close-glossaire]");
    if (closeGlo) closeGlo.addEventListener("click", function () { gloDlg.close ? gloDlg.close() : gloDlg.removeAttribute("open"); });
    gloDlg.addEventListener("click", function (e) { if (e.target === gloDlg) gloDlg.close && gloDlg.close(); });
  }

  // ---------- 6b. Reprendre où j'en étais (sommaire) ----------
  var resume = document.getElementById("fresume");
  if (resume && MODULES.length) {
    var firstUndone = MODULES.find(function (s) { return !isDone(s); });
    resume.setAttribute("href", (firstUndone || MODULES[0]) + ".html");
    resume.textContent = firstUndone ? "Reprendre où j'en étais →" : "Revoir la formation →";
  }

  // ---------- 6c. Impression : déplier les <details> pour un PDF complet ----------
  var reopened = [];
  window.addEventListener("beforeprint", function () {
    reopened = [];
    document.querySelectorAll("details:not([open])").forEach(function (d) {
      d.open = true; reopened.push(d);
    });
  });
  window.addEventListener("afterprint", function () {
    reopened.forEach(function (d) { d.open = false; });
    reopened = [];
  });

  // ---------- 7. Navigation clavier ◀ ▶ ----------
  var prevLink = document.querySelector("[data-nav-prev]");
  var nextLink = document.querySelector("[data-nav-next]");
  document.addEventListener("keydown", function (e) {
    if (e.target.matches("input, textarea, select")) return;
    if (e.key === "ArrowRight" && nextLink) location.href = nextLink.getAttribute("href");
    else if (e.key === "ArrowLeft" && prevLink) location.href = prevLink.getAttribute("href");
    else if (e.key === "Escape") { closeToc(); if (gloDlg && gloDlg.open) gloDlg.close(); }
  });
})();
