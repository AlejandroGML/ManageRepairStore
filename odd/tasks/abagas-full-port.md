# ABAGAS full port — everything but branding

## Objective

Port the ENTIRE ABAGAS architecture/data model/constraints into MRS.
Branding stays MRS (violet palette, title, logo, XLSX header). MRS-only
advantages stay (i18n, demo module). Reference map: ABAGAS
openspec/changes/archive/2026-10-01-empresas-gestion/{proposal,design,tasks}.md
+ TECH-DEBT-FIXES.md. Branch: feat/abagas-full-port from main @ eaf286e.

## Batches

### Batch A — Companies backend (ABAGAS phases 1+2) — ✅ COMPLETE
- [x] A1 entities: company.entity.ts (port), client.entity → company_id
      nullable + DROP company_name; datasource + modules. 098988c
- [x] A2 migration CompanyEntityFormalization1791059200000 (política B
      backfill, orphan delete, down reversible). 098988c
- [x] A3 migration ClientCompanyIdIndex1791059200001 (J6). 098988c
- [x] A4 script company-migration-report.ts (sin dotenv, named import). 9dbda82
- [x] A5 CompanyModule: list paginado + branchCount, clients, rename con
      lock (J5/B7) + 8 specs. a89d1ae
- [x] A6 registerClientOrder: resolveCompany (companyId 400-mismatch /
      auto-link / crear / reactivar inactiva B4 / basura→NULL) +
      assignOrderCode ORD-{1000+id} en ambas ramas. 098988c
- [x] A7 dup-check exclusión clientId+companyId; matcher sin empresa
      fuzzy (isMeaningfulRut ahora export); searchClients por join. 098988c
- [x] A8 XLSX por join; GET /client/companies retirada. 098988c
- [x] A9 demo-seed → CompanyEntity (1 empresa 2 sucursales compartiendo
      rut + 2 de 1 + 5 particulares NULL). 098988c
- [x] A10 migración aplicada en dev: dry-run → 2 grupos basura →
      post: 8 NULL/0 empresas/0 huérfanas; show [X]×3. Live: /api/company
      branchCounts 2/1/1, /order/recent (antes 404!), /company/1/clients.
      9dbda82. Suite 280/280.
- EXTRA ported: shared Client interface (company_id/company), front dtos
  (companyId/is_company), order.mapper payload, GET /order/recent route
  (J3 — el front ya la llamaba y daba 404). 098988c

### Batch B — Companies frontend (ABAGAS phases 3+4, con i18n MRS) — ✅ COMPLETE
- [x] B1 CompaniesApiService + fragmentos i18n companies (651 keys). f0d2a60
- [x] B2 register: autocomplete real (debounce), RUT locked, panel
      sucursales + reuso + nueva sucursal, retiro company_name/
      ModalCompanySimilar, payload companyId/is_company, J4/J7/J8/U1,
      panel búsqueda particular (GET /client/search). f0d2a60
- [x] B3 modal-companies (paginado 10, renombrar inline, 409 snackbar,
      i18n) + botón SIEMPRE visible. f0d2a60
- [x] B4 interfaces ficha (companyId/is_company) + limpieza modales
      (edit sin company_name, choice por relación, duplicate sin empresa)
      + rut.pipe verifier mayúscula. f0d2a60
- [x] B5 specs: register 31 (portadas), modal-companies, modal-edit,
      choice actualizada. KARMA FULL 368/368 ✅. Backend 280/280.

### Batch C — J-patterns + parity — ✅ COMPLETE
- [x] C1 J2 audit: 0 hallazgos — el patrón commit-then-save no existe
      (T2/T6 lo cerraron en las tandas anteriores).
- [x] C2 J3: getUserById/getUsersByName/getUsersByAddress cargan la
      relación company (getClientsByRut/searchClients ya estaban). 89e0fbb
- [x] C3 J8: register + modal-companies muestran err?.error?.message;
      el resto de componentes MRS ya lo hacía. (f0d2a60)
