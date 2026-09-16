# ── ManageRepairStore — single-container production image ─────────────────
# Angular SPA + NestJS API served by one Node process (see main.ts SPA
# fallback), PostgreSQL runs as a sibling compose service. PDFs render with
# the system Chromium (CHROME_BIN) instead of Puppeteer's bundled download.
#
# Both apps cross-import the repo-root `shared/` package via the
# `@shared/*` tsconfig path — it must sit next to 1FRONT/ and 2BACK/ in the
# build stages or compilation fails.

# ── Stage 1: frontend build ──────────────────────────────────────────────
FROM node:24-slim AS frontend-build
RUN npm install -g pnpm@11.1.1
# Cap the V8 heap so the build survives a 1 GB VPS (swap absorbs the spikes)
ENV NODE_OPTIONS=--max-old-space-size=1024
WORKDIR /src/1FRONT
COPY 1FRONT/package.json 1FRONT/pnpm-lock.yaml 1FRONT/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY shared/ /src/shared/
COPY 1FRONT/ ./
# Source maps cost extra RAM and are useless in production
RUN pnpm build -- --source-map=false

# ── Stage 2: backend build ───────────────────────────────────────────────
FROM node:24-slim AS backend-build
# Serialize stages: this edge forces the backend to wait for the frontend
# (BuildKit would otherwise run both in parallel and OOM a 1 GB VPS)
COPY --from=frontend-build /src/1FRONT/dist/manage-repair-store/index.html /tmp/frontend-ready.html
ENV PUPPETEER_SKIP_DOWNLOAD=1
# pnpm pinned to the exact local version — pnpm 11 minors differ in how
# strictly they verify lockfile tarball entries
RUN npm install -g pnpm@11.1.1
WORKDIR /src/2BACK
COPY 2BACK/package.json 2BACK/pnpm-lock.yaml 2BACK/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY shared/ /src/shared/
COPY 2BACK/ ./
RUN pnpm build && pnpm prune --prod

# ── Stage 3: runtime ─────────────────────────────────────────────────────
FROM node:24-slim
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    CHROME_BIN=/usr/bin/chromium \
    FRONTEND_DIST_DIR=/app/frontend-dist \
    LOGO_PATH=/app/assets/logo-300x80.png

# nest build emits the program under dist/2BACK/src + dist/shared
COPY --from=backend-build /src/2BACK/node_modules ./node_modules
COPY --from=backend-build /src/2BACK/dist ./dist
COPY --from=backend-build /src/2BACK/assets ./assets
COPY --from=backend-build /src/2BACK/package.json ./
# Logo used by the PDF templates (resolved via LOGO_PATH)
COPY 1FRONT/src/assets/img/logo-300x80.png ./assets/logo-300x80.png
COPY --from=frontend-build /src/1FRONT/dist/manage-repair-store ./frontend-dist

# Multer writes uploads to <cwd>/uploads (see main.ts useStaticAssets)
RUN mkdir -p uploads

EXPOSE 3000
CMD ["node", "dist/2BACK/src/main.js"]
