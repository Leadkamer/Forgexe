/*
 * Fietsbot – AI-chatwidget voor fietsenwinkels (Forgexe)
 * Gebruik: <script src="https://www.forgexe.nl/fietsbot.js" data-winkel="WINKEL_ID" data-naam="Winkelnaam"></script>
 * (data-naam is optioneel: de winkelnaam in de teaserkaart vóór de eerste config-call)
 * Design: Spaak AI Design System (paper/ink-palet, pill-composer, lime verstuurknop)
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://leadkamer.app.n8n.cloud/webhook/fietsbot';
  var EVENTS_ENDPOINT = 'https://leadkamer.app.n8n.cloud/webhook/fietsbot-events';

  var scriptTag = document.currentScript;
  if (!scriptTag) {
    var scripts = document.querySelectorAll('script[src*="fietsbot.js"]');
    scriptTag = scripts[scripts.length - 1];
  }
  var WINKEL = scriptTag ? scriptTag.getAttribute('data-winkel') : null;
  if (!WINKEL) return;
  /* Optioneel: data-naam="Fingo" zet de winkelnaam in de teaserkaart al vóór
     de eerste config-call (die komt pas als iemand de chat opent). */
  var DATA_NAAM = scriptTag ? scriptTag.getAttribute('data-naam') : null;

  var config = null;
  var open = false;
  var busy = false;
  var storeKey = 'fietsbot-' + WINKEL + '-v3';

  /* Standaardteksten per soort pagina; een winkel kan ze overschrijven via de
     kolommen teaser en chips in de data table (chips gescheiden door |). */
  var CONTEXTEN = {
    service: {
      teaser: 'Vraag over reparatie of onderhoud?',
      chips: ['Wat kost een beurt?', 'Kan ik langskomen?', 'Hoe lang duurt een reparatie?']
    },
    contact: {
      teaser: 'Iets weten voor je belt?',
      chips: ['Wat zijn jullie openingstijden?', 'Waar kan ik jullie vinden?', 'Doen jullie reparaties?']
    },
    product: {
      teaser: 'Twijfel je over deze fiets?',
      chips: ['Help me kiezen', 'Is deze op voorraad?', 'Kan ik een proefrit maken?']
    },
    algemeen: {
      teaser: 'Kan ik je helpen? 👋',
      chips: ['Help me een fiets kiezen', 'Doen jullie reparaties?', 'Wat zijn jullie openingstijden?']
    },
    demo: {
      teaser: 'Wil je zien wat ik kan? 👋',
      chips: ['Wat kost FietsBot?', 'Wat zijn jullie openingstijden?', 'Hoe snel kan ik live?']
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
    if (/reparat|onderhoud|werkplaats|service|beurt|storing/.test(pad)) return 'service';
    if (/contact|openingstijd|route|adres|vestiging|winkel-info/.test(pad)) return 'contact';
    /* Lease- en verzekeringspagina's bevatten vaak het woord "fiets" maar gaan
       niet over één model; daar past de algemene teaser beter dan "deze fiets". */
    if (/lease|verzeker/.test(pad)) return 'algemeen';
    if (/-\d{3,}\.html?$|\/p\/|fiets|ebike|e-bike|product|artikel|shop|collectie|assortiment|occasion|model/.test(pad)) return 'product';
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

  var WA_ICOON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.02c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.92-4.66-4.1-.13-.18-1.11-1.48-1.11-2.82s.7-2 .95-2.27c.25-.27.54-.34.72-.34h.52c.16 0 .39-.06.6.46.24.56.8 1.94.87 2.08.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.6.75 1.87.89.27.14.45.2.52.32.07.11.07.66-.17 1.34z"/></svg>';

  /* Vraagt iemand naar een medewerker of een echt persoon? Dan tonen we
     direct (nog vóór het AI-antwoord) een WhatsApp-knop, als de winkel een
     WhatsApp-nummer heeft (config.whatsapp). Zelfde woordenlijst als het
     vangnet in n8n-node "Splits Vervolgvragen". */
  var WA_VRAAG = /(medewerker|personeel|\bmens\b|echte? (persoon|mens)|iemand (van|uit|in) (de|jullie) (winkel|zaak|werkplaats)|iemand spreken|met iemand (praten|chatten|spreken|bellen)|iemand aan de lijn|contact met (de winkel|jullie|iemand)|whats\s?app|\bappen\b|ben (je|jij) een (robot|bot|computer|ai)\b|real person|human|employee|speak to someone|talk to someone)/i;
  var WA_LINK_RE = /\n*\[[^\]]+\]\((https:\/\/wa\.me\/[^)\s]+)\)\n*/;

  function waUrl(bericht) {
    return 'https://wa.me/' + String(config.whatsapp).replace(/\D/g, '') + '?text=' +
      encodeURIComponent(bericht).replace(/\(/g, '%28').replace(/\)/g, '%29');
  }

  function renderText(s) {
    return escapeHtml(s)
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, function (heel, label, url) {
        /* WhatsApp-links worden een echte groene knop */
        if (/^https:\/\/wa\.me\//.test(url)) {
          return '<a class="fb-wa" href="' + url + '" target="_blank" rel="noopener">' + WA_ICOON + '<span>' + label + '</span></a>';
        }
        return '<a href="' + url + '" target="_blank" rel="noopener">' + label + '</a>';
      })
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
    '.fb-root{position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:14px;line-height:1.55;letter-spacing:-0.005em;color:#0C0D10}' +
    '.fb-btn{width:58px;height:58px;border-radius:999px;border:none;cursor:pointer;box-shadow:0 14px 30px rgba(12,13,16,.22);display:flex;align-items:center;justify-content:center;transition:transform .15s cubic-bezier(.16,1,.3,1)}' +
    '.fb-btn:hover{transform:scale(1.06)}' +
    '.fb-btn:active{transform:scale(.97)}' +
    '.fb-btn svg{width:28px;height:28px}' +
    '.fb-panel{position:absolute;right:0;bottom:74px;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 120px);background:#FFFFFF;border:1px solid #E6E6E0;border-radius:20px;box-shadow:0 30px 70px rgba(12,13,16,.16);display:none;flex-direction:column;overflow:hidden}' +
    '.fb-root.fb-open .fb-panel{display:flex}' +
    '.fb-head{padding:14px 16px;display:flex;align-items:center;gap:10px;flex:0 0 auto;background:#FFFFFF;border-bottom:1px solid #E6E6E0}' +
    '.fb-avatar{width:34px;height:34px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;overflow:hidden}' +
    '.fb-avatar img{width:100%;height:100%;object-fit:cover;border-radius:999px;display:block}' +
    '.fb-head-txt{flex:1;min-width:0}' +
    '.fb-head-naam{font-weight:600;font-size:13px;color:#0C0D10;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.fb-head-sub{font-size:12px;color:#22A06B}' +
    '.fb-close{background:none;border:none;cursor:pointer;font-size:22px;line-height:1;padding:4px;color:#8A909D}' +
    '.fb-close:hover{color:#0C0D10}' +
    '.fb-msgs{flex:1;overflow-y:auto;padding:16px;background:#F2F2EE;display:flex;flex-direction:column;gap:10px}' +
    '.fb-msg{max-width:80%;padding:12px 16px;word-wrap:break-word;overflow-wrap:break-word;font-size:14px}' +
    '.fb-msg-bot{background:#FFFFFF;color:#0C0D10;border:1px solid #E6E6E0;border-radius:18px 18px 18px 6px;align-self:flex-start}' +
    '.fb-msg-bot a{font-weight:600;text-decoration:underline;word-break:break-all}' +
    '.fb-msg-bot a.fb-wa{display:inline-flex;align-items:center;gap:8px;margin:6px 0 2px;padding:10px 16px;border-radius:999px;background:#25D366;color:#fff;text-decoration:none;word-break:normal;font-weight:700;line-height:1.2;transition:background .15s}' +
    '.fb-msg-bot a.fb-wa:hover,.fb-msg-bot a.fb-wa:focus-visible{background:#1EBE5A}' +
    '.fb-msg-bot a.fb-wa svg{flex:none}' +
    '.fb-msg-user{border-radius:18px 18px 6px 18px;align-self:flex-end;border:1px solid transparent}' +
    '.fb-typing{display:inline-flex;gap:5px;align-items:center;padding:13px 16px;background:#FFFFFF;border:1px solid #E6E6E0;border-radius:18px 18px 18px 6px;align-self:flex-start}' +
    '.fb-typing span{width:6px;height:6px;border-radius:999px;background:#B6BBC5;transition:background-color .15s cubic-bezier(.16,1,.3,1)}' +
    '.fb-chips{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 10px;background:#F2F2EE;max-height:104px;overflow-y:auto}' +
    '.fb-chips:empty{padding:0}' +
    '.fb-chip{min-height:34px;padding:7px 14px;border-radius:17px;border:1px solid #D3D4CE;background:transparent;color:#22252C;font-family:inherit;font-weight:600;font-size:13px;line-height:1.3;text-align:left;cursor:pointer;max-width:100%;transition:background-color .15s ease}' +
    '.fb-chip:hover{background:#FFFFFF}' +
    '.fb-inputbar{flex:0 0 auto;padding:10px 12px;background:#F2F2EE}' +
    '.fb-input-wrap{display:flex;align-items:center;gap:10px;padding:4px 4px 4px 18px;background:#FFFFFF;border-radius:999px;border:1px solid #D3D4CE;box-shadow:0 2px 6px rgba(12,13,16,.06);transition:border-color .15s ease,box-shadow .15s ease}' +
    '.fb-input-wrap input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:14px;color:#0C0D10;min-width:0;height:38px}' +
    '.fb-input-wrap input::placeholder{color:#8A909D}' +
    '.fb-send{width:40px;height:40px;flex:none;border-radius:999px;border:none;background:#E8E8E2;color:#0C0D10;cursor:default;font-size:16px;transition:background-color .15s ease,transform .1s ease}' +
    '.fb-send.fb-armed{background:#C4F24C;cursor:pointer}' +
    '.fb-send.fb-armed:active{transform:scale(.94)}' +
    '.fb-foot{flex:0 0 auto;text-align:center;font-size:10px;color:#8A909D;padding:0 0 8px;background:#F2F2EE}' +
    '.fb-foot a{color:inherit;text-decoration:none}' +
    '.fb-teaser{position:absolute;right:0;bottom:72px;width:288px;max-width:calc(100vw - 40px);background:#FFFFFF;border:1px solid #E6E6E0;border-radius:14px;box-shadow:0 14px 34px rgba(12,13,16,.14);padding:14px 34px 14px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;opacity:0;transform:translateY(8px);transition:opacity .3s cubic-bezier(.16,1,.3,1),transform .3s cubic-bezier(.16,1,.3,1),border-color .15s ease;pointer-events:none}' +
    '.fb-teaser.fb-show{opacity:1;transform:translateY(0);pointer-events:auto}' +
    '.fb-teaser:hover{border-color:#D3D4CE}' +
    '.fb-teaser-ico{width:40px;height:40px;flex:none;border-radius:999px;border:1px solid #E6E6E0;background:#FFFFFF;display:flex;align-items:center;justify-content:center;color:#22252C;overflow:hidden}' +
    '.fb-teaser-ico svg{width:19px;height:19px}' +
    '.fb-teaser-ico img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.fb-teaser-body{flex:1;min-width:0}' +
    '.fb-teaser-naam{font-size:13px;font-weight:700;color:#0C0D10;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.fb-teaser-txt{font-size:13px;color:#8A909D;line-height:1.45;margin-top:2px}' +
    '.fb-teaser-x{position:absolute;top:4px;right:6px;background:none;border:none;color:#8A909D;font-size:15px;cursor:pointer;padding:2px 4px;line-height:1;font-family:inherit}' +
    /* Kaartmodus: de teaserkaart vervangt de ronde knop als eerste staat */
    '.fb-root.fb-kaart .fb-btn{display:none}' +
    '.fb-root.fb-kaart .fb-teaser{bottom:0}' +
    '.fb-teaser-x:hover{color:#0C0D10}' +
    '@media (max-width:520px){.fb-root{right:12px;bottom:12px}.fb-panel{position:fixed;inset:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0;border:none;bottom:0}.fb-teaser{max-width:calc(100vw - 24px)}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var dynStyle = document.createElement('style');
  document.head.appendChild(dynStyle);

  var root = document.createElement('div');
  root.className = 'fb-root';
  root.innerHTML =
    '<div class="fb-panel" role="dialog" aria-label="Chat">' +
      '<div class="fb-head">' +
        '<span class="fb-avatar"></span>' +
        '<div class="fb-head-txt"><div class="fb-head-naam"></div><div class="fb-head-sub">&#9679; Online — antwoordt direct</div></div>' +
        '<button class="fb-close" aria-label="Sluiten">&times;</button>' +
      '</div>' +
      '<div class="fb-msgs"></div>' +
      '<div class="fb-chips"></div>' +
      '<div class="fb-inputbar"><div class="fb-input-wrap">' +
        '<input maxlength="1000" placeholder="Stel een vraag over je fiets…" aria-label="Je vraag">' +
        '<button class="fb-send" aria-label="Verstuur">&#8593;</button>' +
      '</div></div>' +
      '<div class="fb-foot"><a href="https://www.forgexe.nl" target="_blank" rel="noopener">AI-assistent door Forgexe</a></div>' +
    '</div>' +
    '<div class="fb-teaser" role="button" tabindex="0" aria-label="Open chat">' +
      '<button class="fb-teaser-x" aria-label="Sluiten">&times;</button>' +
      '<span class="fb-teaser-ico"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.1.92 4 2.43 5.43-.14 1.1-.6 2.42-1.43 3.32 1.64-.06 3.2-.66 4.33-1.42.86.24 1.76.37 2.67.37 4.97 0 9-3.58 9-8s-4.03-8-9-8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8.6" cy="11" r="1" fill="currentColor"/><circle cx="12" cy="11" r="1" fill="currentColor"/><circle cx="15.4" cy="11" r="1" fill="currentColor"/></svg></span>' +
      '<div class="fb-teaser-body"><div class="fb-teaser-naam"></div><div class="fb-teaser-txt"></div></div>' +
    '</div>' +
    '<button class="fb-btn" aria-label="Open chat">' +
      '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.1.92 4 2.43 5.43-.14 1.1-.6 2.42-1.43 3.32 1.64-.06 3.2-.66 4.33-1.42.86.24 1.76.37 2.67.37 4.97 0 9-3.58 9-8s-4.03-8-9-8Z" fill="currentColor"/></svg>' +
    '</button>';
  document.body.appendChild(root);

  var btn = root.querySelector('.fb-btn');
  var avatarEl = root.querySelector('.fb-avatar');
  var naamEl = root.querySelector('.fb-head-naam');
  var closeBtn = root.querySelector('.fb-close');
  var msgsEl = root.querySelector('.fb-msgs');
  var chipsEl = root.querySelector('.fb-chips');
  var inputEl = root.querySelector('input');
  var sendBtn = root.querySelector('.fb-send');
  var teaserEl = root.querySelector('.fb-teaser');
  var teaserTxtEl = root.querySelector('.fb-teaser-txt');
  var teaserNaamEl = root.querySelector('.fb-teaser-naam');
  var teaserIcoEl = root.querySelector('.fb-teaser-ico');
  var teaserX = root.querySelector('.fb-teaser-x');

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
      '.fb-msg-user{background:' + kleur + ';color:' + tekst + '}' +
      '.fb-input-wrap:focus-within{border-color:' + kleur + ';box-shadow:0 0 0 3px ' + kleur + '33}' +
      '.fb-typing span.fb-on{background:' + kleur + '}' +
      '.fb-msg-bot a{color:' + linkKleur + '}' +
      '@keyframes fb-pulse{0%{box-shadow:0 14px 30px rgba(12,13,16,.22),0 0 0 0 ' + pulsKleur + '59}80%{box-shadow:0 14px 30px rgba(12,13,16,.22),0 0 0 16px ' + pulsKleur + '00}100%{box-shadow:0 14px 30px rgba(12,13,16,.22),0 0 0 0 ' + pulsKleur + '00}}' +
      '.fb-btn.fb-pulsing{animation:fb-pulse 1.9s cubic-bezier(.16,1,.3,1) 2}' +
      '@media (prefers-reduced-motion:reduce){.fb-btn.fb-pulsing{animation:none}}';
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
    b.className = 'fb-chip';
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
    el.className = 'fb-msg ' + (rol === 'user' ? 'fb-msg-user' : 'fb-msg-bot');
    el.innerHTML = renderText(tekst);
    msgsEl.appendChild(el);
    scrollDown();
    if (!skipSave) {
      var h = loadHistory();
      h.push({ rol: rol, tekst: tekst });
      saveHistory(h);
    }
    return el;
  }

  /* Werkt de tekst van een eerder getoond bericht bij, ook in de opgeslagen
     geschiedenis (laatste bericht met precies die oude tekst). */
  function updateMsg(el, oud, nieuw) {
    el.innerHTML = renderText(nieuw);
    var h = loadHistory();
    for (var i = h.length - 1; i >= 0; i--) {
      if (h[i].tekst === oud) { h[i].tekst = nieuw; break; }
    }
    saveHistory(h);
  }

  msgsEl.addEventListener('click', function (e) {
    var el = e.target;
    if (el && el.tagName === 'A') track('link_geklikt', el.getAttribute('href'));
  });

  var typingEl = null;
  var typingIv = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'fb-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    msgsEl.appendChild(typingEl);
    scrollDown();
    var step = 0;
    typingIv = setInterval(function () {
      if (!typingEl) return;
      var dots = typingEl.querySelectorAll('span');
      for (var d = 0; d < dots.length; d++) dots[d].className = d === step ? 'fb-on' : '';
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
      if (cached && cached.t && (Date.now() - cached.t) < CONFIG_TTL && cached.d && cached.d.naam && 'whatsapp' in cached.d) {
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
    sendBtn.className = 'fb-send' + (inputEl.value.trim() && !busy ? ' fb-armed' : '');
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
    /* Directe WhatsApp-knop: de klant hoeft niet op de AI te wachten */
    var waDirect = null;
    if (config && config.whatsapp && WA_VRAAG.test(vraag)) {
      var waTekst = 'Liever direct iemand van de winkel? Een medewerker leest je WhatsApp-bericht.\n\n' +
        '[Stuur ons een WhatsApp](' + waUrl('Hoi, ik had net een chat op jullie website en wil graag iemand van de winkel spreken.') + ')';
      waDirect = { el: addMsg('bot', waTekst), tekst: waTekst };
      track('whatsapp_getoond', 'direct');
    }
    showTyping();
    track('bericht', bron || 'getypt');
    post({ winkel: WINKEL, actie: 'chat', vraag: vraag, sessie: sessieId(), pagina: paginaPad() })
      .then(function (data) {
        hideTyping();
        var antwoord = data.antwoord || 'Hmm, daar heb ik even geen antwoord op.';
        /* Stond de directe knop er al? Dan geen tweede knop in het AI-antwoord:
           de knop bovenin krijgt de link van de AI (met samenvatting van het
           gesprek in het berichtvak) en verdwijnt uit het antwoord zelf. */
        var waM = waDirect && antwoord.match(WA_LINK_RE);
        if (waM) {
          var nieuw = waDirect.tekst.replace(/\(https:\/\/wa\.me\/[^)\s]+\)/, '(' + waM[1] + ')');
          updateMsg(waDirect.el, waDirect.tekst, nieuw);
          antwoord = antwoord.replace(WA_LINK_RE, '\n\n').replace(/\n{3,}/g, '\n\n').trim() || antwoord;
        }
        addMsg('bot', antwoord);
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
    if (bootCfg && bootCfg.t && (Date.now() - bootCfg.t) < CONFIG_TTL && bootCfg.d && bootCfg.d.naam && 'whatsapp' in bootCfg.d) applyConfig(bootCfg.d);
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
    teaserEl.classList.remove('fb-show');
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
    btn.classList.remove('fb-pulsing');
    void btn.offsetWidth;
    btn.classList.add('fb-pulsing');
  }

  function stopPulsen() {
    pulsGestopt = true;
    btn.classList.remove('fb-pulsing');
    if (pulsTimer) { clearInterval(pulsTimer); pulsTimer = null; }
  }

  btn.addEventListener('animationend', function () {
    btn.classList.remove('fb-pulsing');
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
    root.classList.remove('fb-kaart');
  }

  if (kaartModus) {
    root.classList.add('fb-kaart');
    setTimeout(function () {
      if (open || !kaartModus) return;
      vulTeaser();
      teaserEl.classList.add('fb-show');
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
      root.classList.add('fb-open');
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
      root.classList.remove('fb-open');
      return;
    }
    openChat('knop');
  });

  closeBtn.addEventListener('click', function () {
    open = false;
    root.classList.remove('fb-open');
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
