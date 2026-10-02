# Execution Playbook

## Fast vibe-coding loop

Use this loop for Terra, Sol, Luna, or any capable coding model:

1. Inspect the target and its nearest shared components.
2. Declare mode and UI read.
3. List at most five acceptance checks.
4. Implement the smallest complete vertical slice.
5. Run focused tests and UI preflight.
6. Inspect responsive and theme variants.
7. Fix and deliver.

Do not ask the user to restate information discoverable in the repository.

## Model role guidance

Use the fastest implementation-oriented model for bounded component work, styling, responsive fixes, and routine tests. Use the strongest reasoning-oriented model for design-system migration, broad redesigns, state architecture, accessibility audits, and cross-route refactors.

Model names change over time. The contract does not. Never encode behavior that only one model can understand.

## Prompt template

```text
Use $app-ui-vibe-coding.
Mode: PRESERVE.
Goal: Add a compact portfolio risk summary that works with the current theme settings.
Scope: /holdings and its shared dashboard components.
Keep: Routes, data contracts, sidebar, theme-settings-v2, Vietnamese/English copy behavior.
Change: Add loading, empty, error, populated, and mobile states.
Acceptance:
- Uses semantic runtime theme variables.
- One-column mobile fallback below 768px.
- Keyboard-visible actions.
- Reduced-motion safe.
- Existing tests and focused UI preflight pass.
```

## New-app clone template

```text
Use $app-ui-vibe-coding.
Mode: CLONE.
Goal: Build <app type> with the same UI DNA as the investment workspace.
Stack: Next.js, TypeScript, Tailwind v4, Radix primitives.
Required: Token-based dark theme, user-selectable accent/background/panel opacity, dense app shell, full UI states, responsive drawer navigation, reduced motion.
Avoid: Copying investment-specific content or inventing fake production data.
```

## Redesign template

```text
Use $app-ui-vibe-coding.
Mode: EVOLVE.
Audit the current route before editing.
Preserve routes, business behavior, copy intent, analytics, and appearance settings.
Improve token consistency, responsive behavior, accessibility, and visual hierarchy.
Show the token map and acceptance checks before implementation.
```

## Scope control

Treat these as separate tasks unless the user combines them:

- Visual restyle
- Information architecture change
- Copy rewrite
- Data-model change
- Theme schema migration
- Navigation redesign

If a requested visual change requires one of the other categories, explain the dependency before expanding scope.

## Review rubric

Score each changed surface from 0 to 2:

| Area | 0 | 1 | 2 |
|---|---|---|---|
| Contract | Visual island | Partial tokens | Fully theme-aware |
| Responsive | Broken | Basic stack | Intentional modes |
| States | Success only | Some states | Full state cycle |
| Accessibility | Missing | Mostly usable | Keyboard, focus, contrast |
| Motion | Distracting | Acceptable | Motivated and reducible |
| Verification | None | Static checks | Tests plus visual checks |

Do not deliver below 10/12 without stating the limitation.
