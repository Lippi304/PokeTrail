---
phase: 01-foundation-toolchain-engine-core
plan: 05
subsystem: deploy
tags: [deploy, vercel, spa, ci, foundation]
requires:
  - vercel-project-linked-to-github (user_setup; performed by user before this plan ran)
  - dist-bundle-from-01-04 (locked D-03 disclaimer present in production build)
provides:
  - vercel.json (Vite framework preset + SPA-fallback rewrite per Pitfall 5)
  - README.md ## Live section pointing at https://poke-trail.vercel.app/
  - .gitignore exclusion for .vercel/ link cache
  - "deep-URL refresh does not 404" guarantee for all subsequent UI work
affects:
  - every Phase 3+ UI screen automatically gets a Vercel preview deploy on PR / push to main
  - Phase 4+ battle UI can rely on /any/path SPA-routing without 404 surprises
tech-stack:
  added: []
  patterns:
    - vercel.json `rewrites.source` regex with negative lookahead to exclude static asset prefixes (sprites/, assets/, favicon.ico) while routing everything else to /index.html (Pitfall 5 canonical fix)
    - Live URL documented in README.md ## Live section directly under the title heading (single source of truth for "where is it deployed")
key-files:
  created:
    - vercel.json
    - .planning/phases/01-foundation-toolchain-engine-core/01-05-SUMMARY.md
  modified:
    - .gitignore
    - README.md
