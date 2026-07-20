# Matchday — Project Plan

> Status: draft. M0 complete; M1+ scope is provisional — refine before starting each milestone.

## Overview

Matchday is a mobile app built with Expo (SDK 57), TypeScript and expo-router, themed with a
dark "pitch green" design system (background `#0d1f16`, teal accents, amber for alerts).

## Tech stack

- **App**: Expo SDK 57, React Native, TypeScript (strict), expo-router (file-based routing)
- **Quality**: ESLint (flat config, `eslint-config-expo`), Prettier, Jest (`jest-expo`)
- **CI**: GitHub Actions — type-check, lint, format check and tests on every PR

## Repo structure

```
matchday
├── .github/workflows   # CI
├── docs                # project docs (this plan)
├── src
│   ├── app             # expo-router routes
│   ├── components      # shared UI components (M1+)
│   ├── features        # feature modules: matches, table, squad (M1+)
│   ├── lib             # data fetching, storage, utilities (M2+)
│   └── theme           # design tokens
└── assets              # icons, splash images
```

## Milestones

### M0 — Project setup ✅ (2026-07-20)

- [x] Expo + TypeScript + expo-router scaffold
- [x] ESLint + Prettier
- [x] Jest with passing sample test
- [x] `src/theme/theme.ts` design tokens (pitch-green theme)
- [x] README with run steps

### M0.5 — CI

- [ ] GitHub Actions workflow: `tsc --noEmit`, `eslint --max-warnings 0`,
      `prettier --check`, `jest` on every PR and push to `main`
- [ ] CONTRIBUTING.md with workflow conventions

### M1 — Navigation shell & core UI ✅ (2026-07-20)

- [x] Tab navigation: Matches, Table, Squad
- [x] Shared themed components: `Screen`, `Card`, `Button`, `Badge`
- [x] Component tests via `@testing-library/react-native`

### M2 — Data layer ✅ (2026-07-20, mock-backed)

- [x] Repository interface (`src/lib/data`) with mock implementation — real
      fixtures/results API deferred; swap point is `src/lib/data/index.ts`
- [x] Data fetching via `useData` hook (loading/error/success + reload)
- [x] Loading/error/empty states using theme tokens (`StateView`)
- [x] Matches, Table and Squad screens driven by repository data
- [ ] Real data source integration (decision pending)

### M3 — Match experience ✅ (2026-07-20, mock-backed)

- [x] Match detail screen at `/match/[id]` (score header, events timeline, lineups)
- [x] Live match states — amber live badge with minute, amber/red card icons,
      postponed alert badge
- [x] Pull-to-refresh (Matches list + match detail) and 30s background polling
      while a match is live

### M4 — Polish & release

- [ ] App icon + splash final artwork
- [ ] Accessibility pass (contrast, labels, dynamic type)
- [ ] EAS build profiles, store metadata

## Definition of done (every milestone)

- Runs from a clean clone (`npm install && npm start`)
- `npx tsc --noEmit`, `npx eslint . --max-warnings 0`, `npx prettier --check .`
  and `npm test` all pass (CI green)
- No secrets or env files committed
- README and docs reflect new behavior
- Changes are minimal and intentional
