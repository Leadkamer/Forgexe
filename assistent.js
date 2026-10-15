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
  /* Optioneel: data-avatar="https://..." toont de avatar al in de teaserkaart en
     de kop, ook bij een eerste bezoek zonder gecachte config. */
  var DATA_AVATAR = scriptTag ? scriptTag.getAttribute('data-avatar') : null;
  if (DATA_AVATAR && !/^https:\/\//.test(DATA_AVATAR)) DATA_AVATAR = null;

  var WA_ICOON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7c-1.5 0-2.9-.4-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1l-.1-.3Z"/></svg>';

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
    /* Testomgeving: daar staat de site van de klant in een frame en zet de
       testpagina hier het pad van de pagina die in dat frame open staat. */
    if (window.FXA_TEST_PAD) return String(window.FXA_TEST_PAD).slice(0, 200);
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

  /* Paginadata (ballon, startvragen, samenvatting voor de bot) per URL-pad,
     uit forgexe.nl/assistent-data/<klant>.js. Zonder data gelden de teksten
     per paginasoort hieronder. */
  var PAGINA_DATA = null;
  var laatsteBallon = '';

  function paginaInfo() {
    if (!PAGINA_DATA || !PAGINA_DATA.paginas) return null;
    var p = PAGINA_DATA.paginas;
    var pad = paginaPad();
    return p[pad] || p[pad.replace(/\/?$/, '/')] || p[pad.replace(/\/+$/, '')] || null;
  }

  function teaserTekst() {
    var info = paginaInfo();
    if (info && info.ballon && !info.stil) return info.ballon;
    if (config && config.teaser) {
      var map = perSoort(config.teaser);
      if (!map) return config.teaser;
      var eigen = map[contextNaam()];
      if (eigen) return eigen;
    }
    return paginaContext().teaser;
  }

  function startChips() {
    var info = paginaInfo();
    if (info && Array.isArray(info.chips) && info.chips.length) return info.chips.slice(0, 3);
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
    /* Basis tegen knop- en invoerstijlen van het thema van de klant */
    '.fxa-root button,.fxa-root input{text-transform:none;letter-spacing:normal;box-shadow:none;margin:0;text-shadow:none;font-family:inherit}' +
    '.fxa-root img{max-width:none;opacity:1}' +
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
    '.fxa-wa{width:34px;height:34px;flex:none;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#1DA851;text-decoration:none;transition:background-color .15s ease}' +
    '.fxa-wa:hover{background:#E9F8EF}' +
    '.fxa-wa svg{width:20px;height:20px;display:block}' +
    '.fxa-wa-knop{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 16px;border-radius:12px;background:#1DA851;color:#FFFFFF;font-family:inherit;font-weight:700;font-size:14px;text-decoration:none}' +
    '.fxa-wa-knop:hover,.fxa-wa-knop:focus{background:#178F45;color:#FFFFFF}' +
    '.fxa-wa-knop svg{width:18px;height:18px}' +
    '.fxa-close:hover{color:#0C0D10}' +
    '.fxa-msgs{flex:1;overflow-y:auto;padding:16px;background:#F2F2EE;display:flex;flex-direction:column;gap:10px}' +
    '.fxa-msg{max-width:80%;padding:12px 16px;word-wrap:break-word;overflow-wrap:break-word;font-size:14px}' +
    '.fxa-msg-bot{background:#FFFFFF;color:#0C0D10;border:1px solid #E6E6E0;border-radius:18px 18px 18px 6px;align-self:flex-start}' +
    '.fxa-msg-bot a{font-weight:600;text-decoration:underline;word-break:break-all}' +
    '.fxa-msg-user{border-radius:18px 18px 6px 18px;align-self:flex-end;border:1px solid transparent}' +
    '.fxa-typing{display:inline-flex;gap:5px;align-items:center;padding:13px 16px;background:#FFFFFF;border:1px solid #E6E6E0;border-radius:18px 18px 18px 6px;align-self:flex-start}' +
    '.fxa-typing span{width:6px;height:6px;border-radius:999px;background:#B6BBC5;transition:background-color .15s cubic-bezier(.16,1,.3,1)}' +
    /* Geen eigen scrollvak: hooguit drie vragen, die passen altijd volledig */
    '.fxa-chips{display:flex;gap:6px;flex-wrap:wrap;padding:2px 16px 10px;background:#F2F2EE;flex:0 0 auto}' +
    '.fxa-chips:empty{padding:0}' +
    '.fxa-chip{min-height:34px;padding:7px 14px;border-radius:17px;border:1px solid #D3D4CE;background:transparent;color:#22252C;font-family:inherit;font-weight:600;font-size:13px;line-height:1.3;text-align:left;cursor:pointer;max-width:100%;transition:background-color .15s ease}' +
    /* Eigen hover- en focuskleuren: thema's maken knoptekst bij hover vaak wit */
    '.fxa-chip:hover,.fxa-chip:focus{background:#FFFFFF;color:#22252C;border-color:#B6BBC5}' +
    '.fxa-seg button:hover,.fxa-seg button:focus{background:#F2F2EE;color:#22252C;border-color:#B6BBC5}' +
    '.fxa-stepper button:hover,.fxa-stepper button:focus{background:#F2F2EE;color:#22252C}' +
    '.fxa-cta2:hover,.fxa-cta2:focus{background:#F2F2EE;color:#22252C;border-color:#B6BBC5}' +
    '.fxa-send:hover,.fxa-send:focus{color:#0C0D10}' +
    '.fxa-wa:hover,.fxa-wa:focus{color:#1DA851}' +
    '.fxa-inputbar{flex:0 0 auto;padding:10px 12px;background:#F2F2EE}' +
    '.fxa-input-wrap{display:flex;align-items:center;gap:10px;padding:4px 4px 4px 18px;background:#FFFFFF;border-radius:999px;border:1px solid #D3D4CE;box-shadow:0 2px 6px rgba(12,13,16,.06);transition:border-color .15s ease,box-shadow .15s ease}' +
    /* 16px: kleiner laat iPhones bij het tikken inzoomen op het invoerveld */
    '.fxa-input-wrap input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:16px;color:#0C0D10;min-width:0;height:38px}' +
    '.fxa-input-wrap input::placeholder{color:#8A909D}' +
    '.fxa-send{width:40px;height:40px;padding:0;display:flex;align-items:center;justify-content:center;flex:none;border-radius:999px;border:none;background:#E8E8E2;color:#0C0D10;cursor:default;font-size:16px;transition:background-color .15s ease,transform .1s ease}' +
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
    /* Afscherming tegen site-brede knopstijlen van het thema van de klant
       (bijv. oranje ronde knoppen): de sluitknoppen blijven rustig. */
    '.fxa-root .fxa-teaser-x,.fxa-root .fxa-close{background:none!important;border:none!important;box-shadow:none!important;width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;border-radius:4px!important;text-transform:none!important;letter-spacing:normal!important;line-height:1!important}' +
    '.fxa-root .fxa-teaser-x{color:#8A909D!important;padding:2px 4px!important;font-size:15px!important}' +
    '.fxa-root .fxa-close{color:#8A909D!important;padding:4px!important;font-size:22px!important}' +
    '.fxa-root .fxa-teaser-x:hover,.fxa-root .fxa-close:hover{color:#0C0D10!important}' +
    /* Kaarten in het gesprek: invulkaart (wizard) en prijskaart */
    '.fxa-card{align-self:stretch;min-width:0;max-width:100%;box-sizing:border-box;background:#FFFFFF;border:1px solid #E6E6E0;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:14px}' +
    '.fxa-card *{box-sizing:border-box}' +
    '.fxa-card-kop{font-weight:700;font-size:14px;line-height:1.3;color:#0C0D10}' +
    '.fxa-card-sub{font-size:12px;color:#8A909D;margin-top:2px}' +
    '.fxa-lbl{display:block;font-size:12px;font-weight:600;color:#22252C;margin-bottom:6px}' +
    '.fxa-rij{display:flex;gap:8px;align-items:center}' +
    '.fxa-num{flex:1 1 0;width:0;min-width:0;height:40px;border:1px solid #D3D4CE;border-radius:10px;padding:0 10px;font-family:inherit;font-size:16px;color:#0C0D10;background:#FFFFFF;outline:none}' +
    '.fxa-num::placeholder{color:#B6BBC5}' +
    '.fxa-x{color:#8A909D;font-size:13px;flex:none}' +
    '.fxa-hint{font-size:12px;color:#8A909D;margin-top:6px;line-height:1.45}' +
    '.fxa-hint.fxa-warn{color:#B42318}' +
    '.fxa-seg{display:flex;gap:6px;flex-wrap:wrap}' +
    '.fxa-seg button{flex:1 1 auto;min-height:36px;padding:6px 10px;border-radius:10px;border:1px solid #D3D4CE;background:#FFFFFF;color:#22252C;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background-color .15s ease,border-color .15s ease}' +
    '.fxa-sub{margin-top:8px}' +
    '.fxa-stepper{display:inline-flex;align-items:center;gap:4px;margin-top:8px}' +
    '.fxa-stepper button{width:36px;height:36px;border-radius:10px;border:1px solid #D3D4CE;background:#FFFFFF;font-family:inherit;font-size:16px;cursor:pointer;color:#22252C}' +
    '.fxa-stepper span{min-width:64px;text-align:center;font-size:13px;font-weight:600}' +
    '.fxa-cta{display:flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border:none;border-radius:12px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;text-decoration:none;text-align:center}' +
    '.fxa-cta[disabled]{opacity:.45;cursor:default}' +
    '.fxa-cta2{display:flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border:1px solid #D3D4CE;border-radius:12px;background:#FFFFFF;color:#22252C;font-family:inherit;font-weight:600;font-size:14px;cursor:pointer}' +
    '.fxa-card.fxa-klaar input,.fxa-card.fxa-klaar .fxa-seg button,.fxa-card.fxa-klaar .fxa-stepper button{pointer-events:none;opacity:.6}' +
    '.fxa-regels{display:flex;flex-direction:column}' +
    '.fxa-regel{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px dashed #E6E6E0;font-size:13px}' +
    '.fxa-regel-naam{min-width:0}' +
    '.fxa-regel-det{display:block;font-size:12px;color:#8A909D}' +
    '.fxa-regel-bedrag{white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:600}' +
    '.fxa-totaal{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding-top:2px}' +
    '.fxa-totaal strong{font-size:18px;font-variant-numeric:tabular-nums;white-space:nowrap;flex:none}' +
    '.fxa-tip{background:#F2F2EE;border-radius:10px;padding:9px 11px;font-size:12px;line-height:1.45;color:#22252C}' +
    '.fxa-knoppen{display:flex;flex-direction:column;gap:8px}' +
    '@media (max-width:520px){.fxa-root{right:12px;bottom:12px}.fxa-panel{position:fixed;inset:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0;border:none;bottom:0}.fxa-teaser{max-width:calc(100vw - 24px)}}';

  /* Alle widgetregels krijgen ".fxa-root" ervoor. Thema's als Elementor stylen
     knoppen met bijv. ".elementor-kit-5 button" (specifieker dan één klasse);
     met twee klassen wint de widget altijd, zonder overal !important. */
  function scoped(regels) {
    return String(regels).replace(/(^|[{},])(\s*)\.fxa-(?!root)/g, '$1$2.fxa-root .fxa-');
  }

  var style = document.createElement('style');
  style.textContent = scoped(css);
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
        '<a class="fxa-wa" href="#" target="_blank" rel="noopener" aria-label="App met een collega" title="App met een collega" style="display:none">' + WA_ICOON + '</a>' +
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
  var waKopEl = root.querySelector('.fxa-wa');
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
    dynStyle.textContent = scoped(
      '.fxa-msg-user{background:' + kleur + ';color:' + tekst + '}' +
      '.fxa-send.fxa-armed{background:' + kleur + ';color:' + tekst + '}' +
      '.fxa-input-wrap:focus-within{border-color:' + kleur + ';box-shadow:0 0 0 3px ' + kleur + '33}' +
      '.fxa-typing span.fxa-on{background:' + kleur + '}' +
      '.fxa-msg-bot a{color:' + linkKleur + '}' +
      '.fxa-seg button.fxa-aan,.fxa-seg button.fxa-aan:hover,.fxa-seg button.fxa-aan:focus{background:' + kleur + ';border-color:' + kleur + ';color:' + tekst + '}' +
      '.fxa-cta,.fxa-cta:hover,.fxa-cta:focus{background:' + kleur + ';color:' + tekst + '}' +
      '.fxa-cta:hover{filter:brightness(.94)}' +
      '.fxa-send.fxa-armed:hover,.fxa-send.fxa-armed:focus{background:' + kleur + ';color:' + tekst + '}' +
      '.fxa-btn:hover,.fxa-btn:focus{background:' + kleur + ';color:' + tekst + '}' +
      '.fxa-num:focus{border-color:' + kleur + ';box-shadow:0 0 0 3px ' + kleur + '33}' +
      '@keyframes fxa-pulse{0%{box-shadow:0 14px 30px rgba(12,13,16,.22),0 0 0 0 ' + pulsKleur + '59}80%{box-shadow:0 14px 30px rgba(12,13,16,.22),0 0 0 16px ' + pulsKleur + '00}100%{box-shadow:0 14px 30px rgba(12,13,16,.22),0 0 0 0 ' + pulsKleur + '00}}' +
      '.fxa-btn.fxa-pulsing{animation:fxa-pulse 1.9s cubic-bezier(.16,1,.3,1) 2}' +
      '@media (prefers-reduced-motion:reduce){.fxa-btn.fxa-pulsing{animation:none}}');
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

  /* ---- Kaarten: invulkaart (zelfde vragen als de webshopwizard) en prijskaart ----
     De bot zet een invulkaart met [[WIZARD: id | pakket]]; n8n stuurt die mee als
     data.wizard. Na een berekening stuurt n8n data.berekening mee. Beide komen in
     de geschiedenis als { rol: 'kaart', soort, data }, zodat ze na een paginawissel
     terugkomen. */
  function getal(v) {
    var n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(n) && n > 0 ? n : 0;
  }

  function maatTekst(n) {
    return String(Math.round(n * 100) / 100).replace('.', ',');
  }

  function el(tag, cls, tekst) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tekst != null) e.textContent = tekst;
    return e;
  }

  function kaartId() {
    return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function markeerKaartKlaar(id) {
    var h = loadHistory();
    for (var i = 0; i < h.length; i++) {
      if (h[i].rol === 'kaart' && h[i].id === id) h[i].klaar = true;
    }
    saveHistory(h);
  }

  function segment(opties, waarde, onChange) {
    var wrap = el('div', 'fxa-seg');
    var knoppen = [];
    opties.forEach(function (o) {
      var b = el('button', o[0] === waarde ? 'fxa-aan' : '', o[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', o[0] === waarde ? 'true' : 'false');
      b.addEventListener('click', function () {
        knoppen.forEach(function (k) { k.className = ''; k.setAttribute('aria-pressed', 'false'); });
        b.className = 'fxa-aan';
        b.setAttribute('aria-pressed', 'true');
        onChange(o[0]);
      });
      knoppen.push(b);
      wrap.appendChild(b);
    });
    return wrap;
  }

  function veld(label, inhoud, hint) {
    var w = el('div');
    w.appendChild(el('span', 'fxa-lbl', label));
    w.appendChild(inhoud);
    if (hint) w.appendChild(el('div', 'fxa-hint', hint));
    return w;
  }

  function maatInvoer(waarde, placeholder, label) {
    var i = document.createElement('input');
    i.className = 'fxa-num';
    i.type = 'text';
    i.inputMode = 'decimal';
    i.placeholder = placeholder;
    i.setAttribute('aria-label', label);
    if (waarde) i.value = maatTekst(waarde);
    return i;
  }

  var AFVOER = [['nee', 'Nee'], ['zijuitloop', 'Bladvanger zijuitloop'], ['bolrooster', 'Bolrooster'], ['tegelbladvanger', 'Tegelbladvanger']];

  function wizardKaart(item) {
    var d = item.data || {};
    var v = d.invoer || {};
    var st = {
      onderbreking: v.onderbreking_lengte > 0 && v.onderbreking_breedte > 0 ? 'ja' : 'nee',
      grind: v.grind || 'grind',
      folie: v.folie || 'nee',
      afvoer: v.afvoer || 'nee',
      aantal: v.afvoer_aantal > 0 ? v.afvoer_aantal : 1,
      meststof: v.meststof || 'nee'
    };
    var kaart = el('div', 'fxa-card' + (item.klaar ? ' fxa-klaar' : ''));
    var kop = el('div');
    kop.appendChild(el('div', 'fxa-card-kop', 'Bereken je groendak'));
    kop.appendChild(el('div', 'fxa-card-sub', d.pakket || 'Groendakpakket'));
    kaart.appendChild(kop);

    var lIn = maatInvoer(v.lengte, 'Lengte', 'Lengte in meters');
    var bIn = maatInvoer(v.breedte, 'Breedte', 'Breedte in meters');
    var rij = el('div', 'fxa-rij');
    rij.appendChild(lIn); rij.appendChild(el('span', 'fxa-x', '×')); rij.appendChild(bIn); rij.appendChild(el('span', 'fxa-x', 'm'));
    var m2Hint = el('div', 'fxa-hint', 'Minimaal 5 m²');
    var dakVeld = veld('Afmetingen van het dak', rij);
    dakVeld.appendChild(m2Hint);
    kaart.appendChild(dakVeld);

    var olIn = maatInvoer(v.onderbreking_lengte, 'Lengte', 'Lengte onderbreking in meters');
    var obIn = maatInvoer(v.onderbreking_breedte, 'Breedte', 'Breedte onderbreking in meters');
    var oRij = el('div', 'fxa-rij fxa-sub');
    oRij.appendChild(olIn); oRij.appendChild(el('span', 'fxa-x', '×')); oRij.appendChild(obIn); oRij.appendChild(el('span', 'fxa-x', 'm'));
    var ondVeld = veld('Onderbreking, zoals een dakkapel of lichtstraat?', segment([['nee', 'Nee'], ['ja', 'Ja']], st.onderbreking, function (w) {
      st.onderbreking = w; oRij.style.display = w === 'ja' ? 'flex' : 'none'; check();
    }));
    ondVeld.appendChild(oRij);
    oRij.style.display = st.onderbreking === 'ja' ? 'flex' : 'none';
    kaart.appendChild(ondVeld);

    kaart.appendChild(veld('Grindstrook langs de rand', segment([['nee', 'Nee'], ['grind', 'Grind'], ['olivijn', 'Olivijn split']], st.grind, function (w) { st.grind = w; }),
      'Aanbevolen: zo kan het water weg.'));
    kaart.appendChild(veld('Wortelwerende folie', segment([['nee', 'Nee'], ['ja', 'Ja']], st.folie, function (w) { st.folie = w; }),
      'EPDM is al wortelwerend. Bij bitumen of twijfel: kies ja.'));

    var stepper = el('div', 'fxa-stepper');
    var min = el('button', '', '−'); min.type = 'button'; min.setAttribute('aria-label', 'Minder afvoeren');
    var aantalEl = el('span');
    var plus = el('button', '', '+'); plus.type = 'button'; plus.setAttribute('aria-label', 'Meer afvoeren');
    function toonAantal() { aantalEl.textContent = st.aantal + (st.aantal === 1 ? ' afvoer' : ' afvoeren'); }
    min.addEventListener('click', function () { if (st.aantal > 1) { st.aantal--; toonAantal(); } });
    plus.addEventListener('click', function () { if (st.aantal < 20) { st.aantal++; toonAantal(); } });
    toonAantal();
    stepper.appendChild(min); stepper.appendChild(aantalEl); stepper.appendChild(plus);
    var afvVeld = veld('Hemelwaterafvoer bedekken', segment(AFVOER, st.afvoer, function (w) {
      st.afvoer = w; stepper.style.display = w === 'nee' ? 'none' : 'inline-flex';
    }));
    afvVeld.appendChild(stepper);
    stepper.style.display = st.afvoer === 'nee' ? 'none' : 'inline-flex';
    kaart.appendChild(afvVeld);

    kaart.appendChild(veld('Meststof erbij', segment([['nee', 'Nee'], ['3L', '3 liter'], ['5L', '5 liter']], st.meststof, function (w) { st.meststof = w; })));

    var knop = el('button', 'fxa-cta', item.klaar ? 'Berekend ✓' : 'Bereken prijs');
    knop.type = 'button';
    kaart.appendChild(knop);

    function check() {
      var L = getal(lIn.value), B = getal(bIn.value);
      var m2 = Math.round(L * B * 100) / 100;
      var ok = L > 0 && B > 0 && m2 >= 5;
      if (L > 0 && B > 0) {
        m2Hint.textContent = m2 >= 5 ? '= ' + maatTekst(m2) + ' m²' : maatTekst(m2) + ' m²: de minimale afname is 5 m²';
        m2Hint.className = 'fxa-hint' + (m2 >= 5 ? '' : ' fxa-warn');
      } else {
        m2Hint.textContent = 'Minimaal 5 m²';
        m2Hint.className = 'fxa-hint';
      }
      if (st.onderbreking === 'ja') {
        var oL = getal(olIn.value), oB = getal(obIn.value);
        if (!(oL > 0 && oB > 0) || oL * oB >= L * B) ok = false;
      }
      knop.disabled = item.klaar || !ok;
    }
    [lIn, bIn, olIn, obIn].forEach(function (i) { i.addEventListener('input', check); });
    check();

    knop.addEventListener('click', function () {
      if (knop.disabled || busy) return;
      var L = getal(lIn.value), B = getal(bIn.value);
      var ond = st.onderbreking === 'ja';
      var oL = ond ? getal(olIn.value) : 0, oB = ond ? getal(obIn.value) : 0;
      var afvNaam = '';
      AFVOER.forEach(function (a) { if (a[0] === st.afvoer) afvNaam = a[1]; });
      var opdracht = 'Bereken voor ' + (d.pakket || 'het pakket') + ' (' + d.product_id + '): dak ' + maatTekst(L) + ' x ' + maatTekst(B) + ' m, ' +
        (ond ? 'onderbreking ' + maatTekst(oL) + ' x ' + maatTekst(oB) + ' m' : 'geen onderbreking') +
        ', grindstrook: ' + st.grind + ', wortelwerende folie: ' + st.folie +
        ', afvoer: ' + (st.afvoer === 'nee' ? 'nee' : st.afvoer + ' x ' + st.aantal) + ', meststof: ' + st.meststof + '.';
      var samenvatting = maatTekst(L) + ' × ' + maatTekst(B) + ' m (' + maatTekst(Math.round(L * B * 100) / 100) + ' m²)' +
        (ond ? ', onderbreking ' + maatTekst(oL) + ' × ' + maatTekst(oB) + ' m' : '') +
        (st.grind !== 'nee' ? ', grindstrook ' + (st.grind === 'olivijn' ? 'olivijn' : 'grind') : ', geen grindstrook') +
        (st.folie === 'ja' ? ', met folie' : '') +
        (st.afvoer !== 'nee' ? ', ' + st.aantal + '× ' + afvNaam.toLowerCase() : '') +
        (st.meststof !== 'nee' ? ', meststof ' + st.meststof.replace('L', ' liter') : '');
      item.klaar = true;
      kaart.className = 'fxa-card fxa-klaar';
      knop.textContent = 'Berekend ✓';
      knop.disabled = true;
      markeerKaartKlaar(item.id);
      track('wizard_verstuurd', d.product_id);
      send('wizard', opdracht, samenvatting);
    });
    return kaart;
  }

  function prijsKaart(item) {
    var d = item.data || {};
    var kaart = el('div', 'fxa-card');
    var kop = el('div');
    kop.appendChild(el('div', 'fxa-card-kop', d.pakket || 'Je groendak'));
    kop.appendChild(el('div', 'fxa-card-sub', maatTekst(Number(d.m2) || 0) + ' m² · richtprijs'));
    kaart.appendChild(kop);

    var lijst = el('div', 'fxa-regels');
    (Array.isArray(d.regels) ? d.regels : []).forEach(function (r) {
      var rij = el('div', 'fxa-regel');
      var naam = el('span', 'fxa-regel-naam');
      var delen = String(r.omschrijving || '').split(' — ');
      naam.appendChild(document.createTextNode(delen[0]));
      if (delen[1]) naam.appendChild(el('span', 'fxa-regel-det', delen.slice(1).join(' — ')));
      rij.appendChild(naam);
      rij.appendChild(el('span', 'fxa-regel-bedrag', r.bedrag_tekst || ''));
      lijst.appendChild(rij);
    });
    kaart.appendChild(lijst);

    var tot = el('div', 'fxa-totaal');
    tot.appendChild(el('span', 'fxa-card-sub', 'Totaal, excl. eventuele verzendkosten'));
    tot.appendChild(el('strong', '', d.totaal || ''));
    kaart.appendChild(tot);

    /* Staffeltip alleen als de volgende staffel dichtbij ligt; verder weg is het
       geen bruikbare tip maar een verkooppraatje. */
    var vs = d.volgende_staffel;
    var m2 = Number(d.m2) || 0;
    if (vs && vs.vanaf_m2 && vs.vanaf_m2 - m2 <= Math.max(3, m2 * 0.2)) {
      kaart.appendChild(el('div', 'fxa-tip', 'Vanaf ' + vs.vanaf_m2 + ' m² betaal je ' + (vs.prijs_tekst || '') + ' per m². Alleen interessant als je dak die meters ook echt heeft.'));
    }

    var knoppen = el('div', 'fxa-knoppen');
    var ww = d.winkelwagen;
    if (ww && /^https:\/\//.test(String(ww.actie || '')) && ww.velden) {
      /* In één klik in de winkelwagen: hetzelfde formulier als de wizard op de
         pakketpagina, ingevuld met deze keuzes. De webshop rekent zelf en stuurt
         door naar de winkelwagen. Op de eigen site in hetzelfde tabblad, anders
         (bijv. de testomgeving) in een nieuw tabblad. */
      var inWagen = el('button', 'fxa-cta', 'In winkelwagen en bestellen');
      inWagen.type = 'button';
      inWagen.addEventListener('click', function () {
        track('winkelwagen_geklikt', d.product_id || '');
        var form = document.createElement('form');
        form.method = 'post';
        form.action = ww.actie;
        form.enctype = 'multipart/form-data';
        var eigenSite = false;
        try { eigenSite = new URL(ww.actie).hostname.replace(/^www\./, '') === location.hostname.replace(/^www\./, ''); } catch (e) { /* onbekend: nieuw tabblad */ }
        form.target = eigenSite ? '_self' : '_blank';
        form.style.display = 'none';
        Object.keys(ww.velden).forEach(function (k) {
          var i = document.createElement('input');
          i.type = 'hidden';
          i.name = k;
          i.value = String(ww.velden[k]);
          form.appendChild(i);
        });
        document.body.appendChild(form);
        form.submit();
        setTimeout(function () { if (form.parentNode) form.parentNode.removeChild(form); }, 1000);
      });
      knoppen.appendChild(inWagen);
    } else if (d.link && /^https:\/\//.test(d.link)) {
      var bestel = el('a', 'fxa-cta', 'Bestellen op de pakketpagina');
      bestel.href = d.link;
      bestel.target = '_blank';
      bestel.rel = 'noopener';
      bestel.addEventListener('click', function () { track('bestel_geklikt', d.product_id || ''); });
      knoppen.appendChild(bestel);
    }
    if (d.product_id) {
      var aanpassen = el('button', 'fxa-cta2', 'Maten of opties aanpassen');
      aanpassen.type = 'button';
      aanpassen.addEventListener('click', function () {
        if (busy) return;
        track('wizard_aanpassen', d.product_id);
        addKaart('wizard', { product_id: d.product_id, pakket: d.pakket, invoer: d.invoer || null });
      });
      knoppen.appendChild(aanpassen);
    }
    kaart.appendChild(knoppen);
    return kaart;
  }

  /* ---- Overdracht naar een collega via WhatsApp ----
     Opent WhatsApp naar het kantoornummer (whatsapp_url in de config) met een
     samenvatting van dit gesprek al ingevuld, zodat de medewerker niets opnieuw
     hoeft te vragen. De klant ziet de tekst en kan hem aanpassen voor verzenden. */
  function waBasis() {
    var u = config && config.whatsapp_url ? String(config.whatsapp_url) : '';
    return /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(u) ? u.split('?')[0] : '';
  }

  function invoerTekst(v) {
    if (!v) return '';
    var delen = [];
    if (v.onderbreking_lengte > 0 && v.onderbreking_breedte > 0) delen.push('onderbreking ' + maatTekst(v.onderbreking_lengte) + ' x ' + maatTekst(v.onderbreking_breedte) + ' m');
    delen.push(v.grind && v.grind !== 'nee' ? 'grindstrook ' + v.grind : 'geen grindstrook');
    if (v.folie === 'ja') delen.push('met wortelwerende folie');
    if (v.afvoer && v.afvoer !== 'nee') delen.push(v.afvoer_aantal + 'x ' + v.afvoer);
    if (v.meststof && v.meststof !== 'nee') delen.push('meststof ' + v.meststof);
    return delen.join(', ');
  }

  function gespreksSamenvatting() {
    var h = loadHistory();
    var vragen = [];
    var prijs = null;
    for (var i = 0; i < h.length; i++) {
      if (h[i].rol === 'user' && h[i].tekst) vragen.push(String(h[i].tekst).replace(/\s+/g, ' ').slice(0, 160));
      if (h[i].rol === 'kaart' && h[i].soort === 'prijs') prijs = h[i].data;
    }
    var bot = (config && config.bot_naam) || 'de AI-assistent';
    var regels = ['Hoi! Ik had net contact met ' + bot + ' op jullie website.'];
    if (vragen.length) regels.push('Mijn vragen: ' + vragen.slice(-3).join(' / '));
    if (prijs) {
      var opties = invoerTekst(prijs.invoer);
      regels.push('Berekening: ' + (prijs.pakket || 'pakket') + ', ' + maatTekst(Number(prijs.m2) || 0) + ' m²' + (opties ? ' (' + opties + ')' : '') + ', richtprijs ' + (prijs.totaal || '') + '.');
    }
    var pagina = paginaPad();
    if (pagina && pagina !== '/') regels.push('Pagina: ' + ((config && config.website) || '') + pagina);
    regels.push('');
    regels.push('Mijn vraag aan jullie: ');
    return regels.join('\n').slice(0, 1200);
  }

  function waLink() {
    var basis = waBasis();
    return basis ? basis + '?text=' + encodeURIComponent(gespreksSamenvatting()) : '';
  }

  function whatsappKaart() {
    var kaart = el('div', 'fxa-card');
    var kop = el('div');
    kop.appendChild(el('div', 'fxa-card-kop', 'App met een collega'));
    kop.appendChild(el('div', 'fxa-card-sub', 'Je vraag en wat we net bespraken staan er al in. Je kunt het nog aanpassen voor je verstuurt.'));
    kaart.appendChild(kop);
    var knop = el('a', 'fxa-wa-knop');
    knop.innerHTML = WA_ICOON + '<span>Open WhatsApp</span>';
    knop.href = waLink() || '#';
    knop.target = '_blank';
    knop.rel = 'noopener';
    knop.addEventListener('click', function () {
      knop.href = waLink() || '#';
      track('whatsapp_geklikt', 'kaart');
    });
    kaart.appendChild(knop);
    if (config && config.telefoon) kaart.appendChild(el('div', 'fxa-hint', 'Bellen kan ook: ' + config.telefoon + '. We reageren tijdens kantoortijden.'));
    return kaart;
  }

  waKopEl.addEventListener('click', function (e) {
    var l = waLink();
    if (!l) { e.preventDefault(); return; }
    waKopEl.href = l;
    track('whatsapp_geklikt', 'kop');
  });

  function addKaart(soort, data, skipSave, bestaand) {
    var item = bestaand || { rol: 'kaart', soort: soort, data: data, id: kaartId() };
    var kaart = soort === 'prijs' ? prijsKaart(item) : (soort === 'whatsapp' ? whatsappKaart() : wizardKaart(item));
    msgsEl.appendChild(kaart);
    if (!skipSave) {
      /* Bij een nieuwe kaart naar Brams tekst erboven scrollen, niet naar de
         onderkant: anders begint de klant halverwege de kaart. */
      var vorige = kaart.previousSibling;
      var boven = vorige && vorige.classList && vorige.classList.contains('fxa-msg-bot') ? vorige : kaart;
      msgsEl.scrollTop += boven.getBoundingClientRect().top - msgsEl.getBoundingClientRect().top - 12;
    } else {
      scrollDown();
    }
    if (!skipSave) {
      var h = loadHistory();
      h.push(item);
      saveHistory(h);
      track({ prijs: 'prijskaart_getoond', wizard: 'wizard_getoond', whatsapp: 'whatsapp_getoond' }[soort] || 'kaart_getoond', (data && data.product_id) || '');
      /* Signaal voor de pagina eromheen (de testomgeving volgt hiermee het pakket) */
      try {
        window.dispatchEvent(new CustomEvent('fxa:kaart', { detail: { soort: soort, product_id: (data && data.product_id) || '', link: (data && data.link) || '' } }));
      } catch (e) { /* oude browser: geen signaal, de chat werkt gewoon */ }
    }
  }

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
    var avatarUrl = DATA_AVATAR || (data.avatar_url && /^https:\/\//.test(data.avatar_url) ? data.avatar_url : '');
    if (avatarUrl) {
      var img = document.createElement('img');
      img.src = avatarUrl;
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
    waKopEl.style.display = waBasis() ? 'flex' : 'none';
    var h = loadHistory();
    if (h.length) {
      for (var i = 0; i < h.length; i++) {
        if (h[i].rol === 'kaart') addKaart(h[i].soort, h[i].data, true, h[i]);
        else addMsg(h[i].rol, h[i].tekst, true);
      }
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

  /* opdracht/toon: de invulkaart stuurt een volledige opdracht naar de bot,
     maar toont de klant een korte samenvatting van wat hij invulde. */
  function send(bron, opdracht, toon) {
    var vraag = opdracht ? String(opdracht) : inputEl.value.trim();
    if (!vraag || busy) return;
    if (!opdracht) inputEl.value = '';
    addMsg('user', toon || vraag);
    chipsEl.innerHTML = '';
    saveVervolg([]);
    busy = true;
    armSend();
    showTyping();
    track('bericht', bron || 'getypt');
    /* Paginacontext voor de bot: titel, samenvatting en (bij een product) het id,
       plus de ballon waar de bezoeker op klikte (eenmalig). */
    var info = paginaInfo();
    var geklikt = '';
    try {
      geklikt = sessionStorage.getItem(storeKey + '-ballon-geklikt') || '';
      sessionStorage.removeItem(storeKey + '-ballon-geklikt');
    } catch (e) { geklikt = ''; }
    post({
      winkel: WINKEL, actie: 'chat', vraag: vraag, sessie: sessieId(), pagina: paginaPad(),
      pagina_titel: String(document.title || '').slice(0, 150),
      pagina_info: info ? (String(info.samenvatting || '') + (info.product_id ? ' (product-id ' + info.product_id + ')' : '')).slice(0, 400) : '',
      ballon: geklikt.slice(0, 150)
    })
      .then(function (data) {
        hideTyping();
        addMsg('bot', data.antwoord || 'Hmm, daar heb ik even geen antwoord op.');
        if (data.berekening && Array.isArray(data.berekening.regels)) addKaart('prijs', data.berekening);
        else if (data.wizard && data.wizard.product_id) addKaart('wizard', data.wizard);
        if (data.whatsapp && waBasis()) addKaart('whatsapp', {});
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

  function vulTeaser(tekst) {
    teaserNaamEl.textContent = (config && config.naam) || DATA_NAAM || (PAGINA_DATA && PAGINA_DATA.naam) || 'Chat met ons';
    teaserTxtEl.textContent = tekst || teaserTekst();
    /* Winkellogo in het rondje zodra de config (uit cache) bekend is;
       anders blijft het neutrale chat-icoon staan. */
    var teaserAvatar = DATA_AVATAR || (config && config.avatar_url && /^https:\/\//.test(config.avatar_url) ? config.avatar_url : '');
    if (teaserAvatar && !teaserIcoEl.querySelector('img')) {
      var img = document.createElement('img');
      img.src = teaserAvatar;
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

  /* De eerste kaart wacht kort op de paginadata, zodat hij meteen de tekst van
     deze pagina toont; hooguit 1,5 seconde, daarna de standaardtekst. */
  var kaartGetoond = false;
  function toonKaart() {
    if (kaartGetoond || open || !kaartModus) return;
    kaartGetoond = true;
    vulTeaser();
    teaserEl.classList.add('fxa-show');
    laatsteBallon = teaserTxtEl.textContent;
    track('teaser_getoond', teaserTxtEl.textContent);
    markeerTeaserGezien();
  }

  if (kaartModus) {
    root.classList.add('fxa-kaart');
    setTimeout(toonKaart, 1500);
  } else {
    setTimeout(puls, 4000);
  }

  /* ---- Pagina-ballonnen ----
     Per pagina een eigen ballontekst en startvragen uit
     forgexe.nl/assistent-data/<klant>.js (statisch bestand, geen n8n-run per
     paginaweergave). De ballon komt na een paar seconden of na een stukje
     scrollen; op een pakketpagina komt een tweede ballon als iemand lang met
     de wizard bezig is zonder te bestellen. Rustig: één per pagina, hooguit
     BALLON_MAX per sessie, nooit bij een open chat, en wie er een wegklikt
     krijgt er deze sessie geen meer. */
  var BALLON_MAX = 4;
  var BALLON_WACHT = 6000;
  var WIZARD_WACHT = 25000;

  function sessieLees(k) {
    try { return sessionStorage.getItem(storeKey + '-' + k); } catch (e) { return null; }
  }
  function sessieZet(k, v) {
    try { sessionStorage.setItem(storeKey + '-' + k, v); } catch (e) { /* geen opslag */ }
  }

  function ballonMag() {
    if (open || kaartModus || sessieLees('ballon-uit')) return false;
    return (parseInt(sessieLees('ballon-n') || '0', 10) || 0) < BALLON_MAX;
  }

  function toonBallon(tekst, soort) {
    if (!tekst) return;
    vulTeaser(tekst);
    teaserEl.classList.add('fxa-show');
    laatsteBallon = tekst;
    sessieZet('ballon-n', String((parseInt(sessieLees('ballon-n') || '0', 10) || 0) + 1));
    track('ballon_getoond', soort + ': ' + tekst);
  }

  function planWizardBallon(tekst) {
    var form = document.querySelector('form.cart');
    if (!form) return;
    var timer = null;
    var klaar = false;
    form.addEventListener('submit', function () {
      klaar = true;
      if (timer) clearTimeout(timer);
    });
    var opnieuw = function () {
      if (klaar) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        if (klaar || !ballonMag()) return;
        klaar = true;
        toonBallon(tekst, 'wizard');
      }, WIZARD_WACHT);
    };
    form.addEventListener('input', opnieuw);
    form.addEventListener('change', opnieuw);
  }

  function planBallon() {
    var info = paginaInfo();
    if (!info || info.stil) return;
    if (info.ballon2) planWizardBallon(info.ballon2);
    if (!info.ballon) return;
    var pad = paginaPad();
    var gezien = [];
    try { gezien = JSON.parse(sessieLees('ballon-paden') || '[]') || []; } catch (e) { gezien = []; }
    if (gezien.indexOf(pad) >= 0) return;
    var gedaan = false;
    var opScroll = function () {
      var h = document.documentElement;
      var top = h.scrollTop || document.body.scrollTop || 0;
      if (top / Math.max(1, h.scrollHeight - h.clientHeight) > 0.35) trigger();
    };
    var trigger = function () {
      if (gedaan) return;
      gedaan = true;
      window.removeEventListener('scroll', opScroll);
      if (!ballonMag()) return;
      gezien.push(pad);
      sessieZet('ballon-paden', JSON.stringify(gezien.slice(-50)));
      toonBallon(info.ballon, 'pagina');
    };
    setTimeout(trigger, BALLON_WACHT);
    window.addEventListener('scroll', opScroll, { passive: true });
  }

  /* Kleur uit de paginadata zolang de config (die pas bij het openen komt) er nog niet is */
  function dataKleur() {
    if (!config && PAGINA_DATA && /^#[0-9a-fA-F]{6}$/.test(String(PAGINA_DATA.kleur || ''))) applyKleur(PAGINA_DATA.kleur);
  }

  function laadPaginaData() {
    /* Al aanwezig (bijvoorbeeld vooraf ingeladen door de pagina)? Dan niet nog eens ophalen. */
    if (window.FXA_PAGINAS && window.FXA_PAGINAS[WINKEL]) {
      PAGINA_DATA = window.FXA_PAGINAS[WINKEL];
      dataKleur();
      setTimeout(function () {
        if (kaartModus) toonKaart();
        planBallon();
      }, 0);
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://www.forgexe.nl/assistent-data/' + encodeURIComponent(WINKEL) + '.js';
    s.async = true;
    s.onload = function () {
      PAGINA_DATA = (window.FXA_PAGINAS && window.FXA_PAGINAS[WINKEL]) || null;
      if (!PAGINA_DATA) return;
      dataKleur();
      if (kaartModus) toonKaart();
      else if (!teaserEl.classList.contains('fxa-show')) vulTeaser();
      planBallon();
    };
    document.head.appendChild(s);
  }
  laadPaginaData();

  /* Testomgeving: na het wisselen van pagina in het frame opnieuw een ballon plannen */
  window.addEventListener('fxa:pagina', function () {
    if (open) return;
    verbergTeaser();
    /* Net als bij een echte nieuwe pagina: de eerste-bezoek-kaart is dan al
       gezien, dus weer de ronde knop met ballonnen. */
    if (kaartModus) {
      markeerTeaserGezien();
      verlaatKaartModus();
    }
    planBallon();
  });
  /* Testomgeving: de wizard-ballon kan daar niet vanzelf komen (het formulier
     zit in een frame van een ander domein), dus de testpagina toont hem zo. */
  window.addEventListener('fxa:ballon', function (e) {
    if (open || !e.detail || !e.detail.tekst) return;
    toonBallon(String(e.detail.tekst).slice(0, 150), 'test');
  });

  teaserEl.addEventListener('click', function () {
    track('teaser_geklikt', laatsteBallon);
    var tekst = laatsteBallon;
    if (tekst) sessieZet('ballon-geklikt', tekst);
    verbergTeaser();
    verlaatKaartModus();
    openChat('teaser').then(function () {
      /* Loopt er al een gesprek, dan zet Bram de ballontekst als nieuw bericht
         neer en komen de startvragen van deze pagina eronder. */
      if (!tekst || !config || !loadHistory().length) return;
      var h = loadHistory();
      var laatste = h[h.length - 1];
      if (!laatste || laatste.tekst !== tekst) addMsg('bot', tekst);
      renderChips(startChips(), 'start');
    });
  });

  teaserEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      teaserEl.click();
    }
  });

  teaserX.addEventListener('click', function (e) {
    e.stopPropagation();
    track('teaser_weggeklikt', laatsteBallon);
    sessieZet('ballon-uit', '1');
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
    verbergTeaser();
    setTimeout(function () { inputEl.focus(); }, 100);
    return initConfig()
      .catch(function () {
        naamEl.textContent = 'Chat';
        avatarEl.textContent = '!';
        addMsg('bot', 'Sorry, de chat is nu even niet beschikbaar. Probeer het later opnieuw.', true);
        track('fout', 'config');
      });
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
