# STOKROVA Brand & UI Design System

## 1. Brand Identity & Visual Philosophy

STOKROVA's visual design reflects an enterprise-grade, precision-engineered operating platform. 
The brand palette is intentionally disciplined:
- **Core Symbol Gold**: `#BD9652`
- **Core Wordmark Charcoal Slate**: `#293136`
- **Strict Color Rule**: Do not introduce arbitrary colors. All interface elements, status accents, and backgrounds must derive directly from the brand gold, charcoal slate, or darker variations thereof.

---

## 2. Core Color Palette

```
  ┌───────────────────┐       ┌───────────────────┐
  │   IMPERIAL GOLD   │       │  CHARCOAL SLATE   │
  │      #BD9652      │       │      #293136      │
  │   (Primary Mark)  │       │    (Wordmark)     │
  └───────────────────┘       └───────────────────┘
```

### Scale: Imperial Gold
- `gold-50`:  `#FDFBF7`
- `gold-100`: `#F9F4EB`
- `gold-200`: `#EFE3CE`
- `gold-300`: `#E0CB9F`
- `gold-400`: `#CEB274`
- `gold-500`: **`#BD9652`** (Brand Accent / Primary Action)
- `gold-600`: `#A47E3D` (Button Hover / Pressed)
- `gold-700`: `#85642D` (Darker Gold Accent)
- `gold-800`: `#684D22` (Subtle Gold Border)
- `gold-900`: `#4E381A` (Deep Shadow)
- `gold-950`: `#33230E` (Dark Mode Gold Glow)

### Scale: Charcoal Slate
- `slate-50`:  `#F5F7F8`
- `slate-100`: `#E9ECF0`
- `slate-200`: `#D2D9DF`
- `slate-300`: `#ACB8C3`
- `slate-400`: `#7E919F` (Muted text / labels)
- `slate-500`: `#586A78`
- `slate-600`: `#414F5A`
- `slate-700`: `#333D46` (Dark mode card border)
- `slate-800`: **`#293136`** (Wordmark / Light mode text)
- `slate-900`: **`#1E2428`** (Dark mode primary surface)
- `slate-950`: **`#161B1E`** (Pitch midnight dark background)

---

## 3. Hybrid Light & Dark Mode Tokens

| UI Element | Light Mode | Dark Mode | Rationale |
| :--- | :--- | :--- | :--- |
| **App Background** | `#FFFFFF` | `#161B1E` | Deepest slate tone for low-strain contrast |
| **Surface / Sidebar** | `#F8FAFC` | `#1E2428` | Grounded brand charcoal foundation |
| **Card / Dialog** | `#FFFFFF` | `#242A2F` | Elevated slate card surface |
| **Card Hover** | `#F1F5F9` | `#293136` | Direct wordmark slate shade on hover |
| **Borders** | `#E2E8F0` | `#333D46` | Subtle structural division |
| **Primary Text** | `#293136` | `#F8FAFC` | Brand charcoal in light mode; crisp white in dark |
| **Secondary Text** | `#64748B` | `#ACB8C3` | Balanced legibility |
| **Primary Button** | `#BD9652` | `#BD9652` | Consistent brand gold CTA |
| **Button Hover** | `#A47E3D` | `#CEB274` | Darker in light mode, luminous in dark mode |
| **Focus Ring** | `#BD9652` | `#BD9652` | Brand gold outline |

---

## 4. Multi-Platform Icon Assets Inventory

All icon assets are generated in `packages/ui/assets/`:

1. **Brand Marks**:
   - `stokrova-logo.png` — Full logo (922x235) with transparent background
   - `stokrova-symbol.png` — Isolated geometric S mark (185x233)
2. **Android Adaptive Icons**:
   - `android-adaptive-foreground.png` — 432x432 px canvas with S-mark centered in the official 66% safe zone (288x288 px)
   - `android-adaptive-background-dark.png` — 432x432 px solid `#1E2428`
   - `android-adaptive-background-light.png` — 432x432 px solid `#FFFFFF`
3. **Desktop Application Icons (Tauri 2)**:
   - `desktop-icon-dark.png` — 512x512 px on `#1E2428` slate background
   - `desktop-icon-light.png` — 512x512 px on `#FFFFFF` clean background
   - `desktop-icon-transparent.png` — 512x512 px transparent background
4. **Web & PWA Icons (Admin & POS)**:
   - `icon-512.png` — 512x512 px PWA manifest icon
   - `icon-192.png` — 192x192 px PWA manifest icon
   - `apple-touch-icon.png` — 180x180 px iOS home screen icon
   - `favicon-32x32.png` — 32x32 px browser tab favicon
   - `favicon-16x16.png` — 16x16 px browser tab favicon
