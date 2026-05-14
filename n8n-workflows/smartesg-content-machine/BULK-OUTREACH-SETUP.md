# SmartESG — Pitch Campagne Setup

Werkwijze voor Tom's eenmalige campagne-pitch naar geaccepteerde leads, daarna permanent ingebouwd als FU3 in de bestaande Leadgen-sequence.

## Onderdelen

1. **`SmartESG - Bulk Outreach.json`** — nieuwe workflow (eenmalige bulk + dagelijkse doortikkend)
2. **Settings tab** in de SmartESG Google Sheet (config opslag)
3. **Leads-tab kolom toevoegen**: `Pitch Verzonden`
4. **Dashboard-knop** "📣 Pitch campagne" (al toegevoegd aan smartesg-dashboard)
5. **FU3-tak** in beide bestaande Leadgen workflows (Tom + Bas) — handmatige patch

---

## 1. Settings tab toevoegen

Maak in dezelfde Google Sheet als waar `Posts_Review`/`Authors`/`Leads` in staan, een nieuw tabblad genaamd **`Settings`**.

Twee kolommen, header in rij 1:

| key | value |
|---|---|
| pitch_actief | Nee |
| pitch_template | (Tom's pitch-tekst hier, met `{Voornaam}` placeholder) |
| pitch_daglimiet | 20 |
| pitch_throttle_sec | 90 |
| pitch_statuses | Geaccepteerd,Follow-up,Nudge |

**`pitch_statuses`** is een comma-separated lijst van display-statussen die de pitch krijgen. Mogelijke waardes (uit het dashboard): `Geaccepteerd`, `Follow-up`, `Nudge`, `Gereageerd`. Tom en Bas kunnen dit per campagne aanpassen via de modal — de gekozen statussen worden hier opgeslagen zodat de schedule de volgende dag dezelfde set gebruikt.

**Default pitch_template** (kun je 1-op-1 plakken):

```
Goedemiddag {Voornaam}, We zijn laatst verbonden op mijn interesse om meer van de markt te zien, maar ik vraag me af of je ons zou willen helpen door klant te worden? Wij maken duurzaamheid passend in het bedrijfsplan door het als toevoeging aan je processen te behandelen. Onze basismodule biedt inzicht in een groot deel van je compliance en impact, en omdat we op zoek zijn naar bredere referenties, met forse korting. Zou je openstaan voor een kort gesprek om te ontdekken of dit ook voor jullie interessant is?
```

> De workflow overschrijft `pitch_template` automatisch elke keer dat je via het dashboard de campagne start (zodat je 'm daar kan tweaken zonder de sheet open te doen).

## 2. Leads-tab — kolom `Pitch Verzonden`

Voeg achter de bestaande kolommen een nieuwe lege kolom toe: **`Pitch Verzonden`** (header in rij 1, datum-formaat).

De workflow vult deze met `yyyy-MM-dd` zodra een lead is gepitcht. Skipt iedereen waar dit veld al een waarde heeft.

## 3. Import `SmartESG - Bulk Outreach.json` in n8n

1. Open n8n cloud → New workflow → Import from file
2. Selecteer `n8n-workflows/smartesg-content-machine/SmartESG - Bulk Outreach.json`
3. Vervang in **alle 6 Google Sheets nodes** de `REPLACE_WITH_SHEET_ID` met de echte sheet-ID
4. Bind in de Gmail-node (`Notify Email`) de Gmail-credential (`REPLACE_WITH_GMAIL_CREDENTIAL_ID`)
5. In de **Build Send Queue** code-node: vervang `REPLACE_WITH_BAS_UNIPILE_ID` met Bas' Unipile `account_id` (Tom staat al goed: `behhoyRSR5y24t66aDgVQQ`)
6. Activeer de workflow

**Webhook URL**: `https://leadkamer.app.n8n.cloud/webhook/smartesg-bulk-outreach` — staat al in dashboard.

## 4. Hoe het werkt

**Eenmalige start** (via dashboard):
- Klik op Leads-tab → **📣 Pitch campagne**
- Tweak template/daglimiet/throttle in de modal
- Klik **Start** → workflow zet `pitch_actief = Ja`, slaat template op, en stuurt vandaag's batch (max 20/auteur)
- Schedule-trigger draait dagelijks om **11:00 (werkdagen)** → pakt volgende batch tot iedereen gehad is

**Stoppen**:
- Knop "Campagne stoppen" in modal → zet `pitch_actief = Nee` → schedule slaat door

**Filtering** (in `Build Send Queue` code-node):
- `Status = Geaccepteerd`
- `Heeft Gereageerd != Ja`
- `Pitch Verzonden` leeg
- Per auteur (Tom/Bas) max `pitch_daglimiet` per dag

---

## 5. FU3-tak toevoegen aan bestaande Leadgen workflows

Doel: na de Nudge nog één pitch sturen, structureel ingebakken in de sequence.

**Doe dit in BEIDE workflows:**
- `SmartESG - AI Leadgen (Tom)` — id `KfdguQ2HJKx76lm4`
- `SmartESG - AI Leadgen (Bas)` — id `oTgUXaVkJqBONbUR`

### Stappen per workflow

1. **Duplicate** de bestaande "Nudge"-tak:
   - `Schedule Follow-up` (al aanwezig) feeds → `Haal Leads op voor Follow-up` → `Filter op Timing + Reactie` → `Batch per Lead 3` → `Wait3` → `Verstuur Bericht 2` → `Update row in sheet3`
2. Maak een **kopie** van deze tak met de naam-suffix `Pitch`:
   - `Filter op Timing Pitch` (nieuwe code-node, zie hieronder)
   - `Batch per Lead Pitch` (splitInBatches, batchSize 1)
   - `Wait Pitch` (60 sec)
   - `Verstuur Pitch` (httpRequest, kopie van Verstuur Bericht 2 — alleen body veld text wijzigen)
   - `Update Pitch Verzonden` (googleSheets update — alleen kolom `Pitch Verzonden` met `={{ $now.format('yyyy-MM-dd') }}`)
3. Connect: `Haal Leads op voor Follow-up` → ook → `Filter op Timing Pitch` (parallelle tak)

### `Filter op Timing Pitch` JS-code

```javascript
const today = new Date();
const dow = today.getDay();
if (dow === 0 || dow === 6) return [];

const items = $input.all();

return items.filter(item => {
  if (item.json['Heeft Gereageerd'] === 'Ja') return false;
  if (item.json['Status Follow-up'] !== 'Nudge Verzonden') return false;
  if ((item.json['Pitch Verzonden'] || '').trim() !== '') return false;

  const nudgeDate = new Date(item.json['Datum Nudge'] || item.json['Datum Follow-up']);
  const daysSinceNudge = Math.floor((today - nudgeDate) / (1000 * 60 * 60 * 24));

  return daysSinceNudge >= 7;
});
```

### `Verstuur Pitch` body

Identiek aan `Verstuur Bericht 2`, behalve:

```json
{
  "account_id": "<Tom of Bas account_id, zoals bestaande nodes>",
  "attendees_id": "{{ $json.provider_id }}",
  "text": "{{ $('Get Settings').first().json.pitch_template.replace(/\\{Voornaam\\}/gi, $json.Voornaam).replace(/\\{voornaam\\}/gi, $json.Voornaam) }}"
}
```

Of: lees de template uit Settings via een aparte `Get Settings` node bovenaan de tak (zoals in de Bulk Outreach workflow).

### `Update Pitch Verzonden` mapping

```json
{
  "Linkedin URL": "={{ $json['Linkedin URL'] }}",
  "Pitch Verzonden": "={{ $now.format('yyyy-MM-dd') }}",
  "Status Follow-up": "Pitch Verzonden"
}
```

> Met deze setup wordt iemand óf via de eenmalige bulk gepitcht, óf via de structurele FU3 — nooit dubbel, want `Pitch Verzonden` is de single source of truth.
