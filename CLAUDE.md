# Forgexe Website

## Project
Forgexe is een B2B AI-automatiseringsbedrijf voor het Nederlandse MKB. De website is een statische site, gehost op GitHub Pages vanuit deze repo (`Leadkamer/Forgexe`). Productiedomein: `https://forgexe.nl/`.

## Taal & toon
- Alle copy op de site is in het **Nederlands** (informeel: je/jij/jouw, niet u/uw).
- Communiceer met mij ook in het Nederlands.
- Geen verwijzingen naar "Leadkamer" in zichtbare content.
- E-mailadressen schrijven als `naam at domein.nl` (Cloudflare email protection / anti-scrape).

## Tech stack
- **Pure statische site**: standalone HTML-bestanden met inline CSS en inline JS. Geen build-step, geen bundlers, geen frameworks (geen React/Vue/Tailwind/etc.).
- Externe assets beperkt tot Google Fonts en de ElevenLabs convai widget (`<elevenlabs-convai>`).
- SVG-illustraties bij voorkeur **inline** in de HTML; externe afbeeldingen alleen voor klantlogo's, foto's en raster-iconen.
- JS gebruikt `function()` syntax (geen arrow functions) voor brede compatibility.
- Scroll-animaties via `IntersectionObserver` op elementen met class `.reveal` / `.reveal-left` / `.reveal-scale`.

## Design tokens
- Fonts: `JetBrains Mono` (mono/UI/body) + `Outfit` (headings).
- Primaire kleur (groen): `--green: #34d399`, `--green-lt: #4ade80`, `--green-deep: #059669`.
- Accent: neon cyan `--neon-cyan: #00f0ff`; secundair amber `--amber: #f5a623`.
- Dark mode is **standaard**; light mode via `body.light` class (geen `data-theme` attribuut).
- CSS custom properties staan op `:root` (kleurconstanten) en op `body` / `body.light` (themed tokens als `--bg`, `--bg-el`, `--txt`, `--dim`, `--mut`, `--brd`, `--card-hover`, `--nav-bg`, `--btn-txt`, etc.).
- Sfeer: terminal/arcade-esthetiek met scanline-overlay (`body::after`), grain (`body::before`), neon-grid achtergrond (`.neon-grid`), CRT-vignette en knipperende cursor accenten.

## Bestandsstructuur

### Kernpagina's
- `index.html` — homepage (groot, ~1400 regels, bevat hero, challenges, scan-wizard, FAQ, etc.).
- `over-ons.html`, `contact.html`, `cases.html`, `blog.html`, `pilot.html`, `pricing.html`, `expertises.html`, `branches.html`, `stackforge.html`.
- `404.html` — custom 404.

### Diensten / expertises (AI-pagina's)
- `ai-blogger.html`, `ai-outreach.html`, `ai-rapportage.html`, `ai-ads.html`, `ai-training.html`, `ai-act.html` (AI Act / compliance), `dashboarding.html`, `planning-optimalisatie.html`.

### Branche-pagina's (`branche-*.html`)
- `branche-finance.html`, `branche-maakindustrie.html`, `branche-vastgoed.html`, `branche-e-commerce.html`, `branche-juridisch.html`, `branche-it-software.html`, `branche-marketing-bureaus.html`.

### Blogartikelen (`blog-*.html`)
- `blog-ai-agents-salesteam.html`, `blog-5-processen-automatiseren.html`, `blog-linkedin-outreach-ai.html`, `blog-roi-procesautomatisering.html`, `blog-crm-integraties.html`, `blog-ai-strategie-bestaande-tools.html`.
- `blog-image-prompts.md` — prompts voor AI-gegenereerde blogheaders.

### Juridisch
- `privacy.html`, `voorwaarden.html`, `disclaimer.html`.

### Branding & assets
- `forgexe-mark-green.svg` (+ 64/128/256/512 PNG-varianten) — primair logo (groen).
- `forgexe-mark-dark.svg`, `forgexe-mark-darkgreen.svg` — varianten.
- `forgexe-lockup-{green,dark,light}.svg/png` — logo met tekst (lockup).
- `forgexe-logo-print.svg`, `favicon.png`.
- `forgexe-brandkit.html`, `forgexe-logos.html`, `logo-varianten.html` — interne brandkit-/preview-pagina's.
- `linkedin-banner.svg`, `linkedin-company-banner.svg`, `visitekaartje-{voor,achter}kant.svg`, `email-handtekening.html`.
- Klantlogo's: `logo-dnatalent.png`, `logo-fesma.png`, `logo-fietsencatalogus.jpg`, `logo-influid.svg`, `logo-mploy.svg`, `logo-realcob.png`, `logo-sevenwave.png`, `logo-smartesg.webp`, `logo-technetium.svg`, `logo-wijnzinnig.webp`.
- Team: `team-samuel.jpg.jpg` (let op dubbele extensie).

