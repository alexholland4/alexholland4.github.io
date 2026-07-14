/* ============================================================
   Personalization layer
   Reads ?for=<company> (or bare ?<company>), loads a per-company
   config, and layers a welcome + in-page annotations onto the
   normal portfolio. Does nothing without a matching config.
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // must match main.css's mobile-hero breakpoint (960px): below it the hero mark
  // is a full-screen absolute layer, so the fly-to-hero handoff has no valid target
  function isMobile() { return window.matchMedia("(max-width: 960px)").matches; }

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

  // base arrow points RIGHT; JS rotates the whole thing to aim at each bullet.
  // The shaft comes into the tip (39,9) LEVEL (horizontal end tangent) and the two
  // barbs are symmetric about y=9, so the body splits the arrowhead down the middle.
  var CURL =
    '<svg class="perso-note__curl" viewBox="0 0 44 18" fill="none" aria-hidden="true">' +
    '<path d="M3 11 C 16 5, 28 9, 39 9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M39 9 L 30 5 M39 9 L 30 13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

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
      note.className = "perso-note perso-note--" + side + (h.fit ? " perso-note--fit" : "");
      note.innerHTML = CURL + '<span class="perso-note__txt">' + esc(h.note) + "</span>";
      if (h.dy) note.style.top = h.dy; // optional vertical nudge for left/right notes
      el.appendChild(note); // absolutely positioned inside -> never shifts layout
    });
    scheduleOrient();
  }

  // point each arrow straight at the bullet it annotates.
  // We read the arrow tip's real screen position from the SVG's own coordinate
  // matrix (getScreenCTM) instead of estimating it, so the tip lands exactly.
  function orientArrows() {
    var mobile = window.matchMedia("(max-width: 960px)").matches; // matches the CSS static-note breakpoint
    document.querySelectorAll(".perso-note").forEach(function (note) {
      var curl = note.querySelector(".perso-note__curl");
      var item = note.parentElement;
      if (!curl || !item) return;
      if (mobile) { curl.style.transform = ""; note.style.maxWidth = ""; return; }
      curl.style.transform = ""; // reset first so we measure the untransformed arrow (no drift on re-runs)

      // clamp side notes to the room left before the viewport edge, so on narrower
      // desktop/tablet windows they wrap into more rows instead of running off screen
      note.style.maxWidth = "";
      var nr = note.getBoundingClientRect();
      var room = note.classList.contains("perso-note--right") ? window.innerWidth - nr.left - 14
               : note.classList.contains("perso-note--left") ? nr.right - 14
               : Infinity;
      if (nr.width > room) note.style.maxWidth = Math.max(96, Math.floor(room)) + "px";

      var ir = item.getBoundingClientRect();
      var cr = curl.getBoundingClientRect();
      var cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;

      // exact tip position: viewBox point (39,9) mapped through the arrow's screen matrix
      var tipX, tipY;
      var m = curl.getScreenCTM && curl.getScreenCTM();
      if (m) {
        tipX = m.a * 39 + m.c * 9 + m.e;
        tipY = m.b * 39 + m.d * 9 + m.f;
      } else {                          // fallback if CTM is unavailable
        tipX = cx + cr.width * 0.386; tipY = cy;
      }
      var tvx = tipX - cx, tvy = tipY - cy;
      var tipLen = Math.hypot(tvx, tvy) || 1;   // measured center-to-tip distance
      var tipAng = Math.atan2(tvy, tvx);        // arrow's resting direction (~0, points right)

      // where the tip should land
      var tx, ty;
      if (note.classList.contains("perso-note--above")) {
        tx = cx; ty = ir.top + 8;               // straight down onto the card's top edge
      } else if (note.classList.contains("perso-note--right")) {
        tx = ir.right; ty = Math.max(ir.top + 8, Math.min(cy, ir.bottom - 8));
      } else {
        tx = ir.left; ty = Math.max(ir.top + 8, Math.min(cy, ir.bottom - 8));
      }

      var dx = tx - cx, dy = ty - cy;
      var dist = Math.hypot(dx, dy) || 1;
      var aim = Math.atan2(dy, dx);
      var gap = -1;                              // let the tip just kiss the target edge
      var move = dist - tipLen - gap;
      var mvx = Math.cos(aim) * move, mvy = Math.sin(aim) * move;
      var rot = (aim - tipAng) * 180 / Math.PI; // rotate so the tip aligns with the aim direction
      curl.style.transform = "translate(" + mvx.toFixed(1) + "px," + mvy.toFixed(1) + "px) rotate(" + rot.toFixed(2) + "deg)";
    });
  }
  var orientBound = false;
  function scheduleOrient() {
    orientArrows();
    setTimeout(orientArrows, 600);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(orientArrows);
    if (orientBound) return;
    orientBound = true;
    window.addEventListener("load", orientArrows);
    var t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(orientArrows, 150); });
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
    // reserve the scrollbar gutter so locking (and later unlocking) the page never
    // changes its width -> the hero can't reflow/shift under the fly-to-hero handoff
    document.documentElement.style.scrollbarGutter = "stable";
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

      var FLIGHT = 900;
      var monoEl = overlay.querySelector(".perso-mono");
      var target = document.querySelector(".hero__mark");
      var canFly = !!(opts.fly && !reduce && !isMobile() && monoEl && target);

      var done = false;
      function fin() {
        if (done) return;
        done = true;
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.documentElement.classList.remove("perso-veil"); // the real hero monogram fades back in
        document.body.classList.remove("perso-lock");             // unlock ONLY after the handoff
        if (opts.onDone) opts.onDone();
      }

      function bail() {
        overlay.classList.add("is-out");
        setTimeout(fin, 560);
      }

      if (!canFly) { bail(); return; }

      // The page stays scroll-locked through the whole flight, so the hero's layout
      // cannot shift under us between measuring and landing. We unlock in fin(),
      // after the handoff; the reserved scrollbar gutter keeps that shift-free too.
      // Measure the .mono SVGs themselves, not their wrappers: the wrappers can be
      // taller than the artwork, which would letterbox the clone's SVG and land it low.
      var first = (monoEl.querySelector(".mono") || monoEl).getBoundingClientRect(); // docked mono, on screen
      var last = (target.querySelector(".mono") || target).getBoundingClientRect(); // where the hero mark's artwork sits
      if (!(last.width > 24 && first.width > 0)) { bail(); return; }

      // Fly a clone positioned in absolute viewport pixels and scaled from its
      // top-left, so its final box provably overlays the hero mark exactly.
      var fly = document.createElement("div");
      fly.className = "perso-fly";
      fly.innerHTML = MONO;
      // strokes solid (no redraw), arrow hidden, and NO drop-shadow: the scaled
      // shadow would sit low under the mark and read as "landed too low".
      fly.querySelectorAll(".mono__s").forEach(function (s) { s.style.animation = "none"; s.style.strokeDashoffset = "0"; });
      var ar = fly.querySelector(".mono__arrow"); if (ar) { ar.style.animation = "none"; ar.style.opacity = "0"; }
      var pp = fly.querySelector(".mono__pop"); if (pp) { pp.style.animation = "none"; pp.style.opacity = "0"; }
      var mn = fly.querySelector(".mono"); if (mn) mn.style.filter = "none";
      fly.style.cssText =
        "position:fixed;left:0;top:0;margin:0;z-index:3001;pointer-events:none;" +
        "width:" + first.width + "px;height:" + first.height + "px;" +
        "transform-origin:top left;will-change:transform;" +
        "transform:translate(" + first.left.toFixed(1) + "px," + first.top.toFixed(1) + "px);";
      document.body.appendChild(fly);
      monoEl.style.visibility = "hidden"; // the clone takes over from the docked original
      overlay.classList.add("is-flying");

      var scale = last.width / first.width;
      requestAnimationFrame(function () {
        fly.style.transition = "transform 0.9s var(--ease)";
        fly.style.transform = "translate(" + last.left.toFixed(1) + "px," + last.top.toFixed(1) + "px) scale(" + scale.toFixed(4) + ")";
      });

      // the clone and the real mark are pixel-identical at touchdown, so no
      // cross-fade: swap them in a single frame (a fade would dip combined
      // opacity mid-way and read as a blink). transitionend fires the swap the
      // exact frame the flight ends; the timeout is only a safety net.
      var swapped = false;
      function swap() {
        if (swapped) return;
        swapped = true;
        target.style.transition = "none"; // no fade-in on the real mark
        document.documentElement.classList.remove("perso-veil");
        if (fly.parentNode) fly.parentNode.removeChild(fly);
        void target.offsetWidth; // force a style flush so opacity:1 commits WITHOUT a transition
        requestAnimationFrame(function () { target.style.transition = ""; });
      }
      fly.addEventListener("transitionend", swap);
      setTimeout(swap, FLIGHT + 150);
      setTimeout(fin, FLIGHT + 460);
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
