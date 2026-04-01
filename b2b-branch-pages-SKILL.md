---
name: b2b-branch-pages
description: Use this skill whenever a user asks to build, design, or structure landing pages for specific industries, verticals, or branches. This includes requests like "build a page for maakindustrie", "create industry-specific landing pages", "branche pagina", "vertical landing page", "sector page", or any request to create targeted pages for specific business sectors (manufacturing, finance, legal, e-commerce, healthcare, etc.). Also trigger when users want to create SEO-optimized pages targeting industry-specific keywords, or when they need a repeatable template for multiple industry pages. This skill contains a conversion-optimized 8-section blueprint specifically designed for B2B service companies targeting multiple verticals, derived from the homepage blueprint principles and adapted for industry-specific persuasion.
---

# B2B Branch/Industry Landing Page Blueprint

A repeatable format for building individual industry-specific landing pages. Each page functions as a mini-homepage optimized for that sector — speaking their language, naming their pains, and showing relevant proof.

## Why Individual Branch Pages

- **SEO:** Each page targets industry-specific long-tail keywords ("AI automatisering maakindustrie", "procesoptimalisatie accountantskantoor")
- **Conversion:** Visitors from a specific industry see themselves immediately — no cognitive overhead filtering generic content
- **Authority:** Demonstrates deep vertical expertise rather than generalist capability
- **Ads:** Each page is a perfect landing page for industry-targeted ad campaigns

## The 8-Section Branch Page Blueprint

### Section 1: Branch Hero

**Function:** Instant recognition — the visitor must think "this is for ME" within 2 seconds.

**Requirements:**
- Headline format: "[Service/outcome] voor de [branche]"
  - Example: "AI-systemen die jouw productiebedrijf autonoom laten draaien"
  - Example: "Procesautomatisering voor accountantskantoren"
- Subheadline: 1-2 sentences naming the core tension of that industry
  - Example: "Jouw team besteedt meer tijd aan administratie dan aan advies. Dat kan anders."
- ONE primary CTA ("Gratis scan voor jouw [branche]bedrijf")
- Terminal prompt with branch reference: `C:\forgexe> forge --sector [branche]`
- Optional: branch-specific line illustration (industry-recognizable shapes)

**Copy principles:**
- Use industry jargon the target audience recognizes (but keep it accessible)
- Name the specific role who visits: "Als productiemanager weet je..." / "Als managing partner van een kantoor..."
- Lead with the transformation, not the technology

### Section 2: Branch-Specific Pain Points (3 Cards)

**Function:** Name exactly the frustrations this industry faces. More specific = more recognition = more trust.

**Requirements:**
- Exactly 3 pain points, each with:
  - Icon or small illustration
  - Short title (5-8 words)
  - Description (2-3 sentences) using industry-specific scenarios
- Pain points should map to your service pillars (at least 1 Growth, 1 Ops, 1 bridging)

**Research approach per branch:**
Before writing pain points, answer these questions:
1. What manual process wastes the most hours in this industry?
2. Where do they lose revenue due to slow response or human error?
3. Which tools/systems are they already using but not connecting?
4. What's the #1 complaint their clients have about their service?

**Template per pain card:**
```
Title: [Concrete frustration in their words]
Description: [Scenario they recognize] + [Consequence they feel] + [Implicit: this is solvable]
```

**Example (Maakindustrie):**
```
Title: Offertes die te laat de deur uit gaan
Description: Een aanvraag komt binnen, maar het duurt 3 dagen voor de offerte klaar is.
Ondertussen heeft de prospect al bij de concurrent getekend. Elke dag vertraging kost orders.
```

### Section 3: Two-Pillar Solution (Growth + Ops)

**Function:** Show how both service pillars apply specifically to this industry.

**Layout:** Two columns, each with:
- Pillar name (Forge.Growth / Forge.Ops)
- Pillar headline specific to branch
  - Growth: "Meer [branche-relevante leads] binnenhalen"
  - Ops: "[Branche-specifiek proces] stroomlijnen"
- 3-4 concrete toepassingen per pillar, each as a short bullet

**Key principle:** Every bullet must be recognizable for someone in that industry. No generic items like "leadgeneratie verbeteren" — instead: "AI-agent die offerte-aanvragen binnen 2 minuten opvolgt."

