# MTB Typography System

## Philosophy

Typography in the MercedTradingBot brand serves **precision and hierarchy**. Every size, weight, and spacing choice communicates either authority (headlines), data (monospace), or context (body). The system avoids decorative typography — every typographic decision must serve the reader.

---

## Font Families

### Primary — Geometric Sans
**Inter** (loaded via system or CDN) or system fallback chain:
```
'Inter', 'SF Pro Display', 'Helvetica Neue', 'Arial', sans-serif
```
Used for: all UI text, wordmark, headings, body copy.

**Why Inter?** Open-source, available on Google Fonts, designed for screens, has tabular numbers (critical for financial data), and has excellent rendering at small sizes.

### Monospace — Data
```
'SF Mono', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace
```
Used for: prices, percentages, confidence scores, trade IDs, technical labels.

**Why monospace for data?** Column alignment in price tables, consistent character width for scanning numbers, and the precision aesthetic aligns with Bloomberg/terminal interfaces.

---

## Type Scale

The scale uses a 1.25 (Major Third) ratio with a 16px base.

| Token | Size | Weight | Line-height | Use |
|-------|------|--------|-------------|-----|
| `display-2xl` | 72px | 800 | 1.06 | Hero headlines |
| `display-xl` | 60px | 800 | 1.08 | Page heroes |
| `display-lg` | 48px | 700 | 1.1 | Section headers |
| `display-md` | 36px | 700 | 1.2 | Sub-section headers |
| `display-sm` | 30px | 600 | 1.3 | Card headers |
| `text-xl` | 20px | 500 | 1.5 | Large body, intro |
| `text-lg` | 18px | 400 | 1.6 | Body text |
| `text-md` | 16px | 400 | 1.6 | Default body |
| `text-sm` | 14px | 400 | 1.5 | Secondary text |
| `text-xs` | 12px | 400 | 1.4 | Captions, labels |
| `text-2xs` | 10px | 500 | 1.4 | Badges, tags |

---

## Weights

| Weight | Value | Use |
|--------|-------|-----|
| Thin | 100 | Decorative only |
| Light | 300 | Subheadings, wordmark sub-label |
| Regular | 400 | Body copy, descriptions |
| Medium | 500 | UI labels, interactive elements |
| Semibold | 600 | Emphasis, wordmark |
| Bold | 700 | Section headings |
| Extrabold | 800 | Hero display text |

---

## Letter Spacing

| Context | Value | Example |
|---------|-------|---------|
| Display headings | -0.03em | "Tradez avec précision" |
| Body text | 0 (default) | Paragraph text |
| Wordmark "Merced" | -0.02em | Logo wordmark |
| Sub-label "TRADING BOT" | +0.18em | Logo sub-label |
| Badge labels | +0.12em | "MTB", "LIVE", "BUY" |
| Monospace data | 0 (default) | "2,354.18" |
| Uppercase small caps | +0.08em | Section labels |

---

## Color Usage in Type

| Role | Color | Hex |
|------|-------|-----|
| Primary heading (dark bg) | White | `#FFFFFF` |
| Body text (dark bg) | White | `#FFFFFF` |
| Secondary text | Muted | `#6B6B6B` |
| Accent text | Gold | `#D4AF37` |
| BUY signal text | Emerald | `#10B981` |
| SELL signal text | Red | `#EF4444` |
| Data / price text | White + monospace | `#FFFFFF` |
| Code / technical | Monospace | `#E2E8F0` |

---

## Component-Specific Rules

### Signal Cards
```
Pair name:         16px, weight 700, white
Direction badge:   12px, weight 700, uppercase, +0.08em
Confidence:        13px, weight 700, gold (BUY) or emerald (SELL)
Price (entry/SL):  14px, weight 600, monospace, white
Analysis text:     12px, weight 400, muted
```

### Data Tables
```
Column headers:    11px, weight 600, uppercase, +0.08em, muted
Cell values:       14px, weight 500, monospace, white
Positive values:   emerald (#10B981)
Negative values:   red (#EF4444)
```

### Navigation
```
Logo wordmark:     20px, weight 600, white, -0.02em
Logo sub-label:    9.5px, weight 300, gold, +0.2em uppercase
Nav links:         14px, weight 500, muted → white on hover
```

---

## Tabular Numbers

For all financial data, always use tabular/monospace figures so columns align:
```css
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum";
```
Or use the monospace font family (which is inherently tabular).

---

## Do / Don't

✅ Use weight contrast to create clear hierarchy  
✅ Use tabular numbers for all prices and percentages  
✅ Keep body copy at 400 weight — heavy body text feels aggressive  
✅ Use letter-spacing to aid readability of uppercase labels  
✅ Use `font-mono` for all trading data (prices, tickers, IDs)  

❌ Don't use fewer than 2 weight differences to establish hierarchy  
❌ Don't use italic in data tables or signal cards  
❌ Don't mix gold and emerald text in close proximity  
❌ Don't use ultra-light (100–200) weight for any interactive element  
❌ Don't justify text — left-align for readability  
