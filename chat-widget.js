/* Forgexe chat-widget
   Zwevende knop rechtsonder + chatpaneel. Praat met de n8n-agent (Casper).
   De agent zet [SCAN] achter zijn bericht zodra de bezoeker gekwalificeerd is;
   dat token wordt hier weggehaald en vervangen door een knop naar openScan().
*/
(function(){
  if (document.getElementById('fxChat')) return;

  var ENDPOINT = 'https://leadkamer.app.n8n.cloud/webhook/forgexe-chat';
  var SLEUTEL = 'fx-chat-sessie';
  var LOG_KEY = 'fx-chat-log';
  var OPEN_KEY = 'fx-chat-open';
  var SCAN_KEY = 'fx-chat-scan';
  var MAX_LOG = 40;
  var bezig = false;
  var sessie = null;
  var log = [];

  function sessieId(){
    if (sessie) return sessie;
    try {
      sessie = sessionStorage.getItem(SLEUTEL);
      if (!sessie){
        sessie = 'fx-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem(SLEUTEL, sessie);
      }
    } catch (e) {
      sessie = 'fx-' + Date.now().toString(36);
    }
    return sessie;
  }

  /* Het gesprek moet een paginawissel overleven. n8n onthoudt de inhoud al
     via de sessionId, hier bewaren we wat de bezoeker op het scherm zag. */
  function onthoud(sleutel, waarde){
    try { sessionStorage.setItem(sleutel, waarde); } catch (e) {}
  }
  function opgehaald(sleutel){
    try { return sessionStorage.getItem(sleutel); } catch (e) { return null; }
  }
  function bewaarLog(){
    if (log.length > MAX_LOG) log = log.slice(-MAX_LOG);
    onthoud(LOG_KEY, JSON.stringify(log));
  }

  var css = ''
    + '#fxChat{position:fixed;right:20px;bottom:calc(20px + var(--fx-banner,0px));z-index:190;font-family:var(--head,system-ui,sans-serif);transition:bottom .3s cubic-bezier(.16,1,.3,1)}'
    + '#fxChatKnop{display:flex;align-items:center;gap:.55rem;background:var(--green,#34d399);color:#052e16;border:none;border-radius:999px;padding:.85rem 1.25rem;font-family:var(--head,system-ui,sans-serif);font-size:.9rem;font-weight:600;cursor:pointer;box-shadow:0 10px 30px rgba(5,46,22,.22);transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s}'
    + '#fxChatKnop:hover{transform:translateY(-2px);box-shadow:0 16px 38px rgba(5,46,22,.28)}'
    + '#fxChatKnop:active{transform:translateY(0)}'
    + '#fxChatKnop svg{flex-shrink:0}'
    + '#fxChat.open #fxChatKnop{display:none}'
    + '#fxChatPaneel{display:none;flex-direction:column;width:380px;max-width:calc(100vw - 40px);height:min(560px,calc(100vh - 120px));background:var(--card-bg,#fff);border:1px solid var(--line,rgba(10,11,14,.08));border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(10,11,14,.28)}'
    + '#fxChat.open #fxChatPaneel{display:flex;animation:fxChatIn .3s cubic-bezier(.16,1,.3,1)}'
    + '@keyframes fxChatIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}'
    + '.fx-chat-kop{display:flex;align-items:center;gap:.7rem;padding:1rem 1.1rem;background:var(--ink,#0a0b0e);color:#fff;flex-shrink:0}'
    + '.fx-chat-avatar{width:34px;height:34px;border-radius:50%;background:rgba(52,211,153,.16);display:flex;align-items:center;justify-content:center;flex-shrink:0}'
    + '.fx-chat-titel{font-size:.92rem;font-weight:600;letter-spacing:-.01em;line-height:1.2}'
    + '.fx-chat-status{font-family:var(--mono,monospace);font-size:.64rem;color:var(--green,#34d399);letter-spacing:.06em;margin-top:.15rem;display:flex;align-items:center;gap:.35rem}'
    + '.fx-chat-status::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--green,#34d399)}'
    + '.fx-chat-sluit{margin-left:auto;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.08);border:none;color:#fff;font-size:1.1rem;line-height:1;cursor:pointer;transition:background .25s;flex-shrink:0}'
    + '.fx-chat-sluit:hover{background:rgba(255,255,255,.18)}'
    + '.fx-chat-berichten{flex:1;overflow-y:auto;padding:1.1rem;display:flex;flex-direction:column;gap:.7rem;background:var(--bg,#fafbfc)}'
    + '.fx-bericht{max-width:85%;padding:.7rem .9rem;border-radius:13px;font-size:.87rem;line-height:1.5;white-space:pre-wrap;word-break:break-word}'
    + '.fx-bericht.bot{background:var(--card-bg,#fff);border:1px solid var(--line,rgba(10,11,14,.08));color:var(--ink,#0a0b0e);align-self:flex-start;border-bottom-left-radius:4px}'
    + '.fx-bericht.mens{background:var(--ink,#0a0b0e);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}'
    + '.fx-bericht a{color:var(--green-deep,#059669);font-weight:600}'
    + '.fx-typt{display:flex;gap:4px;align-self:flex-start;padding:.85rem .9rem;background:var(--card-bg,#fff);border:1px solid var(--line,rgba(10,11,14,.08));border-radius:13px;border-bottom-left-radius:4px}'
    + '.fx-typt span{width:6px;height:6px;border-radius:50%;background:var(--ink-mut,#8d9bb5);animation:fxTypt 1.2s infinite}'
    + '.fx-typt span:nth-child(2){animation-delay:.2s}.fx-typt span:nth-child(3){animation-delay:.4s}'
    + '@keyframes fxTypt{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}'
    + '.fx-scan-knop{align-self:flex-start;background:var(--green,#34d399);color:#052e16;border:none;border-radius:9px;padding:.75rem 1.1rem;font-family:var(--head,system-ui,sans-serif);font-size:.85rem;font-weight:600;cursor:pointer;transition:background .25s,transform .25s}'
    + '.fx-scan-knop:hover{background:var(--green-light,#4ade80);transform:translateY(-1px)}'
    + '.fx-chat-voet{display:flex;gap:.5rem;padding:.8rem;border-top:1px solid var(--line,rgba(10,11,14,.08));background:var(--card-bg,#fff);flex-shrink:0}'
    + '.fx-chat-voet input{flex:1;min-width:0;padding:.75rem .9rem;font-size:.85rem;font-family:var(--head,system-ui,sans-serif);background:var(--bg,#fafbfc);border:1px solid var(--line,rgba(10,11,14,.08));color:var(--ink,#0a0b0e);border-radius:9px;outline:none;transition:border-color .25s,box-shadow .25s}'
    + '.fx-chat-voet input:focus{border-color:var(--green,#34d399);box-shadow:0 0 0 3px rgba(52,211,153,.15)}'
    + '.fx-chat-voet button{width:40px;flex-shrink:0;background:var(--ink,#0a0b0e);color:#fff;border:none;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .25s}'
    + '.fx-chat-voet button:hover{background:var(--green,#34d399);color:#052e16}'
    + '.fx-chat-voet button:disabled{opacity:.4;cursor:not-allowed}'
    /* iOS zoomt automatisch in op invoervelden kleiner dan 16px. Op mobiel
       dus exact 16px, anders springt het scherm bij elke tik in het veld. */
    + '@media(max-width:900px){.fx-chat-voet input{font-size:16px}}'
    + '@media(max-width:520px){#fxChat{right:12px;bottom:calc(12px + var(--fx-banner,0px));left:12px}'
    + '#fxChatKnop{margin-left:auto}'
    + '#fxChatPaneel{width:100%;max-width:none;height:min(80vh,calc(100vh - 90px))}}'
    + '@media(prefers-reduced-motion:reduce){#fxChat *,#fxChat{animation:none!important;transition:none!important}}';

  var LOGO = '<svg viewBox="0 0 40 40" width="18" height="18" fill="none" aria-hidden="true">'
    + '<rect x="5" y="4" width="7" height="32" rx="1.5" fill="#34d399"/>'
    + '<rect x="5" y="4" width="25" height="6" rx="1.5" fill="#34d399"/>'
    + '<rect x="5" y="17" width="18" height="5" rx="1.5" fill="#34d399"/>'
    + '<polygon points="27,16 38,24 27,32" fill="#34d399"/></svg>';

  var wrap = document.createElement('div');
  wrap.id = 'fxChat';
  wrap.innerHTML = ''
    + '<style>' + css + '</style>'
    + '<div id="fxChatPaneel" role="dialog" aria-label="Chat met Forgexe">'
    + '  <div class="fx-chat-kop">'
    + '    <div class="fx-chat-avatar">' + LOGO + '</div>'
    + '    <div><div class="fx-chat-titel">Casper</div><div class="fx-chat-status">DIGITALE COLLEGA</div></div>'
    + '    <button type="button" class="fx-chat-sluit" aria-label="Chat sluiten">&times;</button>'
    + '  </div>'
    + '  <div class="fx-chat-berichten" id="fxChatBerichten"></div>'
    + '  <form class="fx-chat-voet" id="fxChatForm">'
    + '    <input type="text" id="fxChatInput" placeholder="Typ je vraag..." autocomplete="off" aria-label="Je bericht">'
    + '    <button type="submit" aria-label="Versturen">'
    + '      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
    + '    </button>'
    + '  </form>'
    + '</div>'
    + '<button type="button" id="fxChatKnop">'
    + '  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 21l1.9-5a8.4 8.4 0 0 1-.9-3.8 8.4 8.4 0 0 1 8.4-8.7h.5a8.4 8.4 0 0 1 8.1 8.1z"/></svg>'
    + '  Chat met Casper'
    + '</button>';
  document.body.appendChild(wrap);

  var paneel = wrap.querySelector('#fxChatPaneel');
  var lijst = wrap.querySelector('#fxChatBerichten');
  var form = wrap.querySelector('#fxChatForm');
  var invoer = wrap.querySelector('#fxChatInput');
  var verstuur = form.querySelector('button');

  function scrollOmlaag(){ lijst.scrollTop = lijst.scrollHeight; }

  function veilig(t){
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Het model glipt er af en toe een gedachtestreepje of een non-breaking
     hyphen doorheen. Die passen niet bij onze schrijfstijl, dus weg ermee. */
  function schoon(t){
    return String(t)
      .replace(/\s+[—–]\s+/g, ', ')
      .replace(/[—–]/g, '-')
      .replace(/[‑‐]/g, '-')
      .replace(/[  ]/g, ' ');
  }

  /* interne links (/prijzen) klikbaar maken, verder alles escapen */
  function opmaak(t){
    return veilig(t).replace(/(^|[\s(])\/([a-z0-9-]+)/g, function(m, voor, pad){
      return voor + '<a href="/' + pad + '">/' + pad + '</a>';
    });
  }

  /* bewaren = false bij het terugzetten van een eerder gesprek */
  function toonBericht(tekst, wie, bewaren){
    var el = document.createElement('div');
    el.className = 'fx-bericht ' + wie;
    el.innerHTML = wie === 'bot' ? opmaak(tekst) : veilig(tekst);
    lijst.appendChild(el);
    scrollOmlaag();
    if (bewaren !== false){
      log.push({ t: tekst, w: wie });
      bewaarLog();
    }
  }

  function toonScanKnop(bewaren){
    /* Een eerdere knop staat inmiddels uit beeld. Verplaats hem naar onderen
       in plaats van hem te negeren, anders verwijst Casper naar een knop
       die de bezoeker nergens ziet. */
    var oud = lijst.querySelector('.fx-scan-knop');
    if (oud && oud.parentNode) oud.parentNode.removeChild(oud);
    var knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'fx-scan-knop';
    knop.textContent = 'Start de gratis bedrijfsscan';
    knop.onclick = function(){
      if (window.fxTrackCustom) window.fxTrackCustom('ChatNaarScan', { bron: window.location.pathname });
      sluit();
      if (window.openScan) window.openScan();
      else window.location.href = '/#scan';
    };
    lijst.appendChild(knop);
    scrollOmlaag();
    if (bewaren !== false) onthoud(SCAN_KEY, '1');
  }

  function toonTypt(){
    var el = document.createElement('div');
    el.className = 'fx-typt';
    el.id = 'fxChatTypt';
    el.innerHTML = '<span></span><span></span><span></span>';
    lijst.appendChild(el);
    scrollOmlaag();
    return el;
  }

  function haalTypt(){
    var el = document.getElementById('fxChatTypt');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function stuur(tekst){
    if (bezig) return;
    bezig = true;
    verstuur.disabled = true;
    toonBericht(tekst, 'mens');
    toonTypt();

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bericht: tekst, sessionId: sessieId(), pagina: window.location.pathname })
    }).then(function(r){ return r.json(); }).then(function(d){
      haalTypt();
      var antwoord = (d && d.reply) ? schoon(d.reply) : 'Sorry, ik kreeg geen antwoord terug. Probeer het nog een keer.';
      var scan = antwoord.indexOf('[SCAN]') !== -1;
      antwoord = antwoord.replace(/\[SCAN\]/g, '').trim();
      toonBericht(antwoord, 'bot');
      if (scan) toonScanKnop();
    })['catch'](function(){
      haalTypt();
      toonBericht('Er ging iets mis met de verbinding. Probeer het zo nog eens, of mail naar sedat at forgexe.nl.', 'bot');
    }).then(function(){
      bezig = false;
      verstuur.disabled = false;
      invoer.focus();
    });
  }

  /* Zet een gesprek van een vorige pagina terug op het scherm. */
  function herstel(){
    var rauw = opgehaald(LOG_KEY);
    if (!rauw) return false;
    var eerder;
    try { eerder = JSON.parse(rauw); } catch (e) { return false; }
    if (!eerder || !eerder.length) return false;

    log = eerder;
    eerder.forEach(function(b){ toonBericht(b.t, b.w, false); });
    if (opgehaald(SCAN_KEY) === '1') toonScanKnop(false);
    return true;
  }

  function toonPaneel(){
    wrap.classList.add('open');
    if (!lijst.children.length){
      toonBericht('Hoi. Ik ben Casper, de digitale collega van Forgexe. Vertel kort wat je bedrijf doet, dan zeg ik je eerlijk of hier iets te automatiseren valt.', 'bot');
    }
    onthoud(OPEN_KEY, '1');
    setTimeout(function(){ scrollOmlaag(); invoer.focus(); }, 120);
  }

  function open(){
    toonPaneel();
    if (window.fxTrackCustom) window.fxTrackCustom('ChatGeopend', { bron: window.location.pathname });
  }

  function sluit(){
    wrap.classList.remove('open');
    onthoud(OPEN_KEY, '0');
  }

  wrap.querySelector('#fxChatKnop').onclick = open;
  wrap.querySelector('.fx-chat-sluit').onclick = sluit;

  form.onsubmit = function(e){
    e.preventDefault();
    var tekst = invoer.value.trim();
    if (!tekst) return;
    invoer.value = '';
    stuur(tekst);
  };

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && wrap.classList.contains('open')) sluit();
  });

  window.fxChatOpen = open;

  /* Liep er al een gesprek op een vorige pagina? Zet het terug, en open het
     paneel weer als het openstond toen de bezoeker doorklikte. */
  if (herstel() && opgehaald(OPEN_KEY) === '1') toonPaneel();

  /* De cookiebanner zit ook onderaan. Zolang die er staat schuift de chat
     erboven; zodra hij weg is zakt de knop terug naar zijn eigen hoek. */
  function meetBanner(){
    var banner = document.getElementById('fxConsent');
    var hoogte = banner ? banner.offsetHeight + 14 : 0;
    document.documentElement.style.setProperty('--fx-banner', hoogte + 'px');
  }
  meetBanner();
  if (window.MutationObserver){
    new MutationObserver(meetBanner).observe(document.body, { childList: true });
  }
  window.addEventListener('resize', meetBanner);
})();
