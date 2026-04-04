import re

with open('index-v4-redesign.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the wizard steps section
# Match from "<!-- Step 1 -->" to the closing of scanDone div
start = content.find('<!-- Step 1 -->')
end = content.find('<!-- Progress bar -->')

if start > 0 and end > 0:
    new_steps = """    <!-- Step 1: Bedrijfsgrootte -->
    <div class="scan-step" id="scanStep1">
      <h3 class="scan-question">Hoeveel medewerkers heeft je bedrijf?</h3>
      <div class="scan-options">
        <button class="scan-option" onclick="nextScanStep(1, 'medewerkers', '1-15')">1 - 15</button>
        <button class="scan-option" onclick="nextScanStep(1, 'medewerkers', '15-50')">15 - 50</button>
        <button class="scan-option" onclick="nextScanStep(1, 'medewerkers', '50-200')">50 - 200</button>
        <button class="scan-option" onclick="nextScanStep(1, 'medewerkers', '200+')">200+</button>
      </div>
    </div>

    <!-- Step 2: Branche -->
    <div class="scan-step" id="scanStep2" style="display:none">
      <h3 class="scan-question">In welke branche ben je actief?</h3>
      <div class="scan-options">
        <button class="scan-option" onclick="nextScanStep(2, 'branche', 'Maakindustrie')">Maakindustrie</button>
        <button class="scan-option" onclick="nextScanStep(2, 'branche', 'Finance')">Finance</button>
        <button class="scan-option" onclick="nextScanStep(2, 'branche', 'IT &amp; Software')">IT &amp; Software</button>
        <button class="scan-option" onclick="nextScanStep(2, 'branche', 'E-commerce')">E-commerce</button>
        <button class="scan-option" onclick="nextScanStep(2, 'branche', 'Vastgoed')">Vastgoed</button>
        <button class="scan-option" onclick="nextScanStep(2, 'branche', 'Juridisch')">Juridisch</button>
        <button class="scan-option" onclick="nextScanStep(2, 'branche', 'Marketing')">Marketing</button>
        <button class="scan-option" onclick="nextScanStep(2, 'branche', 'Anders')">Anders</button>
      </div>
    </div>

    <!-- Step 3: Uitdaging -->
    <div class="scan-step" id="scanStep3" style="display:none">
      <h3 class="scan-question">Waar ligt je grootste uitdaging?</h3>
      <div class="scan-options">
        <button class="scan-option" onclick="nextScanStep(3, 'uitdaging', 'Meer leads en klanten')">Meer leads en klanten</button>
        <button class="scan-option" onclick="nextScanStep(3, 'uitdaging', 'Efficientere operatie')">Effici&#235;ntere operatie</button>
        <button class="scan-option" onclick="nextScanStep(3, 'uitdaging', 'Beide')">Beide</button>
      </div>
    </div>

    <!-- Step 4: Tools (multi-select) -->
    <div class="scan-step" id="scanStep4" style="display:none">
      <h3 class="scan-question">Welke tools gebruik je nu?</h3>
      <p style="font-size:.78rem;color:var(--dim);margin-bottom:1.25rem">Selecteer alles dat van toepassing is.</p>
      <div class="scan-options" id="toolOptions">
        <button class="scan-option scan-multi" onclick="toggleTool(this)">CRM (Zoho, Pipedrive, Salesforce)</button>
        <button class="scan-option scan-multi" onclick="toggleTool(this)">ERP (SAP, Exact, AFAS)</button>
        <button class="scan-option scan-multi" onclick="toggleTool(this)">Google Workspace</button>
        <button class="scan-option scan-multi" onclick="toggleTool(this)">Microsoft 365</button>
        <button class="scan-option scan-multi" onclick="toggleTool(this)">Boekhoudpakket</button>
        <button class="scan-option scan-multi" onclick="toggleTool(this)">Geen van deze</button>
      </div>
      <button class="btn-primary" style="margin-top:1.5rem" onclick="submitTools()">Volgende <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
    </div>

    <!-- Step 5: Urgentie -->
    <div class="scan-step" id="scanStep5" style="display:none">
      <h3 class="scan-question">Hoe snel wil je resultaat zien?</h3>
      <div class="scan-options">
        <button class="scan-option" onclick="nextScanStep(5, 'urgentie', 'Zo snel mogelijk')">Zo snel mogelijk</button>
        <button class="scan-option" onclick="nextScanStep(5, 'urgentie', 'Binnen 3 maanden')">Binnen 3 maanden</button>
        <button class="scan-option" onclick="nextScanStep(5, 'urgentie', 'Ik orienteer me nog')">Ik ori&#235;nteer me nog</button>
      </div>
    </div>

    <!-- Step 6: Contactgegevens -->
    <div class="scan-step" id="scanStep6" style="display:none">
      <h3 class="scan-question">Waar kunnen we je rapport naartoe sturen?</h3>
      <form class="scan-form" onsubmit="submitScan(event)">
        <div class="scan-form-row">
          <input type="text" id="scanNaam" placeholder="Naam" required>
          <input type="text" id="scanBedrijf" placeholder="Bedrijfsnaam" required>
        </div>
        <div class="scan-form-row">
          <input type="email" id="scanEmail" placeholder="Zakelijke e-mail" required>
          <input type="tel" id="scanTelefoon" placeholder="Telefoon (optioneel)">
        </div>
        <button type="submit" class="btn-primary" style="width:100%;justify-content:center;margin-top:1rem">Verstuur scanverzoek <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
      </form>
    </div>

    <!-- Confirmation -->
    <div class="scan-step" id="scanDone" style="display:none">
      <div class="scan-done-terminal">C:\\forgexe\\scan&gt; --status processing...<span class="cursor"></span></div>
      <h3 class="scan-done-title">Bedankt! Je scanverzoek is ontvangen.</h3>
      <p class="scan-done-desc">Je ontvangt je rapport binnen 48 uur. We nemen zo snel mogelijk contact op.</p>
      <div class="scan-done-checks">
        <span>&#10003; Rapport binnen 48 uur</span>
        <span>&#10003; Reactie binnen 2 uur</span>
        <span>&#10003; 100% gratis</span>
      </div>
    </div>

    """

    content = content[:start] + new_steps + content[end:]
    print("Steps replaced")
else:
    print(f"Not found: start={start}, end={end}")

# Update progress bar initial width
content = content.replace('style="width:33%"', 'style="width:16%"')

# Add multi-select CSS
content = content.replace(
    '.scan-wizard.open{display:block;animation:fu .6s ease forwards}',
    '.scan-multi.selected{border-color:var(--green);color:var(--green);background:rgba(52,211,153,.08)}\n.scan-wizard.open{display:block;animation:fu .6s ease forwards}'
)

# Replace JS functions
old_js = "var scanData = {};"
new_js = "var scanData = {};\nvar totalSteps = 6;"
content = content.replace(old_js, new_js, 1)

# Update nextScanStep progress calculation
content = content.replace(
    "document.getElementById('scanProgressBar').style.width = ((step + 1) * 33) + '%';",
    "document.getElementById('scanProgressBar').style.width = Math.round(((step + 1) / totalSteps) * 100) + '%';"
)

# Add toggleTool and submitTools functions before submitScan
content = content.replace(
    "function submitScan(e) {",
    """function toggleTool(btn) {
  btn.classList.toggle('selected');
}
function submitTools() {
  var selected = [];
  document.querySelectorAll('#toolOptions .selected').forEach(function(b) {
    selected.push(b.textContent);
  });
  scanData.tools = selected.length > 0 ? selected.join(', ') : 'Geen geselecteerd';
  document.getElementById('scanStep4').style.display = 'none';
  document.getElementById('scanStep5').style.display = 'block';
  document.getElementById('scanProgressBar').style.width = Math.round((5 / totalSteps) * 100) + '%';
}
function submitScan(e) {"""
)

# Update submitScan to use scanStep6
content = content.replace(
    "document.getElementById('scanStep3').style.display = 'none';",
    "document.getElementById('scanStep6').style.display = 'none';"
)

with open('index-v4-redesign.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("All done")
