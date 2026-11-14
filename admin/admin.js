/* Espace gérant L'Âme de Honaine — contenu dans Supabase (schéma amehonaine, accès via vues publiques). */
(function () {
  'use strict';
  var C = window.AME_CONFIG, sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
  var $ = function (s) { return document.querySelector(s); }, D = null, DIRTY = false, TAB = 'infos', BASE = new URL('../', location.href).href;
  function h(tag, a) {
    var e = document.createElement(tag); a = a || {};
    for (var k in a) {
      var v = a[k];
      if (v == null || v === false) continue;
      if (k === 'text') e.textContent = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (k === 'value') e.value = v;
      else e.setAttribute(k, v);
    }
    for (var i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach(function (c) {
        if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return e;
  }
  function toast(t, err) { var x = h('div', { class: 'toast' + (err ? ' e' : ''), text: t }); $('#toasts').appendChild(x); setTimeout(function () { x.remove(); }, 4000); }
  function dirty() { DIRTY = true; var b = $('#save'); if (b) b.hidden = false; }
  function f(label, obj, key, o) {
    o = o || {};
    var i = o.area ? h('textarea', { rows: o.rows || 3 }) : h('input', { type: 'text', placeholder: o.ph });
    i.value = obj[key] == null ? '' : obj[key];
    i.oninput = function () { obj[key] = i.value; dirty(); };
    return h('label', null, label, i, o.hint ? h('small', { class: 'mut', text: o.hint }) : null);
  }
  function src(p) { return /^https?:/.test(p || '') ? p : BASE + (p || ''); }
  function showLogin(m) {
    $('#boot').hidden = true; $('#app').hidden = true; $('#login').hidden = false;
    if (m) { $('#login-err').textContent = m; $('#login-err').hidden = false; }
  }
  $('#login-form').onsubmit = function (e) {
    e.preventDefault(); $('#login-err').hidden = true;
    sb.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value }).then(function (r) {
      if (r.error) showLogin('E-mail ou mot de passe incorrect.');
      else start();
    });
  };
  function start() {
    sb.auth.getSession().then(function (s) {
      if (!s.data.session) return showLogin();
      sb.rpc(C.IS_ADMIN_RPC).then(function (r) {
        if (!r.data) { sb.auth.signOut(); return showLogin('Ce compte n’a pas accès à l’espace gérant de L’Âme de Honaine.'); }
        sb.from(C.CONTENT_TABLE).select('data,updated_at').eq('id', 1).single().then(function (r2) {
          if (r2.error) return toast('Lecture impossible : ' + r2.error.message, true);
          D = r2.data.data || {};
          D.info = D.info || {};
          D.menu = flattenMenu(D.menu || []);
          D.hours = D.hours || [];
          D.gallery = D.gallery || [];
          D.lieu = D.lieu || [];
          shell();
        });
      });
    });
  }
  var TABS = [
    ['infos', 'Infos & textes'],
    ['carte', 'Carte & prix'],
    ['horaires', 'Horaires'],
    ['photos', 'Photos'],
    ['historique', 'Historique']
  ];
  function shell() {
    $('#boot').hidden = true; $('#login').hidden = true;
    var app = $('#app'); app.hidden = false; app.innerHTML = '';
    app.appendChild(h('header', { class: 'top' },
      h('img', { src: '../images/logo.png', alt: '' }),
      h('b', { text: 'Espace gérant' }),
      h('span', { class: 'sp' }),
      h('a', { class: 'btn ghost sm', href: '../', target: '_blank', text: 'Voir le site' }),
      h('button', { class: 'btn ghost sm', text: 'Déconnexion', onclick: function () { sb.auth.signOut().then(function () { location.reload(); }); } })
    ));
    var t = h('nav', { class: 'tabs' });
    TABS.forEach(function (x) { t.appendChild(h('button', { 'data-t': x[0], text: x[1], onclick: function () { go(x[0]); } })); });
    app.appendChild(t);
    app.appendChild(h('main', { id: 'main' }));
    app.appendChild(h('button', { id: 'save', class: 'btn save', hidden: 'hidden', text: 'Enregistrer et publier', onclick: save }));
    go(TAB);
  }
  function go(t) {
    TAB = t;
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-t') === t); });
    var m = $('#main'); m.innerHTML = '';
    ({ infos: infos, carte: carte, horaires: horaires, photos: photos, historique: hist })[t](m);
  }
  function saveDone(ok, err) {
    var b = $('#save'); b.disabled = false; b.textContent = 'Enregistrer et publier';
    if (!ok) return toast('Échec : ' + (err || 'droits insuffisants'), true);
    DIRTY = false; b.hidden = true; toast('Publié. Le site est à jour.');
  }
  function save() {
    var b = $('#save'); b.disabled = true; b.textContent = 'Enregistrement…';
    sb.from(C.CONTENT_TABLE).update({ data: D }).eq('id', 1).select('updated_at').then(function (r) {
      if (r.error || !r.data || !r.data.length) {
        return sb.rpc('amehonaine_save_content', { payload: D }).then(function (r2) {
          saveDone(!r2.error, r2.error && r2.error.message);
        });
      }
      saveDone(true);
    });
  }
  window.addEventListener('beforeunload', function (e) { if (DIRTY) { e.preventDefault(); e.returnValue = ''; } });

  function infos(m) {
    var i = D.info;
    var sw = h('input', { type: 'checkbox' });
    sw.checked = i.open !== false;
    sw.onchange = function () { i.open = sw.checked; dirty(); };
    m.appendChild(h('div', { class: 'card' },
      h('h2', { text: 'Statut' }),
      h('label', { class: 'switch' }, sw, 'Ouvert (décochez pour une fermeture exceptionnelle)'),
      f('Bandeau d’annonce (vide = masqué)', i, 'notice', { ph: 'Ex. : Fermé exceptionnellement ce lundi' })
    ));
    m.appendChild(h('div', { class: 'card' },
      h('h2', { text: 'Textes & contacts' }),
      f('Nom', i, 'name'),
      f('Accroche (sous le nom)', i, 'tagline'),
      f('Ligne de lieu (accueil)', i, 'kicker'),
      h('div', { class: 'row' },
        f('Téléphone (format +213…)', i, 'phone'),
        f('Téléphone affiché', i, 'phone_display')
      ),
      f('Adresse', i, 'address'),
      f('Précision d’adresse', i, 'address_note'),
      f('Texte d’introduction « Commander »', i, 'order_intro', { area: 1, rows: 3 })
    ));
  }

  function move(arr, i, d) {
    var j = i + d;
    if (j < 0 || j >= arr.length) return;
    var x = arr[i]; arr[i] = arr[j]; arr[j] = x;
    dirty(); go(TAB);
  }
  function slug(s) {
    return String(s || 'plat').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
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
  function carte(m) {
    m.appendChild(h('p', { class: 'mut', text: 'Une seule liste de plats, sans rubriques. Prix en dinars (DA). Vous pouvez ajouter, modifier, réordonner, masquer ou supprimer un plat.' }));
    D.menu.forEach(function (it, ii) {
      var hid = h('input', { type: 'checkbox' });
      hid.checked = it.hidden === true;
      hid.onchange = function () { it.hidden = hid.checked; dirty(); };
      m.appendChild(h('div', { class: 'card item', style: 'display:block;border-top:0;padding:14px 0 4px' },
        h('div', { class: 'row' }, f('Plat', it, 'name'), f('Prix (DA)', it, 'price', { ph: 'ex. 2000' })),
        f('Précision (facultatif, très courte)', it, 'desc'),
        h('div', { class: 'acts' },
          h('label', { class: 'switch' }, hid, 'masquer'),
          h('button', { class: 'btn ghost sm', text: '↑', onclick: function () { move(D.menu, ii, -1); } }),
          h('button', { class: 'btn ghost sm', text: '↓', onclick: function () { move(D.menu, ii, 1); } }),
          upBtn('Photo', function (url) { it.img = url; go(TAB); }),
          it.img ? h('button', { class: 'btn ghost sm', text: 'Retirer photo', onclick: function () { delete it.img; dirty(); go(TAB); } }) : null,
          h('button', { class: 'btn red sm', text: 'Supprimer', onclick: function () { if (confirm('Supprimer « ' + it.name + ' » ?')) { D.menu.splice(ii, 1); dirty(); go(TAB); } } })
        )
      ));
    });
    m.appendChild(h('button', { class: 'btn', text: '+ Ajouter un plat', onclick: function () { D.menu.push({ id: slug('plat'), name: 'Nouveau plat', price: '', desc: '', hidden: false }); dirty(); go(TAB); } }));
  }

  function horaires(m) {
    var i = D.info;
    var b = h('div', { class: 'card' },
      h('h2', { text: 'Horaires' }),
      f('Phrase affichée sur le site', i, 'hours_text', { ph: 'Tous les jours 11h – 23h' }),
      f('Note sous les horaires', i, 'hours_note'),
      h('p', { class: 'mut', text: 'Détail par jour (format 11:00-23:00). Laissez vide pour « Fermé ».' })
    );
    (D.hours || []).forEach(function (d) { b.appendChild(f(d.day, d, 'slots')); });
    m.appendChild(b);
  }

  function upBtn(label, cb) {
    var inp = h('input', { type: 'file', accept: 'image/*', hidden: 'hidden' });
    inp.onchange = function () {
      var file = inp.files[0]; if (!file) return;
      toast('Envoi de la photo…');
      resize(file).then(function (blob) {
        var name = 'up-amehonaine_' + Math.random().toString(36).slice(2, 8) + '-' + Date.now() + '.webp';
        return sb.storage.from('images').upload(name, blob, { contentType: 'image/webp' }).then(function (r) {
          if (r.error) throw r.error;
          cb(sb.storage.from('images').getPublicUrl(name).data.publicUrl);
          dirty();
          toast('Photo ajoutée — pensez à enregistrer.');
        });
      }).catch(function (e) { toast('Échec de l’envoi : ' + (e.message || e), true); });
    };
    return h('span', null, inp, h('button', { class: 'btn ghost sm', type: 'button', text: label, onclick: function () { inp.click(); } }));
  }
  function resize(file) {
    return new Promise(function (ok, ko) {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, 1400 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { b ? ok(b) : ko('conversion'); }, 'image/webp', 0.82);
      };
      img.onerror = function () { ko('image illisible'); };
      img.src = URL.createObjectURL(file);
    });
  }

  function photos(m) {
    var i = D.info;
    var heroCard = h('div', { class: 'card' }, h('h2', { text: 'Photo d’accueil' }));
    if (i.hero_src) heroCard.appendChild(h('img', { class: 'hero-prev', src: src(i.hero_src), alt: '' }));
    heroCard.appendChild(h('div', { class: 'acts' },
      upBtn('Remplacer la photo d’accueil', function (url) { i.hero_src = url; i.hero_src_sm = url; go(TAB); })
    ));
    heroCard.appendChild(f('Texte alternatif', i, 'hero_alt'));
    m.appendChild(heroCard);

    m.appendChild(h('div', { class: 'card' },
      h('h2', { text: 'Salle & terrasse' }),
      h('p', { class: 'mut', text: 'Les deux photos de la section « Salle & terrasse ».' }),
      upBtn('+ Ajouter une photo de lieu', function (url) { D.lieu.push({ src: url, src_sm: url, label: 'Photo', alt: '', caption: '' }); go(TAB); })
    ));
    var lg = h('div', { class: 'gal' });
    (D.lieu || []).forEach(function (p, i) {
      lg.appendChild(h('div', { class: 'card' },
        h('img', { src: src(p.src_sm || p.src), alt: '' }),
        f('Libellé', p, 'label'),
        f('Légende', p, 'caption'),
        f('Texte alternatif', p, 'alt'),
        h('div', { class: 'acts' },
          h('button', { class: 'btn ghost sm', text: '←', onclick: function () { move(D.lieu, i, -1); } }),
          h('button', { class: 'btn ghost sm', text: '→', onclick: function () { move(D.lieu, i, 1); } }),
          h('button', { class: 'btn red sm', text: 'Retirer', onclick: function () { D.lieu.splice(i, 1); dirty(); go(TAB); } })
        )
      ));
    });
    m.appendChild(lg);

    m.appendChild(h('div', { class: 'card' },
      h('h2', { text: 'Galerie' }),
      h('p', { class: 'mut', text: 'Ordre d’affichage de gauche à droite, haut en bas.' }),
      upBtn('+ Ajouter une photo', function (url) { D.gallery.push({ src: url, src_sm: url, alt: 'Photo du restaurant', caption: '' }); go(TAB); })
    ));
    var g = h('div', { class: 'gal' });
    (D.gallery || []).forEach(function (p, i) {
      g.appendChild(h('div', { class: 'card' },
        h('img', { src: src(p.src_sm || p.src), alt: '' }),
        f('Légende', p, 'caption'),
        f('Texte alternatif', p, 'alt'),
        h('div', { class: 'acts' },
          h('button', { class: 'btn ghost sm', text: '←', onclick: function () { move(D.gallery, i, -1); } }),
          h('button', { class: 'btn ghost sm', text: '→', onclick: function () { move(D.gallery, i, 1); } }),
          h('button', { class: 'btn red sm', text: 'Retirer', onclick: function () { D.gallery.splice(i, 1); dirty(); go(TAB); } })
        )
      ));
    });
    m.appendChild(g);
  }

  function hist(m) {
    m.appendChild(h('p', { class: 'mut', text: 'Les 50 dernières versions. Restaurer charge le contenu ici ; cliquez ensuite sur « Enregistrer et publier ».' }));
    sb.from(C.HISTORY_TABLE).select('id,saved_at,data').order('id', { ascending: false }).limit(50).then(function (r) {
      if (r.error) return toast(r.error.message, true);
      if (!r.data.length) return m.appendChild(h('p', { text: 'Aucune version précédente.' }));
      r.data.forEach(function (v) {
        m.appendChild(h('div', { class: 'card row' },
          h('span', { text: new Date(v.saved_at).toLocaleString('fr-FR', { timeZone: 'Africa/Algiers' }) }),
          h('button', { class: 'btn ghost sm', text: 'Restaurer cette version', onclick: function () {
            if (confirm('Restaurer cette version ?')) { D = v.data; D.info = D.info || {}; D.menu = flattenMenu(D.menu || []); D.hours = D.hours || []; D.gallery = D.gallery || []; D.lieu = D.lieu || []; dirty(); toast('Version chargée — cliquez sur Enregistrer.'); }
          } })
        ));
      });
    });
  }

  sb.auth.getSession().then(function (s) { s.data.session ? start() : showLogin(); });
})();
