with open('index-v4-redesign.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '<section id="expertises" class="reveal-scale">'
end_marker = '</section>\n<div class="neon-line-amber">'

start = content.find(start_marker)
end = content.find(end_marker, start)

if start < 0 or end < 0:
    print(f"Not found: start={start}, end={end}")
    exit()

new_section = r'''<section id="expertises" class="reveal-scale">
  <div class="section-label">C:\expertises&gt;<span class="section-label-cursor"></span></div>
  <h2 class="section-title">Twee pijlers.<br>Zes expertises.</h2>
  <p class="section-desc">Wij bouwen twee soorten AI-medewerkers. Samen vormen ze een machine die jouw bedrijf sterker maakt.</p>

  <!-- Forge.Growth header -->
  <div style="display:flex;align-items:center;gap:1rem;margin-bottom:2rem">
    <div style="width:42px;height:42px;border-radius:10px;background:rgba(52,211,153,.1);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
    <div><div style="font-family:var(--head);font-size:1.3rem;font-weight:700;background:linear-gradient(135deg,var(--green),var(--green-lt));-webkit-background-clip:text;-webkit-text-fill-color:transparent">Forge.Growth</div><div style="font-size:.78rem;color:var(--dim)">AI-medewerkers die klanten binnenhalen</div></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-bottom:4rem">
    <a href="ai-outreach.html" class="exp-card exp-green" style="text-decoration:none;color:inherit;display:block">
      <div class="exp-icon" style="background:rgba(52,211,153,.1)"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
      <div class="exp-title">AI Outreach &amp; Leadgen</div>
      <div class="exp-desc">Je AI-outreach specialist vindt prospects, benadert ze en kwalificeert. 24/7.</div>
      <span class="exp-link" style="color:var(--green)">Bekijk details &#8594;</span>
    </a>
    <a href="ai-blogger.html" class="exp-card exp-blue" style="text-decoration:none;color:inherit;display:block">
      <div class="exp-icon" style="background:rgba(59,130,246,.1)"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></div>
      <div class="exp-title">AI Blogger &amp; Content</div>
      <div class="exp-desc">SEO-content die zichzelf schrijft. 20+ artikelen per maand, automatisch.</div>
      <span class="exp-link" style="color:#3b82f6">Bekijk details &#8594;</span>
    </a>
    <a href="ai-training.html" class="exp-card exp-violet" style="text-decoration:none;color:inherit;display:block">
      <div class="exp-icon" style="background:rgba(139,92,246,.1)"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round"><path d="M12 2a7 7 0 0 1 4 12.7V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.3A7 7 0 0 1 12 2z"/><line x1="9" y1="21" x2="15" y2="21"/></svg></div>
      <div class="exp-title">AI Training &amp; Workshops</div>
      <div class="exp-desc">Maak AI een kracht binnen jouw team. Hands-on en op maat.</div>
      <span class="exp-link" style="color:#8b5cf6">Bekijk details &#8594;</span>
    </a>
  </div>

  <!-- Forge.Ops header -->
  <div style="display:flex;align-items:center;gap:1rem;margin-bottom:2rem">
    <div style="width:42px;height:42px;border-radius:10px;background:rgba(245,166,35,.1);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f5a623" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div>
    <div><div style="font-family:var(--head);font-size:1.3rem;font-weight:700;background:linear-gradient(135deg,var(--amber),var(--amber-lt));-webkit-background-clip:text;-webkit-text-fill-color:transparent">Forge.Ops</div><div style="font-size:.78rem;color:var(--dim)">AI-medewerkers die je operatie stroomlijnen</div></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem">
    <a href="ai-rapportage.html" class="exp-card exp-amber" style="text-decoration:none;color:inherit;display:block">
      <div class="exp-icon" style="background:rgba(245,166,35,.1)"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f5a623" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg></div>
      <div class="exp-title">AI Rapportage</div>
      <div class="exp-desc">Automatische rapporten uit al je systemen. Op tijd, zonder fouten.</div>
      <span class="exp-link" style="color:var(--amber)">Bekijk details &#8594;</span>
    </a>
    <a href="planning-optimalisatie.html" class="exp-card exp-rose" style="text-decoration:none;color:inherit;display:block">
      <div class="exp-icon" style="background:rgba(244,63,94,.1)"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f43f5e" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
      <div class="exp-title">Planning Optimalisatie</div>
      <div class="exp-desc">AI-gestuurde planning voor de maakindustrie. -30% stilstand.</div>
      <span class="exp-link" style="color:#f43f5e">Bekijk details &#8594;</span>
    </a>
    <a href="dashboarding.html" class="exp-card exp-cyan" style="text-decoration:none;color:inherit;display:block">
      <div class="exp-icon" style="background:rgba(6,182,212,.1)"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
      <div class="exp-title">Dashboarding &amp; AI Platform</div>
      <div class="exp-desc">E&#233;n platform dat alles verbindt. Real-time inzicht in alle data.</div>
      <span class="exp-link" style="color:#06b6d4">Bekijk details &#8594;</span>
    </a>
  </div>

  <div style="text-align:center;margin-top:3.5rem"><a href="expertises.html" class="btn-ghost">Bekijk alle expertises &#8594;</a></div>
'''

content = content[:start] + new_section + '\n</section>\n<div class="neon-line-amber">' + content[end + len(end_marker):]

# Add CSS for the new expertise cards
exp_css = """
.exp-card{background:rgba(0,0,0,.02);border:1px dashed rgba(0,0,0,.08);border-radius:12px;padding:2rem;transition:all .3s}
.exp-card:hover{transform:translateY(-3px)}
.exp-green:hover{background:rgba(52,211,153,.06);box-shadow:0 8px 32px rgba(52,211,153,.1);border-color:rgba(52,211,153,.2)}
.exp-blue:hover{background:rgba(59,130,246,.06);box-shadow:0 8px 32px rgba(59,130,246,.1);border-color:rgba(59,130,246,.2)}
.exp-violet:hover{background:rgba(139,92,246,.06);box-shadow:0 8px 32px rgba(139,92,246,.1);border-color:rgba(139,92,246,.2)}
.exp-amber:hover{background:rgba(245,166,35,.06);box-shadow:0 8px 32px rgba(245,166,35,.1);border-color:rgba(245,166,35,.2)}
.exp-rose:hover{background:rgba(244,63,94,.06);box-shadow:0 8px 32px rgba(244,63,94,.1);border-color:rgba(244,63,94,.2)}
.exp-cyan:hover{background:rgba(6,182,212,.06);box-shadow:0 8px 32px rgba(6,182,212,.1);border-color:rgba(6,182,212,.2)}
body:not(.light) .exp-card{background:rgba(255,255,255,.02);border-color:rgba(255,255,255,.06)}
body:not(.light) .exp-green:hover{background:rgba(52,211,153,.06)}
body:not(.light) .exp-blue:hover{background:rgba(59,130,246,.06)}
body:not(.light) .exp-violet:hover{background:rgba(139,92,246,.06)}
body:not(.light) .exp-amber:hover{background:rgba(245,166,35,.06)}
body:not(.light) .exp-rose:hover{background:rgba(244,63,94,.06)}
body:not(.light) .exp-cyan:hover{background:rgba(6,182,212,.06)}
.exp-icon{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:1rem}
.exp-title{font-family:var(--head);font-size:1rem;font-weight:600;margin-bottom:.5rem}
.exp-desc{font-size:.78rem;color:var(--dim);line-height:1.7;margin-bottom:1rem}
.exp-link{font-size:.72rem;font-family:var(--mono)}
@media(max-width:768px){#expertises div[style*='grid-template-columns:repeat(3']{grid-template-columns:1fr !important}}
"""

content = content.replace('.scan-wizard{', exp_css + '\n.scan-wizard{')

with open('index-v4-redesign.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
