# Matchday

Mobile app built with [Expo](https://expo.dev) (SDK 57), TypeScript and [expo-router](https://docs.expo.dev/router/introduction/).

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

| Script            | What it does                          |
| ----------------- | ------------------------------------- |
| `npm start`       | Start the Expo dev server             |
| `npm run ios`     | Start and open the iOS simulator      |
| `npm run android` | Start and open the Android emulator   |
| `npm run web`     | Start and open in the browser         |
| `npm run lint`    | Lint with ESLint (`expo lint`)        |
| `npm run format`  | Format the codebase with Prettier     |
| `npm test`        | Run the Jest test suite (`jest-expo`) |

## Checks

CI expects all of these to pass:

```bash
npx tsc --noEmit   # type-check
npx eslint .       # lint
npm test           # tests
```

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
│   │   ├── Screen, Card, Button, Badge, MatchCard, SkeletonCard, TextField, StateView
│   │   └── __tests__
│   ├── lib
│   │   ├── auth       # Cognito wrapper (cognito.ts) + AuthProvider/useAuth (auth-context.tsx)
│   │   ├── data       # repository interface, mock + HttpRepository, swap point (index.ts)
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
