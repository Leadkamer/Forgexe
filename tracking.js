/* Forgexe tracking met consent
   - Meta-pixel EN Google Analytics 4 laden pas na expliciete toestemming (AVG)
   - Keuze wordt 6 maanden onthouden in localStorage
   - window.fxTrack('Lead') stuurt een event naar zowel Meta als GA4
*/
(function(){
  var PIXEL_ID = '3371968756387934';
  var GA_ID = 'G-3F9QV63H16';
  var KEY = 'fx-consent';
  var TERMIJN = 182 * 24 * 60 * 60 * 1000; // 6 maanden

  function lees(){
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj.ts !== 'number') return null;
      if (Date.now() - obj.ts > TERMIJN) { localStorage.removeItem(KEY); return null; }
      return obj.keuze;
    } catch (e) { return null; }
  }

  function bewaar(keuze){
    try { localStorage.setItem(KEY, JSON.stringify({ keuze: keuze, ts: Date.now() })); } catch (e) {}
  }

  function laadPixel(){
    if (window.fbq) return;
    /* Meta pixel base code */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function laadGA(){
    if (window.gtag) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }

  function laadTracking(){
    laadPixel();
    laadGA();
  }

  /* Conversie-events: veilig aanroepbaar, doet niets zonder toestemming.
     Stuurt naar zowel Meta (fbq) als Google Analytics (gtag).
     eventId moet gelijk zijn aan het event_id dat naar de server (n8n/CAPI) gaat,
     anders kan Meta browser- en serverevent niet ontdubbelen. */
  window.fxTrack = function(event, data, eventId){
    if (lees() !== 'ja') return;
    try { if (window.fbq) window.fbq('track', event, data || {}, eventId ? { eventID: eventId } : undefined); } catch (e) {}
    try { if (window.gtag) window.gtag('event', event, data || {}); } catch (e) {}
  };

  /* Velden voor de serverside Conversions API (n8n): klik-cookies + gedeeld event_id.
     Werkt onafhankelijk van consent; zonder consent zijn fbc/fbp leeg en matcht
     de server op IP en user-agent. _fbc wordt uit de fbclid opgebouwd als de
     cookie ontbreekt, want de URL-parameter is niet afhankelijk van toestemming. */
  window.fxLeadMeta = function(){
    function cookie(naam){
      var m = document.cookie.match('(^|;)\\s*' + naam + '\\s*=\\s*([^;]+)');
      return m ? m.pop() : '';
    }
    var fbc = cookie('_fbc');
    if (!fbc) {
      try {
        var fbclid = new URLSearchParams(location.search).get('fbclid');
        if (fbclid) fbc = 'fb.1.' + Date.now() + '.' + fbclid;
      } catch (e) {}
    }
    return {
      fbc: fbc,
      fbp: cookie('_fbp'),
      event_id: 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10),
      event_source_url: location.href
    };
  };

  /* Eigen events (voor inzicht, niet voor optimalisatie) */
  window.fxTrackCustom = function(event, data){
    if (lees() !== 'ja') return;
    try { if (window.fbq) window.fbq('trackCustom', event, data || {}); } catch (e) {}
    try { if (window.gtag) window.gtag('event', event, data || {}); } catch (e) {}
  };

  function verwijderBanner(){
    var el = document.getElementById('fxConsent');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function kies(keuze){
    bewaar(keuze);
    verwijderBanner();
    if (keuze === 'ja') laadTracking();
  }
  window.fxConsentKies = kies;

  /* Heropenen vanaf de privacypagina: <a href="#cookies" onclick="fxConsentReset()"> */
  window.fxConsentReset = function(){
    try { localStorage.removeItem(KEY); } catch (e) {}
    toonBanner();
    return false;
  };

  function toonBanner(){
    if (document.getElementById('fxConsent')) return;
    var wrap = document.createElement('div');
    wrap.id = 'fxConsent';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Cookievoorkeuren');
    wrap.innerHTML =
      '<style>' +
      '#fxConsent{position:fixed;left:18px;right:18px;bottom:18px;z-index:9999;display:flex;gap:1.4rem;align-items:center;justify-content:space-between;flex-wrap:wrap;' +
      'background:#0a0b0e;border:1px solid rgba(52,211,153,.28);border-radius:14px;padding:1.1rem 1.3rem;max-width:940px;margin:0 auto;' +
      'box-shadow:0 20px 50px rgba(10,11,14,.3);animation:fxUp .35s cubic-bezier(.16,1,.3,1)}' +
      '@keyframes fxUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}' +
      '#fxConsent .fx-txt{font-family:"Outfit",system-ui,sans-serif;font-size:.88rem;line-height:1.5;color:#c4cbd8;flex:1;min-width:260px}' +
      '#fxConsent .fx-txt b{color:#fff;font-weight:600}' +
      '#fxConsent .fx-txt a{color:#34d399;text-decoration:none;font-weight:600}' +
      '#fxConsent .fx-txt a:hover{text-decoration:underline}' +
      '#fxConsent .fx-btns{display:flex;gap:.55rem;flex-shrink:0}' +
      '#fxConsent button{font-family:"Outfit",system-ui,sans-serif;font-size:.84rem;font-weight:600;padding:.7rem 1.2rem;border-radius:9px;cursor:pointer;border:1px solid transparent;transition:all .25s;white-space:nowrap}' +
      '#fxConsent .fx-ja{background:#34d399;color:#052e16}' +
      '#fxConsent .fx-ja:hover{background:#4ade80}' +
      '#fxConsent .fx-nee{background:transparent;color:#c4cbd8;border-color:rgba(255,255,255,.22)}' +
      '#fxConsent .fx-nee:hover{background:rgba(255,255,255,.07);color:#fff}' +
      '@media(max-width:640px){#fxConsent{left:10px;right:10px;bottom:10px;padding:.75rem .85rem;gap:.6rem;border-radius:12px}' +
      '#fxConsent .fx-txt{font-size:.78rem;line-height:1.4;min-width:0}' +
      '#fxConsent .fx-btns{width:100%;gap:.45rem}#fxConsent button{flex:1;padding:.6rem .7rem;font-size:.8rem}}' +
      '</style>' +
      '<div class="fx-txt"><b>Cookies?</b> We gebruiken alleen cookies om te meten hoe de site gebruikt wordt en om onze advertenties relevanter te maken. ' +
      'Zonder toestemming plaatsen we ze niet. Meer in onze <a href="/privacy">privacyverklaring</a>.</div>' +
      '<div class="fx-btns">' +
      '<button type="button" class="fx-nee" onclick="fxConsentKies(\'nee\')">Alleen noodzakelijk</button>' +
      '<button type="button" class="fx-ja" onclick="fxConsentKies(\'ja\')">Accepteren</button>' +
      '</div>';
    document.body.appendChild(wrap);
  }

  function init(){
    var keuze = lees();
    if (keuze === 'ja') { laadTracking(); return; }
    if (keuze === 'nee') return;
    /* Eerste bezoek: banner pas na 2,5 s, zodat de pagina en het formulier eerst
       ongestoord in beeld komen. Tracking laadt sowieso pas na toestemming. */
    setTimeout(toonBanner, 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* Vangnet voor formulieren
   Lukt het versturen naar de server niet (storing), dan krijgt de bezoeker
   een venster met een WhatsApp-knop waarin zijn ingevulde gegevens al staan,
   zodat de aanvraag niet verloren gaat. Werkt voor elk formulier dat via
   fetch naar een van de onderstaande webhooks post. */
(function(){
  if (!window.fetch || window.fxVangnet) return;
  window.fxVangnet = true;

  var NUMMER = '31850805439';
  var MAIL = 'info@forgexe.nl';
  var FORMULIEREN = /leadkamer\.app\.n8n\.cloud\/webhook\/(forgexe-scan|forgexe-contact|forgexe-pilot|forgexe-ai-beslisboom|forgexe-calculatie-demo|forgexe-lunchsessie|forgexe-nieuwsbrief|peters-forgexe-lead|b23abb60-c5d3-44d7-a570-ca74e7de5191)(\?|$)/;
  /* Technische velden die de bezoeker niet zelf heeft ingevuld */
  var TECHNISCH = /^(fbc|fbp|event_id|event_source_url|user_agent|useragent|datum|timestamp|ts|token|sessie|consent|referrer|utm_.*)$/i;

  function waarde(v){
    if (v === null || v === undefined || v === '') return '';
    if (Array.isArray(v)) return v.map(waarde).filter(Boolean).join(', ');
    if (typeof v === 'object') {
      return Object.keys(v).map(function(k){ var w = waarde(v[k]); return w ? k + ' ' + w : ''; }).filter(Boolean).join('; ');
    }
    if (v === true) return 'ja';
    if (v === false) return 'nee';
    return String(v);
  }

  function bericht(body){
    var titel = (document.title || '').split('|')[0].split(' — ')[0].trim();
    var regels = ['Hoi Forgexe, het formulier op jullie website' + (titel ? ' (' + titel + ')' : '') + ' kon niet verzonden worden. Dit had ik ingevuld:', ''];
    var data = null;
    try { data = typeof body === 'string' ? JSON.parse(body) : null; } catch (e) { data = null; }
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(function(k){
        if (TECHNISCH.test(k)) return;
        var w = waarde(data[k]).replace(/\s+/g, ' ').trim();
        if (!w) return;
        if (w.length > 300) w = w.slice(0, 300) + '…';
        regels.push(k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ') + ': ' + w);
      });
    }
    var tekst = regels.join('\n');
    return tekst.length > 1400 ? tekst.slice(0, 1400) + '…' : tekst;
  }

  var WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.2 5.07 4.48.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.46 9.48-9.46a9.4 9.4 0 0 1 6.7 2.78 9.4 9.4 0 0 1 2.77 6.7c0 5.22-4.25 9.46-9.47 9.46zm8.06-17.52A11.32 11.32 0 0 0 12.04.65C5.76.65.65 5.75.65 12.03c0 2 .52 3.96 1.52 5.69L.55 23.6l6.02-1.58a11.38 11.38 0 0 0 5.46 1.39h.01c6.28 0 11.39-5.1 11.39-11.38 0-3.04-1.18-5.9-3.33-8.05z"/></svg>';

  function toon(body){
    var tekst = bericht(body);
    var wa = 'https://wa.me/' + NUMMER + '?text=' + encodeURIComponent(tekst);
    var mail = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Aanvraag via forgexe.nl') + '&body=' + encodeURIComponent(tekst);
    var oud = document.getElementById('fxVangnet');
    if (oud) oud.parentNode.removeChild(oud);

    if (!document.getElementById('fxVangnetStijl')) {
      var stijl = document.createElement('style');
      stijl.id = 'fxVangnetStijl';
      stijl.textContent = ''
        + '#fxVangnet{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(10,11,14,.55);padding:0;font-family:"Outfit",system-ui,sans-serif}'
        + '#fxVangnet .fxv-kaart{width:100%;max-width:460px;background:#fff;color:#0a0b0e;border-radius:18px 18px 0 0;padding:1.5rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 40px rgba(10,11,14,.25);box-sizing:border-box}'
        + '#fxVangnet h2{margin:0 0 .5rem;font-size:1.2rem;line-height:1.25;font-weight:700;color:#0a0b0e;font-family:inherit}'
        + '#fxVangnet p{margin:0 0 1.1rem;font-size:.95rem;line-height:1.55;color:#3b4252}'
        + '#fxVangnet .fxv-wa{display:flex;align-items:center;justify-content:center;gap:.55rem;min-height:52px;border-radius:12px;background:#34d399;color:#052e16;font-weight:700;font-size:1rem;text-decoration:none}'
        + '#fxVangnet .fxv-wa:hover{background:#4ade80}'
        + '#fxVangnet .fxv-wa svg{width:20px;height:20px;flex-shrink:0}'
        + '#fxVangnet .fxv-rij{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:.9rem;font-size:.88rem}'
        + '#fxVangnet .fxv-rij a{color:#0a0b0e;font-weight:600;text-decoration:underline}'
        + '#fxVangnet .fxv-rij button{background:none;border:0;padding:.5rem 0;font:inherit;color:#5b6475;cursor:pointer;min-height:44px}'
        + '#fxVangnet a:focus-visible,#fxVangnet button:focus-visible{outline:2px solid #0a0b0e;outline-offset:3px}'
        + '@media(min-width:600px){#fxVangnet{align-items:center;padding:1.5rem}#fxVangnet .fxv-kaart{border-radius:18px;padding:1.75rem}}';
      document.head.appendChild(stijl);
    }

    var laag = document.createElement('div');
    laag.id = 'fxVangnet';
    laag.setAttribute('role', 'dialog');
    laag.setAttribute('aria-modal', 'true');
    laag.setAttribute('aria-labelledby', 'fxvKop');
    laag.innerHTML = ''
      + '<div class="fxv-kaart">'
      + '<h2 id="fxvKop">Je aanvraag is nog niet verstuurd</h2>'
      + '<p>Ons formulier heeft op dit moment een storing. Stuur je aanvraag via WhatsApp, wat je hebt ingevuld staat al in het bericht.</p>'
      + '<a class="fxv-wa" target="_blank" rel="noopener">' + WA_SVG + '<span>Verstuur via WhatsApp</span></a>'
      + '<div class="fxv-rij"><a class="fxv-mail">Liever per e-mail</a><button type="button">Sluiten</button></div>'
      + '</div>';
    laag.querySelector('.fxv-wa').href = wa;
    laag.querySelector('.fxv-mail').href = mail;
    function sluit(){
      if (laag.parentNode) laag.parentNode.removeChild(laag);
      document.removeEventListener('keydown', toets);
    }
    function toets(e){ if (e.key === 'Escape') sluit(); }
    laag.querySelector('button').addEventListener('click', sluit);
    laag.addEventListener('click', function(e){ if (e.target === laag) sluit(); });
    document.addEventListener('keydown', toets);
    document.body.appendChild(laag);
    try { laag.querySelector('.fxv-wa').focus(); } catch (e) {}
  }

  var echt = window.fetch;
  window.fetch = function(input, init){
    var belofte = echt.apply(this, arguments);
    try {
      var url = typeof input === 'string' ? input : ((input && input.url) || '');
      var methode = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if (methode === 'POST' && FORMULIEREN.test(url)) {
        var body = init && init.body;
        belofte.then(function(r){ if (!r.ok) toon(body); }, function(){ toon(body); });
      }
    } catch (e) { /* het vangnet mag een formulier nooit breken */ }
    return belofte;
  };
})();
