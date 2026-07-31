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
- [x] Goal scorers summarised under the scoreline in the match centre header
      card, aggregated per side (repeat scorers grouped with all their
      minutes, e.g. "Callum Reed 12′, 79′")

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
- [x] `npm run test:coverage` + coverage thresholds (~80% statements/
      functions/lines, 75% branches) for `src/lib` and `src/components`,
      run in CI. Excludes `src/lib/auth/` and `src/components/auth/` — the
      Cognito wrapper is thin SDK integration code, not core app logic;
      raising its coverage is future work, not blocked by this threshold
- [x] Matches screen pins the favourite team's fixtures to the top of the
      Upcoming/Previous sections (stable sort, `src/app/(tabs)/index.tsx`)
- [x] Descriptive `accessibilityLabel`s on Table and Squad rows (position,
      team/player, stats, promotion/relegation zone); audited touch targets
      to a 44pt minimum (`Button`, `SignOutButton`)
- [x] Husky + lint-staged pre-commit hook: ESLint `--fix` and Prettier on
      staged files (`.husky/pre-commit`, `lint-staged` config in
      `package.json`)
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

### M6 — Squad management: add player (2026-07-24)

First write path in the app (everything before this was read-only against
matchday-api).

- [x] `MatchdayRepository.addPlayer` (`src/lib/data/repository.ts`) —
      implemented by both `mockRepository` (pushes into the in-memory squad)
      and `HttpRepository` (`src/lib/data/http-repository.ts`, GET the
      current squad then PUT the full array back — matchday-api only exposes
      a whole-array squad endpoint, no atomic append; acceptable race-condition
      tradeoff for a single-coach team)
- [x] `AddPlayerModal` (`src/components/add-player-modal.tsx`) — name,
      position (GK/DF/MF/FW toggle) and squad number form, presented as a
      full-screen `Modal` from the Squad tab (not an expo-router route, so it
      needs no navigation-context wiring and the Squad screen can just
      `reload()` after a successful add)
- [x] Squad screen (`src/app/(tabs)/squad.tsx`) — "Add player" button opens
      the modal; on success, refetches the squad

### M7 — Manage squad & fixtures: edit/remove players, add/edit matches

Closes the write-path gap M6 left open: a coach could add a player but never
edit one, and had no way to create a fixture or record a score at all
(seeding/patching matches was still a script run by hand against
matchday-api). Everything here is UI-only — matchday-api's M6 endpoints
already supported all of it.

- [x] Repository additions (`src/lib/data/repository.ts` +
      `mock-repository.ts` + `http-repository.ts`): `updatePlayer`,
      `removePlayer`, `createMatch`, `updateMatchScore`. The two squad writes
      follow `addPlayer`'s existing read-modify-write pattern (matchday-api
      only exposes a whole-array squad `PUT`).
- [x] `TeamProvider`/`useTeam()` (`src/lib/team-context.tsx`) — `AuthGate` now
      tracks the resolved `ManagedTeam`, not just its id, and provides it so
      screens can build a fixture with the coach's own team on one side
      without a second network round-trip.
- [x] `ChoiceChips` (`src/components/choice-chips.tsx`) — generic single-select
      chip row, factored out for match status and home/away (position choice
      in `AddPlayerModal` was left as-is rather than risk its existing tests).
- [x] `AddFixtureModal` — opponent name/short name, competition, ground,
      date/time (as separate `YYYY-MM-DD`/`HH:MM` fields — kickoff strings in
      this app are a literal UTC-labelled wall clock time, not a real
      timezone conversion, matching every existing fixture), and a home/away
      toggle. Wired to the Matches tab's new "Add fixture" button.
- [x] `EditMatchModal` — status chips (scheduled/live/finished/postponed),
      score fields (live/finished only) and a minute field (live only).
      Wired to an "Edit match" button on the match centre screen.
- [x] `EditPlayerModal` — same fields as `AddPlayerModal`, pre-filled, plus a
      "Remove player" action that requires a second confirming tap (no native
      `Alert.alert` dependency). Squad rows are now pressable and open it.
- [x] Tests: repository methods (mock + HTTP), all three new modals,
      `TeamProvider`/`useTeam`, and the screen wiring (`squad-screen.test.tsx`
      edit/remove flow; `matches-screen.test.tsx` updated for the new
      "Add fixture" button appearing in the button-role query).
- **Known gap:** no server-side validation that a coach doesn't double-book a
  kickoff slot, and no undo on player removal beyond the confirm tap.

### M8 — Lineup and formation editor

- [x] `Match.formation?: string` (`src/lib/types.ts`) — our team's shape for a
      match, e.g. "2-3-1". Free text rather than a fixed enum: this squad
      plays 7- or 9-a-side, not 11, so a preset list of standard formations
      would be wrong. matchday-api's `Match` type gained the same field (and
      closed its pre-existing `venue` gap) in a type-only PR — no deploy
      needed, the handler already stored/returned unrecognised fields.
- [x] Repository: `updateLineup(id, { side, formation?, players })`. Both
      implementations only ever touch **our** side — we don't manage the
      opponent's roster, so their `lineups` entry (if any) is left alone.
      `HttpRepository` reads the match first and merges our side back in,
      since the API's PATCH replaces the whole `lineups` object rather than
      deep-merging it.
