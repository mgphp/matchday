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
- [x] Shared themed components: `Screen`, `Card`, `Button`, `Badge`, `SectionHeader`
- [x] Component tests via `@testing-library/react-native`

### M2 — Data layer ✅ (2026-07-20, mock-backed)

- [x] Repository interface (`src/lib/data`) with mock implementation — real
      fixtures/results API deferred; swap point is `src/lib/data/index.ts`
- [x] Data fetching via `useData` hook (loading/error/success + reload)
- [x] Loading/error/empty states using theme tokens (`StateView`)
- [x] Matches, Table and Squad screens driven by repository data
- [x] Real data source integration — see M5 below

### M3 — Match experience ✅ (2026-07-20, mock-backed)

- [x] Match detail screen at `/match/[id]` (score header, events timeline, lineups)
- [x] Live match states — amber live badge with minute, amber/red card icons,
      postponed alert badge
- [x] Pull-to-refresh (Matches list + match detail) and 30s background polling
      while a match is live

### M4 — Polish & release (in progress)

- [ ] App icon + splash final artwork (needs design input — template icons in
      place, splash/adaptive-icon backgrounds already pitch-green)
- [x] Accessibility pass: `textDisabled` contrast raised to WCAG AA,
      descriptive labels on match cards and loading states, dynamic type left
      enabled (default font scaling)
- [x] EAS build profiles (`eas.json`: development / preview / production)
- [x] Shared `SectionHeader` component (default + accent variants), adopted by
      Squad's position groups and the match centre's Events/Lineups headings
- [x] Matches screen split into "Upcoming" (scheduled/live/postponed) and
      "Previous" (finished) sections via `SectionHeader`
- [x] Skeleton loading state: Matches screen shows 3 pulsing `SkeletonCard`
      placeholders instead of a spinner while fixtures load
- [x] Settings tab with a favourite-team picker, persisted via
      `@react-native-async-storage/async-storage` (`src/lib/favourite-team.ts`)
- [ ] Store metadata (needs store accounts)

### M5 — Coach auth & real backend (matchday-api M5c, 2026-07-24)

Wires the app to the deployed [`matchday-api`](https://github.com/mgphp/matchday-api)
(M6: club/coach/team model, Cognito auth) instead of the mock repository.

- [x] `HttpRepository` (`src/lib/data/http-repository.ts`) implementing
      `MatchdayRepository`, parameterized by `teamId` — defaults the `venue`
      field to `''` since matchday-api's `Match` type doesn't carry one yet
      (tracked as a gap, not fixed here)
- [x] Coach auth: sign in, self-registration (email/password + club/team
      setup in one form), email confirmation, and the Cognito
      `NEW_PASSWORD_REQUIRED` challenge (for coaches created via
      matchday-api's migration script) — `src/lib/auth/`,
      `src/components/auth/`
- [x] Session persisted via `@react-native-async-storage/async-storage`,
      with transparent access-token refresh (`useAuth().getAccessToken`)
- [x] `AuthGate` (`src/app/_layout.tsx`) gates the tab navigator behind
      sign-in + onboarding (club/team creation or picking one of up to 3
      teams), then flips the data-source swap point
      (`src/lib/data/index.ts`'s `setRepository`)
- [x] `.env.example` documents `EXPO_PUBLIC_API_URL`,
      `EXPO_PUBLIC_COGNITO_USER_POOL_ID`, `EXPO_PUBLIC_COGNITO_CLIENT_ID`
- [x] Mock repository kept as the default/test data source; screens are
      unaffected and their tests still mock `@/lib/data` directly
- **Note:** Cognito auth requires `react-native-get-random-values` (native
  crypto polyfill), so the app now needs a dev client build — Expo Go no
  longer works. See README's Backend & auth section.

## Definition of done (every milestone)

- Runs from a clean clone (`npm install && npm start`)
- `npx tsc --noEmit`, `npx eslint . --max-warnings 0`, `npx prettier --check .`
  and `npm test` all pass (CI green)
- No secrets or env files committed
- README and docs reflect new behavior
- Changes are minimal and intentional
