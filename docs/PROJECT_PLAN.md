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
  - **Slot assignments are stored** — `LineupUpdate.slots` (a slot id →
    squad id map alongside `players`, `Lineups.homeSlots`/`awaySlots` on
    read) persists exactly which slot each player was in, so a lineup
    assigned out of tap order reopens unchanged instead of being re-placed.
    A lineup with no slot map (saved before this landed) still falls back to
    `placeByPosition`, matching each player's squad `position` to a slot of
    the same group. Changing team size or formation re-runs that same
    fallback placement over whoever's currently assigned — slot ids are
    formation-derived, so the old ones don't carry across a shape change
    anyway — which is enough to not lose the squad selection.
  - Wired to a new "Edit lineup" button on the match centre, next to
    "Edit match".
- [x] Match centre shows the formation next to whichever lineup column is
      ours (`data.home.id === ownTeam.id`, via `useTeam()`).
- [x] Tests: `updateLineup` (mock + HTTP), `EditLineupModal` (formation/team
      size steppers, position-restricted picker, assign/clear, pre-fill from
      an existing lineup, slot-order round trip), and match centre wiring.
- **Known gap:** the pitch is schematic (rows of circles), not a
  geometrically accurate positional diagram — there's no left/right or
  precise x/y placement within a row. Closed by
  [#43](https://github.com/mgphp/matchday/issues/43) (M8.1).

### M8.1 — Positional pitch slots ([#43](https://github.com/mgphp/matchday/issues/43))

Closes the M8 known gap, now that M8's slot persistence ([#30](https://github.com/mgphp/matchday/issues/30))
has landed to make a slot's position meaningful across a save/reload.

- [x] `Slot` gains `lane: number` — a normalised horizontal position (0 = left
      touchline, 1 = right touchline) computed by `laneFor(index, count)`,
      which spreads `count` slots evenly with margin at each touchline. Works
      for any positive count, so a 1-defender row and a 5-defender row both
      lay out correctly across every DF-MF-FW split from 5- to 11-a-side.
  - GK is fixed at the centre (`lane: 0.5`); outfield slots get a lane in
    tap-index order, so `DF-0` is consistently the leftmost defender.
- [x] `pitchRow` switched from flexbox `space-evenly` to absolute positioning:
      each slot sits at `left: ${lane * 100}%` with a fixed `translateX` to
      centre it on that point. Lane is purely visual — the position picker
      still restricts by `slot.group` only, not by lane.
- [x] Tests: `laneFor`/`buildSlots` across a range of team sizes and
      formations (1-slot rows centre, multi-slot rows spread left-to-right
      in index order, lanes stay within the touchlines).

### M8.2 — Realistic half-pitch markings ([#47](https://github.com/mgphp/matchday/issues/47))

Cosmetic pass on the lineup editor: the pitch was a plain green rectangle with
a hairline halfway line and one centred box. It now reads as a defensive half —
our goal at the bottom, halfway line at the top.

- [x] `PitchMarkings` (same file as `EditLineupModal`) draws stripes, halfway
      line, centre-circle arc + spot, penalty area, goal area, penalty arc
      ("the D"), penalty spot, goal frame and two corner arcs — all plain
      `View`s. Arcs are half/quarter circles made with a rounded,
      one-side-open border (no SVG or `clip-path` in RN).
- [x] The pitch is given a fixed `aspectRatio` so the markings hold their
      proportions; the four slot rows moved to an absolutely-positioned layer
      (`pitchRows`, `space-evenly`) on top of the markings, so slot layout and
      the position picker are unchanged.
- [x] New grass/paint constants only (`PITCH_STRIPE`, `PITCH_LINE_WIDTH`,
      `PITCH_ASPECT_RATIO`) alongside the existing `PITCH_GREEN` / `PITCH_LINE`
      — no theme tokens hard-coded.
- [x] Test: the markings and each sub-part render (by `testID`), on top of the
      existing slot/assignment/availability tests.

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

### M7.2 — Undo a player removal ([#29](https://github.com/mgphp/matchday/issues/29))

Closes the other M7 known gap: removal was guarded by a confirming tap, but
once through there was no way back.

- [x] `MatchdayRepository.restorePlayer(player)` (mock + HTTP) — deliberately
      **not** `addPlayer`. `addPlayer` mints a new id, and an undo that
      changes a player's identity would orphan any match event referencing
      their `playerId`. `restorePlayer` writes the original object back, and
      is a no-op if the player is somehow already there (double-tapped Undo).
- [x] `UndoBanner` (`src/components/undo-banner.tsx`) — transient bar with an
      Undo action, auto-dismissing after 8 seconds. Not a blocking confirm:
      the removal has already gone through, so ignoring the banner is a valid
      answer. `accessibilityLiveRegion="polite"` so it is announced.
- [x] Squad screen holds the removed player and shows the banner; Undo calls
      `restorePlayer` and refetches.
- [x] Tests: banner (press, timeout, timeout disabled, no dismiss after
      unmount), both repository implementations, and the screen flow asserting
      the **original id** comes back and `addPlayer` is never called.
- **Known gap:** `restorePlayer` appends rather than restoring the original
  index. The Squad screen groups by position, so this is invisible in
  practice.

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

### M10 — Substitutions ([#32](https://github.com/mgphp/matchday/issues/32))

`MatchEvent` already had a `'substitution'` type and the match centre rendered
it, but events were read-only seed data — a coach could not record a sub.

- [x] `MatchEvent.playerId` / `relatedPlayerId` (`src/lib/types.ts`) — optional
      squad ids alongside the existing display strings. Display keeps using
      `player`/`detail`; anything reasoning about _which_ player needs ids,
      because names are not stable identifiers. `relatedPlayerId` is named
      generically so a goal can later record its assister the same way.
- [x] `src/lib/lineup-state.ts` — `playersOnPitch` applies substitutions to the
      starting lineup in **minute order** (not array order, since a coach can
      record one late), keeping the substitute in the slot the outgoing player
      vacated. `playersOnBench` is the complement. Substitutions recorded
      without ids are ignored rather than name-matched: guessing would
      silently corrupt the result.
- [x] Repository: `addEvent(id, event)` (mock + HTTP), keeping the timeline
      minute-sorted. The HTTP implementation is read-modify-write against the
      existing `PATCH`, exactly like `updateLineup` — **no new matchday-api
      endpoint was needed**, contrary to what the issue assumed.
- [x] `SubstitutionModal` — "Coming off" lists the pitch, "Coming on" lists the
      bench, minute pre-filled from the clock but editable. Rows in the two
      lists carry "Take off …" / "Bring on …" accessibility labels, since they
      are otherwise indistinguishable to a screen reader.
- [x] Match centre: a "Substitution" button, shown only while the match is
      live (before kick-off, the lineup editor is the right tool).
- [x] Tests: `lineup-state` (out-of-order subs, sub-on-then-off, unknown
      player, opponent's subs, id-less legacy events), `SubstitutionModal`,
      both repositories, and the match centre wiring.
- **Known gap:** no way to edit or delete a recorded event — a mistyped minute
  has to be lived with.

### M11 — Minutes played ([#33](https://github.com/mgphp/matchday/issues/33))

With the clock (M9) and substitutions (M10) in place, playing time is a
derivation rather than something to track by hand.

- [x] `src/lib/player-minutes.ts` — `playerMinutes` takes the starting lineup,
      the events, our side, the squad and the elapsed minutes, and returns
      every squad player with minutes and an on-pitch flag, in squad order.
  - Works entirely in **match-minute space**, so half time needs no special
    handling: `elapsed` already excludes the gap and substitution minutes are
    match minutes too.
  - A substitution minute typed ahead of the clock is clamped to `elapsed`,
    so a fat-fingered "70" during the 50th minute can't credit unplayed time.
  - Handles a player coming on, going off and coming back on — each spell is
    accumulated separately.
  - A starter missing from the squad list (stale squad fetch) is still
    reported rather than silently dropped.
- [x] Match centre "Minutes played" card, split into "On pitch" and "Bench",
      ticking live off the same clock. Shown only once a match is live or
      finished — before kick-off everyone is on zero, which is just noise.
      Rows carry a descriptive `accessibilityLabel` ("… 58 minutes played, on
      the bench").
- [x] Tests: 12 cases over the derivation (spells, out-of-order events,
      future minutes, opponent's subs, frozen full time) plus the screen
      wiring.
- **Known gap:** per-match only. Season totals per player would be a natural
  follow-up but need results aggregated across fixtures.

### M12 — Rotation helper ([#34](https://github.com/mgphp/matchday/issues/34))

The point of M9–M11: during a match, show who needs bringing on and who has
had enough, so game time is shared fairly.

- [x] `Match.durationMinutes?: number` — full-time length, edited via a
      "Full-time minutes" field in `EditMatchModal` (default 90). Per-match
      rather than a constant because youth football runs shorter than 90 and
      varies by age group.
- [x] `src/lib/rotation.ts`:
  - `target` = an even split of the total playing time on offer
    (`duration x lineup size / squad size`).
  - `expected` = the same figure pro-rata to the clock, capped at `duration`
    so stoppage time doesn't keep inflating what a player is owed.
  - `status` is `under` / `on-track` / `over` against `expected`, with a
    ±3 minute tolerance — without it the whole squad flickers amber between
    every substitution.
  - `dueOn` / `dueOff` pick the single most useful name in each direction
    (least-played on the bench who is behind; most-played on the pitch who is
    ahead), which is what a coach actually needs mid-match.
- [x] Match centre: minutes rows show `played/target` with a teal "due on" or
      amber "due off" tag, and a "Due off … · Due on …" hint sits next to the
      Substitution button. Accessibility labels carry the target and status
      too.
- [x] Tests: 12 cases over targets, tolerance boundaries, the full-time cap,
      empty squads and both pickers, plus the modal and screen wiring.
- **Known gap:** "available" means the whole squad — there is no per-match
  availability, so a player who isn't at the game still lowers everyone's
  target and shows as permanently "due on". That is the next thing to fix
  here, and probably means an availability step in the lineup editor.

### M13 — Per-match availability ([#39](https://github.com/mgphp/matchday/issues/39))

Closes M12's known gap: "available" meant the whole squad, so anyone who
didn't turn up still lowered everyone else's target and sat permanently at
"due on".

- [x] `Match.availablePlayerIds?: string[]` — **absent means everyone**. That
      covers both fixtures recorded before this existed and the normal week
      where the whole squad turns up, so a coach never ticks anyone in for a
      full-strength side. An empty list means nobody, which is different.
- [x] `src/lib/availability.ts` — `isAvailable`, `availablePlayers`,
      `unavailablePlayers`. A test asserts the last two partition the squad
      exactly, since a player appearing in both halves would double-count.
- [x] Set in `EditLineupModal`'s substitutes list: tap anyone who isn't at the
      match. **Only bench players are toggleable** — anyone picked to start is
      available by definition. State is held as the _available_ set rather
      than the missing one, so it needs no knowledge of the squad until a row
      is tapped, and unticking the last missing player drops back to
      `undefined` rather than storing a list naming everybody.
- [x] Match centre filters unavailable players out **before** `rotation()`
      runs, so no signature change was needed — the existing
      `minutes.length` divisor becomes the available count for free. They are
      listed under a "Not available" heading with no target.
- [x] `LineupUpdate.availablePlayerIds`, persisted by both repositories. The
      HTTP one sends `null` to clear, so going back to a full squad actually
      sticks instead of leaving a stale list.
- [x] Tests: `availability` (absent vs empty list, partitioning), the modal
      (mark, unmark, pre-fill, and that a full squad sends nothing), both
      repositories, and a screen test proving the target moves from 64 to 90
      minutes when two of seven drop out.
- **Known gap:** a player added to the squad _after_ availability was set for
  a match reads as unavailable for it, because they aren't in the stored
  list. Only affects fixtures already marked up.

## Definition of done (every milestone)

- Runs from a clean clone (`npm install && npm start`)
- `npx tsc --noEmit`, `npx eslint . --max-warnings 0`, `npx prettier --check .`
  and `npm test` all pass (CI green)
- No secrets or env files committed
- README and docs reflect new behavior
- Changes are minimal and intentional
