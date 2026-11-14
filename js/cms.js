/* Charge le contenu publié depuis Supabase. En cas d'échec, le HTML statique reste en place. */
(function () {
  "use strict";
  var C = window.AME_CONFIG || {};
  if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY) return;

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function media(p) { return p || ""; }
  function formatDaHtml(n) {
    var num = String(n).replace(/[^\d]/g, "");
    if (!num) return "";
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "\u00a0<abbr title=\"dinars algériens\">DA</abbr>";
  }
  function setText(sel, v) {
    if (v == null) return;
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = v; });
  }
  function applyPhones(phone, display) {
    if (!phone && !display) return;
    var href = phone ? "tel:" + String(phone).replace(/[^\d+]/g, "") : "";
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      if (href) a.href = href;
      if (display && !a.classList.contains("call-fab") && !a.classList.contains("btn-call-lg")) {
        if (a.childElementCount === 0) a.textContent = display;
      }
    });
    var fab = document.querySelector(".call-fab");
    if (fab && display) fab.setAttribute("aria-label", "Appeler le " + display);
    document.querySelectorAll(".call-number").forEach(function (el) {
      if (display) el.textContent = display;
    });
  }

  function flattenMenu(menu) {
    if (!menu || !menu.length) return [];
    if (menu[0] && Object.prototype.hasOwnProperty.call(menu[0], "items")) {
      var out = [];
      menu.forEach(function (c) { (c.items || []).forEach(function (it) { out.push(it); }); });
      return out;
    }
    return menu;
  }
  function renderMenu(menu) {
    var grid = document.getElementById("menu-grid");
    if (!grid) return;
    var items = flattenMenu(menu).filter(function (it) { return it && !it.hidden; });
    if (!items.length) return;
    var lis = items.map(function (it) {
      var id = it.id || String(it.name || "plat");
      var price = String(it.price || "").replace(/[^\d]/g, "");
      var name = it.name || "";
      var desc = it.desc || "";
      var nameHtml = escapeHtml(name) + (desc ? " <em>(" + escapeHtml(desc) + ")</em>" : "");
      var dataName = desc ? name + " (" + desc + ")" : name;
      var priceHtml = price ? formatDaHtml(price) : "";
      var qty = price ? (
        "<span class=\"qty-ctrl\" data-id=\"" + escapeHtml(id) + "\" data-name=\"" + escapeHtml(dataName) + "\" data-price=\"" + escapeHtml(price) + "\">" +
        "<button type=\"button\" data-act=\"dec\" aria-label=\"Retirer " + escapeHtml(name) + "\">−</button>" +
        "<span class=\"qty\" aria-live=\"polite\">0</span>" +
        "<button type=\"button\" data-act=\"inc\" aria-label=\"Ajouter " + escapeHtml(name) + "\">+</button></span>"
      ) : "";
      return (
        "<li><span class=\"dish-name\">" + nameHtml + "</span>" +
        "<span class=\"dish-dots\" aria-hidden=\"true\"></span>" +
        (priceHtml ? "<span class=\"price\">" + priceHtml + "</span>" : "") +
        qty + "</li>"
      );
    }).join("");
    grid.innerHTML = "<ul class=\"menu-list\">" + lis + "</ul>";
  }

  function renderLieu(lieu) {
    var grid = document.getElementById("lieu-grid");
    if (!grid || !lieu || !lieu.length) return;
    grid.innerHTML = lieu.map(function (p) {
      var full = media(p.src);
      var sm = media(p.src_sm || p.src);
      return (
        '<button type="button" class="lieu-card reveal is-in lightbox-open" data-full="' + escapeHtml(full) + '" data-caption="' + escapeHtml(p.caption || p.label || "") + '">' +
        '<img src="' + escapeHtml(sm) + '" srcset="' + escapeHtml(sm) + " 900w, " + escapeHtml(full) + ' 1280w" alt="' + escapeHtml(p.alt || p.label || "") + '">' +
        (p.label ? '<span class="lieu-label">' + escapeHtml(p.label) + "</span>" : "") +
        "</button>"
      );
    }).join("");
  }

  function renderGallery(gallery) {
    var grid = document.getElementById("gallery-grid");
    if (!grid || !gallery || !gallery.length) return;
    grid.innerHTML = gallery.map(function (p, i) {
      var full = media(p.src);
      var sm = media(p.src_sm || p.src);
      var cls = "gallery-item reveal is-in lightbox-open" + (i === 0 || i % 4 === 2 ? " wide" : "");
      return (
        '<button type="button" class="' + cls + '" data-full="' + escapeHtml(full) + '" data-caption="' + escapeHtml(p.caption || "") + '">' +
        '<img src="' + escapeHtml(sm) + '" alt="' + escapeHtml(p.alt || p.caption || "") + '">' +
        "</button>"
      );
    }).join("");
  }

  function renderMarquee(gallery) {
    var track = document.querySelector(".photo-marquee-track");
    if (!track || !gallery || !gallery.length) return;
    var srcs = gallery.map(function (p) { return media(p.src_sm || p.src); }).filter(Boolean);
    if (!srcs.length) return;
    var imgs = srcs.concat(srcs).map(function (s) {
      return '<img src="' + escapeHtml(s) + '" alt="" />';
    }).join("");
    track.innerHTML = imgs;
  }

  function apply(d) {
    if (!d) return;
    var i = d.info || {};
    if (i.name) setText(".brand-name", i.name);
    if (i.tagline) {
      setText(".brand-tag", i.tagline);
      setText(".hero-pecherie", i.tagline);
    }
    if (i.kicker) setText(".hero-kicker", i.kicker);
    var notice = i.notice || "";
    if (i.open === false && !notice) notice = "Fermé exceptionnellement";
    document.querySelectorAll(".demo-banner, .site-footer .note").forEach(function (el) {
      if (notice) { el.textContent = notice; el.hidden = false; }
      else { el.hidden = true; el.textContent = ""; }
    });
    if (i.hours_text) {
      var hoursP = document.querySelector("#venir .info-card:first-of-type p:not(.note)");
      if (hoursP) hoursP.textContent = i.hours_text;
    }
    if (i.hours_note != null) {
      var hoursNote = document.querySelector("#venir .info-card:first-of-type .note");
      if (hoursNote) {
        hoursNote.textContent = i.hours_note;
        hoursNote.hidden = !i.hours_note;
      }
    }
    if (i.address) {
      var addr = document.querySelector("#venir .info-card:nth-of-type(3) p:not(.note)");
      if (addr) addr.textContent = i.address;
    }
    if (i.address_note != null) {
      var addrNote = document.querySelector("#venir .info-card:nth-of-type(3) .note");
      if (addrNote) { addrNote.textContent = i.address_note; addrNote.hidden = !i.address_note; }
    }
    if (i.order_intro) {
      var intro = document.querySelector("#commander .section-head p");
      if (intro) intro.textContent = i.order_intro;
    }
    var heroImg = document.querySelector(".hero-media img");
    if (heroImg && i.hero_src) {
      var src = media(i.hero_src);
      var sm = media(i.hero_src_sm || i.hero_src);
      heroImg.src = src;
      heroImg.srcset = sm + " 900w, " + src + " 1280w";
      if (i.hero_alt) heroImg.alt = i.hero_alt;
    }
    applyPhones(i.phone, i.phone_display);
    var foot = document.querySelector(".site-footer p:first-child");
    if (foot && i.name) {
      foot.textContent = i.name + (i.tagline ? " — " + i.tagline : "") + " · Honaine";
    }
    renderMenu(d.menu);
    renderLieu(d.lieu);
    renderGallery(d.gallery);
    renderMarquee(d.gallery && d.gallery.length ? d.gallery : null);
    if (window.AME && typeof window.AME.afterCms === "function") window.AME.afterCms();
  }

  var url = C.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/" + (C.CONTENT_TABLE || "amehonaine_site_content") + "?select=data&id=eq.1";
  fetch(url, {
    headers: {
      apikey: C.SUPABASE_ANON_KEY,
      Authorization: "Bearer " + C.SUPABASE_ANON_KEY
    }
  }).then(function (r) {
    if (!r.ok) throw new Error("cms " + r.status);
    return r.json();
  }).then(function (rows) {
    var row = Array.isArray(rows) ? rows[0] : rows;
    if (row && row.data) apply(row.data);
  }).catch(function () {
    /* fallback : contenu statique déjà dans la page */
  });
})();