- [x] `EditLineupModal` (`src/components/edit-lineup-modal.tsx`) — a visual
      pitch, not a flat list:
  - **Team size** (5–11) and **formation** (e.g. "2-2-2") steppers. Formation
    options are generated per team size — every way to split the outfield
    count into 3 positive DF-MF-FW parts — rather than a fixed 11-a-side
    preset list, since this squad plays 7-/9-a-side.
  - The pitch renders one circular slot per formation slot (GK row at the
    bottom, then DF/MF/FW rows moving up the pitch toward the opponent's
    goal). Tapping an empty slot opens a picker restricted to squad players
    of that slot's position; tapping a filled slot lets you reassign or
    clear it.
  - **Substitutes** are computed, not picked: whichever squad players aren't
    currently in a pitch slot.
  - **No positional metadata is stored** — reopening the editor re-places
    the saved starting XI into slots by matching each player's squad
    `position` to a slot of the same group (defenders are interchangeable
    within the back line, so slot identity within a group doesn't need to
    survive a save/reload round trip). Changing team size or formation
    re-runs the same placement over whoever's currently assigned, so
    tweaking the shape doesn't lose the squad selection.
  - Wired to a new "Edit lineup" button on the match centre, next to
    "Edit match".
- [x] Match centre shows the formation next to whichever lineup column is
      ours (`data.home.id === ownTeam.id`, via `useTeam()`).
- [x] Tests: `updateLineup` (mock + HTTP), `EditLineupModal` (formation/team
      size steppers, position-restricted picker, assign/clear, pre-fill from
      an existing lineup), and match centre wiring.
- **Known gap:** the pitch is schematic (rows of circles), not a
  geometrically accurate positional diagram — there's no left/right or
  precise x/y placement within a row.

### M7.1 — Clashing kickoff warning ([#28](https://github.com/mgphp/matchday/issues/28))

Closes an M7 known gap: nothing stopped a coach adding two fixtures in the
same slot.

- [x] `src/lib/fixture-clash.ts` — `findClashingFixture` returns an existing
      fixture within `CLASH_WINDOW_MINUTES` (2 hours) of a proposed kickoff.
      Postponed fixtures are skipped (they aren't being played), and an
      `ignoreMatchId` option keeps a future "edit fixture" flow from clashing
      with itself.
- [x] `AddFixtureModal` takes `existingFixtures` and shows an amber warning
      naming the clash. **Advisory only — Add is never disabled.** Tournaments
      and double-headers are real, and a coach knows their own diary better
      than a two-hour rule does.
- [x] Tests: window boundaries on both sides, postponed fixtures, unparseable
      dates, self-ignore, plus the modal warning appearing/not appearing and
      leaving Add enabled.
- **Known gap:** the check is client-side only. Two devices adding the same
  slot at once would both succeed — fine for a single-coach team.

### M9 — Match clock ([#31](https://github.com/mgphp/matchday/issues/31))

Before this, a live match's minute was a number the coach typed into
`EditMatchModal`, and the match centre's 30s poll only refetched that stored
value — nothing ticked, and closing the app froze the match.

- [x] `MatchPeriod` (`src/lib/types.ts`) — a period name plus `startedAt` and
      an optional `endedAt`, and `Match.periods?: MatchPeriod[]`. An array
      rather than a pair of timestamps so half-time is _recorded_ rather than
      inferred, and so a third period could be appended without a type change.
- [x] `src/lib/match-clock.ts` — pure derivation, no React:
  - `elapsedMinutes(periods, now)` sums time inside periods only, so the
    half-time gap is excluded automatically and a finished match freezes.
  - `displayMinute(match, now)` prefers the derived clock but falls back to
    the legacy hand-entered `Match.minute`, so fixtures recorded before this
    milestone still render. `minute` is kept in the type for exactly that
    reason and is cleared the moment a match gains periods.
  - `nextClockAction(match)` returns the single control to offer next
    (kick-off → half-time → second-half → full-time), and
    `applyClockAction(match, action, now)` returns the resulting periods and
    status. Keeping both pure means the screen holds no clock state.
- [x] `useNow(intervalMs, active)` (`src/lib/use-now.ts`) — re-reads the wall
      clock on an interval so the minute ticks between polls. Only active
      while a period is actually running; at half time the clock is stopped,
      so re-rendering every second would show the same number.
- [x] Repository: `updateMatchClock(id, { status, periods })` (mock + HTTP).
      The HTTP implementation sends `minute: null` alongside, so a stale
      legacy value can't shadow the derived clock.
- [x] Match centre: one primary clock button (whichever action is next), and
      a "Half time N′" badge while the clock is stopped between periods so a
      frozen "LIVE" minute doesn't look like a bug.
- [x] `EditMatchModal` lost its Minute field (and `MatchScoreUpdate` lost
      `minute`) — the status chips remain for corrections, but the clock now
      owns the minute. The modal points at the clock controls instead.
- [x] Tests: `match-clock` (half-time gaps, finished matches, legacy
      fallback, out-of-order timestamps, every action transition), `useNow`,
      both repositories, and the match centre wiring.
- **Known gap:** no stoppage-time allowance — the clock counts real elapsed
  time only, so added time has to be handled by when the coach presses the
  next control.

## Definition of done (every milestone)

- Runs from a clean clone (`npm install && npm start`)
- `npx tsc --noEmit`, `npx eslint . --max-warnings 0`, `npx prettier --check .`
  and `npm test` all pass (CI green)
- No secrets or env files committed
- README and docs reflect new behavior
- Changes are minimal and intentional
