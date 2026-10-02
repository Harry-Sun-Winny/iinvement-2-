---
name: app-ui-vibe-coding
description: Build, restyle, or extend web app interfaces so they preserve this product's established visual settings, theme controls, component language, density, responsiveness, and interaction behavior. Use for vibe-coding a new app or screen, redesigning an existing React or Next.js UI, translating a screenshot or feature request into code, creating shared UI components, or asking Terra, Sol, Luna, or another coding model to make an app look and behave like this one.
---

# App UI Vibe Coding

Treat the interface contract as the source of truth and the current repository as evidence. Produce a working product surface, not a static mockup.

## Required reading

1. Read [references/interface-contract.md](references/interface-contract.md) for the visual and behavioral contract.
2. Read [references/execution-playbook.md](references/execution-playbook.md) for the implementation loop and model handoff format.
3. Read [references/component-recipes.md](references/component-recipes.md) only when creating or changing components.

## Operating modes

Choose one mode before editing:

- `PRESERVE`: keep the current brand, routes, copy intent, analytics hooks, and UI behavior. Use for normal feature work.
- `EVOLVE`: preserve product identity while improving consistency, accessibility, responsive behavior, and maintainability.
- `CLONE`: apply this interface contract to a different app while adapting information architecture to that app.

Default to `PRESERVE` for an existing repository and `CLONE` for a new app. Never silently replace the theme system, logo, routes, field names, or user settings.

## Workflow

### 1. Inspect before coding

- Read `package.json`, the root layout, global CSS, theme provider, app shell, shared UI primitives, and the target screen.
- Reuse installed libraries. Do not import a package that is absent from `package.json`.
- Identify dirty or user-owned changes and preserve them.
- State a one-line UI read:
  `Mode: <mode>. Surface: <screen kind>. Contract: dense dark investment workspace, user-selectable theme, restrained glass panels, data-first hierarchy.`

### 2. Lock the contract

Use semantic tokens and existing theme settings. Do not hardcode a new visual island.

Priority order:

1. Existing runtime CSS variables such as `--panel`, `--card`, `--table`, `--border`, `--accent`, `--text-color`, `--positive`, `--negative`, and `--bg-image`.
2. Existing shared primitives under `components/ui`.
3. Existing tokens in `lib/design-tokens.ts`.
4. New semantic tokens only when no existing token expresses the meaning.

Preserve the user's appearance choices. A screen must remain legible when accent, text color, background image, panel opacity, market theme, and reduced-motion settings change.

### 3. Implement in vertical slices

Build one complete user path at a time:

1. Shell and responsive layout.
2. Primary content and real data wiring.
3. Loading, empty, error, and disabled states.
4. Keyboard, focus, contrast, and reduced-motion behavior.
5. Visual refinement and small motion.

Keep Server Components by default. Isolate interactive state and animation in small Client Components. Avoid speculative architecture and fake product data unless the user explicitly requests a mock.

### 4. Verify

- Run focused tests first, then the repository test or build command when proportional to the change.
- Run `node .agents/skills/app-ui-vibe-coding/scripts/ui-preflight.mjs <changed files...>`.
- Inspect the result at desktop, tablet, and mobile widths.
- Test at least the default dark theme, one alternate accent or market theme, a background image with panel opacity, and reduced motion.
- Fix failures before delivery. Report warnings that are inherited and outside the changed scope.

## Non-negotiable rules

- Preserve the dark, data-first product identity. Use color primarily for meaning, selection, and status.
- Use one icon family already present in the app. This repository currently uses `lucide-react`; do not introduce a second family.
- Use the established 4px spacing rhythm and 8/12/14/18px radius scale.
- Use `min-h-[100dvh]` for full-height mobile-capable surfaces. Existing `h-screen` may remain outside the changed scope, but do not add more.
- Prefer CSS Grid for structured data layouts and explicit single-column mobile collapse below 768px.
- Keep sidebar and workspace behavior consistent with the app shell. Do not assume a fixed 256px sidebar on small screens.
- Provide loading, empty, error, disabled, hover, active, focus-visible, and selected states when applicable.
- Respect `prefers-reduced-motion` and the app's `reducedMotion` setting.
- Animate only `transform` and `opacity` for continuous motion. Do not store scroll or pointer coordinates in React state.
- Maintain WCAG AA contrast for text, controls, placeholders, and focus rings.
- Do not invent financial precision, performance claims, testimonials, or production data.
- Do not create decorative fake dashboards, hand-drawn SVG icons, generic three-card marketing rows, or isolated AI-purple visual sections.
- Do not refactor unrelated code while implementing a UI request.

## Model handoff contract

This skill is model-independent. Terra, Sol, Luna, or another coding model must receive the same compact handoff:

```text
Use $app-ui-vibe-coding.
Mode: PRESERVE | EVOLVE | CLONE
Goal: <one user outcome>
Scope: <routes/components>
Keep: <brand, data behavior, routes, analytics>
Change: <requested behavior and UI>
Acceptance: <observable checks>
```

For a fast vibe-coding pass, keep the goal narrow and let the model inspect the repository. For a high-risk redesign, require an audit and token map before edits.

## Completion format

Return:

- The user-visible outcome.
- Files changed.
- Verification run and result.
- Any inherited issue not changed.
- One concise next-use prompt, only when useful.
