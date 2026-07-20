/* Forgexe tracking met consent
   - Meta-pixel wordt pas geladen na expliciete toestemming (AVG)
   - Keuze wordt 6 maanden onthouden in localStorage
   - window.fxTrack('Lead') stuurt een conversie-event als er toestemming is
*/
(function(){
  var PIXEL_ID = '3371968756387934';
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

  /* Conversie-events: veilig aanroepbaar, doet niets zonder toestemming */
  window.fxTrack = function(event, data){
    if (lees() !== 'ja' || !window.fbq) return;
    try { window.fbq('track', event, data || {}); } catch (e) {}
  };

  function verwijderBanner(){
    var el = document.getElementById('fxConsent');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function kies(keuze){
    bewaar(keuze);
    verwijderBanner();
    if (keuze === 'ja') laadPixel();
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
      '@media(max-width:640px){#fxConsent{left:10px;right:10px;bottom:10px;padding:1rem;gap:.9rem}#fxConsent .fx-btns{width:100%}#fxConsent button{flex:1}}' +
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
    if (keuze === 'ja') { laadPixel(); return; }
    if (keuze === 'nee') return;
    toonBanner();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
