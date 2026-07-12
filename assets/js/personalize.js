/* ============================================================
   Personalization layer
   Reads ?for=<company> (or bare ?<company>), loads a per-company
   config, and layers a welcome + in-page annotations onto the
   normal portfolio. Does nothing without a matching config.
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function isMobile() { return window.matchMedia("(max-width: 820px)").matches; }

  // ---- parse the company slug from the URL ----
  var raw = (location.search || "").replace(/^\?/, "");
  var slug = "";
  if (raw) {
    if (raw.indexOf("=") > -1) {
      try { slug = new URLSearchParams(location.search).get("for") || ""; } catch (e) { slug = ""; }
    } else {
      slug = decodeURIComponent(raw);
    }
  }
  slug = (slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!slug) return; // normal visitor -> untouched site

  var MONO =
    '<svg class="mono" viewBox="0 0 328 328" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<g class="mono__ink" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">' +
    '<line class="mono__s" style="--i:0" pathLength="1" x1="154" y1="44" x2="43" y2="264"/>' +
    '<line class="mono__s" style="--i:1" pathLength="1" x1="154" y1="44" x2="203" y2="150"/>' +
    '<line class="mono__s" style="--i:2" pathLength="1" x1="96" y1="180" x2="138" y2="180"/>' +
    '<line class="mono__s" style="--i:3" pathLength="1" x1="154" y1="118" x2="154" y2="264"/>' +
    '<line class="mono__s" style="--i:4" pathLength="1" x1="150" y1="180" x2="268" y2="180"/>' +
    '<line class="mono__s" style="--i:5" pathLength="1" x1="268" y1="60" x2="268" y2="264"/>' +
    '</g>' +
    '<g class="mono__arrow"><path class="mono__arrowfill" d="M155 64 L201 172 L101 172 Z"/>' +
    '<line class="mono__arrowstem" x1="154" y1="150" x2="154" y2="264" stroke-width="22" stroke-linecap="round"/></g>' +
    '<circle class="mono__pop" cx="154" cy="150" r="9"/></svg>';

  var CURL =
    '<svg class="perso-note__curl" viewBox="0 0 44 44" fill="none" aria-hidden="true">' +
    '<path d="M38 6 C 30 26, 24 30, 12 36" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M12 36 L 21 34 M12 36 L 16 27" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  fetch("assets/personalize/" + slug + ".json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("no config"); return r.json(); })
    .then(function (cfg) { if (cfg && typeof cfg === "object") init(cfg); })
    .catch(function () { /* no matching config -> leave the site normal */ });

  function init(cfg) {
    injectFont();
    applyAnnotations(cfg);

    var key = "perso-seen-" + slug;
    var seen = false;
    try { seen = sessionStorage.getItem(key) === "1"; } catch (e) {}

    if (seen) {
      showChip(cfg);
    } else {
      runWelcome(cfg, { fly: true, onDone: function () {
        try { sessionStorage.setItem(key, "1"); } catch (e) {}
        showChip(cfg);
      } });
    }
  }

  // ---- handwriting font (loaded only when personalizing) ----
  function injectFont() {
    if (document.getElementById("perso-font")) return;
    var l = document.createElement("link");
    l.id = "perso-font";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&display=swap";
    document.head.appendChild(l);
  }

  // ---- in-page highlights + handwritten margin notes ----
  function applyAnnotations(cfg) {
    (cfg.highlights || []).forEach(function (h) {
      if (!h || !h.target) return;
      var el = document.querySelector('[data-hl="' + h.target + '"]');
      if (!el) return;
      el.classList.add("perso-hl");
      if (!h.note) return;
      var side = h.side === "left" || h.side === "above" ? h.side : "right";
      var note = document.createElement("span");
      note.className = "perso-note perso-note--" + side;
      note.innerHTML = CURL + '<span class="perso-note__txt">' + esc(h.note) + "</span>";
      if (h.dy) note.style.top = h.dy; // optional vertical nudge for left/right notes
      el.appendChild(note); // absolutely positioned inside -> never shifts layout
    });
  }

  // ---- welcome overlay ----
  function runWelcome(cfg, opts) {
    opts = opts || {};
    var overlay = document.createElement("div");
    overlay.className = "perso-overlay";

    var monoWrap = document.createElement("div");
    monoWrap.className = "perso-mono";
    monoWrap.setAttribute("aria-hidden", "true");
    monoWrap.innerHTML = MONO;

    var card = document.createElement("div");
    card.className = "perso-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-label", "A note for " + (cfg.company || "you"));

    var logoHTML = cfg.logo
      ? '<img class="perso-card__logo" src="' + cfg.logo + '" alt="' + esc(cfg.company || "") +
        '" onerror="this.replaceWith(document.createTextNode(\'' + escAttr(cfg.company || "") + '\'))">'
      : esc(cfg.company || "");

    card.innerHTML =
      '<button class="perso-card__x" type="button" aria-label="Close">✕</button>' +
      (cfg.role ? '<div class="perso-card__role">' + esc(cfg.role) + "</div>" : "") +
      '<div class="perso-card__hi">Welcome in,&nbsp;' + logoHTML + "</div>" +
      (cfg.welcome ? '<p class="perso-card__msg">' + esc(cfg.welcome) + "</p>" : "") +
      '<div class="perso-card__cta"><button class="btn btn--solid perso-dismiss" type="button">Take a look ↓</button></div>';

    overlay.appendChild(monoWrap);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    document.body.classList.add("perso-lock");
    document.documentElement.classList.add("perso-veil"); // hide the real hero monogram while ours is on screen

    var docked = false;
    function dock() { if (docked) return; docked = true; overlay.classList.add("is-docked"); }

    if (opts.skipIntro || reduce) {
      overlay.classList.add("no-draw");
      requestAnimationFrame(function () { overlay.classList.add("is-in"); dock(); });
    } else {
      requestAnimationFrame(function () { overlay.classList.add("is-in"); });
      setTimeout(dock, 2900);
    }

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      document.body.classList.remove("perso-lock");

      var flew = false;
      if (opts.fly && !reduce && !isMobile()) {
        var monoEl = overlay.querySelector(".perso-mono");
        var target = document.querySelector(".hero__mark");
        if (monoEl && target) {
          try {
            var t = target.getBoundingClientRect();
            var m = monoEl.getBoundingClientRect();
            // the docked mono is raised by translateY(-27vh); an inline transform
            // drops that, so measure from the UN-shifted base position.
            var baseCX = m.left + m.width / 2;
            var baseCY = m.top + m.height / 2 + 0.27 * window.innerHeight;
            if (t.width > 24 && m.width > 0) {
              var scale = t.width / m.width;
              var dx = (t.left + t.width / 2) - baseCX;
              var dy = (t.top + t.height / 2) - baseCY;
              monoEl.style.transition = "transform 0.95s var(--ease), opacity 0.5s var(--ease) 0.72s";
              monoEl.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + scale + ")";
              monoEl.style.opacity = "0"; // crossfade out at the landing spot as the real mark fades in
              overlay.classList.add("is-flying");
              flew = true;
            }
          } catch (e) {}
        }
      }
      if (!flew) overlay.classList.add("is-out");

      var done = false;
      function fin() {
        if (done) return;
        done = true;
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.documentElement.classList.remove("perso-veil"); // the real hero monogram fades back in
        if (opts.onDone) opts.onDone();
      }
      // reveal the hero mark as the flown one nears its target, so they crossfade in place
      if (flew) setTimeout(function () { document.documentElement.classList.remove("perso-veil"); }, 800);
      setTimeout(fin, flew ? 1200 : 560);
    }

    card.querySelector(".perso-dismiss").addEventListener("click", close);
    card.querySelector(".perso-card__x").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay && docked) close(); });
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") { document.removeEventListener("keydown", onEsc); close(); }
    });
  }

  // ---- persistent chip (re-opens the card gently, no full intro, no fly) ----
  function showChip(cfg) {
    if (document.querySelector(".perso-chip")) return;
    var chip = document.createElement("div");
    chip.className = "perso-chip";
    var logo = cfg.logo ? '<img class="perso-chip__logo" src="' + cfg.logo + '" alt="' + esc(cfg.company || "") + '">' : esc(cfg.company || "");
    chip.innerHTML = '<button class="perso-chip__open" type="button" title="See the welcome again">Personalized for&nbsp;' + logo + "</button>";
    document.body.appendChild(chip);
    requestAnimationFrame(function () { chip.classList.add("is-in"); });

    chip.querySelector(".perso-chip__open").addEventListener("click", function () {
      chip.parentNode && chip.parentNode.removeChild(chip);
      runWelcome(cfg, { skipIntro: true, fly: false, onDone: function () { showChip(cfg); } });
    });
  }

  // ---- helpers ----
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function escAttr(s) { return String(s).replace(/'/g, "\\'"); }
})();
