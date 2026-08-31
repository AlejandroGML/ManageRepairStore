# Manage Repair Store

Point-of-sale / repair-shop management system — portfolio demo. Inventory (stock),
sales, spare-part refills tied to client service orders, and PDF/QR order tickets
for the Chilean market (RUT, CLP, Chilean Spanish UI).

**All data in this repository is 100% synthetic demo data.**

## Stack

| Layer | Tech |
|---|---|
| Frontend | Angular 21 + Angular Material (standalone components) |
| Backend | NestJS 11 + TypeORM + PostgreSQL 16 |
| PDF/QR | Puppeteer (server-side) + `qrcode` |
| Package manager | pnpm (no root package.json — each package has its own lockfile) |

## Architecture highlights

- **Shell sidebar + topbar with role-based routing** — each role lands on its own
  screen (`/panel` admin, `/bodega` warehouse, `/ventas` seller); routes are guarded
  by `authGuard` + `rolesGuard`.
- **Design system** — `docs/DESIGN.md` is the single source of truth (violet/teal
  palette, Fira Sans + Fira Code, data-dense tokens). SCSS tokens in
  `1FRONT/src/_variables.scss`, prototype component classes in `_components.scss`.
- **Denormalized stock with a single mutation path** — `ProductEntity.stock` is the
  single source of truth. Every stock change goes through `mutateStock()`
  (`2BACK/src/product/product.service.ts`): `QueryRunner` + `pessimistic_write` lock
  + `409 Conflict` on insufficient stock. `finalStock` is a server-side historical
  record, never computed client-side.
- **Atomic batch endpoints** (single `QueryRunner`, full rollback if any product fails):
  - `POST /sales/batch` — sale + stock deduction + `SaleEntity.snapshot`
  - `POST /product/refills/batch` — `RefillGroupEntity` (optionally linked to an order) + stock moves
- **Auth default-deny** — global `JwtAuthGuard` via `APP_GUARD`; endpoints are
  protected unless explicitly marked `@Public()` (e.g. `POST /order/pdf`). Login:
  `POST /auth/login` with email + password.
- **Server-side PDF/QR** — the QR code is generated on the backend from the order
  code; the frontend sends no QR data. Puppeteer browser is a lazy singleton reused
  across requests.
- Swagger UI at `http://localhost:3000/api`.

## Running the demo

Prerequisites: Docker, pnpm.

```bash
# 1. Database (postgres:16-alpine on host port 5433)
docker compose up -d

# 2. Backend (port 3000, watch mode — synchronize:true creates the schema on boot)
cd 2BACK && pnpm install && pnpm run start:dev

# 3. Seed synthetic demo data (idempotent, re-runnable)
cd 2BACK && pnpm run seed

# 4. Frontend (port 4200)
cd 1FRONT && pnpm install && pnpm start
```

### Demo credentials

| Email | Password | Role | Landing |
|---|---|---|---|
| `admin@demo.example` | `Demo1234!` | admin | Panel (todas las pantallas) |
| `clerk@demo.example` | `Demo1234!` | seller | Ventas |
| `bodega@demo.example` | `Demo1234!` | warehouse | Bodega |

The seed also creates 6 categories, 24 repair products with CLP prices, and 8
fictional clients with valid (módulo-11) synthetic RUTs. The login screen offers
one-click demo access per role.

## Testing

```bash
cd 2BACK && pnpm test       # Jest — 27 suites, 195 tests
cd 1FRONT && npx ng build   # production build
```

## Project layout

| Path | What |
|---|---|
| `1FRONT/` | Angular frontend |
| `2BACK/` | NestJS backend |
| `shared/` | Shared TS interfaces (frontend imports via `@shared/*` path alias) |

## Notes

- Table names carry a `_entity` suffix (`product_entity`, `client_entity`, …);
  `refill_groups` and `sales` are explicit names. Raw SQL must match these.
- DB connection defaults live in `2BACK/.env.development` (copy from `.env.example`
  and generate a fresh `JWT_SECRET` with `openssl rand -hex 32`).
