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

### Batch C — J-patterns + parity
- [ ] C1 J2 audit: commit-then-save shape en MRS (grep).
- [ ] C2 J3 audit: read endpoints vs relations que consume el UI.
- [ ] C3 J8: server error messages en toasts (err?.error?.message).
- [ ] C4 interceptors/script.interceptor.ts — evaluar qué es y si aplica.
- [ ] C5 API_CONTRACT.md para MRS (regenerado de sus rutas).
- [ ] C6 inventario final por diff — lo que quede (utils/dto/shared).

### Batch D — U2 dark-mode contrast (paleta violeta MRS)
- [ ] D1 .seg active y .btn-soft/.badge-neutral sobre dark → variante
      violeta clara (~#C4B5FD, 8.7:1 sobre surface) + :host-context
      pattern donde aplique.

### Batch E — N/A honesto (documentado, no porteado)
- W1 demo wipe: MRS demo es sintético efímero (POST /demo/reset) — no
  aplica夜间 wipe.
- A1/migration-v2: maquinaria de adopción legacy de ABAGAS — MRS no
  tiene BD legacy; su baseline + mark-baseline bastan.
- openspec/ archive de ABAGAS: es historia de OTRO repo; lo que importa
  (el diseño) queda referenciado acá.

## Rules

- Branding MRS se respeta (paleta violeta, títulos, logo).
- i18n: todo UI nuevo usa t-pipe con claves nuevas (es/en).
- Una unidad de trabajo = un commit convencional; suites verdes por unidad.
- Evidence log con hash real por unidad — sin estado inventado.

## Evidence log

- Branch: feat/abagas-full-port (from main @ eaf286e).
