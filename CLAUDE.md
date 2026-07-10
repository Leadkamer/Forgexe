# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Forgexe Website

## Project
Forgexe is een B2B AI-automatiseringsbedrijf ("AI-medewerkers voor het Nederlandse MKB"). Dit is de marketingwebsite: een pure statische site zonder build-stap, frameworks of package manager. Live op **https://forgexe.nl** (gedeployed via Vercel, zie `vercel.json` met `cleanUrls`).

## Taal
- Alle copy op de site is in het **Nederlands** (informeel: je/jij/jouw, niet u/uw)
- Communiceer met mij in het Nederlands
- Commit messages zijn in het Nederlands en beschrijven wat + waarom

## Development
- Geen build-, lint- of test-tooling. HTML-bestanden direct bewerken.
- Lokaal bekijken: `python3 -m http.server` in de repo-root (of het bestand direct openen).
- Deploy: push naar `main` → Vercel deployt automatisch. De GitHub Pages workflow (`.github/workflows/static.yml`) triggert nog op `master` en vuurt dus niet meer; Vercel is de actieve hosting.
- Bij nieuwe publieke pagina's: `sitemap.xml` bijwerken en een `<link rel="canonical">` naar `https://forgexe.nl/...` toevoegen.

## Architectuur
- **Elke pagina is standalone HTML** met inline CSS en JS. Nav, footer en design tokens zijn per pagina gekopieerd, niet gedeeld. Een sitewide wijziging (nav-item, footer, CTA-copy) moet dus in álle ~37 pagina's — gebruik grep om alle voorkomens te vinden.
- **`scan-modal.js` is de enige gedeelde JS**: de "gratis bedrijfsscan"-wizard. Injecteert zijn eigen CSS + modal en exposeert `openScan()`; vrijwel elke pagina laadt hem en triggert via `onclick="openScan()"`. (index.html heeft daarnaast een eigen inline variant; de guard in scan-modal.js voorkomt dubbele injectie.)
- **Formulieren posten naar n8n-webhooks** op `https://leadkamer.app.n8n.cloud/webhook/`: `forgexe-contact` (contact.html), `forgexe-pilot` (pilot.html), `forgexe-scan` (scan-modal). Veldnamen zijn Nederlands (naam, bedrijf, email, telefoon, onderwerp, bericht) + `bron` + timestamp. Bij webhook-failure valt de UI terug op een mailto-link.
- **`n8n-workflows/`** — geëxporteerde n8n workflow-JSONs die bij die webhooks en klantprojecten horen (contact-lead, pilot-waitlist, scan-lead, smartesg-content-machine). Bronbestanden, geen onderdeel van de site.
- **`skills/`** — interne blueprints voor pagina-opbouw (b2b-homepage-blueprint, b2b-branch-pages, frontend-design). Raadpleeg deze bij het bouwen van nieuwe landing- of branchepagina's.

### Pagina-types
- `index.html` — homepage (de live versie; `index-v1/v2/v3/v4-*.html` zijn design-archief/backups, niet gelinkt — niet aanpassen bij sitewide wijzigingen)
- `expertises.html` + dienstpagina's: `ai-*.html`, `dashboarding.html`, `planning-optimalisatie.html`
- `branches.html` + `branche-*.html` — branche-landingspagina's (volg het 8-secties blueprint in `skills/`)
- `cases.html` + `case-*.html` (met `case-*-preview.png` OG-afbeeldingen)
- `blog.html` + `blog-*.html`
- `contact.html`, `pricing.html`, `pilot.html`, `over-ons.html`
- Juridisch: `privacy.html`, `voorwaarden.html`, `disclaimer.html`; verder `404.html` (Vercel routet onbekende URLs hierheen)
- `forgexe-brandkit.html`, `forgexe-logos.html`, `design-preview.html`, `email-handtekening.html` e.d. zijn interne/brand-hulppagina's

## Design tokens
- Fonts: `JetBrains Mono` (body/UI, via `--mono`) + `Outfit` (headings, via `--head`), geladen van Google Fonts
- Primaire kleur (groen): `#34d399` (`--green`), light: `#4ade80` (`--green-lt`); accenten: neon cyan `#00f0ff`, amber `#f5a623`
- **Licht card-design is de huidige stijl**: `--page-bg:#f4f6f8` met witte cards (`--card-bg:#ffffff`), inkt-kleuren `--ink`/`--ink-dim`/`--ink-mut`. De oude dark mode + scanline/terminal-esthetiek is vervangen bij de v4-redesign — geen `body.light` toggle meer.
- CSS custom properties op `:root` per pagina; radii via `--radius-*`, transitie via `--tr`
- Layout: `.shell` wrapper (max-width 1480px), sticky nav, pill-buttons (`.btn-pill`)

## Conventies
- Gebruik `function()` syntax, geen arrow functions (compatibility)
- Scroll-animaties via IntersectionObserver
- SVG illustraties inline in HTML, geen externe afbeeldingen waar mogelijk
- E-mail: `info@forgexe.nl` (gewoon uitgeschreven, incl. mailto-links)
- Geen verwijzingen naar "Leadkamer" in zichtbare content (de n8n webhook-URL in JS is oké)
- Primaire CTA sitewide is de gratis bedrijfsscan: "kort gesprek + drie grootste quick wins binnen 48 uur"

## Git
- Repo: https://github.com/Leadkamer/Forgexe
- Default branch: `main` (push naar `main` = live via Vercel)
