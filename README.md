# Matchday

Mobile app built with [Expo](https://expo.dev) (SDK 57), TypeScript and [expo-router](https://docs.expo.dev/router/introduction/).

## Requirements

- Node.js 20+
- npm

## Getting started

```bash
npm install
npm start        # start the Expo dev server
npm run ios      # open in iOS simulator
npm run android  # open in Android emulator
npm run web      # open in the browser
```

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
│   │   ├── _layout.tsx  # root stack
│   │   ├── (tabs)       # tab navigation: Matches / Squad / Settings (Table screen hidden for now)
│   │   └── match/[id].tsx # match centre (events, lineups, live polling)
│   ├── components     # shared themed UI: Screen, Card, Button, Badge, MatchCard, SkeletonCard, StateView
│   │   └── __tests__
│   ├── lib
│   │   ├── data       # repository interface + mock data source
│   │   ├── types.ts   # domain models (Match, Standing, Player)
│   │   ├── use-data.ts # async data hook (loading/error/success)
│   │   └── favourite-team.ts # favourite team, persisted via AsyncStorage
│   └── theme
│       ├── theme.ts   # design tokens (colors, spacing, radii, typography)
│       └── __tests__
├── assets             # icons, splash images
├── app.json           # Expo config
├── eslint.config.js   # ESLint flat config (expo + prettier)
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