**Template per pillar:**
```
FORGE.GROWTH — [Branche] groei
> [Specifieke toepassing 1 — kanaal + actie]
> [Specifieke toepassing 2 — automation + resultaat]
> [Specifieke toepassing 3 — strategie + meetbaar doel]

FORGE.OPS — [Branche] operatie
> [Specifiek proces 1 dat geautomatiseerd wordt]
> [Specifieke integratie — tool A ↔ tool B]
> [Specifieke rapportage/dashboard die ze nu handmatig doen]
```

### Section 4: Process (3 Steps, Branch-Contextualized)

**Function:** Same 3-step framework as homepage, but with branch-specific language in each step.

**Template:**
```
1. Gratis [branche]scan
   "Wij analyseren jouw [branche-specifiek proces] en [branche-specifiek kanaal].
   Je krijgt een rapport met de 3 grootste kansen voor jouw [bedrijfstype]."

2. Wij smeden jouw [branche]-systeem
   "Gebouwd op [tools die deze branche gebruikt: SAP/Exact/Afas/etc.].
   Geen migraties, geen verstoringen."

3. Het draait. Jij [branche-specifiek resultaat].
   "[Specifiek resultaat: 'Je team adviseert, het systeem administreert' /
   'Je productie draait, het systeem rapporteert']"
```

### Section 5: Results & Case Study

**Function:** Branche-relevant bewijs. Eén sterk voorbeeld is beter dan drie vage.

**Requirements:**
- 2-3 KPI counters relevant voor de branche
  - Maakindustrie: doorlooptijd offerte, orderfoutmarge, productie-uptime
  - Finance: uren administratie bespaard, klanttevredenheid, doorlooptijd dossier
  - E-commerce: ROAS, conversieratio, klantenservice-responstijd
- 1 case study card with:
  - Type tag (Growth / Ops / Growth + Ops)
  - Bedrijfsbeschrijving (type + FTE, geen naam nodig als niet beschikbaar)
  - 2-3 specifieke resultaten met cijfers

**If no real case in that branch:**
- Use anonymized composites: "Een [type bedrijf] met [X] medewerkers"
- Focus on metrics that are realistic and verifiable
- Mark as "verwacht resultaat op basis van vergelijkbare projecten" if needed

### Section 6: Testimonial (If Available)

**Function:** Social proof from someone in the same industry.

**Requirements:**
- If available: real testimonial from a client in this branch
- If not: skip this section entirely (fake testimonials destroy trust)
- Can also use a general testimonial with a bridge: "Hoewel [bedrijf] in een andere branche zit, is het principe hetzelfde..."

### Section 7: Branch-Specific FAQ (3-4 Questions)

**Function:** Address industry-specific objections.

**Standard questions to adapt per branch:**
1. "Is Forgexe ervaring met [branche]?" — proof of relevant expertise
2. "Werkt dit met [branche-specifieke tool: SAP/Exact/Afas/Twinfield/etc.]?" — integration confidence
3. "Hoe lang duurt het voor ik resultaat zie in [branche-context]?" — timeline expectations
4. "Wat kost dit voor een [branche-type] bedrijf?" — pricing framing

### Section 8: Final CTA

**Function:** Branch-specific closing.

**Requirements:**
- Headline: "Klaar om jouw [branche]bedrijf te laten draaien op AI?"
- Sub: 1 sentence naming the core transformation
- Primary CTA: "Gratis [branche]scan aanvragen"
- Risk reducers (same as homepage: gratis, 48 uur, 2 uur reactie)
- Contact options

## SEO Optimization Per Branch Page

### URL Structure
```
/branches/maakindustrie
/branches/finance
/branches/vastgoed
/branches/e-commerce
/branches/juridisch
/branches/it-software
/branches/marketing-bureaus
```

### Title Tag Format
```
AI Automatisering [Branche] — Forgexe | Groei & Operatie Systemen
```

### Meta Description Format
```
AI-systemen voor de [branche]. Van [pain point 1] tot [pain point 2] —
wij smeden autonome systemen die jouw [bedrijfstype] 24/7 laten draaien.
Gratis bedrijfsscan.
```

### H1-H2-H3 Structure
```
H1: [Service] voor de [branche]
  H2: Herkenbaar? (pain points)
  H2: Wat wij smeden voor [branche]
    H3: Forge.Growth — [branche] groei
    H3: Forge.Ops — [branche] operatie
  H2: Hoe het werkt
  H2: Resultaten in de [branche]
  H2: Veelgestelde vragen
  H2: [CTA headline]
```

### Internal Linking
- Each branch page links to homepage expertises section
- Each branch page links to related branches ("Ook relevant voor...")
- Homepage branches section links to individual pages
- Case studies link back to relevant branch page

