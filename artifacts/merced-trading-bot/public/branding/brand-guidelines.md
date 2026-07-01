# MercedTradingBot — Brand Guidelines v1.0

> Precision. Exclusivity. Intelligence.

---

## 1. Brand Identity

**Full name:** MercedTradingBot  
**Short name:** MTB  
**Category:** AI-powered professional trading platform  
**Positioning:** Premium fintech — comparable to Bloomberg Terminal aesthetics, TradingView precision, and Apple minimalism.

### Brand Personality

| Attribute | Expression |
|-----------|-----------|
| Premium | Black-gold palette, generous whitespace, thin geometric letterforms |
| Precise | Exact grid system, pixel-perfect alignment, monospaced data labels |
| Intelligent | Geometric letterforms suggesting circuits and data networks |
| Trustworthy | Consistent application, high contrast, no visual noise |
| Exclusive | Restrained use of gold, never decorative for its own sake |

---

## 2. The Logo

### 2.1 Construction

The MTB mark is constructed on a 80×28 unit grid. Each letterform uses:
- **Stroke weight:** 4.5 units (relative to grid)
- **Cap height:** 28 units
- **Letter spacing:** 7 units between each glyph
- **M:** Geometric capital with pointed V-center (apex at y=11, inner valley at y=16)
- **T:** Full-width crossbar (22 units) with centered stem (4.5 units wide)
- **B:** Vertical stem + two D-shaped bowls — top bowl rx=13, bottom bowl rx=14 for visual weighting

### 2.2 Logo Variants

| File | Background | Use case |
|------|-----------|----------|
| `logo.svg` | Dark (#0B0B0B) | Default — dark surfaces, website, presentations |
| `logo-dark.svg` | Dark (#0B0B0B) | Dark backgrounds |
| `logo-light.svg` | Light (#F5F5F5) | Light backgrounds, print on white |
| `logo-gold.svg` | Transparent | Dark photo overlays, embossing, monochrome print |
| `monogram.svg` | Transparent | Gold mark only, use where space is limited |
| `app-icon.svg` | Dark rounded rect | App stores, favicons, profile images |

### 2.3 Clear Space

The minimum clear space around the logo is equal to the height of the **M** letterform (28 units in the SVG coordinate system). At 48px rendered size, this equals ~17px of clear space on all sides.

```
  ┌─ clear space = M height ─┐
  │                           │
  │    ┌─────────────────┐    │
  │    │  MTB  Merced    │    │
  │    │       Trading   │    │
  │    └─────────────────┘    │
  │                           │
  └───────────────────────────┘
```

### 2.4 Minimum Sizes

| Context | Minimum width |
|---------|--------------|
| Digital — icon only | 24px |
| Digital — with wordmark | 120px |
| Print | 15mm |
| Favicon | 16×16px (use M-only form) |

### 2.5 Prohibited Uses

❌ Do not rotate or skew the logo  
❌ Do not change the gold to any other color without approval  
❌ Do not place the logo on mid-tone backgrounds (use dark or light variants only)  
❌ Do not add drop shadows or effects  
❌ Do not use the full wordmark below 120px wide  
❌ Do not separate the icon mark from the wordmark vertically in the horizontal logo  
❌ Do not use the logo on colors other than #0B0B0B or #FFFFFF backgrounds  

---

## 3. Colors

### 3.1 Primary Palette

| Name | Hex | Use |
|------|-----|-----|
| **Brand Black** | `#0B0B0B` | Primary backgrounds, icon backgrounds |
| **Luxury Gold** | `#D4AF37` | Logo mark, primary accent, premium highlights |
| **White** | `#FFFFFF` | Primary text on dark, headings |

### 3.2 Secondary Palette

| Name | Hex | Use |
|------|-----|-----|
| Graphite | `#1C1C1E` | Cards, elevated surfaces |
| Graphite Mid | `#2C2C2E` | Borders, dividers |
| Muted | `#6B6B6B` | Captions, secondary labels |

### 3.3 Accent Colors (Use Sparingly)

| Name | Hex | Use |
|------|-----|-----|
| Emerald | `#10B981` | BUY signals, profit, success |
| Electric Blue | `#60A5FA` | AI indicators, data highlights |
| Destructive Red | `#EF4444` | SELL signals, losses, errors |

### 3.4 Accessibility

- Gold (`#D4AF37`) on Black (`#0B0B0B`): **7.3:1 contrast** — passes WCAG AAA
- White (`#FFFFFF`) on Black (`#0B0B0B`): **21:1 contrast** — passes WCAG AAA
- Gold on White: **3.8:1** — use only for decorative elements, not body text

---

## 4. Typography

See `typography.md` for the complete type system.

### Quick Reference

| Role | Font | Weight | Size |
|------|------|--------|------|
| Brand mark | Geometric sans (embedded paths) | — | — |
| Wordmark | Helvetica Neue / Inter | 600 | Dynamic |
| Sub-label | Helvetica Neue / Inter | 300 | Small, 0.2em tracking |
| Data labels | SF Mono / Fira Code | 400–500 | 11–14px |
| Headings | Inter / system-ui | 700 | 32–72px |
| Body | Inter / system-ui | 400 | 14–16px |

---

## 5. App Icon

The app icon uses the MTB monogram on a near-black rounded rectangle (#0B0B0B → #1A1A1A gradient) with iOS/Android corner radius (22.5% = 115px at 512px).

Subtle horizontal rule lines at 17% and 83% of height reinforce the precision/data aesthetic without being ornamental.

### Icon Grid

```
512px app icon → inner icon safe zone = 384px (75%)
Monogram rendered at 448px width (87.5%) for visual impact
```

---

## 6. Dark Mode

MTB is primarily a **dark-first** brand. All default components use:
- Background: `#0B0B0B` (body) / `#1C1C1E` (elevated)
- Text: `#FFFFFF` primary / `#6B6B6B` secondary
- Accent: `#D4AF37` (gold)

**Never use the light logo on dark backgrounds.** Use `logo.svg` or `logo-dark.svg`.

---

## 7. Light Mode

When displaying MTB branding on light backgrounds:
- Use `logo-light.svg`
- Icon background remains `#0B0B0B` (maintains contrast)
- Wordmark changes to `#0B0B0B`
- Sub-label changes to `#8B7A2E` (darkened gold for accessibility)

---

## 8. PWA & Digital Icons

| Asset | File | Size |
|-------|------|------|
| Browser favicon | `favicon.svg` | 32px |
| Apple Touch Icon | `icons/icon-192.png` | 192×192px |
| Android Launcher | `icons/icon-512.png` | 512×512px |
| Maskable (Android) | `icons/icon-512.png` | 512×512px (safe zone: 80%) |
| OpenGraph | `opengraph.jpg` | 1200×630px |

### PWA Manifest Colors

```json
{
  "theme_color": "#D4AF37",
  "background_color": "#0B0B0B"
}
```

---

## 9. Voice & Tone

| Attribute | Do | Don't |
|-----------|-----|-------|
| Premium | "Signaux de précision institutionnelle" | "Super signaux de trading" |
| Precise | "Confiance ≥88% sur 5 timeframes" | "Signaux précis" |
| Confident | "Le cours live correspond à MT5" | "Nos données sont correctes" |
| Exclusive | "Réservé aux traders sérieux" | "Pour tout le monde" |

---

*MercedTradingBot Brand Guidelines v1.0 — All rights reserved*
