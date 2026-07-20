/* Forgexe scan-wizard, gedeeld over alle pagina's
   Injecteert CSS + modal + functions. Belt openScan() vanaf elk button. */
(function(){
  if (document.getElementById('scanModal')) return; // al aanwezig op deze pagina

  // ────────── CSS ──────────
  var css = ''
    + '.scan-modal{position:fixed;inset:0;background:rgba(10,11,14,.55);display:none;align-items:center;justify-content:center;padding:1.4rem;z-index:200;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);overflow-y:auto}'
    + '.scan-modal.open{display:flex;animation:scanFadeIn .25s ease forwards}'
    + '@keyframes scanFadeIn{from{opacity:0}to{opacity:1}}'
    + '.scan-card{background:var(--card-bg,#fff);border-radius:var(--radius-xl,16px);max-width:620px;width:100%;padding:2.4rem 2.2rem;position:relative;box-shadow:0 24px 60px rgba(10,11,14,.28);animation:scanScaleIn .35s cubic-bezier(.16,1,.3,1) forwards;margin:auto}'
    + '@keyframes scanScaleIn{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}'
    + '.scan-close{position:absolute;top:1rem;right:1rem;width:34px;height:34px;border-radius:50%;background:#fafbfc;border:1px solid var(--line,rgba(10,11,14,.08));display:flex;align-items:center;justify-content:center;color:var(--ink-dim,#475569);font-size:1.2rem;cursor:pointer;line-height:1;font-family:var(--head,sans-serif)}'
    + '.scan-close:hover{background:var(--ink,#0a0b0e);color:#fff;border-color:var(--ink,#0a0b0e)}'
    + '.scan-eyebrow{font-family:var(--mono,monospace);font-size:.72rem;font-weight:600;color:var(--green,#34d399);letter-spacing:.06em;margin-bottom:.6rem;display:flex;align-items:center;gap:.5rem}'
    + '.scan-eyebrow::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--green,#34d399);box-shadow:0 0 0 3px rgba(52,211,153,.2)}'
    + '.scan-question{font-family:var(--head,sans-serif);font-size:1.4rem;font-weight:600;letter-spacing:-.02em;color:var(--ink,#0a0b0e);margin-bottom:1.6rem;line-height:1.15}'
    + '.scan-hint{font-family:var(--head,sans-serif);font-size:.85rem;color:var(--ink-mut,#8d9bb5);margin-bottom:1.2rem;line-height:1.5}'
    + '.scan-options{display:flex;gap:.5rem;flex-wrap:wrap}'
    + '.scan-options.col{flex-direction:column}'
    + '.scan-options.col .scan-option{width:100%}'
    + '.scan-option{padding:.85rem 1.3rem;background:#fafbfc;border:1px solid var(--line,rgba(10,11,14,.08));color:var(--ink,#0a0b0e);font-family:var(--mono,monospace);font-size:.82rem;font-weight:500;cursor:pointer;border-radius:8px;transition:all .32s cubic-bezier(.4,0,.2,1);text-align:left}'
    + '.scan-option:hover{border-color:var(--green,#34d399);background:var(--green-soft,#d1fae5);color:var(--green,#34d399);transform:translateY(-1px)}'
    + '.scan-option.selected{border-color:var(--green,#34d399);background:var(--green-soft,#d1fae5);color:var(--green,#34d399)}'
    + '.scan-back{background:none;border:none;color:var(--ink-mut,#8d9bb5);font-family:var(--mono,monospace);font-size:.74rem;cursor:pointer;padding:0;margin-bottom:1.2rem;transition:color .32s;display:inline-flex;align-items:center;gap:.35rem}'
    + '.scan-back:hover{color:var(--ink,#0a0b0e)}'
    + '.scan-form{display:flex;flex-direction:column;gap:.7rem}'
    + '.scan-form-row{display:flex;gap:.7rem}'
    + '.scan-form-row input{flex:1;padding:.85rem 1rem;font-size:.85rem;font-family:var(--mono,monospace);background:#fafbfc;border:1px solid var(--line,rgba(10,11,14,.08));color:var(--ink,#0a0b0e);outline:none;border-radius:8px;transition:all .32s}'
    + '.scan-form-row input:focus{border-color:var(--green,#34d399);background:#fff;box-shadow:0 0 0 3px rgba(52,211,153,.15)}'
    + '.scan-form-row input::placeholder{color:var(--ink-mut,#8d9bb5)}'
    + '.scan-privacy{display:flex;align-items:flex-start;gap:.6rem;font-family:var(--head,sans-serif);font-size:.8rem;color:var(--ink-dim,#475569);line-height:1.5;cursor:pointer;margin-top:.4rem}'
    + '.scan-privacy input{margin-top:.2rem;accent-color:var(--green,#34d399);flex-shrink:0}'
    + '.scan-privacy a{color:var(--green,#34d399);font-weight:600}'
    + '.scan-progress{height:3px;background:var(--line,rgba(10,11,14,.08));border-radius:2px;margin-top:1.8rem;overflow:hidden}'
    + '.scan-progress-bar{height:100%;background:var(--green,#34d399);transition:width .5s cubic-bezier(.16,1,.3,1);border-radius:2px}'
    + '.scan-step{display:none}'
    + '.scan-step.active{display:block;animation:scanStepIn .35s ease-out forwards}'
    + '@keyframes scanStepIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}'
    + '.scan-done-title{font-family:var(--head,sans-serif);font-size:1.6rem;font-weight:700;color:var(--ink,#0a0b0e);margin-bottom:.6rem;letter-spacing:-.02em;line-height:1.15}'
    + '.scan-done-desc{font-family:var(--head,sans-serif);font-size:.92rem;color:var(--ink-dim,#475569);margin-bottom:1.6rem;line-height:1.5}'
    + '.scan-done-checks{display:flex;gap:1.4rem;flex-wrap:wrap;font-family:var(--mono,monospace);font-size:.74rem;color:var(--ink-dim,#475569);padding-top:1.2rem;border-top:1px solid var(--line,rgba(10,11,14,.08))}'
    + '.scan-done-checks span strong{color:var(--green,#34d399);font-weight:700}'
    + '.scan-submit{display:inline-flex;align-items:center;justify-content:center;gap:.6rem;padding:.85rem 1.4rem;border-radius:9px;font-family:var(--head,sans-serif);font-weight:600;font-size:.88rem;border:none;cursor:pointer;transition:all .32s;background:var(--green,#34d399);color:#052e16}'
    + '.scan-submit:hover{background:var(--green-lt,#4ade80);transform:translateY(-1px);box-shadow:0 8px 24px rgba(52,211,153,.32)}'
    + '@media(max-width:600px){.scan-card{padding:1.8rem 1.4rem 1.6rem}.scan-options{flex-direction:column}.scan-form-row{flex-direction:column}.scan-done-checks{flex-direction:column;gap:.5rem}}';

  var styleEl = document.createElement('style');
  styleEl.setAttribute('data-forgexe-scan', '1');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ────────── HTML ──────────
  var arrowSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  var html = ''
    + '<div class="scan-modal" id="scanModal" role="dialog" aria-modal="true" aria-labelledby="scanTitle">'
    + '  <div class="scan-card">'
    + '    <button class="scan-close" onclick="closeScan()" aria-label="Sluiten">&times;</button>'
    + '    <div class="scan-eyebrow">C:\\forgexe\\scan &middot; gratis bedrijfsscan</div>'
    + '    <div class="scan-step active" id="scanStep1">'
    + '      <h3 class="scan-question" id="scanTitle">Hoeveel medewerkers heeft je bedrijf?</h3>'
    + '      <div class="scan-options">'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(1,\'medewerkers\',\'1-15\')">1 tot 15</button>'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(1,\'medewerkers\',\'15-50\')">15 tot 50</button>'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(1,\'medewerkers\',\'50-200\')">50 tot 200</button>'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(1,\'medewerkers\',\'200+\')">200+</button>'
    + '      </div>'
    + '    </div>'
    + '    <div class="scan-step" id="scanStep2">'
    + '      <button class="scan-back" type="button" onclick="prevScanStep(2)">&larr; Terug</button>'
    + '      <h3 class="scan-question">In welke branche ben je actief?</h3>'
    + '      <div class="scan-options col">'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(2,\'branche\',\'Maakindustrie\')">Maakindustrie</button>'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(2,\'branche\',\'Technische Groothandel\')">Technische Groothandel</button>'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(2,\'branche\',\'Zakelijke Dienstverlening\')">Zakelijke Dienstverlening</button>'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(2,\'branche\',\'Marketing &amp; Bureaus\')">Marketing &amp; Bureaus</button>'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(2,\'branche\',\'Anders\')">Anders</button>'
    + '      </div>'
    + '    </div>'
    + '    <div class="scan-step" id="scanStep3">'
    + '      <button class="scan-back" type="button" onclick="prevScanStep(3)">&larr; Terug</button>'
    + '      <h3 class="scan-question">Waar ligt je grootste uitdaging?</h3>'
    + '      <div class="scan-options col">'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(3,\'uitdaging\',\'Meer leads en klanten\')">Meer leads en klanten</button>'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(3,\'uitdaging\',\'Efficientere operatie\')">Effici&euml;ntere operatie</button>'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(3,\'uitdaging\',\'Beide\')">Beide</button>'
    + '      </div>'
    + '    </div>'
    + '    <div class="scan-step" id="scanStep4">'
    + '      <button class="scan-back" type="button" onclick="prevScanStep(4)">&larr; Terug</button>'
    + '      <h3 class="scan-question">Welke tools gebruik je nu?</h3>'
    + '      <p class="scan-hint">Selecteer alles dat van toepassing is. Klik nogmaals om te de-selecteren.</p>'
    + '      <div class="scan-options col" id="toolOptions"></div>'
    + '      <button class="scan-submit" type="button" style="margin-top:1.5rem" onclick="submitTools()">Volgende ' + arrowSvg + '</button>'
    + '    </div>'
    + '    <div class="scan-step" id="scanStep5">'
    + '      <button class="scan-back" type="button" onclick="prevScanStep(5)">&larr; Terug</button>'
    + '      <h3 class="scan-question">Hoe snel wil je resultaat zien?</h3>'
    + '      <div class="scan-options col">'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(5,\'urgentie\',\'Zo snel mogelijk\')">Zo snel mogelijk</button>'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(5,\'urgentie\',\'Binnen 3 maanden\')">Binnen 3 maanden</button>'
    + '        <button class="scan-option" type="button" onclick="nextScanStep(5,\'urgentie\',\'Ik orienteer me nog\')">Ik ori&euml;nteer me nog</button>'
    + '      </div>'
    + '    </div>'
    + '    <div class="scan-step" id="scanStep6">'
    + '      <button class="scan-back" type="button" onclick="prevScanStep(6)">&larr; Terug</button>'
    + '      <h3 class="scan-question">Waar kunnen we je rapport naartoe sturen?</h3>'
    + '      <form class="scan-form" onsubmit="submitScan(event)">'
    + '        <div class="scan-form-row">'
    + '          <input type="text" id="scanNaam" placeholder="Jouw naam" required>'
    + '          <input type="text" id="scanBedrijf" placeholder="Bedrijfsnaam" required>'
    + '        </div>'
    + '        <div class="scan-form-row">'
    + '          <input type="email" id="scanEmail" placeholder="Zakelijke e-mail" required>'
    + '          <input type="tel" id="scanTelefoon" placeholder="Telefoon (optioneel)">'
    + '        </div>'
    + '        <label class="scan-privacy"><input type="checkbox" id="scanPrivacy" required><span>Ik ga akkoord met het <a href="privacy.html" target="_blank">privacybeleid</a> en geef toestemming voor het verwerken van mijn gegevens.</span></label>'
    + '        <button type="submit" class="scan-submit" style="width:100%;margin-top:1rem">Verstuur scanverzoek ' + arrowSvg + '</button>'
    + '      </form>'
    + '    </div>'
    + '    <div class="scan-step" id="scanDone">'
    + '      <div class="scan-eyebrow" style="color:#c47f0a"><span style="background:#f5a623;box-shadow:0 0 0 3px rgba(245,166,35,.2)"></span>C:\\forgexe\\scan &middot; processing</div>'
    + '      <h3 class="scan-done-title">Bedankt! Je scanverzoek is ontvangen.</h3>'
    + '      <p class="scan-done-desc">We nemen binnen 48 uur contact op voor een kort gesprek en delen jouw drie grootste quick wins. Geen verplichtingen.</p>'
    + '      <div class="scan-done-checks">'
    + '        <span><strong>&#10003;</strong> Quick wins binnen 48 uur</span>'
    + '        <span><strong>&#10003;</strong> Reactie binnen 2 uur</span>'
    + '        <span><strong>&#10003;</strong> 100% gratis</span>'
    + '      </div>'
    + '    </div>'
    + '    <div class="scan-progress"><div class="scan-progress-bar" id="scanProgressBar" style="width:16%"></div></div>'
    + '  </div>'
    + '</div>';

  function mount(){
    if (document.getElementById('scanModal')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstChild);
    document.getElementById('scanModal').addEventListener('click', function(e){
      if (e.target === this) closeScan();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && document.getElementById('scanModal').classList.contains('open')) closeScan();
    });
    if (window.location.hash === '#scan'){
      setTimeout(openScan, 220);
    }
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // ────────── State + functions ──────────
  var scanData = {};
  var SCAN_TOTAL_STEPS = 6;
  var toolsByUitdaging = {
    'Meer leads en klanten': ['CRM (Zoho, Pipedrive, Salesforce)', 'LinkedIn', 'Google Ads', 'Meta Ads', 'E-mail marketing (Mailchimp, ActiveCampaign)', 'WordPress / Webflow', 'Geen van deze'],
    'Efficientere operatie': ['ERP (SAP, Exact, AFAS)', 'Boekhoudpakket', 'Planningssoftware', 'Google Workspace', 'Microsoft 365', 'Slack / Teams', 'Geen van deze'],
    'Beide': ['CRM (Zoho, Pipedrive, Salesforce)', 'ERP (SAP, Exact, AFAS)', 'Google Ads / Meta Ads', 'Google Workspace', 'Microsoft 365', 'Boekhoudpakket', 'E-mail marketing', 'Geen van deze']
  };

  window.openScan = function(){
    scanData = {};
    var modal = document.getElementById('scanModal');
    if (!modal){ mount(); modal = document.getElementById('scanModal'); }
    document.querySelectorAll('.scan-step').forEach(function(s){ s.classList.remove('active'); });
    document.getElementById('scanStep1').classList.add('active');
    document.getElementById('scanProgressBar').style.width = Math.round((1/SCAN_TOTAL_STEPS)*100) + '%';
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (window.fxTrack) window.fxTrack('InitiateCheckout', { content_name: 'bedrijfsscan', bron: window.location.pathname });
  };
  window.closeScan = function(){
    document.getElementById('scanModal').classList.remove('open');
    document.body.style.overflow = '';
  };
  window.nextScanStep = function(step, key, value){
    scanData[key] = value;
    var next = step + 1;
    if (step === 3) { buildToolOptions(); }
    document.getElementById('scanStep' + step).classList.remove('active');
    document.getElementById('scanStep' + next).classList.add('active');
    document.getElementById('scanProgressBar').style.width = Math.round((next/SCAN_TOTAL_STEPS)*100) + '%';
    if (window.fxTrackCustom) window.fxTrackCustom('ScanStap', { stap: next, van: step });
  };
  window.prevScanStep = function(step){
    var prev = step - 1;
    document.getElementById('scanStep' + step).classList.remove('active');
    document.getElementById('scanStep' + prev).classList.add('active');
    document.getElementById('scanProgressBar').style.width = Math.round((prev/SCAN_TOTAL_STEPS)*100) + '%';
  };
  function buildToolOptions(){
    var container = document.getElementById('toolOptions');
    var tools = toolsByUitdaging[scanData.uitdaging] || toolsByUitdaging['Beide'];
    container.innerHTML = '';
    tools.forEach(function(tool){
      var btn = document.createElement('button');
      btn.className = 'scan-option';
      btn.type = 'button';
      btn.textContent = tool;
      btn.onclick = function(){ btn.classList.toggle('selected'); };
      container.appendChild(btn);
    });
  }
  window.submitTools = function(){
    var selected = [];
    document.querySelectorAll('#toolOptions .selected').forEach(function(b){ selected.push(b.textContent); });
    scanData.tools = selected.length ? selected.join(', ') : 'Geen geselecteerd';
    document.getElementById('scanStep4').classList.remove('active');
    document.getElementById('scanStep5').classList.add('active');
    if (window.fxTrackCustom) window.fxTrackCustom('ScanStap', { stap: 5, van: 4 });
    document.getElementById('scanProgressBar').style.width = Math.round((5/SCAN_TOTAL_STEPS)*100) + '%';
  };
  window.submitScan = function(e){
    e.preventDefault();
    scanData.naam = document.getElementById('scanNaam').value;
    scanData.bedrijf = document.getElementById('scanBedrijf').value;
    scanData.email = document.getElementById('scanEmail').value;
    scanData.telefoon = document.getElementById('scanTelefoon').value;
    scanData.bron = window.location.pathname;
    document.getElementById('scanStep6').classList.remove('active');
    document.getElementById('scanDone').classList.add('active');
    document.getElementById('scanProgressBar').style.width = '100%';
    fetch('https://leadkamer.app.n8n.cloud/webhook/forgexe-scan', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(scanData)
    }).catch(function(){});
    if (window.fxTrack) window.fxTrack('Lead', { content_name: 'bedrijfsscan' });
  };
})();
