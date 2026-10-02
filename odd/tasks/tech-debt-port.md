# Tech-debt port from ABAGAS (docs/TECH-DEBT-FIXES.md)

## Objective

Port the verified ABAGAS fixes into MRS, in the agreed order:
**E1 → T1 → T3 → T5 → T6+T2 → T4**. Each task closes with a work-unit
commit (tests + docs alongside behavior) on branch `fix/tech-debt-port`.

## Scope

- `2BACK/src/**` (users, sales, product, datasource/migrations)
- Specs for every changed unit; frontend only if a contract changes.
- T4 is the largest item; if the session ends before it, the file must
  reflect exact progress for resumption.

## Out of scope

- P1–P4 platform fixes, J1–J8, U1–U3, W1, A1 (documented but not authorized yet).
- Companies architecture port.
- The unrelated `GET /sales` summary mismatch (flagged during review; separate issue).

## Checklist

- [x] E1 — Users API strips `passwordHash`
      Controller maps every response to `PublicUser`
      (`Omit<UserEntity,'passwordHash'>`) in all four endpoints
      (findAll, findById, create, update). Controller specs assert the
      hash is absent in each response. Service internals untouched.
      Commit: e89dc57 (users suite 32/32, nest build green)
- [x] T1 — Delete legacy non-atomic sale path
      `@Post()` route + `createSale` service method + their specs deleted.
      No API_CONTRACT.md exists in MRS (checked). Frontend already verified:
      only `POST /sales/batch` exists (spec at sales.api.service.spec.ts:60
      is the GET summary, not a POST). Suite shrank 11→10, green; unused
      TransactionEntity import removed from controller.
      Commit: d9a59e5 (−74/+2 lines)
- [x] T3 — Single low-stock threshold
      `ProductService.LOW_STOCK_THRESHOLD = 7` used by `searchProducts`
      (bound parameter `:threshold`) and `buildLowStockXlsx`. Business
      comment lives at the constant. Grep confirmed remaining `< 7`
      matches are the constant's own comment + two unrelated RUT-length
      checks. Product suite 28/28 green.
      Commit: 155d37f
- [x] T5 — Mutation-verify maxDiscount carry-over
      VERIFICATION-ONLY, no commit (nothing changed). Mutation applied
      (`maxDiscount: 0` instead of `lastTx?.maxDiscount ?? 0`) → 1 test
      failed (batch sale spec asserting `nthCalledWith` maxDiscount 500).
      Mutation reverted; suite 10/10 green again. The invariant is locked
      by the existing spec, which already asserts BOTH the carry-over
      (500) and the fallback (0). WHY comment already present at
      sales.service.ts:107-109.
- [x] T6+T2 — Race-safe unified duplicate guard + atomic register
      One normalized duplicate path (lowercase-exact append branch
      removed — it only ever fired for soft-deleted products, adding
      stock without reactivating them); pg_advisory_xact_lock +
      in-tx recheck + write all inside one transaction for
      registerProduct and updateProductById; new-product branch saved
      via qr.manager (cascade product+transaction, atomic);
      GET /product/exists aligned to exact normalized equality against
      ACTIVE products (substring matches no longer block renames).
      Tests: 409 collision, lock ordering, in-tx save, inactive no-block,
      rename conflict rollback, substring rename allowed, exists semantics.
      Commits: ff65a74. Suite 258/258 backend.
      GOTCHA found while testing: normalize() strips dots/dashes WITHOUT
      introducing spaces — 'Válvula.X' → 'valvulax' ≠ 'valvula x'.
      Test data must collide on accents/case/spaces only.
- [x] T4 — Explicit migrations baseline, `synchronize:false`
      1. CLI datasource: single named export (typeorm 1.0 CLI accepted it
         — P1 concern cleared); scripts migration:generate|run|revert|show
         + migration:mark-baseline added to package.json.
      2. Baseline migration 1790977935682-Baseline (11 tables + FKs),
         generated against an EMPTY scratch DB (docker mrs-postgres, fresh
         `mrs_baseline_scratch` database), then verified:
         run → show [X] → revert → run, and the compiled app BOOTS against
         the fresh migrations-only DB (Swagger 200, auth roundtrip OK).
      3. synchronize: false hardcoded in app.module + datasource; the
         TYPEORM_SYNCHRONIZE escape hatch is GONE. Demo reset (data
         seeding) stays outside the migration system.
      4. Orphan root one-offs DELETED (rename-branch, add-product-stock):
         effects captured by the baseline; history in git.
      5. DEPLOY.md rewritten: env without TYPEORM_SYNCHRONIZE, §3 schema
         (fresh DB → migration:run; existing DB → mark-baseline; never
         mark an undiffed schema), §7 update flow with migration step.
         mark-baseline verified idempotent compiled in dist (the exact
         command the runbook documents): "0 recorded, 1 already present".
      Commit: 089a603. Suite 258/258 green.
      Gotchas: dotenv is a devDependency — mark-baseline deliberately
      loads no env file (container-safe, consistent with CLI scripts);
      sales + refill_groups tables carry no _entity suffix (W1 trap).

## Acceptance criteria (whole feature)

- `cd 2BACK && pnpm test` green after every task.
- No production code change without a test locking it (T5 verified by mutation).
- Conventional commits, one work unit per task, hashes recorded in the
  evidence log below as each task closes.

## Evidence log

- Branch: `fix/tech-debt-port` (from main @ 7f625ab).
- E1: e89dc57 — PublicUser mapping + hash-absence specs (users 32/32).
- T1: d9a59e5 — legacy createSale deleted (−74 lines), suite 11→10.
- T3: 155d37f — LOW_STOCK_THRESHOLD, bound-parameter query.
- T5: verification-only, no commit — mutation killed 1 test, reverted.
- T6+T2: ff65a74 — advisory lock + in-tx recheck + atomic register +
  aligned /exists. Suite 258/258.
- T4: 089a603 — baseline migration + synchronize:false + scripts +
  mark-baseline + DEPLOY.md rewrite, orphans deleted. Suite 258/258.

## Feature complete

All six checklist items closed with observed proof. MERGED to main as
fast-forward 7f625ab..95db3fa (merge authorized by Xoko); branch
fix/tech-debt-port deleted after merge. Batch 2 + 13 stale-spec fix
continued on the same branch (see tech-debt-port-2.md).
Note: docs/TECH-DEBT-FIXES.md remains untracked (Xoko's document — left
alone deliberately).
