# Overdracht: Foto's-tab voor fietsencatalogus-dashboard

**Datum:** 10 juni 2026
**Doel:** de `index.html` in deze map moet de bestaande `index.html` in de repo
`Leadkamer/fietsencatalogus-dashboard` (branch `master`) vervangen. Vercel deployt
daarna automatisch.

## Wat is er gewijzigd t.o.v. de live versie

De live versie is commit-stand van ~1 juni 2026. Toegevoegd:

1. **Sidebar-item "Foto's"** (`sb-ft`, camera-icoon) met rode badge die het aantal
   te beoordelen fietsen toont.
2. **Sectie `s-ft`** met de Foto Review-tab: per fiets een kaart met 3 kandidaat-
   foto's (klikken = selecteren), veld voor eigen foto-URL, knoppen
   "Goedkeuren & uploaden" en "Overslaan", filterchips Te beoordelen / Beoordeeld / Alle.
3. **CSS** voor `.ft-grid`, `.ft-card`, `.ft-ph` e.d. (zelfde designtaal als de rest).
4. **JS-functies** `loadFt`, `rFt`, `ftPick`, `ftCustom`, `ftApprove`, `ftSkip`,
   `updFtBadge`; `sw()` uitgebreid met de `ft`-tab; `loadFt()` wordt bij page load
   aangeroepen voor de badge.

Er is verder **niets** aan de bestaande functionaliteit veranderd.

## Bijbehorende backend (staat al live in n8n, leadkamer.app.n8n.cloud)

- **Fietsencatalogus - Foto Review API** (actief): `GET /webhook/dashboard-fotos`
  en `POST /webhook/dashboard-foto-status` (body: `product_id`, `keuze` = 1/2/3 of
  foto-URL, `status` = goedgekeurd/overgeslagen).
- **Fietsencatalogus - Foto's Zoeken (Review)** (nog inactief): vult elke maandag
  07:00 de review-sheet via SerpAPI. Eerst handmatig testen i.v.m. onbekende
  veldnamen van de Sevenmiles API (`/api/bikes/without-image/`).
- **Fietsencatalogus - Foto's Uploaden (Goedgekeurd)** (nog inactief): uploadt
  dagelijks 08:00 goedgekeurde foto's als bestand naar `/api/bikes/image/`
  (`product_id` + `image`).
- Opslag: Google Sheet "Fietsencatalogus - Foto Review"
  (ID `1kSry-TYcbNwiJpKdsTPvn70_Ane8OhW2QFnTWzI3h_I`).

## Te doen in een sessie met toegang tot Leadkamer/fietsencatalogus-dashboard

1. Vervang `index.html` op `master` door het bestand in deze map.
2. Commit + push; Vercel deployt automatisch.
3. Verifieer: tab "Foto's" zichtbaar, data laadt zodra de zoek-workflow gedraaid heeft.
