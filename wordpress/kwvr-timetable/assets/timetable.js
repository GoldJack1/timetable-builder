(function () {
  function formatWhen(iso, letter, name) {
    var label = iso;
    var parts = iso.split("-");
    if (parts.length >= 3) {
      var dt = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      if (!isNaN(dt.getTime())) {
        label = dt.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    }
    if (letter) {
      label += " · " + letter + (name ? " " + name : "");
    }
    return label;
  }

  function paletteName(root, letter) {
    try {
      var names = JSON.parse(root.getAttribute("data-kwvr-names") || "{}");
      return names[letter] || "";
    } catch (e) {
      return "";
    }
  }

  function monthCards(root) {
    return Array.prototype.slice.call(root.querySelectorAll("[data-kwvr-month]"));
  }

  function currentIndex(root) {
    var cards = monthCards(root);
    for (var i = 0; i < cards.length; i++) {
      if (!cards[i].hidden) return i;
    }
    return 0;
  }

  function showMonth(root, index) {
    var cards = monthCards(root);
    if (!cards.length) return;
    if (index < 0) index = 0;
    if (index > cards.length - 1) index = cards.length - 1;
    cards.forEach(function (card, i) {
      card.hidden = i !== index;
    });
    var title = root.querySelector("[data-kwvr-month-label]");
    if (title) title.textContent = cards[index].getAttribute("data-kwvr-month-title") || "";
    var prev = root.querySelector("[data-kwvr-month-prev]");
    var next = root.querySelector("[data-kwvr-month-next]");
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === cards.length - 1;
  }

  function startMonthIndex(root) {
    var cards = monthCards(root);
    var now = new Date();
    var id = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute("data-kwvr-month") === id) return i;
    }
    return 0;
  }

  function closeOverlay(root) {
    var overlay = root.querySelector(".kwvr-tt-overlay");
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove("kwvr-tt-open");
  }

  function openOverlay(root, iso, letter) {
    var overlay = root.querySelector(".kwvr-tt-overlay");
    if (!overlay) return;
    overlay.hidden = false;
    document.body.classList.add("kwvr-tt-open");
    root.querySelectorAll("[data-kwvr-iso]").forEach(function (el) {
      el.classList.toggle("is-selected", el.getAttribute("data-kwvr-iso") === iso);
    });
    var empty = overlay.querySelector(".kwvr-tt-overlay-empty");
    var title = overlay.querySelector(".kwvr-tt-overlay-when");
    var shown = false;
    overlay.querySelectorAll("[data-kwvr-panel]").forEach(function (el) {
      var on = !!letter && el.getAttribute("data-kwvr-panel") === letter;
      el.hidden = !on;
      el.classList.toggle("is-active", on);
      if (on) shown = true;
    });
    if (title) title.textContent = formatWhen(iso, letter, paletteName(root, letter));
    if (empty) empty.hidden = shown;
    var closeBtn = overlay.querySelector(".kwvr-tt-overlay-close");
    if (closeBtn) closeBtn.focus();
  }

  function init(root) {
    if (root.getAttribute("data-kwvr-ready")) return;
    root.setAttribute("data-kwvr-ready", "1");
    showMonth(root, startMonthIndex(root));
  }

  document.addEventListener("click", function (e) {
    var close = e.target.closest("[data-kwvr-close]");
    if (close) {
      var closed = close.closest(".kwvr-tt-live");
      if (closed) closeOverlay(closed);
      return;
    }
    var prev = e.target.closest("[data-kwvr-month-prev]");
    if (prev) {
      var pRoot = prev.closest(".kwvr-tt-live");
      if (pRoot) showMonth(pRoot, currentIndex(pRoot) - 1);
      return;
    }
    var next = e.target.closest("[data-kwvr-month-next]");
    if (next) {
      var nRoot = next.closest(".kwvr-tt-live");
      if (nRoot) showMonth(nRoot, currentIndex(nRoot) + 1);
      return;
    }
    var day = e.target.closest("[data-kwvr-iso]");
    if (!day) return;
    if (e.target.closest("a")) return;
    var live = day.closest(".kwvr-tt-live");
    if (!live) return;
    e.preventDefault();
    openOverlay(live, day.getAttribute("data-kwvr-iso") || "", day.getAttribute("data-kwvr-letter") || "");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".kwvr-tt-live").forEach(closeOverlay);
  });

  function boot() {
    document.querySelectorAll(".kwvr-tt-live").forEach(init);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
