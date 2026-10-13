/* Forgexe WhatsApp-knop
   Zwevende knop rechtsonder die een WhatsApp-gesprek met Forgexe opent.
   Vervangt de Casper-chat: berichten komen nu direct bij Sedat binnen.
   De bestandsnaam blijft chat-widget.js, zodat alle pagina's hem zonder
   aanpassing blijven laden.
*/
(function(){
  if (document.getElementById('fxWhatsapp')) return;

  var NUMMER = '31850805439';

  /* Openingszin met de pagina erin, zodat je ziet waar iemand vandaan komt. */
  function openingszin(){
    var titel = (document.title || '').split('|')[0].split(' — ')[0].trim();
    if (!titel || location.pathname === '/' ) return 'Hoi Forgexe, ik heb een vraag: ';
    return 'Hoi Forgexe, ik kom via jullie pagina "' + titel + '" en heb een vraag: ';
  }

  function link(){
    return 'https://wa.me/' + NUMMER + '?text=' + encodeURIComponent(openingszin());
  }

  var css = ''
    + '#fxWhatsapp{position:fixed;right:20px;bottom:calc(20px + var(--fx-banner,0px));z-index:190;display:flex;align-items:center;gap:.55rem;background:var(--green,#34d399);color:#052e16;text-decoration:none;border-radius:999px;padding:.85rem 1.25rem;font-family:var(--head,system-ui,sans-serif);font-size:.9rem;font-weight:600;box-shadow:0 10px 30px rgba(10,11,14,.18);transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s,bottom .3s cubic-bezier(.16,1,.3,1)}'
    + '#fxWhatsapp:hover{transform:translateY(-2px);box-shadow:0 16px 38px rgba(10,11,14,.24)}'
    + '#fxWhatsapp:active{transform:translateY(0)}'
    + '#fxWhatsapp:focus-visible{outline:2px solid #0a0b0e;outline-offset:3px}'
    + '#fxWhatsapp svg{width:19px;height:19px;flex-shrink:0}'
    + '@media(max-width:480px){#fxWhatsapp{right:14px;bottom:calc(14px + var(--fx-banner,0px));padding:.8rem 1.05rem;font-size:.85rem}}'
    + '@media (prefers-reduced-motion:reduce){#fxWhatsapp{transition:none}}'
    + '@media print{#fxWhatsapp{display:none}}';

  var stijl = document.createElement('style');
  stijl.textContent = css;
  document.head.appendChild(stijl);

  var knop = document.createElement('a');
  knop.id = 'fxWhatsapp';
  knop.href = link();
  knop.target = '_blank';
  knop.rel = 'noopener';
  knop.setAttribute('aria-label', 'Stuur Forgexe een WhatsApp-bericht');
  knop.innerHTML = ''
    + '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.2 5.07 4.48.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.46 9.48-9.46a9.4 9.4 0 0 1 6.7 2.78 9.4 9.4 0 0 1 2.77 6.7c0 5.22-4.25 9.46-9.47 9.46zm8.06-17.52A11.32 11.32 0 0 0 12.04.65C5.76.65.65 5.75.65 12.03c0 2 .52 3.96 1.52 5.69L.55 23.6l6.02-1.58a11.38 11.38 0 0 0 5.46 1.39h.01c6.28 0 11.39-5.1 11.39-11.38 0-3.04-1.18-5.9-3.33-8.05z"/></svg>'
    + '<span>WhatsApp ons</span>';

  /* Meta-pixel bestaat alleen na cookie-akkoord; zonder akkoord gebeurt er niets. */
  knop.addEventListener('click', function(){
    knop.href = link();
    try { if (window.fbq) window.fbq('track', 'Contact', { content_name: 'whatsapp-knop' }); } catch (e) {}
  });

  document.body.appendChild(knop);

  /* De cookiebanner zit ook onderaan. Zolang die er staat schuift de knop
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

  /* Oude chat-sessies uit de browser opruimen. */
  try {
    ['fx-chat-sessie', 'fx-chat-log', 'fx-chat-open', 'fx-chat-scan'].forEach(function(k){
      sessionStorage.removeItem(k); localStorage.removeItem(k);
    });
  } catch (e) {}
})();