### Target Keywords Per Branch (Dutch)
Research these patterns per branch:
- "[service] [branche]" — "AI automatisering maakindustrie"
- "[probleem] [branche] oplossen" — "leadgeneratie accountantskantoor"
- "[tool] integratie [branche]" — "SAP automatisering productiebedrijf"
- "automatisering [branche] MKB" — broad industry + automation

## Branch-Specific Tool Stacks

When mentioning integrations, reference tools actually used in that industry:

**Maakindustrie:** SAP, Exact, AFAS, Ridder iQ, Isah, Proman, Cadac
**Finance:** Twinfield, Exact Online, AFAS, Basecone, Yuki, Visma
**Vastgoed:** Realworks, Kolibri, Reaforce, Reasult, Aareon
**E-commerce:** Shopify, WooCommerce, Magento, Lightspeed, Bol.com, Amazon
**Juridisch:** PracticeNet, Kleos, Legal Intelligence, Time Solutions
**IT/Software:** Jira, Confluence, GitHub, Linear, Azure DevOps
**Marketing/Bureaus:** Teamleader, Productive, Harvest, Basecamp

## Design Consistency

Each branch page should:
- Use the same nav, footer, and global styles as the homepage
- Use the same color scheme and typography
- Include the same logo (SVG mark + wordmark)
- Default to light mode (matching homepage)
- Have dark/light toggle
- Use line illustrations consistent with homepage style
- Include branch-specific illustration in the hero (optional but recommended)

## Template Variables

When generating a branch page, fill these variables:

```
{{BRANCH_NAME}}        — "Maakindustrie"
{{BRANCH_SLUG}}        — "maakindustrie"
{{BRANCH_HEADLINE}}    — "AI-systemen voor de maakindustrie"
{{BRANCH_SUB}}         — Industry-specific tension sentence
{{BRANCH_TERMINAL}}    — "C:\forgexe> forge --sector manufacturing"
{{PAIN_1_TITLE}}       — First pain point title
{{PAIN_1_DESC}}        — First pain point description
{{PAIN_2_TITLE}}       — Second pain point title
{{PAIN_2_DESC}}        — Second pain point description
{{PAIN_3_TITLE}}       — Third pain point title
{{PAIN_3_DESC}}        — Third pain point description
{{GROWTH_HEADLINE}}    — Branch-specific growth headline
{{GROWTH_ITEMS}}       — 3-4 growth applications
{{OPS_HEADLINE}}       — Branch-specific ops headline
{{OPS_ITEMS}}          — 3-4 ops applications
{{STEP1_DESC}}         — Branch-contextualized step 1
{{STEP2_DESC}}         — Branch-contextualized step 2
{{STEP3_DESC}}         — Branch-contextualized step 3
{{KPI_1}}              — Branch-relevant metric + label
{{KPI_2}}              — Branch-relevant metric + label
{{KPI_3}}              — Branch-relevant metric + label
{{CASE_TYPE}}          — Growth / Ops / Growth + Ops
{{CASE_DESC}}          — Company type + size
{{CASE_RESULTS}}       — 2-3 specific results
{{FAQ_1_Q}} / {{FAQ_1_A}}  — Branch-specific FAQ
{{FAQ_2_Q}} / {{FAQ_2_A}}
{{FAQ_3_Q}} / {{FAQ_3_A}}
{{CTA_HEADLINE}}       — Branch-specific closing headline
{{TOOLS}}              — Branch-specific tool names for integration mentions
```

## Generating Multiple Branch Pages

When asked to generate all branch pages at once:
1. Generate each page as a separate HTML file
2. Name files: `branche-[slug].html` (e.g., `branche-maakindustrie.html`)
3. Update the homepage branches section to link to individual pages
4. Update the overzichtspagina to serve as an index
5. Ensure internal linking between related branches

## Quality Checklist Per Branch Page

Before delivering a branch page, verify:
- [ ] Hero passes grunt test for someone in that industry
- [ ] Pain points use industry-specific language, not generic
- [ ] Growth + Ops items are concrete and recognizable
- [ ] Process steps reference tools/workflows from that industry
- [ ] FAQ addresses the #1 objection for that industry
- [ ] CTA is branch-specific, not generic
- [ ] SEO: title tag, meta description, H-tag hierarchy correct
- [ ] All text uses "je/jij/jouw" (informal Dutch), not "u/uw"
- [ ] No Leadkamer references
- [ ] Design matches homepage (nav, footer, colors, typography)