key-decisions:
  - D-04 honored — deployed on default *.vercel.app subdomain (https://poke-trail.vercel.app/), no custom domain
  - FOUND-06 closed — live URL serves the production bundle whose JS chunk contains the locked D-03 disclaimer string verbatim, and SPA-fallback rewrite is wired so deep-URL refresh no longer 404s
  - Pitfall 5 closed — vercel.json `rewrites` with `/((?!sprites/|assets/|favicon\.ico).*) -> /index.html` preserves static assets while routing all SPA paths to index.html
requirements:
  - FOUND-06
metrics:
  duration: ~6 min
  tasks_completed: 3
  files_created: 1 (vercel.json) + 1 (this SUMMARY)
  files_modified: 2 (.gitignore, README.md)
  commits: 2 (Task 1 + Task 3; Task 2 was a pre-completed user-action checkpoint, no commit)
  completed_date: 2026-04-25
---

# Phase 1 Plan 5: Vercel SPA Wiring + Verification Summary

`vercel.json` with Vite framework preset + SPA-fallback rewrite shipped to GitHub main; Vercel auto-deployed within seconds; live URL https://poke-trail.vercel.app/ now serves the Phase 1 title shell, the JS bundle contains the locked D-03 disclaimer string verbatim, and deep-URL refresh (`/battle`, `/anything`) no longer 404s — Pitfall 5 closed and FOUND-06 met.

## What Shipped

- **`vercel.json`** (16 lines) — `framework: "vite"`, `buildCommand: "npm run build"`, `outputDirectory: "dist"`, `rewrites: [{ "source": "/((?!sprites/|assets/|favicon\\.ico).*)", "destination": "/index.html" }]`. The negative-lookahead regex preserves `/sprites/*` (151 Pokémon pixel sprites under `public/sprites/` per DATA-04), `/assets/*` (Vite fingerprinted JS/CSS chunks), and `/favicon.ico` (browser default request) while rewriting every other path to the SPA shell. `$schema` set to `https://openapi.vercel.sh/vercel.json` for IDE auto-complete.
- **`.gitignore`** — added `.vercel` to exclude the local Vercel link cache directory created by `vercel link`.
- **`README.md`** — added `## Live` section directly under the `# PokeTrail` heading with the production URL https://poke-trail.vercel.app/ and a one-line note that auto-deploys are wired via Vercel's GitHub integration.

## Quality-Gate Evidence

```
$ npm run build              # exit 0 — dist/index.html + 195 KB JS + 16 KB CSS, ~370 ms
$ grep -rq "non-commercial fan project" dist
                             # exit 0 — D-03 disclaimer survives production build
$ npm run lint               # exit 0 — eslint . --max-warnings 0
$ npx tsc --noEmit           # exit 0
$ npm test                   # exit 0 — 118/118 passing across 10 test files (~990 ms)
                             #   |engine| 52 tests
                             #   |ui|     66 tests
```

## Live-URL Curl Evidence

Pre-fix (before this plan, against the existing dist deploy from Plan 01-04):

```
GET /                  -> 200
GET /battle            -> 404   ← Pitfall 5 unfixed
GET /sprites/1.png     -> 200
```

Post-fix (after `git push origin main` triggered Vercel auto-deploy of `vercel.json`):

```
GET /                  -> 200   ← root SPA shell
GET /battle            -> 200   ← SPA fallback now serving index.html
GET /anything          -> 200   ← SPA fallback (any non-asset path)
GET /sprites/1.png     -> 200   ← static-asset exclusion still wins (regex preserved)
GET /favicon.ico       -> 404   ← excluded from rewrite by design (no favicon in repo yet, browser request returns 404 instead of HTML shell)
```

Live JS-bundle contains the disclaimer:

```
$ curl -sSL https://poke-trail.vercel.app/assets/index-D77q_rMM.js \
    | grep -c "non-commercial fan project"
1
```

The shell HTML (`curl -sSL https://poke-trail.vercel.app/`) does NOT contain the disclaimer string in raw form because React renders the `<Disclaimer />` text client-side after the JS bundle hydrates. This is expected for any client-rendered SPA. The contract — "the deployed page renders the locked D-03 disclaimer to the user" — is satisfied because the bundle that runs on every page load contains the verbatim string and `<App />` mounts `<Disclaimer />` unconditionally (asserted by `tests/app.test.tsx` from Plan 01-04). Visual confirmation in a browser would show the footer text rendered.

## Decisions Implemented

| ID | Decision | Where |
|---|---|---|
| D-04 | Default `*.vercel.app` subdomain, no custom domain in v1 | Live URL `https://poke-trail.vercel.app/` is the user's pre-linked Vercel project on the default subdomain |
| FOUND-06 | "Vercel deployment URL serves the current main branch with the legal disclaimer visible on the title placeholder" | Live URL serves the Phase 1 title shell; live JS bundle contains the verbatim D-03 string (1 grep hit); `<Disclaimer />` is unconditionally mounted in `<App />`'s footer per Plan 01-04 RTL test |
| Pitfall 5 (RESEARCH §"Vercel SPA Routing Fallback Missing") | `vercel.json` rewrites with negative-lookahead regex preserves static-asset prefixes while serving `index.html` for all SPA routes | `vercel.json:9–14` |

## Patterns Locked for Downstream Plans

- **Auto-deploy on push to main is now the default for every Phase 2+ commit.** Reviewing UI changes is now a one-link click for the user — open the latest deployment in the Vercel dashboard or visit the static URL.
- **Static-asset prefix discipline.** Anything served from `public/sprites/**` or `dist/assets/**` is the authoritative "these paths bypass the SPA rewrite" list. If a future phase introduces a new static folder (e.g. `public/audio/`), it must be added to the negative-lookahead in `vercel.json` (or moved under `public/assets/`).
- **Live-URL contract.** The README.md `## Live` section is the single source of truth for "where is the live deploy"; Phase 11 (custom domain, post-v1) will simply update this one line.

## Deviations from Plan

### Auto-fixed Issues

None — the plan executed exactly as written. The only adjustment was a sequencing simplification described under "Authentication Gates" below (Task 2 already pre-resolved by user setup, so no checkpoint stop was needed).

### Authentication Gates

**Task 2 — Vercel CLI auth + GitHub remote + Vercel↔GitHub project connection: pre-resolved by user before this plan ran.**

The plan included `<task type="checkpoint:human-action">` for parts that are typically interactive (Vercel CLI `vercel login` magic-link flow, `git remote add origin`, dashboard-side Vercel↔GitHub project connection). However, the user had already completed all four parts of the checkpoint before invoking this plan:

- GitHub repo `https://github.com/Lippi304/PokeTrail` exists and is wired as `origin` (verified: `git remote -v` shows `origin https://github.com/Lippi304/PokeTrail.git (push)`)
- Vercel project linked to that GitHub repo with framework preset = Vite, auto-deploy from `main` enabled
- Live URL `https://poke-trail.vercel.app/` was already serving the dist bundle from Plan 01-04 before this plan ran (pre-flight curl: `GET / -> 200`, `GET /battle -> 404` as expected without the rewrite)

So the checkpoint was treated as already-approved; the executor proceeded directly from Task 1 to Task 3 without stopping. No `vercel login`, `vercel link`, or `vercel --prod` call was needed — Vercel auto-deploys on every push to `main`, which is what carried Task 1's commit (`vercel.json`) to production. The deploy completed in ~30 s after `git push origin main`; verified by polling `GET /battle` until it switched from 404 (pre-rewrite) to 200 (post-rewrite).

This is the documented behavior under `<auto_mode_detection>` / `<checkpoint_protocol>` for human-action gates that are no-ops because the human-action is already done — the executor recognizes the gate is pre-cleared and continues.

### Out-of-scope Discoveries

**Pre-existing unstaged changes in working tree.** When this plan started, `git status` showed seven modified files unrelated to plan 01-05 (whitespace-only changes in `src/components/layout/Disclaimer.tsx`, leftover edits in `scripts/fetch-pokemon-gen1.ts`, `src/data/schemas.ts`, `src/engine/__tests__/golden-baseline.ts`, `src/engine/damage.ts`, `tests/data-revalidation.test.ts`, plus an unrelated update to `.planning/STATE.md`). These are out-of-scope for plan 01-05. Per `<deviation_rules>` SCOPE BOUNDARY, the executor did NOT touch them — they were verified to be non-disruptive (Disclaimer.tsx diff is whitespace-only, D-03 text intact verbatim) and left in place. Both Task 1 and Task 3 commits used explicit `git add <file>` paths to ensure only plan-scoped files were committed.

**`/favicon.ico` returns 404 on the live URL.** This is by design — the rewrite excludes `favicon.ico` to avoid serving the HTML shell as a favicon, but no favicon binary exists in `public/` yet. Documented as deferred. A favicon belongs to a Phase 11 polish plan (POLISH-03 / PWA), not this one.

## Stub Debt for Later Phases

None introduced by this plan. The two existing Phase-1 stubs (`AriaLive.tsx`, `useMoveHotkeys.ts` from Plan 01-04) remain as documented; they are unrelated to Vercel deploy.

## Threat Flags

None — `vercel.json` is read-only static-hosting configuration. No env vars, no server runtime, no auth, no user input parsing, no secrets in the file. Re-evaluate when Phase 3 introduces save/load (still client-side localStorage, but new attack surface) and when Phase 11 adds PWA service worker (cache-poisoning surface). Matches the plan frontmatter `threat_model: "Vercel deploy is read-only static hosting — no server runtime, no env vars, no auth in this phase."`

## Phase 1 Final Status

All six Phase 1 success criteria are now met. With this plan complete, the Phase 1 hard exit gate #2 closes:

| # | Phase 1 Success Criterion | Met by |
|---|---|---|
| 1 | Vite + React 19 + TS strict + Tailwind v4 toolchain bootable | Plan 01-01 |
| 2 | **Vercel deployment URL serves main branch with legal disclaimer visible on title placeholder** | **Plan 01-05 (this one)** |
| 3 | Pure-TS engine with seedable PRNG, 15-type chart minus Steel/Dark/Fairy, damage formula, 20+ Smogon golden tests | Plan 01-02 |
| 4 | Build-time data pipeline: 151 Gen-1 Pokémon + moves + sprites, Zod-validated | Plan 01-03 |
| 5 | A11y/mobile baseline primitives (TypeBadge text labels, 44×44 tap targets, focus rings, 100dvh, touch-action: manipulation, 1-4 hotkey + aria-live patterns) | Plan 01-04 |
| 6 | Architecture patterns locked: split contexts, versioned localStorage, Immer + Zod from day 1 | Plans 01-01..04 (patterns established; Phase 3 implements) |

Phase 1 is complete. Next step: `/gsd-verify-work 1` to sanity-check that the phase actually delivered what the roadmap promised before moving to Phase 2.

## Self-Check: PASSED

- **Created files exist** (verified via `ls`): `vercel.json` (root), `.planning/phases/01-foundation-toolchain-engine-core/01-05-SUMMARY.md`. Both present.
- **Modified files updated** (verified via `git show`): `.gitignore` (commit `7a4a5fa`) and `README.md` (commit `f928b84`) both show expected diffs.
- **Commits exist**: `7a4a5fa` (Task 1 — vercel.json + .gitignore) and `f928b84` (Task 3 — README live URL). Both confirmed via `git log --oneline` and pushed to `origin/main`.
- **All five Phase 1 quality gates green**: `npm run lint --max-warnings 0`, `npx tsc --noEmit`, `npm test` (118/118), `npm run build` (dist with disclaimer), `curl -sSL https://poke-trail.vercel.app/assets/index-*.js | grep "non-commercial fan project"` (1 hit) — all exit 0.
- **Live SPA-fallback verified**: pre-fix `GET /battle -> 404`; post-Vercel-redeploy `GET /battle -> 200`, `GET /anything -> 200`, `GET /sprites/1.png -> 200` (asset exclusion preserved). Polled until /battle switched to 200 within ~30 s of push.
- **Phase 1 success-criterion #2 fully met**: Live URL `https://poke-trail.vercel.app/` serves the production bundle; the JS chunk contains the locked D-03 disclaimer string verbatim; `<Disclaimer />` is unconditionally mounted in `<App />` (asserted by Plan 01-04's RTL tests, all green here).
