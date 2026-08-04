/*
 * Fietsbot – AI-chatwidget voor fietsenwinkels (Forgexe)
 * Gebruik: <script src="https://www.forgexe.nl/fietsbot.js" data-winkel="WINKEL_ID"></script>
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

  var css = '' +
    '.fb-root{position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:15px;line-height:1.45}' +
    '.fb-btn{width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;transition:transform .15s ease}' +
    '.fb-btn:hover{transform:scale(1.06)}' +
    '.fb-btn svg{width:28px;height:28px}' +
    '.fb-panel{position:absolute;right:0;bottom:74px;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden}' +
    '.fb-root.fb-open .fb-panel{display:flex}' +
    '.fb-head{padding:14px 16px;display:flex;align-items:center;gap:10px;flex:0 0 auto}' +
    '.fb-head-txt{flex:1;min-width:0}' +
    '.fb-head-naam{font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.fb-head-sub{font-size:12px;opacity:.8}' +
    '.fb-close{background:none;border:none;cursor:pointer;font-size:22px;line-height:1;padding:4px;color:inherit;opacity:.85}' +
    '.fb-msgs{flex:1;overflow-y:auto;padding:14px;background:#f5f6f8;display:flex;flex-direction:column;gap:10px}' +
    '.fb-msg{max-width:85%;padding:10px 13px;border-radius:14px;word-wrap:break-word;overflow-wrap:break-word}' +
    '.fb-msg-bot{background:#fff;color:#1c1e21;border-bottom-left-radius:4px;align-self:flex-start;box-shadow:0 1px 2px rgba(0,0,0,.08)}' +
    '.fb-msg-bot a{color:#0b6e4f;font-weight:600;text-decoration:underline;word-break:break-all}' +
    '.fb-msg-user{border-bottom-right-radius:4px;align-self:flex-end}' +
    '.fb-typing{display:flex;gap:4px;padding:12px 14px;background:#fff;border-radius:14px;border-bottom-left-radius:4px;align-self:flex-start;box-shadow:0 1px 2px rgba(0,0,0,.08)}' +
    '.fb-typing span{width:7px;height:7px;border-radius:50%;background:#b0b3b8;animation:fb-blink 1.2s infinite}' +
    '.fb-typing span:nth-child(2){animation-delay:.2s}' +
    '.fb-typing span:nth-child(3){animation-delay:.4s}' +
    '@keyframes fb-blink{0%,80%,100%{opacity:.3}40%{opacity:1}}' +
    '.fb-input{flex:0 0 auto;display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #e4e6eb}' +
    '.fb-input textarea{flex:1;border:1px solid #d0d3d8;border-radius:10px;padding:9px 12px;font:inherit;resize:none;height:40px;max-height:90px;outline:none}' +
    '.fb-input textarea:focus{border-color:#888}' +
    '.fb-send{border:none;border-radius:10px;padding:0 14px;cursor:pointer;font-weight:700;font:inherit}' +
    '.fb-send:disabled{opacity:.5;cursor:default}' +
    '.fb-foot{flex:0 0 auto;text-align:center;font-size:10px;color:#8a8d91;padding:5px 0 7px;background:#fff}' +
    '.fb-foot a{color:inherit;text-decoration:none}' +
    '@media (max-width:520px){.fb-root{right:12px;bottom:12px}.fb-panel{position:fixed;inset:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0;bottom:0}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.className = 'fb-root';
  root.innerHTML =
    '<div class="fb-panel" role="dialog" aria-label="Chat">' +
      '<div class="fb-head">' +
        '<div class="fb-head-txt"><div class="fb-head-naam"></div><div class="fb-head-sub">Digitale assistent</div></div>' +
        '<button class="fb-close" aria-label="Sluiten">&times;</button>' +
      '</div>' +
      '<div class="fb-msgs"></div>' +
      '<div class="fb-input">' +
        '<textarea maxlength="1000" rows="1" placeholder="Typ je vraag..." aria-label="Je vraag"></textarea>' +
        '<button class="fb-send">Stuur</button>' +
      '</div>' +
      '<div class="fb-foot"><a href="https://www.forgexe.nl" target="_blank" rel="noopener">AI-assistent door Forgexe</a></div>' +
    '</div>' +
    '<button class="fb-btn" aria-label="Open chat">' +
      '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.1.92 4 2.43 5.43-.14 1.1-.6 2.42-1.43 3.32 1.64-.06 3.2-.66 4.33-1.42.86.24 1.76.37 2.67.37 4.97 0 9-3.58 9-8s-4.03-8-9-8Z" fill="currentColor"/></svg>' +
    '</button>';
  document.body.appendChild(root);

  var btn = root.querySelector('.fb-btn');
  var panel = root.querySelector('.fb-panel');
  var head = root.querySelector('.fb-head');
  var naamEl = root.querySelector('.fb-head-naam');
  var closeBtn = root.querySelector('.fb-close');
  var msgsEl = root.querySelector('.fb-msgs');
  var inputEl = root.querySelector('textarea');
  var sendBtn = root.querySelector('.fb-send');

  function applyKleur(kleur) {
    var licht = isLight(kleur);
    var tekst = licht ? '#111' : '#fff';
    btn.style.background = kleur;
    btn.style.color = tekst;
    head.style.background = kleur;
    head.style.color = tekst;
    sendBtn.style.background = kleur;
    sendBtn.style.color = tekst;
  }
  applyKleur('#34d399');

  function scrollDown() {
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function addMsg(rol, tekst, skipSave) {
    var el = document.createElement('div');
    el.className = 'fb-msg ' + (rol === 'user' ? 'fb-msg-user' : 'fb-msg-bot');
    if (rol === 'user' && config) {
      el.style.background = config.kleur;
      el.style.color = isLight(config.kleur) ? '#111' : '#fff';
    } else if (rol === 'user') {
      el.style.background = '#34d399';
    }
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
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'fb-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    msgsEl.appendChild(typingEl);
    scrollDown();
  }
  function hideTyping() {
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
      if (data.kleur) applyKleur(data.kleur);
      var h = loadHistory();
      if (h.length) {
        h.forEach(function (m) { addMsg(m.rol, m.tekst, true); });
      } else if (data.welkomst) {
        addMsg('bot', data.welkomst);
      }
      return data;
    });
  }

  function send() {
    var vraag = inputEl.value.trim();
    if (!vraag || busy) return;
    inputEl.value = '';
    addMsg('user', vraag);
    busy = true;
    sendBtn.disabled = true;
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
        sendBtn.disabled = false;
        inputEl.focus();
      });
  }

  btn.addEventListener('click', function () {
    open = !open;
    root.classList.toggle('fb-open', open);
    if (open) {
      initConfig().catch(function () {
        naamEl.textContent = 'Chat';
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
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
})();
