(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("menu-principal");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 20);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") !== "true";
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      nav.classList.toggle("is-open", open);
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Ouvrir le menu");
        nav.classList.remove("is-open");
      });
    });
  }

  // Light hero parallax
  var heroImg = document.querySelector(".hero-media img");
  if (heroImg && !reduceMotion) {
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (y < window.innerHeight) {
        heroImg.style.transform = "translateY(" + y * 0.18 + "px) scale(1)";
      }
    }, { passive: true });
  }

  // Scroll reveals
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  // Lightbox
  var lightbox = document.getElementById("lightbox");
  var lbImg = lightbox ? lightbox.querySelector("img") : null;
  var lbCap = lightbox ? lightbox.querySelector(".lightbox-caption") : null;
  var lbCount = lightbox ? lightbox.querySelector(".lightbox-counter") : null;
  var lastFocus = null;
  var lbItems = [];
  var lbIndex = 0;
  var touchStartX = 0;
  var touchStartY = 0;
  var touchActive = false;
  var touchLock = null;
  var SWIPE_THRESHOLD = 50;

  function collectLightboxItems(btn) {
    var root = btn && btn.closest("#gallery-grid, #lieu-grid");
    var list = root ? root.querySelectorAll(".lightbox-open") : (btn ? [btn] : []);
    return Array.prototype.slice.call(list);
  }
  function showLightboxAt(i) {
    if (!lightbox || !lbImg || !lbItems.length) return;
    var n = lbItems.length;
    lbIndex = ((i % n) + n) % n;
    var btn = lbItems[lbIndex];
    var img = btn.querySelector("img");
    var src = btn.getAttribute("data-full") || (img && (img.currentSrc || img.src)) || "";
    lbImg.src = src;
    lbImg.alt = (img && img.alt) || "";
    if (lbCap) lbCap.textContent = btn.getAttribute("data-caption") || "";
    if (lbCount) {
      lbCount.textContent = (lbIndex + 1) + " / " + n;
      lbCount.hidden = n < 2;
    }
    var prev = lightbox.querySelector(".lightbox-prev");
    var next = lightbox.querySelector(".lightbox-next");
    if (prev) prev.hidden = n < 2;
    if (next) next.hidden = n < 2;
    if (n > 1) {
      var pre = new Image();
      var nxt = lbItems[(lbIndex + 1) % n];
      if (nxt) pre.src = nxt.getAttribute("data-full") || "";
    }
  }
  function lightboxPrev() { showLightboxAt(lbIndex - 1); }
  function lightboxNext() { showLightboxAt(lbIndex + 1); }
  function openLightboxFrom(btn) {
    if (!lightbox || !lbImg || !btn) return;
    lastFocus = document.activeElement;
    lbItems = collectLightboxItems(btn);
    if (!lbItems.length) lbItems = [btn];
    lightbox.hidden = false;
    document.body.classList.add("is-locked");
    showLightboxAt(Math.max(0, lbItems.indexOf(btn)));
    var closeBtn = lightbox.querySelector(".lightbox-close");
    if (closeBtn) closeBtn.focus();
  }
  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    if (lbImg) lbImg.removeAttribute("src");
    document.body.classList.remove("is-locked");
    lbItems = [];
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".lightbox-open");
    if (!btn) return;
    openLightboxFrom(btn);
  });
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    var closeBtn = lightbox.querySelector(".lightbox-close");
    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    var prevBtn = lightbox.querySelector(".lightbox-prev");
    var nextBtn = lightbox.querySelector(".lightbox-next");
    if (prevBtn) prevBtn.addEventListener("click", function (e) { e.stopPropagation(); lightboxPrev(); });
    if (nextBtn) nextBtn.addEventListener("click", function (e) { e.stopPropagation(); lightboxNext(); });
    lightbox.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      touchActive = true;
      touchLock = null;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    lightbox.addEventListener("touchmove", function (e) {
      if (!touchActive || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - touchStartX;
      var dy = e.touches[0].clientY - touchStartY;
      if (!touchLock) {
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        touchLock = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
      if (touchLock === "h") e.preventDefault();
    }, { passive: false });
    lightbox.addEventListener("touchend", function (e) {
      if (!touchActive) return;
      touchActive = false;
      var wasH = touchLock === "h";
      touchLock = null;
      if (!wasH || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (dx <= -SWIPE_THRESHOLD) lightboxNext();
      else if (dx >= SWIPE_THRESHOLD) lightboxPrev();
    });
    lightbox.addEventListener("touchcancel", function () {
      touchActive = false;
      touchLock = null;
    });
    lightbox.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || lightbox.hidden) return;
      var focusable = lightbox.querySelectorAll("button:not([hidden])");
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  // Cart
  var cart = {};
  function qtyCtrls() { return document.querySelectorAll(".qty-ctrl"); }
  var cartList = document.getElementById("cart-list");
  var cartEmpty = document.getElementById("cart-empty");
  var cartTotal = document.getElementById("cart-total");
  var cartFab = document.getElementById("cart-fab");
  var cartFabCount = document.getElementById("cart-fab-count");
  var cartFabTotal = document.getElementById("cart-fab-total");
  var formHint = document.getElementById("form-hint");
  var orderForm = document.getElementById("order-form");
  var orderModal = document.getElementById("order-modal");
  var orderSummary = document.getElementById("order-summary");

  function formatDa(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "\u00a0DA";
  }

  function getItems() {
    return Object.keys(cart).map(function (id) { return cart[id]; }).filter(function (it) { return it.qty > 0; });
  }

  function totals() {
    var items = getItems();
    var count = 0;
    var sum = 0;
    items.forEach(function (it) {
      count += it.qty;
      sum += it.qty * it.price;
    });
    return { items: items, count: count, sum: sum };
  }

  function syncQtyDisplays() {
    qtyCtrls().forEach(function (ctrl) {
      var id = ctrl.getAttribute("data-id");
      var q = (cart[id] && cart[id].qty) || 0;
      var el = ctrl.querySelector(".qty");
      if (el) el.textContent = String(q);
    });
  }

  function renderCart() {
    var t = totals();
    syncQtyDisplays();
    if (!cartList || !cartEmpty || !cartTotal) return;
    if (t.count === 0) {
      cartList.hidden = true;
      cartList.innerHTML = "";
      cartEmpty.hidden = false;
      cartTotal.hidden = true;
      if (cartFab) cartFab.hidden = true;
      return;
    }
    cartEmpty.hidden = true;
    cartList.hidden = false;
    cartTotal.hidden = false;
    cartList.innerHTML = t.items.map(function (it) {
      return "<li><span>" + it.qty + "\u00d7 " + escapeHtml(it.name) + "</span><span>" + formatDa(it.qty * it.price) + "</span></li>";
    }).join("");
    var strong = cartTotal.querySelector("strong");
    if (strong) strong.textContent = formatDa(t.sum);
    if (cartFab) {
      cartFab.hidden = false;
      if (cartFabCount) cartFabCount.textContent = String(t.count);
      if (cartFabTotal) cartFabTotal.textContent = formatDa(t.sum);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".qty-ctrl button");
    if (!btn) return;
    var ctrl = btn.closest(".qty-ctrl");
    if (!ctrl) return;
    var id = ctrl.getAttribute("data-id");
    var name = ctrl.getAttribute("data-name");
    var price = Number(ctrl.getAttribute("data-price")) || 0;
    if (!cart[id]) cart[id] = { id: id, name: name, price: price, qty: 0 };
    var act = btn.getAttribute("data-act");
    if (act === "inc") cart[id].qty += 1;
    if (act === "dec") cart[id].qty = Math.max(0, cart[id].qty - 1);
    if (cart[id].qty === 0) delete cart[id];
    renderCart();
  });

  function closeModal() {
    if (!orderModal || orderModal.hidden) return;
    orderModal.hidden = true;
    document.body.classList.remove("is-locked");
  }

  function openModal() {
    if (!orderModal) return;
    lastFocus = document.activeElement;
    orderModal.hidden = false;
    document.body.classList.add("is-locked");
    var callBtn = orderModal.querySelector(".btn-call-lg");
    if (callBtn) callBtn.focus();
  }

  document.querySelectorAll("[data-close-modal]").forEach(function (el) {
    el.addEventListener("click", closeModal);
  });

  function buildSummaryHtml(t, name, phone, mode, notes) {
    var rows = t.items.map(function (it) {
      return "<li><span>" + it.qty + "\u00d7 " + escapeHtml(it.name) + "</span><span>" + formatDa(it.qty * it.price) + "</span></li>";
    }).join("");
    var notesHtml = notes ? "<p class=\"meta\">Note : " + escapeHtml(notes) + "</p>" : "";
    return (
      "<p class=\"meta\">" + escapeHtml(name) + " · " + escapeHtml(phone) + "</p>" +
      "<p class=\"meta\">" + escapeHtml(mode) + "</p>" +
      "<ul>" + rows + "</ul>" +
      notesHtml +
      "<p class=\"sum-total\"><span>Total</span><span>" + formatDa(t.sum) + "</span></p>"
    );
  }

  if (orderForm) {
    orderForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (formHint) { formHint.hidden = true; formHint.textContent = ""; }
      var t = totals();
      var name = (document.getElementById("order-name") || {}).value || "";
      var phone = (document.getElementById("order-phone") || {}).value || "";
      var notes = (document.getElementById("order-notes") || {}).value || "";
      var modeEl = orderForm.querySelector('input[name="mode"]:checked');
      var mode = modeEl ? modeEl.value : "Sur place";
      name = name.trim();
      phone = phone.trim();
      notes = notes.trim();
      if (t.count === 0) {
        if (formHint) {
          formHint.hidden = false;
          formHint.textContent = "Ajoutez au moins un plat depuis la carte.";
        }
        return;
      }
      if (!name || !phone) {
        if (formHint) {
          formHint.hidden = false;
          formHint.textContent = "Indiquez votre nom et votre téléphone, pour les donner lors de l'appel.";
        }
        return;
      }
      if (orderSummary) orderSummary.innerHTML = buildSummaryHtml(t, name, phone, mode, notes);
      openModal();
      // Nothing is sent: confirmation happens only by calling the restaurant.
    });
  }

  document.addEventListener("keydown", function (e) {
    if (lightbox && !lightbox.hidden) {
      if (e.key === "Escape") { e.preventDefault(); closeLightbox(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); lightboxPrev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); lightboxNext(); }
      return;
    }
    if (e.key === "Escape" && orderModal && !orderModal.hidden) closeModal();
  });

  renderCart();

  window.AME = {
    afterCms: function () {
      renderCart();
    }
  };
})();
