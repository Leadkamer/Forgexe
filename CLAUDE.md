# Forgexe Website

## Project
Forgexe is een B2B AI-automatiseringsbedrijf. De website is een statische site gehost op **Vercel**: https://www.forgexe.nl (apex forgexe.nl redirect naar www).

## Taal
- Alle copy op de site is in het **Nederlands** (informeel: je/jij/jouw, niet u/uw)
- Communiceer met mij in het Nederlands

## Design tokens
- Fonts: `JetBrains Mono` (mono/UI) + `Outfit` (headings)
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

## Samenwerkingen
- Elke samenwerking krijgt een eigen map in de Forgexe-map: `<partner> x forgexe/` (bijv. `fesma x forgexe/`, `peters x forgexe/`)
- **Al het materiaal voor die samenwerking staat daarin**: advertenties, carrousels, PDF-exports, documenten. Niet in de algemene `ads/`-map
- Vraagt Sedat om ads of een carrousel voor een samenwerking, dan komen die dus in de bijbehorende projectmap
- **Uitzondering: live pagina's blijven in de repo-root**, want dat zijn URL's (bijv. `peters-forgexe-juridische-ai.html` → /peters-forgexe-juridische-ai). Alleen het marketingmateriaal verhuist
- Samenwerkingsmappen staan in .gitignore: de hele repo-root gaat live, en dit is intern materiaal
- Beelden in die mappen verwijzen met `../` naar de gedeelde bestanden in de root (logo's, teamfoto's)
- Binnen zo'n projectmap: eerst een map per campagne of aanbod, daarbinnen op soort. Bijvoorbeeld `fesma x forgexe/lunchsessie-30-oktober/{carrousel,advertenties}/`. Losse bestanden op één hoop worden onvindbaar
- Elk niveau dieper betekent één `../` extra in de beeldpaden — nalopen na het verplaatsen

## Conventies
- Alle HTML is standalone (inline CSS + JS, geen externe frameworks)
- SVG illustraties inline in HTML, geen externe afbeeldingen waar mogelijk
- Dark/light toggle via `body.light` class (geen data-theme)
- Scroll-animaties via IntersectionObserver
- Gebruik `function()` syntax, geen arrow functions (compatibility)
- Email adressen schrijven als "naam at domein.nl" (Cloudflare email protection)
- Geen verwijzingen naar "Leadkamer" in zichtbare content

## Hosting & URL's
- Vercel deployt automatisch bij push naar `main`; `vercel.json` heeft `cleanUrls: true`
- Canonieke URL-vorm: `https://www.forgexe.nl/pagina` (zonder .html, met www)
- Interne links altijd schrijven als `/pagina` (root-relatief, zonder .html)
- `_archive/` en `leadkamer-placeholder/` staan in .gitignore en deployen niet mee
- GitHub Pages voor dit repo is uitgeschakeld (was duplicate content)

## Git
- Repo: https://github.com/Leadkamer/Forgexe
- Branch: main
