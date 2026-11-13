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
      nav.classList.toggle("is-open", open);
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navToggle.setAttribute("aria-expanded", "false");
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
  var lastFocus = null;

  function openLightbox(src, caption, alt) {
    if (!lightbox || !lbImg) return;
    lastFocus = document.activeElement;
    lbImg.src = src;
    lbImg.alt = alt || "";
    if (lbCap) lbCap.textContent = caption || "";
    lightbox.hidden = false;
    document.body.classList.add("is-locked");
    var closeBtn = lightbox.querySelector(".lightbox-close");
    if (closeBtn) closeBtn.focus();
  }
  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    if (lbImg) lbImg.removeAttribute("src");
    document.body.classList.remove("is-locked");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".lightbox-open");
    if (!btn) return;
    var img = btn.querySelector("img");
    openLightbox(btn.getAttribute("data-full"), btn.getAttribute("data-caption"), img ? img.alt : "");
  });
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    var closeBtn = lightbox.querySelector(".lightbox-close");
    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
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
      "<p class=\"sum-total\"><span>Total <small>(prix d'exemple)</small></span><span>" + formatDa(t.sum) + "</span></p>"
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
    if (e.key !== "Escape") return;
    if (lightbox && !lightbox.hidden) closeLightbox();
    else if (orderModal && !orderModal.hidden) closeModal();
  });

  renderCart();

  window.AME = {
    afterCms: function () {
      renderCart();
    }
  };
})();
