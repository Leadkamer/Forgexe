# People Work Service — Operations Command Center (demo)

Een interactieve demo van het **Operations Command Center**: een dashboard waarin inkomende
WhatsApp-berichten automatisch worden getrieerd, geprioriteerd en gerouteerd naar de juiste
afdeling. Gebouwd door **Forgexe** als onderdeel van het AI-automatiseringsvoorstel voor
People Work Service.

> ⚠️ **Demo met fictieve data.** Alle namen, adressen, klanten en berichten zijn verzonnen en
> dienen uitsluitend ter illustratie. Er wordt geen echte data verwerkt.

## Wat het laat zien

- Live inbox van WhatsApp-berichten met AI-triage (categorie + prioriteit)
- Verrijking per persoon (voorbeeld op basis van een CRM zoals Plan4Flex)
- Routing naar het juiste Teams-kanaal en de juiste coördinator
- KPI's, taakverdeling per coördinator en categorie-overzicht
- Na ~20 seconden valt er automatisch een nieuw bericht binnen (live-demo-effect)

## Lokaal bekijken

Het is één standalone bestand. Open simpelweg `index.html` in je browser, of serveer de map:

```bash
npx serve .
```

## Deployen op Vercel

Dit is een statische site zonder build-stap.

1. Push deze repo naar GitHub.
2. Ga naar [vercel.com/new](https://vercel.com/new) en importeer de repo.
3. Framework preset: **Other** · Build command: *(leeg)* · Output directory: `.`
4. Deploy. Vercel serveert `index.html` automatisch en deployt opnieuw bij elke push.

## Huisstijl aanpassen

De kleuren staan als CSS-variabelen bovenaan `index.html` (`--brand` teal, `--accent` oranje).
Eén regel aanpassen en de hele huisstijl verandert mee.

---

Aangedreven door **Forgexe** — execute growth · info@forgexe.nl
