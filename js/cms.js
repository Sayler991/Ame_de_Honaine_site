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
      if (display && !a.classList.contains("call-fab") && !a.classList.contains("btn-call-lg") && !a.classList.contains("menu-custom-call")) {
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
  var ICON_FALLBACK = "icons/poisson.svg";
  var ICON_BY_ID = {
    melange: "icons/melange.svg",
    "special-calamar-crevettes": "icons/calamar-crevettes.svg",
    "plat-calamar": "icons/calamar.svg",
    "plat-crevette": "icons/crevette.svg",
    paella: "icons/paella.svg",
    soupe: "icons/soupe.svg",
    "bourek-crevette": "icons/bourek.svg"
  };
  function normalizeDishName(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, "et").replace(/[^a-z0-9]+/g, " ").trim();
  }
  var ICON_BY_NAME = {
    "melange": "icons/melange.svg",
    "special calamar et crevettes": "icons/calamar-crevettes.svg",
    "special calamar crevettes": "icons/calamar-crevettes.svg",
    "plat calamar": "icons/calamar.svg",
    "plat crevette": "icons/crevette.svg",
    "paella": "icons/paella.svg",
    "soupe de poisson": "icons/soupe.svg",
    "bourek crevette": "icons/bourek.svg",
    "commande personnalisee": "icons/chef.svg"
  };
  function dishIconSrc(it) {
    if (!it) return ICON_FALLBACK;
    if (it.icon) return media(it.icon);
    if (it.id && ICON_BY_ID[it.id]) return ICON_BY_ID[it.id];
    var n = normalizeDishName(it.name);
    if (ICON_BY_NAME[n]) return ICON_BY_NAME[n];
    if (/calamar/.test(n) && /crevette/.test(n)) return "icons/calamar-crevettes.svg";
    if (/calamar|encornet/.test(n)) return "icons/calamar.svg";
    if (/bourek|brick/.test(n)) return "icons/bourek.svg";
    if (/crevette|shrimp/.test(n)) return "icons/crevette.svg";
    if (/paella/.test(n)) return "icons/paella.svg";
    if (/soupe|soup/.test(n)) return "icons/soupe.svg";
    if (/commande personnalisee|sur mesure/.test(n)) return "icons/chef.svg";
    return ICON_FALLBACK;
  }
  function dishVisualHtml(src) {
    return "<span class=\"dish-visual\" aria-hidden=\"true\"><img src=\"" + escapeHtml(src || ICON_FALLBACK) + "\" alt=\"\" width=\"56\" height=\"56\"></span>";
  }
  function defaultCustomOrder() {
    return {
      enabled: true,
      name: "Commande personnalisée",
      price_label: "Sur demande",
      text: "Plateau ou plat sur mesure ? Appelez-nous pour en discuter.",
      button: "Appeler",
      icon: "icons/chef.svg"
    };
  }
  function renderCustomOrder(order, phone) {
    if (order && order.enabled === false) return "";
    var o = order && (order.name || order.price_label || order.text || order.button || order.icon) ? order : defaultCustomOrder();
    if (o.enabled === false) return "";
    var name = o.name || "Commande personnalisée";
    var priceLabel = o.price_label || "Sur demande";
    var text = o.text || "";
    var button = o.button || "Appeler";
    var href = "tel:" + String(phone || "+213773984853").replace(/[^\d+]/g, "");
    if (href === "tel:") href = "tel:+213773984853";
    var icon = dishIconSrc({ icon: o.icon, name: name, id: "commande-personnalisee" });
    if (!o.icon && icon === ICON_FALLBACK) icon = "icons/chef.svg";
    return (
      "<li class=\"menu-custom\">" +
      "<div class=\"menu-custom-row\">" +
      dishVisualHtml(icon) +
      "<span class=\"dish-main\">" +
      "<span class=\"dish-name\">" + escapeHtml(name) + "</span>" +
      "<span class=\"dish-dots\" aria-hidden=\"true\"></span>" +
      "<span class=\"price price-tbc\">" + escapeHtml(priceLabel) + "</span>" +
      "</span></div>" +
      (text ? "<p class=\"menu-custom-text\">" + escapeHtml(text) + "</p>" : "") +
      "<a class=\"btn btn-gold menu-custom-call\" href=\"" + escapeHtml(href) + "\"><span>" + escapeHtml(button) + "</span></a>" +
      "</li>"
    );
  }
  function renderMenu(menu, custom, phone) {
    var grid = document.getElementById("menu-grid");
    if (!grid) return;
    var items = flattenMenu(menu).filter(function (it) { return it && !it.hidden; });
    var customHtml = renderCustomOrder(custom, phone);
    if (!items.length && !customHtml) return;
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
        "<li>" + dishVisualHtml(dishIconSrc(it)) +
        "<span class=\"dish-main\"><span class=\"dish-name\">" + nameHtml + "</span>" +
        "<span class=\"dish-dots\" aria-hidden=\"true\"></span>" +
        (priceHtml ? "<span class=\"price\">" + priceHtml + "</span>" : "") +
        "</span>" + qty + "</li>"
      );
    }).join("");
    grid.innerHTML = "<ul class=\"menu-list\">" + lis + customHtml + "</ul>";
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

  function renderMarquee(items) {
    var track = document.querySelector(".photo-marquee-track");
    if (!track || !items || !items.length) return;
    var srcs = items.map(function (p) { return media(p.src_sm || p.src); }).filter(Boolean);
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
    renderMenu(d.menu, d.custom_order, (d.info || {}).phone);
    renderLieu(d.lieu);
    renderGallery(d.gallery);
    renderMarquee(d.marquee && d.marquee.length ? d.marquee : null);
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
