# Contributing

## Workflow

1. Branch off `main`. Naming: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`
   (use the Jira/issue ID as the slug when one exists).
2. Keep changes minimal and intentional — prefer modifying existing files over adding new ones.
3. Open a PR to `main`. CI must be green before merge.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add match detail screen
fix: correct table sort order
chore: bump expo sdk
docs: update project plan
test: cover theme tokens
```

## Checks

Run locally before pushing — CI runs the same set:

```bash
npx tsc --noEmit             # type-check
npx eslint . --max-warnings 0
npx prettier --check .       # or: npm run format
npm test
```

## Conventions

- TypeScript strict; no `any` unless justified.
- Import design tokens from `@/theme/theme` — never hard-code colors or spacing.
- Routes live in `src/app` (expo-router); shared UI in `src/components`.
- New environment variables go in `.env.example` and the docs.
- New scripts and behavior changes must be reflected in README/docs.
