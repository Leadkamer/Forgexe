# Forgexe Website

## Project
Forgexe is een B2B AI-automatiseringsbedrijf. De website is een statische site gehost op GitHub Pages: https://leadkamer.github.io/forgexe-website/

## Taal
- Alle copy op de site is in het **Nederlands** (informeel: je/jij/jouw, niet u/uw)
- Communiceer met mij in het Nederlands

## Design tokens
- Fonts: `JetBrains Mono` (mono/UI) + `Poppins` (headings)
- Primaire kleur (groen): `#34d399`, light: `#4ade80`, deep: `#059669`
- Neon cyan accent: `#00f0ff`
- Dark mode is standaard, light mode via `body.light` class
- CSS custom properties op `:root` en `body` / `body.light`
- Scanline overlay + neon grid achtergrond (terminal/arcade esthetiek)

## Bestandsstructuur
- `index.html` — homepage
- `over-ons.html` — over ons pagina
- `branches.html` — branche-overzicht
- `branche-*.html` — individuele branche-pagina's (finance, maakindustrie, etc.)
- `stackforge.html` — StackForge pagina
- `forgexe-mark-green.svg` — primair logo (groen)
- `forgexe-lockup-*.svg/png` — logo met tekst
- `logo-*.png/svg/jpg/webp` — klantlogo's

## Conventies
- Alle HTML is standalone (inline CSS + JS, geen externe frameworks)
- SVG illustraties inline in HTML, geen externe afbeeldingen waar mogelijk
- Dark/light toggle via `body.light` class (geen data-theme)
- Scroll-animaties via IntersectionObserver
- Gebruik `function()` syntax, geen arrow functions (compatibility)
- Email adressen schrijven als "naam at domein.nl" (Cloudflare email protection)
- Geen verwijzingen naar "Leadkamer" in zichtbare content

## Git
- Repo: https://github.com/Leadkamer/forgexe-website
- Branch: master
- GitHub Pages actief vanuit /
