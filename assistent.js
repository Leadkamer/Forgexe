/*
 * Forgexe Assistent – AI-chatwidget voor klanten van Forgexe (gebouwd op het FietsBot-fundament)
 * Gebruik: <script src="https://www.forgexe.nl/assistent.js" data-klant="KLANT_ID" data-naam="Naam"></script>
 * (data-naam is optioneel: de naam in de teaserkaart vóór de eerste config-call)
 * Config, teksten en kleur komen uit de n8n data table assistent_klanten.
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://leadkamer.app.n8n.cloud/webhook/forgexe-assistent';
  var EVENTS_ENDPOINT = 'https://leadkamer.app.n8n.cloud/webhook/forgexe-assistent-events';

  var scriptTag = document.currentScript;
  if (!scriptTag) {
    var scripts = document.querySelectorAll('script[src*="assistent.js"]');
    scriptTag = scripts[scripts.length - 1];
  }
  var WINKEL = scriptTag ? (scriptTag.getAttribute('data-klant') || scriptTag.getAttribute('data-winkel')) : null;
  if (!WINKEL) return;
  /* Optioneel: data-naam="Fingo" zet de winkelnaam in de teaserkaart al vóór
     de eerste config-call (die komt pas als iemand de chat opent). */
  var DATA_NAAM = scriptTag ? scriptTag.getAttribute('data-naam') : null;

  var config = null;
  var open = false;
  var busy = false;
  var storeKey = 'fxa-' + WINKEL + '-v1';

  /* Standaardteksten per soort pagina; een winkel kan ze overschrijven via de
     kolommen teaser en chips in de data table (chips gescheiden door |). */
  var CONTEXTEN = {
    service: {
      teaser: 'Vraag over onderhoud of service?',
      chips: ['Hoe werkt het onderhoud?', 'Kan ik langskomen?', 'Wat zijn jullie openingstijden?']
    },
    contact: {
      teaser: 'Iets weten voor je belt?',
      chips: ['Wat zijn jullie openingstijden?', 'Waar kan ik jullie vinden?', 'Doen jullie reparaties?']
    },
    product: {
      teaser: 'Twijfel je over dit product?',
      chips: ['Help me kiezen', 'Wat kost dit voor mijn situatie?', 'Hoe snel wordt het geleverd?']
    },
    algemeen: {
      teaser: 'Kan ik je helpen? 👋',
      chips: ['Help me kiezen', 'Wat zijn jullie openingstijden?', 'Kan iemand me terugbellen?']
    },
    demo: {
      teaser: 'Wil je zien wat ik kan? 👋',
      chips: ['Wat kun jij allemaal?', 'Wat zijn jullie openingstijden?', 'Kan iemand me terugbellen?']
    }
  };

  function paginaPad() {
    try {
      return (location.pathname || '/').slice(0, 200);
    } catch (e) {
      return '/';
    }
  }

  /* Alleen op het URL-pad kijken, niet op document.title: veel winkelsites
     voeren op elke pagina dezelfde site-brede titel ("... fietsen, onderhoud
     en advies") waardoor elke pagina als reparatiepagina zou tellen. */
  function contextNaam() {
    if (config && String(config.soort || '') === 'product') return 'demo';
    var pad = paginaPad().toLowerCase();
    if (/onderhoud|service|reparat|storing/.test(pad)) return 'service';
    if (/contact|openingstijd|route|adres|vestiging|winkel-info/.test(pad)) return 'contact';
    /* Lease- en verzekeringspagina's bevatten vaak het woord "fiets" maar gaan
       niet over één model; daar past de algemene teaser beter dan "deze fiets". */
    if (/lease|verzeker/.test(pad)) return 'algemeen';
    if (/\/product\/|\/p\/|artikel|collectie|assortiment/.test(pad)) return 'product';
    return 'algemeen';
  }

  function paginaContext() {
    return CONTEXTEN[contextNaam()];
  }

  /* Een winkel mag teaser en chips ook PER PAGINASOORT zetten, met de soort
     als prefix: "algemeen=Welke fiets past bij jou?|product=Twijfel je nog?".
     Soorten die je niet noemt vallen terug op de standaardteksten hierboven,
     zodat je de reparatiepagina niet hoeft over te schrijven om de homepage
     aan te passen. Zonder prefix geldt de waarde op elke pagina (oude gedrag). */
  var SOORT_PREFIX = /^\s*(algemeen|product|service|contact|demo)\s*=/i;

  function perSoort(waarde) {
    var delen = String(waarde).split('|');
    if (!SOORT_PREFIX.test(delen[0])) return null;
    var map = {};
    for (var i = 0; i < delen.length; i++) {
      var gelijk = delen[i].indexOf('=');
      if (gelijk < 1) continue;
      var soort = delen[i].slice(0, gelijk).trim().toLowerCase();
      var rest = delen[i].slice(gelijk + 1).trim();
      if (soort && rest) map[soort] = rest;
    }
    return map;
  }

  function teaserTekst() {
    if (config && config.teaser) {
      var map = perSoort(config.teaser);
      if (!map) return config.teaser;
      var eigen = map[contextNaam()];
      if (eigen) return eigen;
    }
    return paginaContext().teaser;
  }

  function startChips() {
    if (config && config.chips) {
      /* Bij per-soort chips scheidt de puntkomma de chips onderling, omdat de
         pijp dan al de soorten scheidt. */
      var map = perSoort(config.chips);
      var bron = map ? (map[contextNaam()] || '') : String(config.chips);
      var eigen = bron.split(map ? ';' : '|');
      var schoon = [];
      for (var i = 0; i < eigen.length && schoon.length < 3; i++) {
        var c = eigen[i].trim();
        if (c) schoon.push(c);
      }
      if (schoon.length) return schoon;
    }
    return paginaContext().chips;
  }

  function sessieId() {
    try {
      var id = sessionStorage.getItem(storeKey + '-sessie');
      if (!id) {
        id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem(storeKey + '-sessie', id);
      }
      return id;
    } catch (e) {
      return 'anoniem';
    }
  }

  /* Events worden in de browser gebufferd en in één batch verstuurd bij het
     verlaten van de pagina. Zo blijft het bij ongeveer één n8n-executie per
     bezoekersessie in plaats van één per klik. */
  var eventBuffer = [];

  function flushEvents() {
    if (!eventBuffer.length) return;
    var payload = JSON.stringify({ winkel: WINKEL, sessie: sessieId(), events: eventBuffer });
    eventBuffer = [];
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(EVENTS_ENDPOINT, new Blob([payload], { type: 'text/plain;charset=UTF-8' }));
        return;
      }
    } catch (e) { /* beacon geweigerd, val terug op fetch */ }
    try {
      fetch(EVENTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: payload,
        keepalive: true
      });
    } catch (e) { /* meten mag de chat nooit breken */ }
  }

  function track(naam, detail) {
    eventBuffer.push({
      e: naam,
      p: paginaPad(),
      d: detail ? String(detail).slice(0, 200) : ''
    });
    if (eventBuffer.length >= 25) flushEvents();
  }

  function trackEenmalig(naam) {
    try {
      if (sessionStorage.getItem(storeKey + '-ev-' + naam)) return;
      sessionStorage.setItem(storeKey + '-ev-' + naam, '1');
    } catch (e) { /* zonder opslag meten we hem per pagina */ }
    track(naam);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushEvents();
  });
  window.addEventListener('pagehide', flushEvents);

  function loadHistory() {
    try {
      return JSON.parse(sessionStorage.getItem(storeKey + '-chat')) || [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(list) {
    try {
      sessionStorage.setItem(storeKey + '-chat', JSON.stringify(list.slice(-30)));
    } catch (e) { /* opslag niet beschikbaar, chat werkt gewoon door */ }
  }

  function saveVervolg(lijst) {
    try {
      sessionStorage.setItem(storeKey + '-vervolg', JSON.stringify(lijst || []));
    } catch (e) { /* opslag niet beschikbaar */ }
  }

  function loadVervolg() {
    try {
      return JSON.parse(sessionStorage.getItem(storeKey + '-vervolg')) || [];
    } catch (e) {
      return [];
    }
  }

  function isLight(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return false;
    var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderText(s) {
    return escapeHtml(s)
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  /* Plus Jakarta Sans (Spaak-huisstijl) */
  if (!document.querySelector('link[href*="Plus+Jakarta+Sans"]')) {
    var fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap';
    document.head.appendChild(fontLink);
  }

  var css = '' +
    '.fxa-root{position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:14px;line-height:1.55;letter-spacing:-0.005em;color:#0C0D10}' +
    '.fxa-btn{width:58px;height:58px;border-radius:999px;border:none;cursor:pointer;box-shadow:0 14px 30px rgba(12,13,16,.22);display:flex;align-items:center;justify-content:center;transition:transform .15s cubic-bezier(.16,1,.3,1)}' +
    '.fxa-btn:hover{transform:scale(1.06)}' +
    '.fxa-btn:active{transform:scale(.97)}' +
    '.fxa-btn svg{width:28px;height:28px}' +
    '.fxa-panel{position:absolute;right:0;bottom:74px;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 120px);background:#FFFFFF;border:1px solid #E6E6E0;border-radius:20px;box-shadow:0 30px 70px rgba(12,13,16,.16);display:none;flex-direction:column;overflow:hidden}' +
    '.fxa-root.fxa-open .fxa-panel{display:flex}' +
    '.fxa-head{padding:14px 16px;display:flex;align-items:center;gap:10px;flex:0 0 auto;background:#FFFFFF;border-bottom:1px solid #E6E6E0}' +
    '.fxa-avatar{width:34px;height:34px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;overflow:hidden}' +
    '.fxa-avatar img{width:100%;height:100%;object-fit:cover;border-radius:999px;display:block}' +
    '.fxa-head-txt{flex:1;min-width:0}' +
    '.fxa-head-naam{font-weight:600;font-size:13px;color:#0C0D10;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.fxa-head-sub{font-size:12px;color:#22A06B}' +
    '.fxa-close{background:none;border:none;cursor:pointer;font-size:22px;line-height:1;padding:4px;color:#8A909D}' +
    '.fxa-close:hover{color:#0C0D10}' +
    '.fxa-msgs{flex:1;overflow-y:auto;padding:16px;background:#F2F2EE;display:flex;flex-direction:column;gap:10px}' +
    '.fxa-msg{max-width:80%;padding:12px 16px;word-wrap:break-word;overflow-wrap:break-word;font-size:14px}' +
    '.fxa-msg-bot{background:#FFFFFF;color:#0C0D10;border:1px solid #E6E6E0;border-radius:18px 18px 18px 6px;align-self:flex-start}' +
    '.fxa-msg-bot a{font-weight:600;text-decoration:underline;word-break:break-all}' +
    '.fxa-msg-user{border-radius:18px 18px 6px 18px;align-self:flex-end;border:1px solid transparent}' +
    '.fxa-typing{display:inline-flex;gap:5px;align-items:center;padding:13px 16px;background:#FFFFFF;border:1px solid #E6E6E0;border-radius:18px 18px 18px 6px;align-self:flex-start}' +
    '.fxa-typing span{width:6px;height:6px;border-radius:999px;background:#B6BBC5;transition:background-color .15s cubic-bezier(.16,1,.3,1)}' +
    '.fxa-chips{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 10px;background:#F2F2EE;max-height:104px;overflow-y:auto}' +
    '.fxa-chips:empty{padding:0}' +
    '.fxa-chip{min-height:34px;padding:7px 14px;border-radius:17px;border:1px solid #D3D4CE;background:transparent;color:#22252C;font-family:inherit;font-weight:600;font-size:13px;line-height:1.3;text-align:left;cursor:pointer;max-width:100%;transition:background-color .15s ease}' +
    '.fxa-chip:hover{background:#FFFFFF}' +
    '.fxa-inputbar{flex:0 0 auto;padding:10px 12px;background:#F2F2EE}' +
    '.fxa-input-wrap{display:flex;align-items:center;gap:10px;padding:4px 4px 4px 18px;background:#FFFFFF;border-radius:999px;border:1px solid #D3D4CE;box-shadow:0 2px 6px rgba(12,13,16,.06);transition:border-color .15s ease,box-shadow .15s ease}' +
    '.fxa-input-wrap input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:14px;color:#0C0D10;min-width:0;height:38px}' +
    '.fxa-input-wrap input::placeholder{color:#8A909D}' +
    '.fxa-send{width:40px;height:40px;flex:none;border-radius:999px;border:none;background:#E8E8E2;color:#0C0D10;cursor:default;font-size:16px;transition:background-color .15s ease,transform .1s ease}' +
    '.fxa-send.fxa-armed{background:#C4F24C;cursor:pointer}' +
    '.fxa-send.fxa-armed:active{transform:scale(.94)}' +
    '.fxa-foot{flex:0 0 auto;text-align:center;font-size:10px;color:#8A909D;padding:0 0 8px;background:#F2F2EE}' +
    '.fxa-foot a{color:inherit;text-decoration:none}' +
    '.fxa-teaser{position:absolute;right:0;bottom:72px;width:288px;max-width:calc(100vw - 40px);background:#FFFFFF;border:1px solid #E6E6E0;border-radius:14px;box-shadow:0 14px 34px rgba(12,13,16,.14);padding:14px 34px 14px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;opacity:0;transform:translateY(8px);transition:opacity .3s cubic-bezier(.16,1,.3,1),transform .3s cubic-bezier(.16,1,.3,1),border-color .15s ease;pointer-events:none}' +
    '.fxa-teaser.fxa-show{opacity:1;transform:translateY(0);pointer-events:auto}' +
    '.fxa-teaser:hover{border-color:#D3D4CE}' +
    '.fxa-teaser-ico{width:40px;height:40px;flex:none;border-radius:999px;border:1px solid #E6E6E0;background:#FFFFFF;display:flex;align-items:center;justify-content:center;color:#22252C;overflow:hidden}' +
    '.fxa-teaser-ico svg{width:19px;height:19px}' +
    '.fxa-teaser-ico img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.fxa-teaser-body{flex:1;min-width:0}' +
    '.fxa-teaser-naam{font-size:13px;font-weight:700;color:#0C0D10;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.fxa-teaser-txt{font-size:13px;color:#8A909D;line-height:1.45;margin-top:2px}' +
    '.fxa-teaser-x{position:absolute;top:4px;right:6px;background:none;border:none;color:#8A909D;font-size:15px;cursor:pointer;padding:2px 4px;line-height:1;font-family:inherit}' +
    /* Kaartmodus: de teaserkaart vervangt de ronde knop als eerste staat */
    '.fxa-root.fxa-kaart .fxa-btn{display:none}' +
    '.fxa-root.fxa-kaart .fxa-teaser{bottom:0}' +
    '.fxa-teaser-x:hover{color:#0C0D10}' +
    '@media (max-width:520px){.fxa-root{right:12px;bottom:12px}.fxa-panel{position:fixed;inset:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0;border:none;bottom:0}.fxa-teaser{max-width:calc(100vw - 24px)}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var dynStyle = document.createElement('style');
  document.head.appendChild(dynStyle);

  var root = document.createElement('div');
  root.className = 'fxa-root';
  root.innerHTML =
    '<div class="fxa-panel" role="dialog" aria-label="Chat">' +
      '<div class="fxa-head">' +
        '<span class="fxa-avatar"></span>' +
        '<div class="fxa-head-txt"><div class="fxa-head-naam"></div><div class="fxa-head-sub">&#9679; Online — antwoordt direct</div></div>' +
        '<button class="fxa-close" aria-label="Sluiten">&times;</button>' +
      '</div>' +
      '<div class="fxa-msgs"></div>' +
      '<div class="fxa-chips"></div>' +
      '<div class="fxa-inputbar"><div class="fxa-input-wrap">' +
        '<input maxlength="1000" placeholder="Stel je vraag…" aria-label="Je vraag">' +
        '<button class="fxa-send" aria-label="Verstuur">&#8593;</button>' +
      '</div></div>' +
      '<div class="fxa-foot"><a href="https://www.forgexe.nl" target="_blank" rel="noopener">AI-assistent door Forgexe</a></div>' +
    '</div>' +
    '<div class="fxa-teaser" role="button" tabindex="0" aria-label="Open chat">' +
      '<button class="fxa-teaser-x" aria-label="Sluiten">&times;</button>' +
      '<span class="fxa-teaser-ico"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.1.92 4 2.43 5.43-.14 1.1-.6 2.42-1.43 3.32 1.64-.06 3.2-.66 4.33-1.42.86.24 1.76.37 2.67.37 4.97 0 9-3.58 9-8s-4.03-8-9-8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8.6" cy="11" r="1" fill="currentColor"/><circle cx="12" cy="11" r="1" fill="currentColor"/><circle cx="15.4" cy="11" r="1" fill="currentColor"/></svg></span>' +
      '<div class="fxa-teaser-body"><div class="fxa-teaser-naam"></div><div class="fxa-teaser-txt"></div></div>' +
    '</div>' +
    '<button class="fxa-btn" aria-label="Open chat">' +
      '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.1.92 4 2.43 5.43-.14 1.1-.6 2.42-1.43 3.32 1.64-.06 3.2-.66 4.33-1.42.86.24 1.76.37 2.67.37 4.97 0 9-3.58 9-8s-4.03-8-9-8Z" fill="currentColor"/></svg>' +
    '</button>';
  document.body.appendChild(root);

  var btn = root.querySelector('.fxa-btn');
  var avatarEl = root.querySelector('.fxa-avatar');
  var naamEl = root.querySelector('.fxa-head-naam');
  var closeBtn = root.querySelector('.fxa-close');
  var msgsEl = root.querySelector('.fxa-msgs');
  var chipsEl = root.querySelector('.fxa-chips');
  var inputEl = root.querySelector('input');
  var sendBtn = root.querySelector('.fxa-send');
  var teaserEl = root.querySelector('.fxa-teaser');
  var teaserTxtEl = root.querySelector('.fxa-teaser-txt');
  var teaserNaamEl = root.querySelector('.fxa-teaser-naam');
  var teaserIcoEl = root.querySelector('.fxa-teaser-ico');
  var teaserX = root.querySelector('.fxa-teaser-x');

  function applyKleur(kleur) {
    var licht = isLight(kleur);
    var tekst = licht ? '#0C0D10' : '#fff';
    btn.style.background = kleur;
    btn.style.color = tekst;
    if (!avatarEl.querySelector('img')) {
      avatarEl.style.background = kleur;
      avatarEl.style.color = tekst;
    }
    var linkKleur = licht ? '#22252C' : kleur;
    var pulsKleur = /^#[0-9a-fA-F]{6}$/.test(kleur) ? kleur : '#2F5CFF';
    dynStyle.textContent =
      '.fxa-msg-user{background:' + kleur + ';color:' + tekst + '}' +
      '.fxa-send.fxa-armed{background:' + kleur + ';color:' + tekst + '}' +
      '.fxa-input-wrap:focus-within{border-color:' + kleur + ';box-shadow:0 0 0 3px ' + kleur + '33}' +
      '.fxa-typing span.fxa-on{background:' + kleur + '}' +
      '.fxa-msg-bot a{color:' + linkKleur + '}' +
      '@keyframes fxa-pulse{0%{box-shadow:0 14px 30px rgba(12,13,16,.22),0 0 0 0 ' + pulsKleur + '59}80%{box-shadow:0 14px 30px rgba(12,13,16,.22),0 0 0 16px ' + pulsKleur + '00}100%{box-shadow:0 14px 30px rgba(12,13,16,.22),0 0 0 0 ' + pulsKleur + '00}}' +
      '.fxa-btn.fxa-pulsing{animation:fxa-pulse 1.9s cubic-bezier(.16,1,.3,1) 2}' +
      '@media (prefers-reduced-motion:reduce){.fxa-btn.fxa-pulsing{animation:none}}';
  }
  applyKleur('#2F5CFF');

  function scrollDown() {
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  /* Chips onder het gesprek: bij de start de introvragen, daarna de
     vervolgvragen die de bot zelf bij elk antwoord meestuurt. */
  function renderChips(lijst, bron) {
    chipsEl.innerHTML = '';
    if (!lijst || !lijst.length) return;
    for (var i = 0; i < lijst.length; i++) {
      chipsEl.appendChild(maakChip(lijst[i], bron));
    }
  }

  function maakChip(vraag, bron) {
    var b = document.createElement('button');
    b.className = 'fxa-chip';
    b.type = 'button';
    b.textContent = vraag;
    b.addEventListener('click', function () {
      track(bron === 'vervolg' ? 'vervolg_geklikt' : 'chip_geklikt', vraag);
      inputEl.value = vraag;
      send(bron);
    });
    return b;
  }

  function addMsg(rol, tekst, skipSave) {
    var el = document.createElement('div');
    el.className = 'fxa-msg ' + (rol === 'user' ? 'fxa-msg-user' : 'fxa-msg-bot');
    el.innerHTML = renderText(tekst);
    msgsEl.appendChild(el);
    scrollDown();
    if (!skipSave) {
      var h = loadHistory();
      h.push({ rol: rol, tekst: tekst });
      saveHistory(h);
    }
  }

  msgsEl.addEventListener('click', function (e) {
    var el = e.target;
    if (el && el.tagName === 'A') track('link_geklikt', el.getAttribute('href'));
  });

  var typingEl = null;
  var typingIv = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'fxa-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    msgsEl.appendChild(typingEl);
    scrollDown();
    var step = 0;
    typingIv = setInterval(function () {
      if (!typingEl) return;
      var dots = typingEl.querySelectorAll('span');
      for (var d = 0; d < dots.length; d++) dots[d].className = d === step ? 'fxa-on' : '';
      step = (step + 1) % 3;
    }, 260);
  }
  function hideTyping() {
    if (typingIv) { clearInterval(typingIv); typingIv = null; }
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  function post(body) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function foutmelding() {
    var tel = config && config.telefoon ? ' Je kunt ons ook bellen op ' + config.telefoon + '.' : '';
    addMsg('bot', 'Sorry, er ging iets mis. Probeer het zo nog eens.' + tel, true);
  }

  function applyConfig(data) {
    config = data;
    naamEl.textContent = data.naam || 'Chat';
    if (data.avatar_url && /^https:\/\//.test(data.avatar_url)) {
      var img = document.createElement('img');
      img.src = data.avatar_url;
      img.alt = '';
      img.onerror = function () {
        avatarEl.innerHTML = '';
        avatarEl.textContent = (data.naam || 'F').charAt(0).toUpperCase();
      };
      avatarEl.innerHTML = '';
      avatarEl.appendChild(img);
      avatarEl.style.background = '#fff';
      avatarEl.style.border = '1px solid #E6E6E0';
    } else {
      avatarEl.textContent = (data.naam || 'F').charAt(0).toUpperCase();
    }
    if (data.kleur) applyKleur(data.kleur);
    var h = loadHistory();
    if (h.length) {
      for (var i = 0; i < h.length; i++) addMsg(h[i].rol, h[i].tekst, true);
      renderChips(loadVervolg(), 'vervolg');
    } else {
      if (data.welkomst) addMsg('bot', data.welkomst);
      renderChips(startChips(), 'start');
    }
    vulTeaser();
    return data;
  }

  /* Config max 6 uur per sessie cachen: 1 webhook-call per bezoekersessie i.p.v. per pagina */
  var CONFIG_TTL = 6 * 60 * 60 * 1000;

  function initConfig() {
    if (config) return Promise.resolve(config);
    try {
      var cached = JSON.parse(sessionStorage.getItem(storeKey + '-config'));
      if (cached && cached.t && (Date.now() - cached.t) < CONFIG_TTL && cached.d && cached.d.naam) {
        return Promise.resolve(applyConfig(cached.d));
      }
    } catch (e) { /* geen of ongeldige cache — gewoon ophalen */ }
    return post({ winkel: WINKEL, actie: 'config' }).then(function (data) {
      try {
        sessionStorage.setItem(storeKey + '-config', JSON.stringify({ t: Date.now(), d: data }));
      } catch (e) { /* opslag niet beschikbaar */ }
      return applyConfig(data);
    });
  }

  function armSend() {
    sendBtn.className = 'fxa-send' + (inputEl.value.trim() && !busy ? ' fxa-armed' : '');
  }

  function send(bron) {
    var vraag = inputEl.value.trim();
    if (!vraag || busy) return;
    inputEl.value = '';
    addMsg('user', vraag);
    chipsEl.innerHTML = '';
    saveVervolg([]);
    busy = true;
    armSend();
    showTyping();
    track('bericht', bron || 'getypt');
    post({ winkel: WINKEL, actie: 'chat', vraag: vraag, sessie: sessieId(), pagina: paginaPad() })
      .then(function (data) {
        hideTyping();
        addMsg('bot', data.antwoord || 'Hmm, daar heb ik even geen antwoord op.');
        var vervolg = Array.isArray(data.vervolg) ? data.vervolg.slice(0, 3) : [];
        saveVervolg(vervolg);
        renderChips(vervolg, 'vervolg');
      })
      .catch(function () {
        hideTyping();
        foutmelding();
        track('fout', 'chat');
      })
      .then(function () {
        busy = false;
        armSend();
        inputEl.focus();
      });
  }

  /* Gecachte huisstijl direct toepassen bij laden (kleur/logo zonder extra call) */
  try {
    var bootCfg = JSON.parse(sessionStorage.getItem(storeKey + '-config'));
    if (bootCfg && bootCfg.t && (Date.now() - bootCfg.t) < CONFIG_TTL && bootCfg.d && bootCfg.d.naam) applyConfig(bootCfg.d);
  } catch (e) { /* geen cache */ }

  /* Teaser: compacte kaart met winkelnaam en een gedempte openingszin
     (Cartier-stijl). Bij het eerste bezoek in de sessie VERVANGT de kaart
     de ronde knop; de hele kaart opent de chat. Wie erop klikt of hem
     wegklikt, ziet daarna alleen nog de ronde knop. */
  var TEASER_KEY = storeKey + '-teaser';

  function teaserGezien() {
    try {
      return !!sessionStorage.getItem(TEASER_KEY);
    } catch (e) {
      return false;
    }
  }

  function markeerTeaserGezien() {
    try { sessionStorage.setItem(TEASER_KEY, '1'); } catch (e) { /* geen opslag */ }
  }

  function vulTeaser() {
    teaserNaamEl.textContent = (config && config.naam) || DATA_NAAM || 'Chat met ons';
    teaserTxtEl.textContent = teaserTekst();
    /* Winkellogo in het rondje zodra de config (uit cache) bekend is;
       anders blijft het neutrale chat-icoon staan. */
    if (config && config.avatar_url && /^https:\/\//.test(config.avatar_url) && !teaserIcoEl.querySelector('img')) {
      var img = document.createElement('img');
      img.src = config.avatar_url;
      img.alt = '';
      img.onerror = function () {
        if (img.parentNode) img.parentNode.removeChild(img);
        teaserIcoEl.querySelector('svg').style.display = '';
      };
      teaserIcoEl.querySelector('svg').style.display = 'none';
      teaserIcoEl.appendChild(img);
    }
  }

  function verbergTeaser() {
    teaserEl.classList.remove('fxa-show');
  }

  /* Zachte herinnering: een korte dubbele pulse op de knop, hooguit een paar
     keer per sessie. Stopt zodra iemand de chat opent of het ballonnetje
     wegklikt, slaat een beurt over als het tabblad niet zichtbaar is, en
     staat helemaal uit bij prefers-reduced-motion. */
  var PULS_INTERVAL = 45000;
  var PULS_MAX = 4;
  var pulsAantal = 0;
  var pulsTimer = null;
  var pulsGestopt = false;

  function magPulsen() {
    if (open || pulsGestopt || pulsAantal >= PULS_MAX) return false;
    if (loadHistory().length) return false;
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return false;
    } catch (e) { /* matchMedia niet beschikbaar, gewoon pulsen */ }
    return true;
  }

  function puls() {
    if (!magPulsen()) return;
    if (document.visibilityState === 'hidden') return;
    pulsAantal++;
    btn.classList.remove('fxa-pulsing');
    void btn.offsetWidth;
    btn.classList.add('fxa-pulsing');
  }

  function stopPulsen() {
    pulsGestopt = true;
    btn.classList.remove('fxa-pulsing');
    if (pulsTimer) { clearInterval(pulsTimer); pulsTimer = null; }
  }

  btn.addEventListener('animationend', function () {
    btn.classList.remove('fxa-pulsing');
  });

  pulsTimer = setInterval(function () {
    if (pulsGestopt || pulsAantal >= PULS_MAX) { stopPulsen(); return; }
    puls();
  }, PULS_INTERVAL);

  vulTeaser();

  /* Kaartmodus: nog niet gezien en nog geen gesprek → de kaart is de eerste
     staat van de widget en de ronde knop blijft verborgen. De klasse gaat er
     synchroon op, zodat de knop niet eerst even opflitst. */
  var kaartModus = !teaserGezien() && !loadHistory().length;

  function verlaatKaartModus() {
    kaartModus = false;
    root.classList.remove('fxa-kaart');
  }

  if (kaartModus) {
    root.classList.add('fxa-kaart');
    setTimeout(function () {
      if (open || !kaartModus) return;
      vulTeaser();
      teaserEl.classList.add('fxa-show');
      track('teaser_getoond', teaserTxtEl.textContent);
      markeerTeaserGezien();
    }, 300);
  } else {
    setTimeout(puls, 4000);
  }

  teaserEl.addEventListener('click', function () {
    track('teaser_geklikt', '');
    verbergTeaser();
    verlaatKaartModus();
    openChat('teaser');
  });

  teaserEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      teaserEl.click();
    }
  });

  teaserX.addEventListener('click', function (e) {
    e.stopPropagation();
    track('teaser_weggeklikt', '');
    markeerTeaserGezien();
    verbergTeaser();
    verlaatKaartModus();
    stopPulsen();
  });

  function openChat(bron) {
    if (!open) {
      open = true;
      root.classList.add('fxa-open');
      stopPulsen();
      /* Wie de chat opent hoeft de teaserkaart deze sessie niet meer te zien */
      markeerTeaserGezien();
      verlaatKaartModus();
      track('chat_geopend', bron);
    }
    initConfig()
      .catch(function () {
        naamEl.textContent = 'Chat';
        avatarEl.textContent = '!';
        addMsg('bot', 'Sorry, de chat is nu even niet beschikbaar. Probeer het later opnieuw.', true);
        track('fout', 'config');
      });
    setTimeout(function () { inputEl.focus(); }, 100);
  }

  btn.addEventListener('click', function () {
    verbergTeaser();
    if (open) {
      open = false;
      root.classList.remove('fxa-open');
      return;
    }
    openChat('knop');
  });

  closeBtn.addEventListener('click', function () {
    open = false;
    root.classList.remove('fxa-open');
    flushEvents();
  });

  sendBtn.addEventListener('click', function () { send('getypt'); });
  inputEl.addEventListener('input', armSend);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      send('getypt');
    }
  });

  trackEenmalig('geladen');
})();