### Backups & previews — niet linken vanuit live navigatie
- `index-v1-backup.html`, `index-v2-backup.html`, `index-v2.html`, `index-v3-backup.html`, `index-v3-amber.html`, `index-v4-redesign.html`, `design-preview.html`, `forgexe-logo-refined (1).html`, `Forgexe.htm`.
- Worden bewust bewaard als referentie. Niet wijzigen tenzij expliciet gevraagd.

### Sub-mappen
- `n8n-workflows/` — geëxporteerde n8n workflow-definities die de formulieren op de site afhandelen:
  - `contact-lead-workflow.json` — contactformulier op `contact.html`.
  - `pilot-waitlist-workflow.json` — pilot-aanmeldingen op `pilot.html`.
  - `scan-lead-workflow.json` — AI-scan wizard op de homepage.
- `skills/` — Claude/agent skill-bestanden en blueprints voor het maken van branche-pagina's en homepages (`b2b-branch-pages-SKILL.md`, `b2b-homepage-blueprint-SKILL.md`, `Frontend Skill.md`). Raadpleeg deze bij het opzetten van een nieuwe branche- of dienstenpagina.
- `.github/workflows/static.yml` — GitHub Pages deployment workflow (zie hieronder).
- `.claude/settings.json` — sessie-instellingen (toegestane MCP-tools, web fetch domains).

### Overig
- `eva-chatbot-prompt.md` — system prompt voor de ElevenLabs voice agent (Eva) die op de site embed staat.
- `sitemap.xml` — handmatig bijgehouden sitemap (toevoegen bij elke nieuwe publieke pagina).
- `robots.txt` — verwijst naar `https://forgexe.nl/sitemap.xml`.
- `vercel.json` — `cleanUrls: true` + 404 fallback (voor het geval er ooit naar Vercel wordt gemirrord).
- `README.md` — minimaal.

## Conventies bij het bewerken van pagina's
- **Nieuwe pagina maken**: dupliceer een bestaande pagina van hetzelfde type (branche/dienst/blog) en pas inhoud aan. Zorg dat de `<head>` (title, description, og-tags, canonical) klopt en dat dezelfde inline `:root` / `body.light` tokens en `body::before/after` overlays aanwezig zijn.
- **Navigatie & footer** moeten **op alle pagina's identiek** blijven. Dit geldt ook voor de dropdown-menu's voor "Expertises" en "Branches" en de footerkolom "Bedrijf". Bij een wijziging in de nav of footer: doorvoeren in álle 32+ pagina's.
- **Cookie banner** (`#cookieBanner` + `setCookieConsent` JS) staat op alle publieke pagina's; behoud de exacte structuur en tekst.
- **ElevenLabs convai widget** (`<elevenlabs-convai agent-id="...">` + script) hoort vlak voor `</body>` op alle publieke pagina's, samen met de `elevenlabs-convai` style-overrides.
- **Sitemap**: nieuwe publieke pagina's toevoegen aan `sitemap.xml` met passende `priority` en `changefreq`.
- **Geen externe libraries toevoegen** zonder overleg. Geen Tailwind, geen jQuery, geen build step.
- **CSS minimalisatie**: bestaande pagina's gebruiken extreem dichte/single-line CSS. Houd nieuwe styling consistent met die stijl, of plaats nieuwe regels duidelijk gegroepeerd onderaan de bestaande `<style>` block.

## Git & deployment
- **Repo**: `https://github.com/Leadkamer/Forgexe` (oudere CLAUDE-versies noemden `forgexe-website`; de actuele remote is `Leadkamer/Forgexe`).
- **Productiebranch**: `master`. De GitHub Action `.github/workflows/static.yml` deployt élke push op `master` automatisch naar GitHub Pages (volledige repo-root als artifact).
- **Werk dus voorzichtig op `master`**: elke commit gaat live zodra de Pages-build draait. Voor grotere wijzigingen: gebruik een feature-branch en merge bewust.
- **Huidige werkbranch in deze sessie**: `claude/add-claude-documentation-mVnmO`. Push wijzigingen standaard naar deze branch, niet rechtstreeks naar `master`, tenzij ik dat expliciet vraag.
- Maak geen PR aan tenzij ik er expliciet om vraag.

## Commit-stijl
- Korte, beschrijvende Nederlandse commit messages (zie `git log` voor voorbeelden, bv. "Dropdown navigatie uitgerold naar alle 32 paginas", "Fix footer Bedrijf kolom: consistent op alle paginas").
- Eén logische wijziging per commit waar mogelijk.
