# MTB Spacing System

## Base Unit

**1 unit = 4px**

All spacing values are multiples of 4px. This ensures pixel-perfect alignment across all screen densities.

---

## Scale

| Token | px | rem | Use |
|-------|-----|-----|-----|
| `space-0` | 0 | 0 | Reset |
| `space-1` | 4px | 0.25rem | Tight — icon gap, badge padding |
| `space-2` | 8px | 0.5rem | Compact — button icon gap, chip padding |
| `space-3` | 12px | 0.75rem | Small — input padding vertical, list item gap |
| `space-4` | 16px | 1rem | Default — card internal padding, section gap |
| `space-5` | 20px | 1.25rem | Medium — component gap |
| `space-6` | 24px | 1.5rem | Large — section internal padding |
| `space-8` | 32px | 2rem | Section gap |
| `space-10` | 40px | 2.5rem | Major section gap |
| `space-12` | 48px | 3rem | Page section gap |
| `space-16` | 64px | 4rem | Hero section padding |
| `space-20` | 80px | 5rem | Large hero padding |
| `space-24` | 96px | 6rem | Section-to-section gap |

---

## Component-Specific Spacing

### Cards
```
Padding (default):   16px (space-4) all sides
Padding (compact):   12px (space-3) all sides
Padding (large):     24px (space-6) all sides
Border radius:       12px
Gap between cards:   12px (space-3)
```

### Buttons
```
Height (sm):  32px
Height (md):  40px
Height (lg):  48px
Height (xl):  56px

Padding horizontal (sm):  12px
Padding horizontal (md):  16px
Padding horizontal (lg):  24px
Padding horizontal (xl):  40px

Border radius:       8px (standard) / 12px (large)
Icon gap:            8px
```

### Navigation
```
Sidebar width:       240px
Sidebar padding:     16px horizontal, 24px section gap
Nav item height:     40px
Nav item padding:    8px 12px
Logo area height:    72px
```

### Signal Cards
```
Outer padding:       16px
Row gap:             12px
Grid column gap:     16px
Badge padding:       4px 10px
Analysis text padding-top: 8px (after border-top)
```

### Forms
```
Input height:        44px
Input padding:       0 14px
Label margin-bottom: 6px
Field gap:           16px
Section gap:         24px
Submit button height: 48px
```

---

## Grid System

### Desktop (≥1024px)
```
Max width:    1280px (7xl)
Columns:      12
Gutter:       24px
Margin:       24px (minimum)
```

### Tablet (640–1023px)
```
Max width:    100%
Columns:      8
Gutter:       16px
Margin:       16px
```

### Mobile (<640px)
```
Max width:    100%
Columns:      4
Gutter:       12px
Margin:       16px
```

---

## Logo Clear Space

**Minimum clear space = height of M letterform**

At rendered icon sizes:
| Icon size | Min clear space |
|-----------|----------------|
| 24px | 8px |
| 36px | 12px |
| 48px | 16px |
| 56px | 19px |
| 512px (app icon) | 64px |

---

## Precision Grid (Charts & Data Viz)

Financial data components use a tighter sub-grid:
```
Row height (compact):   32px
Row height (standard):  40px
Row height (spacious):  48px
Column separator:       1px, graphite-mid (#2C2C2E)
Header height:          36px
```

---

## Border Radius Scale

| Token | Value | Use |
|-------|-------|-----|
| `rounded-sm` | 4px | Badges, chips, small elements |
| `rounded` | 6px | Inputs, compact buttons |
| `rounded-md` | 8px | Standard buttons, table rows |
| `rounded-lg` | 12px | Cards, panels |
| `rounded-xl` | 16px | Large cards, sheets |
| `rounded-2xl` | 20px | Modals, hero cards |
| `rounded-3xl` | 24px | Marketing cards |
| `rounded-full` | 9999px | Avatars, circular badges |

App icon border radius: **22.5% of size** (115px at 512px)

---

## Elevation (Shadow Scale)

| Level | Use | Shadow |
|-------|-----|--------|
| 0 | Flat — borders only | none |
| 1 | Raised — cards, inputs | `0 1px 3px rgba(0,0,0,0.4)` |
| 2 | Floating — dropdowns | `0 4px 16px rgba(0,0,0,0.5)` |
| 3 | Modal — dialogs | `0 8px 32px rgba(0,0,0,0.6)` |
| 4 | Critical — toasts | `0 16px 48px rgba(0,0,0,0.7)` |

Gold glow (for accent elements):
```
box-shadow: 0 0 20px rgba(212, 175, 55, 0.2),
            0 4px 16px rgba(212, 175, 55, 0.1);
```
