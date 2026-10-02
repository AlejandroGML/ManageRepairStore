# Tech-debt port — batch 2 (ABAGAS gaps found in post-port comparison)

## Objective

Port the second batch of ABAGAS fixes that the file-by-file comparison
showed MRS lacks, in the agreed order: **① today-summary → ② J1 →
③ T2-clientes → ④ U3+P3+P4**. Same branch `fix/tech-debt-port`, one
work-unit commit per task.

## Scope

- `2BACK/src/sales` (①), `2BACK/src/order` (②), `2BACK/src/client` (③)
- `2BACK/src/scripts/seed.ts`, `2BACK/src/main.ts`, `1FRONT` register (④)

## Out of scope

- Companies architecture (SDD-sized, separate decision).
- U2 dark-mode audit items (design work, needs visual pass).
- J2–J8 remaining patterns (no verified MRS site identified yet except J1).

## Checklist

- [x] ① — GET /sales today-summary (KPI bug)
      listSales deleted (no other consumer); service+route ported from
      ABAGAS: COALESCE SUM/COUNT since startOfDay, string aggregates →
      Number. Spec: aggregation + string coercion + COALESCE zeros.
      Frontend already expected this contract (sales.api.service.ts:36).
      Commit: a24c4a7. Suite 260/260.
- [x] ② — J1: HttpExceptions travel untouched in order.service
      ALL THREE catch sites re-throw HttpException before wrapping
      (registerClientOrder, updateOrder, updateOrderStatus — ABAGAS had
      only fixed the first; the doc's rule covers all). Spec: the SAME
      BadRequestException instance travels (toBe guard) + non-HTTP wrap
      keeps .cause. GOTCHA: rejects.toSatisfy doesn't exist without
      jest-extended — used explicit try/catch capture.
      Commit: 5284c12. Suite 262/262.
- [x] ③ — T2-clientes: advisory lock + in-tx recheck + atomic group
      createUser: pg_advisory_xact_lock(hashtext(normalized)) + in-tx
      recheck + group find-or-create + client insert all in ONE
      QueryRunner transaction (no more orphan groups on crash);
      updateUserById rename guard moved inside its transaction;
      unused groupRepository injection removed. Tests: lock ordering,
      409 collision + rollback, rename conflict, in-tx save, group
      find/create preserved. Commit: d009240. Suite 266/266.
- [x] ④ — U3 hint lifecycle + P3 seed env + P4 CORS list
      U3: *ngIf="!enablePDF" on register hint + Karma two-state spec.
      P3: seed.ts AND normalize-rut.ts AND group-clients.ts (audit found
      all three hardcoded) now mirror the datasource's NODE_ENV env-file
      selection. P4: CORS_ORIGIN split(',') → array, single value
      unchanged. Commits: all three in 029dc8a. Backend 266/266 green.
      HONEST LIMITATION — RESOLVED: initial run used helium-browser
      (unstable under Karma); Xoko pointed out Brave is installed. With
      CHROME_BIN=/usr/bin/brave the U3 spec passes (register suite
      19/19) and the FULL Karma suite ran green after fixing 13 stale
      specs (see follow-up commit 2f3f096 — pre-existing breakage from
      the same-origin /api refactor, not from this batch).

## Acceptance criteria

- `cd 2BACK && pnpm test` green after each task.
- Frontend Karma spec for U3 (hint hidden after register, back after clear).
- Conventional commits, evidence hashes logged here per task.

## Evidence log

- Branch: fix/tech-debt-port (continues batch 1, not merged).
- ①: a24c4a7 — GET /sales today-summary. Backend 260/260.
- ②: 5284c12 — J1 HttpException re-throw, 3 sites. Backend 262/262.
- ③: d009240 — T2-clientes lock + atomic group. Backend 266/266.
- ④: 029dc8a — U3 + P3 (3 scripts) + P4. Backend 266/266.
- Follow-up: 2f3f096 — 13 stale specs fixed (same-origin /api refactor
  leftovers, pre-existing). Karma FULL suite: 352/352 green with
  CHROME_BIN=/usr/bin/brave (helium-browser is unstable under Karma —
  use Brave on this machine).

## Status: COMPLETE — backend 266/266, frontend Karma 352/352, both verified
