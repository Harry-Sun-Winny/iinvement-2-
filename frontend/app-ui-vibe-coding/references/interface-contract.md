# Interface Contract

## Contents

1. Product character
2. Source-of-truth files
3. Theme contract
4. Visual tokens
5. Layout and responsive behavior
6. Typography and iconography
7. Data and interaction states
8. Motion and effects
9. Accessibility and performance
10. Allowed evolution

## 1. Product character

Build a serious, dense investment and research workspace with a dark atmospheric base. The interface may feel cinematic through background imagery, subtle glass, and restrained ambient effects, but data hierarchy and legibility always win.

Use these default dials:

- Design variance: `5/10`
- Motion intensity: `4/10`
- Visual density: `7/10`

The app is not a marketing landing page. Do not apply oversized heroes, sparse editorial layouts, or decorative story sections to product screens.

## 2. Source-of-truth files

Inspect these before changing UI:

- `app/styles.css`: global CSS variables, themes, shared effect classes, Tailwind theme bridge.
- `components/providers/ThemeProvider.tsx`: persisted appearance schema and runtime CSS variables.
- `components/AppearanceSettings.tsx`: controls users can change.
- `components/AppShell.tsx` and `components/AppSidebar.tsx`: workspace structure.
- `components/ui/*`: shared Radix and shadcn-style primitives.
- `lib/design-tokens.ts`: spacing, radius, typography, motion, z-index, and breakpoints.
- `app/market/themes/marketThemes.ts`: alternate market palettes.

If these disagree, prefer runtime behavior in `ThemeProvider.tsx`, then global CSS, then static tokens. Resolve drift only when it is in scope.

## 3. Theme contract

Preserve the persisted schema key `theme-settings-v2` unless a migration is intentionally designed.

User-adjustable inputs include:

- Accent color
- Text color
- Background or remote image
- Panel, card, and table colors
- Panel opacity
- Market theme
- Sakura and snow effects
- Effect density and speed
- Reduced motion

Consume these semantic variables:

| Variable | Meaning |
|---|---|
| `--panel` | Primary workspace panel |
| `--card` | Nested content surface |
| `--table` | Dense table or data surface |
| `--border` | Default subtle boundary |
| `--accent` | Current user or market accent |
| `--text-color` | User-selected content text |
| `--auto-text` | High-contrast text over backgrounds |
| `--positive` | Positive financial state |
| `--negative` | Negative financial state |
| `--bg-image` | Selected background or gradient |
| `--panel-opacity` | Surface opacity control |

Use semantic status colors for success, warning, error, and information. Do not recolor financial positive/negative values to match the accent.

## 4. Visual tokens

### Base palette

- Default base: near-black navy `#050816`
- Sidebar: `#070b18`
- Default panel family: `#16131D`, `#1C1825`, `#1A1622`
- Default border: white at about 8% or slate at about 18%
- Default app accent: blue `#54a0ff`
- Default appearance setting accent: purple `#8B5CF6`
- Default text: silver `#CBD5E1`

Do not treat the differing blue and purple defaults as permission to mix accents inside one screen. Use `--accent` for new interactive emphasis.

### Spacing

Use a 4px rhythm:

`4, 8, 12, 16, 20, 24, 32, 40`

Typical product screen:

- Page or pane padding: 16-24px
- Panel padding: 16-24px
- Compact control gap: 8px
- Section gap: 16-24px
- Major workspace gap: 24-32px

### Radius

- Small controls: 8px
- Standard controls and nested surfaces: 12px
- Prominent panels: 14px
- Large modal or showcase surface: 18px
- Pills only for badges, segmented controls, and inherently pill-shaped inputs

### Borders and shadows

- Prefer 1px low-opacity borders for grouping.
- Use tinted or neutral deep shadows, never harsh pure-black outlines.
- Glass is a surface treatment, not decoration. Keep content readable without blur.

## 5. Layout and responsive behavior

- Desktop shell uses a left navigation rail and a bounded working area.
- Dense research screens may use split panes, but each pane must have a clear scroll owner.
- Avoid nested page-level scroll traps.
- Under 1024px, collapse secondary panes or move them behind tabs, sheets, or drawers.
- Under 768px, use one content column, 16px page padding, full-width controls, and a drawer navigation.
- Tables must have an intentional mobile mode: horizontal scroll with frozen identity column, responsive column hiding, or a card/list projection.
- Never shrink critical data until it becomes unreadable.

## 6. Typography and iconography

- Current primary family: Plus Jakarta Sans with system fallbacks.
- Display: 36-48px, extra-bold, tight tracking, reserved for rare top-level moments.
- H1: 30-36px, bold.
- H2: 24-30px, semibold.
- H3: 20-24px, semibold.
- Body: 14-16px with relaxed line height.
- Dense labels: 10-12px. Uppercase and wide tracking only for short structural labels.
- Numbers and technical identifiers may use monospace.
- Keep Vietnamese diacritics fully supported.
- Use `lucide-react` because it is already established in this app. Keep stroke sizing visually consistent.

## 7. Data and interaction states

Every data-bearing feature needs:

- Loading skeleton shaped like the final layout
- Empty state explaining how to populate it
- Error state with recovery action when possible
- Stale or unavailable state when the data source can lag
- Disabled and permission-denied states where relevant

Use restrained status treatments:

- Positive: emerald or `--positive`
- Negative: red or `--negative`
- Warning: amber
- Information and selection: `--accent`
- Neutral metadata: slate/silver

Do not use color as the only signal. Pair it with text, icon, sign, or shape.

## 8. Motion and effects

- Default transitions: 100ms fast, 200ms normal, 350ms slow.
- Use movement for feedback, hierarchy, and state change.
- Ambient particles, sakura, snow, rainbow shift, shimmer, and float are optional user-controlled layers.
- New motion must stop for both `prefers-reduced-motion` and the app setting.
- Avoid continuous glow or motion on every panel.
- Do not add raw window scroll listeners. Use CSS, IntersectionObserver, or the existing motion library.

## 9. Accessibility and performance

- WCAG AA minimum contrast.
- Visible `focus-visible` treatment on every interactive control.
- Keyboard access for dialogs, tabs, menus, tables, and drawers.
- Minimum practical pointer target of 40px, ideally 44px on touch.
- Reserve image and chart dimensions to avoid layout shift.
- Lazy-load below-the-fold imagery and heavy charts.
- Keep animation away from layout properties.
- Use `100dvh` for mobile full-height surfaces.

## 10. Allowed evolution

May improve:

- Token consistency
- Mobile navigation
- Semantic colors
- State completeness
- Keyboard and screen-reader behavior
- Component reuse
- Font delivery and performance

Do not silently change:

- Theme storage schema
- Appearance options
- Logo and product name
- Route structure
- Navigation labels
- Form field names or order
- Analytics IDs and event names
- Financial meaning of colors
