/*
 * Fietsbot – AI-chatwidget voor fietsenwinkels (Forgexe)
 * Gebruik: <script src="https://www.forgexe.nl/fietsbot.js" data-winkel="WINKEL_ID"></script>
 * Design: Spaak AI Design System (paper/ink-palet, pill-composer, lime verstuurknop)
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://leadkamer.app.n8n.cloud/webhook/fietsbot';

  var scriptTag = document.currentScript;
  if (!scriptTag) {
    var scripts = document.querySelectorAll('script[src*="fietsbot.js"]');
    scriptTag = scripts[scripts.length - 1];
  }
  var WINKEL = scriptTag ? scriptTag.getAttribute('data-winkel') : null;
  if (!WINKEL) return;

  var config = null;
  var open = false;
  var busy = false;
  var storeKey = 'fietsbot-' + WINKEL;
  var CHIPS = ['Wat zijn jullie openingstijden?', 'Doen jullie ook reparaties?'];

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
    '.fb-root{position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:14px;line-height:1.55;letter-spacing:-0.005em;color:#0C0D10}' +
    '.fb-btn{width:58px;height:58px;border-radius:999px;border:none;cursor:pointer;box-shadow:0 14px 30px rgba(12,13,16,.22);display:flex;align-items:center;justify-content:center;transition:transform .15s cubic-bezier(.16,1,.3,1)}' +
    '.fb-btn:hover{transform:scale(1.06)}' +
    '.fb-btn:active{transform:scale(.97)}' +
    '.fb-btn svg{width:28px;height:28px}' +
    '.fb-panel{position:absolute;right:0;bottom:74px;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 120px);background:#FFFFFF;border:1px solid #E6E6E0;border-radius:20px;box-shadow:0 30px 70px rgba(12,13,16,.16);display:none;flex-direction:column;overflow:hidden}' +
    '.fb-root.fb-open .fb-panel{display:flex}' +
    '.fb-head{padding:14px 16px;display:flex;align-items:center;gap:10px;flex:0 0 auto;background:#FFFFFF;border-bottom:1px solid #E6E6E0}' +
    '.fb-avatar{width:34px;height:34px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px}' +
    '.fb-head-txt{flex:1;min-width:0}' +
    '.fb-head-naam{font-weight:600;font-size:13px;color:#0C0D10;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.fb-head-sub{font-size:12px;color:#22A06B}' +
    '.fb-close{background:none;border:none;cursor:pointer;font-size:22px;line-height:1;padding:4px;color:#8A909D}' +
    '.fb-close:hover{color:#0C0D10}' +
    '.fb-msgs{flex:1;overflow-y:auto;padding:16px;background:#F2F2EE;display:flex;flex-direction:column;gap:10px}' +
    '.fb-msg{max-width:80%;padding:12px 16px;word-wrap:break-word;overflow-wrap:break-word;font-size:14px}' +
    '.fb-msg-bot{background:#FFFFFF;color:#0C0D10;border:1px solid #E6E6E0;border-radius:18px 18px 18px 6px;align-self:flex-start}' +
    '.fb-msg-bot a{font-weight:600;text-decoration:underline;word-break:break-all}' +
    '.fb-msg-user{border-radius:18px 18px 6px 18px;align-self:flex-end;border:1px solid transparent}' +
    '.fb-typing{display:inline-flex;gap:5px;align-items:center;padding:13px 16px;background:#FFFFFF;border:1px solid #E6E6E0;border-radius:18px 18px 18px 6px;align-self:flex-start}' +
    '.fb-typing span{width:6px;height:6px;border-radius:999px;background:#B6BBC5;transition:background-color .15s cubic-bezier(.16,1,.3,1)}' +
    '.fb-chips{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 10px;background:#F2F2EE}' +
    '.fb-chip{height:34px;padding:0 16px;border-radius:999px;border:1px solid #D3D4CE;background:transparent;color:#22252C;font-family:inherit;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap;transition:background-color .15s ease}' +
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
    '@media (max-width:520px){.fb-root{right:12px;bottom:12px}.fb-panel{position:fixed;inset:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0;border:none;bottom:0}}';

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

  function applyKleur(kleur) {
    var licht = isLight(kleur);
    var tekst = licht ? '#0C0D10' : '#fff';
    btn.style.background = kleur;
    btn.style.color = tekst;
    avatarEl.style.background = kleur;
    avatarEl.style.color = tekst;
    var linkKleur = licht ? '#22252C' : kleur;
    dynStyle.textContent =
      '.fb-msg-user{background:' + kleur + ';color:' + tekst + '}' +
      '.fb-input-wrap:focus-within{border-color:' + kleur + ';box-shadow:0 0 0 3px ' + kleur + '33}' +
      '.fb-typing span.fb-on{background:' + kleur + '}' +
      '.fb-msg-bot a{color:' + linkKleur + '}';
  }
  applyKleur('#2F5CFF');

  function scrollDown() {
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function renderChips() {
    chipsEl.innerHTML = '';
    if (loadHistory().length > 1) return;
    CHIPS.forEach(function (q) {
      var b = document.createElement('button');
      b.className = 'fb-chip';
      b.type = 'button';
      b.textContent = q;
      b.addEventListener('click', function () {
        inputEl.value = q;
        send();
      });
      chipsEl.appendChild(b);
    });
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
  }

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

  function initConfig() {
    if (config) return Promise.resolve(config);
    return post({ winkel: WINKEL, actie: 'config' }).then(function (data) {
      config = data;
      naamEl.textContent = data.naam || 'Chat';
      avatarEl.textContent = (data.naam || 'F').charAt(0).toUpperCase();
      if (data.kleur) applyKleur(data.kleur);
      var h = loadHistory();
      if (h.length) {
        h.forEach(function (m) { addMsg(m.rol, m.tekst, true); });
      } else if (data.welkomst) {
        addMsg('bot', data.welkomst);
      }
      renderChips();
      return data;
    });
  }

  function armSend() {
    sendBtn.className = 'fb-send' + (inputEl.value.trim() && !busy ? ' fb-armed' : '');
  }

  function send() {
    var vraag = inputEl.value.trim();
    if (!vraag || busy) return;
    inputEl.value = '';
    addMsg('user', vraag);
    chipsEl.innerHTML = '';
    busy = true;
    armSend();
    showTyping();
    post({ winkel: WINKEL, actie: 'chat', vraag: vraag, sessie: sessieId() })
      .then(function (data) {
        hideTyping();
        addMsg('bot', data.antwoord || 'Hmm, daar heb ik even geen antwoord op.');
      })
      .catch(function () {
        hideTyping();
        foutmelding();
      })
      .then(function () {
        busy = false;
        armSend();
        inputEl.focus();
      });
  }

  btn.addEventListener('click', function () {
    open = !open;
    root.classList.toggle('fb-open', open);
    if (open) {
      initConfig().catch(function () {
        naamEl.textContent = 'Chat';
        avatarEl.textContent = '!';
        addMsg('bot', 'Sorry, de chat is nu even niet beschikbaar. Probeer het later opnieuw.', true);
      });
      setTimeout(function () { inputEl.focus(); }, 100);
    }
  });

  closeBtn.addEventListener('click', function () {
    open = false;
    root.classList.remove('fb-open');
  });

  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('input', armSend);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  });
})();