- [x] C4 interceptors/script.interceptor.ts: ya existía en MRS (port
      previo); ABAGAS lo conserva como marcador de retiro del
      EncryptInterceptor inseguro.
- [x] C5 API_CONTRACT.md de MRS verificado contra controllers (incluye
      companies + demo + categories/workers MRS-only). 89e0fbb
- [x] C6 scripts de mantenimiento porteados: find-duplicate-groups,
      merge-duplicates, find-product-name-groups (convenciones MRS).
      QUIRK ABAGAS RESUELTO en MRS: el guard sucursal de merge-duplicates
      leía company_name del reporte que find-duplicate-groups ya no
      emite (muerto desde el cambio empresas) — fix portado y mejorado:
      el reporte ahora lleva companyId por miembro y el guard excluye
      clusters con ≥2 miembros de la MISMA empresa. Verificado en vivo:
      escaneo agrupa las 2 sucursales de Comercial Demo SpA, reporte
      companyId [1,1], dry-run tier-1 planifica 0 merges. Bug reportado
      a ABAGAS (odd/tasks/fix-merge-duplicates-sucursal-guard.md, commit
      d12e1a7 en su repo) para que su agente aplique el fix upstream.
      Commit: d90a5c1
- [x] EXTRA: dev-setup.sh adaptado al loop MRS (compose+pnpm+migrations+
      seed). 8a5ff3c

### Batch D — U2 dark-mode contrast (paleta violeta MRS) — ✅ COMPLETE
- [x] D1 .seg button.active y .btn-soft/.badge-neutral: overrides
      dark-scoped con violeta clara #C4B5FD (~7:1 en ambos surfaces,
      AA/AAA). El patrón :host-context queda como guía para futuros
      componentes. fe54262. Karma 368/368.

### Batch E — N/A honesto (documentado, no porteado)
- W1 demo wipe: MRS demo es sintético efímero (POST /demo/reset en cada
  carga); ABAGAS lo montó para un demo PERSISTENTE con datos ingresados
  por el cliente en la Pi. No aplica — si MRS alguna vez corre un demo
  persistente, portar el kit (flag guard + lista dinámica + post-checks).
- migration-v2/ (4 archivos): maquinaria de ADOPCIÓN DE BD LEGACY de
  ABAGAS (su dump de producción: rut '0', grupos derivados). MRS no
  tiene BD legacy: dev/demo son sintéticas y descartables, y la
  adopción de BDs existentes la cubre baseline + mark-baseline.
  Portearlo procesaría un esquema que no existe en MRS.
- deploy/ (systemd, backup/demo-wipe timers, nginx, compose de la Pi):
  infra específica del Raspberry de ABAGAS. El deploy de MRS es
  Dockerfile + docker-compose.vps.yml + DEPLOY.md (VPS).
- Artefactos raíz de ABAGAS (dumps SQL, guía PDF, openspec/ con su
  historia de cambios, AGENTS.md, SETUP_STATUS, skills-lock,
  IMPLEMENTAR-DISENO-MRS.md): documentación/datos DE ABAGAS, no
  arquitectura portable.
- mark-baseline-applied.ts: equivalente MRS ya existe (mark-baseline.ts).

### Estado final

- Backend: 280/280 Jest verde. Frontend: 368/368 Karma verde (Brave).
- Migraciones aplicadas en dev: baseline + companies + index [X]×3.
- Verificación en vivo (Batch A): /api/company (branchCount 2/1/1),
  /api/company/1/clients, /api/order/recent (antes 404).
- Frontend convergió a superset de ABAGAS (solo login difiere +18
  líneas por i18n). Backend convergió (solo main.ts y rut.service.ts
  son MRS-mayores).
- Sin merge a main: la rama feat/abagas-full-port espera revisión.

## Rules

- Branding MRS se respeta (paleta violeta, títulos, logo).
- i18n: todo UI nuevo usa t-pipe con claves nuevas (es/en).
- Una unidad de trabajo = un commit convencional; suites verdes por unidad.
- Evidence log con hash real por unidad — sin estado inventado.

## Evidence log

- Branch: feat/abagas-full-port (from main @ eaf286e).
