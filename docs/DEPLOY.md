# Deploy — single Node container + PostgreSQL (VPS)

One Node container serves the Angular SPA and the NestJS API (mounted under
`/api`, see `2BACK/src/main.ts`); PostgreSQL 16 runs as a sibling container.
Caddy terminates TLS in front. Only `127.0.0.1:8082` is exposed by the stack.

## 1. Server prep (once)

```bash
# Swap — required on 1 GB RAM plans (the OOM killer eats builds otherwise)
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 80/443 must be reachable or Let's Encrypt cannot validate the domain
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
```

Install Docker + Compose and Caddy per their official docs.

## 2. Code + environment

```bash
git clone https://github.com/AlejandroGML/ManageRepairStore.git /opt/managerepairstore
cd /opt/managerepairstore

cat > .env <<EOF
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=$(openssl rand -hex 24)
DB_DATABASE=manage_repair_store
NODE_ENV=production
PORT=3000
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=https://YOUR_DOMAIN
EOF
chmod 600 .env
```

## 3. Schema: migrations are the only path

`synchronize` is off in every environment — entity edits never ALTER the
database by themselves. The schema comes from `2BACK/src/migrations/`.

Fresh database (empty volume):

```bash
docker compose -f docker-compose.vps.yml up -d postgres   # wait for healthy
docker compose -f docker-compose.vps.yml run --rm app \
  node node_modules/typeorm/typeorm.js migration:run -d dist/2BACK/src/datasource.js
```

Existing database that predates the baseline (schema built by the old
`synchronize` and matching the current entities): record the baseline
WITHOUT running DDL, or the first `migration:run` would try to CREATE
existing tables and crash:

```bash
docker compose -f docker-compose.vps.yml run --rm app node dist/2BACK/src/scripts/mark-baseline.js
```

> Never mark-baseline a schema you have not diffed first. If the target
> does not match the entity graph, fix the schema before marking.

The demo reset (`POST /api/demo/reset`) is data seeding and stays outside
the migration system.

## 4. Build & run

```bash
docker compose -f docker-compose.vps.yml up -d --build   # first build 5-10 min
curl -sI http://127.0.0.1:8082/ | head -1                # expect: HTTP/1.1 200
```

## 5. Caddy

```
YOUR_DOMAIN {
    reverse_proxy 127.0.0.1:8082
}
```

Reload Caddy — it obtains the Let's Encrypt certificate automatically once
DNS points at this server (and only then).

## 6. First boot checklist

- Schema: `migration:run` (fresh DB) or `mark-baseline` (existing DB) — see §3
- `curl -X POST https://YOUR_DOMAIN/api/demo/reset` — seeds the synthetic data
- `https://YOUR_DOMAIN/api-docs` — Swagger UI
- Log in with the quick-login box; generate a sale PDF (exercises Chromium)

## 7. Updates

```bash
cd /opt/managerepairstore && git pull --ff-only \
  && docker compose -f docker-compose.vps.yml up -d --build app
```

If the pull brought new files under `2BACK/src/migrations/`, apply them:

```bash
docker compose -f docker-compose.vps.yml run --rm app \
  node node_modules/typeorm/typeorm.js migration:run -d dist/2BACK/src/datasource.js
```
