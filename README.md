# Matchday

Mobile app built with [Expo](https://expo.dev) (SDK 57), TypeScript and [expo-router](https://docs.expo.dev/router/introduction/).

## Features

- **Matches** — fixtures grouped under "Upcoming" (scheduled/live/postponed) and
  "Previous" (finished) sections, with pull-to-refresh and a skeleton loading
  state while fixtures load; "Add fixture" creates a new match against the
  coach's own team, warning (but not blocking) if a kickoff lands within two
  hours of a fixture already in the diary
- **Squad** — players grouped under GK/DF/MF/FW section headers; "Add player"
  and tapping a row to edit or remove them
- **Table** — full league standings with promotion/relegation zone
  highlighting; implemented but currently hidden from the tab bar pending
  further polish (`src/app/(tabs)/table.tsx`)
- **Settings** — pick a favourite team, persisted on-device via
  `@react-native-async-storage/async-storage`
- **Match centre** (`/match/[id]`) — score header, events timeline (goals,
  cards, substitutions) and lineups once teams are announced; "Edit match"
  updates status and score; "Edit lineup" picks the starting XI from
  the squad and sets a formation (e.g. "2-3-1")
- **Match clock** — "Kick off", "Half time", "Second half" and "Full time"
  controls on the match centre record period timestamps, and the displayed
  minute is derived from them. The clock therefore keeps advancing while the
  app is closed, survives a restart, and excludes the half-time gap
  (`src/lib/match-clock.ts`)
- **Live polling** — while a match is live, the match centre refetches
  automatically every 30s and the derived clock ticks every second in between;
  pull-to-refresh is available everywhere data loads
- **Theme** — dark "pitch green" design system (see [Theme](#theme) below),
  driven entirely by tokens in `src/theme/theme.ts`
- **Coach auth** — sign in/register against [`matchday-api`](https://github.com/mgphp/matchday-api)
  (see [Backend & auth](#backend--auth) below)

## Requirements

- Node.js 20+
- npm

## Getting started

```bash
npm install
cp .env.example .env   # fill in with matchday-api's deploy output (see below)
npm start        # start the Expo dev server
npm run ios      # open in iOS simulator
npm run android  # open in Android emulator
npm run web      # open in the browser
```

### Backend & auth

The app talks to [`matchday-api`](https://github.com/mgphp/matchday-api) (Lambda + DynamoDB +
Cognito). `.env` needs three values from that repo's `npm run deploy` output:

```
EXPO_PUBLIC_API_URL=https://<function-url>.lambda-url.<region>.on.aws/
EXPO_PUBLIC_COGNITO_USER_POOL_ID=<region>_xxxxxxxxx
EXPO_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

Coaches sign in (or register) on first launch — see `src/components/auth/`. Cognito auth pulls
in a native crypto polyfill (`react-native-get-random-values`), so **Expo Go can't run this app**;
use a dev client build (`npx eas build --profile development`, per the Builds section below).

## Scripts

| Script                  | What it does                                |
| ----------------------- | ------------------------------------------- |
| `npm start`             | Start the Expo dev server                   |
| `npm run ios`           | Start and open the iOS simulator            |
| `npm run android`       | Start and open the Android emulator         |
| `npm run web`           | Start and open in the browser               |
| `npm run lint`          | Lint with ESLint (`expo lint`)              |
| `npm run format`        | Format the codebase with Prettier           |
| `npm test`              | Run the Jest test suite (`jest-expo`)       |
| `npm run test:coverage` | Run tests with coverage (`jest --coverage`) |

## Checks

CI expects all of these to pass:

```bash
npx tsc --noEmit         # type-check
npx eslint .             # lint
npm run test:coverage    # tests + coverage thresholds
```

Coverage thresholds (~80% statements/functions/lines, 75% branches) apply to
`src/lib` and `src/components`, excluding the Cognito auth wrapper
(`src/lib/auth/`) and its screens (`src/components/auth/`) — that area is
thin AWS SDK integration code, tracked separately under M5 in
`docs/PROJECT_PLAN.md` rather than gated by this threshold.

A Husky pre-commit hook runs `lint-staged` (ESLint `--fix` + Prettier) on
staged files automatically — it's installed via the `prepare` script on
`npm install`, so no extra setup is needed.

## Project structure

```
matchday
├── src
│   ├── app            # expo-router routes (file-based routing)
│   │   ├── _layout.tsx  # root stack — wraps everything in AuthProvider + AuthGate
│   │   ├── (tabs)       # tab navigation: Matches / Squad / Settings (Table screen hidden for now)
│   │   └── match/[id].tsx # match centre (events, lineups, live polling)
│   ├── components
│   │   ├── auth       # AuthGate + login/register/onboarding screens (coach auth flow)
│   │   ├── add-player-modal.tsx # squad write path — name/position/number form
│   │   ├── Screen, Card, Button, Badge, MatchCard, SkeletonCard, TextField, StateView
│   │   └── __tests__
│   ├── lib
│   │   ├── auth       # Cognito wrapper (cognito.ts) + AuthProvider/useAuth (auth-context.tsx)
│   │   ├── data       # repository interface (incl. addPlayer), mock + HttpRepository, swap point (index.ts)
│   │   ├── coach-api.ts # club/coach/team management endpoints (registration, onboarding)
│   │   ├── types.ts   # domain models (Match, Standing, Player)
│   │   ├── use-data.ts # async data hook (loading/error/success)
│   │   └── favourite-team.ts # favourite team, persisted via AsyncStorage
│   └── theme
│       ├── theme.ts   # design tokens (colors, spacing, radii, typography)
│       └── __tests__
├── assets             # icons, splash images
├── app.json           # Expo config
├── eslint.config.js   # ESLint flat config (expo + prettier)
├── .env.example        # EXPO_PUBLIC_* vars for matchday-api + Cognito
├── .prettierrc.json
├── tsconfig.json
└── package.json
```

## Builds

Cloud builds via [EAS](https://docs.expo.dev/build/introduction/) — profiles in `eas.json`:

```bash
npx eas build --profile development  # dev client, internal distribution
npx eas build --profile preview     # internal distribution
npx eas build --profile production  # store build, auto-incremented version
```

## Theme

Dark "pitch green" theme defined in [`src/theme/theme.ts`](src/theme/theme.ts):

- Background: deep green `#0d1f16`
- Accent: teal `#2dd4bf`
- Alerts: amber `#f5a623`

Import tokens rather than hard-coding values:

```ts
import { colors, spacing } from '@/theme/theme';
```
