# i18n Migration Spec (ManageRepairStore)

The app has a minimal in-house i18n layer:

- `src/app/i18n/i18n.service.ts` — `I18nService` with `t(key, params?)` and `lang` signal
- `src/app/i18n/t.pipe.ts` — `TPipe` (`| t`), impure, already part of `SHARED_IMPORTS`
- Dictionaries: `src/app/i18n/dictionaries/fragments/<feature>.en.json` + `.es.json`,
  merged into `dictionaries/en.ts` / `es.ts` by `build-dicts.mjs` (do NOT edit those two).

English is the runtime default; **Karma runs with Spanish** (all spec assertions
expect the ORIGINAL Spanish strings — that is why the `.es.json` values must be
verbatim copies of the current strings).

## Your job

For every file in your assigned list:

1. Replace every **user-visible string** with the `t` pipe (templates) or
   `i18n.t()` (TypeScript). This includes: text nodes, `placeholder`,
   `matTooltip`, `aria-label`, `title`, table headers, button labels, option
   labels, snackbar messages, `MatDialog` data messages, empty-state texts,
   and string properties that end up rendered (e.g. KPI labels, column defs).
2. Add every new key to BOTH fragment files (`.en.json` translated + `.es.json`
   verbatim copy of the current Spanish string — character-for-character,
   including punctuation, ellipses "…" and accents).
3. Keys are `<prefix>.<camelCaseName>` — use ONLY your assigned prefix(es).
   Reuse `common.*` keys where they fit (save/cancel/close/delete/edit/
   confirm/loading/error/search/actions/total/date/description/quantity/stock/
   client/product/yes/no/back/export/filter/all/required/optional) — do not
   redefine them.
4. Interpolation: `{{name}}` in the dictionary value; pass
   `{ name: value }` as second arg (pipe: `{{ 'key' | t:{ name: x } }}`,
   TS: `i18n.t('key', { name: x })`).
5. Template usage patterns:
   - text: `{{ 'x.key' | t }}`
   - attribute: `[placeholder]="'x.key' | t"`, `[matTooltip]`, `[attr.aria-label]`, `[title]`
   - with params: `{{ 'x.key' | t:{ name: foo } }}`
6. TypeScript usage: `private readonly i18n = inject(I18nService);`
   (make it `readonly`/public if the template also calls `i18n.t`).
7. TPipe availability: if the component imports `SHARED_IMPORTS`, nothing to
   do. Otherwise add `TPipe` to the `imports` array with a RELATIVE import
   (e.g. `import { TPipe } from '../../i18n/t.pipe';`).
   **Never use `src/...` non-relative imports for i18n files — the Angular
   compiler treats them as a different module (NG3004).**
8. Do NOT translate: seed/data values (product names, client names, workers,
   locations like `A1-01`), icon `fontIcon` names, router paths, CSS classes,
   backend error strings, dates/currency pipes, brand names
   (`Manage Repair Store`), `alt="Manage Repair Store"`, code comments,
   emails like `admin@demo.example`, the literal `Demo1234!`.
9. Avoid plural forms: prefer neutral wording that works for both languages.
10. Do NOT touch spec files, do NOT run builds or tests, do NOT edit files
    outside your list (except adding the `TPipe` import to your listed files).

## Domain glossary (EN side)

- Bodega → Warehouse · Inventario → Inventory · Reposiciones → Restocks ·
  Repuestos → Spare parts
- Venta → Sale · carrito → cart · Completar venta → Complete sale ·
  Punto de venta → Point of sale
- Orden (de servicio) → (service) order · Orden de ingreso → Intake order
- Cliente → Client · Trabajador → Worker · Técnico → Technician
- Asignación → Assignment · Devolución → Return · Entrada → Stock entry ·
  Descuento (de stock) → Stock deduction
- Stock bajo → Low stock · Crítico → Critical · Mínimo → Min · Agotado → Out of stock
- Panel → Dashboard · Administración → Administration · Perfil → Profile
- Keep RUT, CLP, $ formatting as-is (market identity)
