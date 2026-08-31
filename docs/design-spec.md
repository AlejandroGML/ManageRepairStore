# Manage Repair Store — Especificación de diseño (prototipo → Angular)

**Fuente:** prototipo `manage-repair-store.html` + `docs/DESIGN.md` (tokens base).
**Objetivo:** guía ejecutable para portar el prototipo al frontend Angular (`1FRONT/`).
**Idioma de la UI:** español chileno (es-CL). Números en CLP, RUT con dígito verificador.

---

## 1. Arquitectura de layout (cambio estructural)

El prototipo **reemplaza el shell de tabs actual** (`app-form` con `mat-tab-group`) por una
**sidebar + topbar**, patrón estándar para herramientas data-dense.

```
┌─────────────┬──────────────────────────────────────────────┐
│  SIDEBAR    │  TOPBAR (título + buscador + tema + notif.)  │
│  (indigo)   ├──────────────────────────────────────────────┤
│  · logo     │                                              │
│  · nav por  │   CONTENIDO  (.page-header + .card/s)        │
│    rol      │                                              │
│  · usuario  │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

- **Sidebar** — `background: $color-secondary (#312E81)` en light, `#15121d` en dark.
  Agrupa la navegación en 4 secciones: *Principal, Inventario, Gestión, Sistema*.
  Ítem activo = `$color-primary` con texto blanco. Al pie, chip de usuario + logout.
- **Topbar** — `surface`, borde inferior `hairline`, altura 64px. Título + subtítulo de página,
  buscador global (Ctrl+K), notificaciones, toggle de tema.
- **Footer eliminado** — la identidad/acción vive en la sidebar.
- **Contenedor de página** — `.content` con `max-width:1440px`, padding 24px.
  Cada pantalla: `.page-header` (h1 + lead + acciones) → grid de `.card`s.

### Responsive

- `<1100px`: grids de 4 → 2 columnas; POS y orden de ingreso a 1 columna.
- `<900px`: sidebar pasa a drawer (`position:fixed`, se abre con botón hamburguesa).
- Móvil: tablas con scroll horizontal (`overflow-x:auto`), nada de scroll horizontal en el body.

---

## 2. Tokens → componentes (mapeo ejecutable)

Los tokens ya existen en `1FRONT/src/_variables.scss`. El prototipo expone los mismos valores
como CSS vars. **No hay colores nuevos**; esto es la correspondencia de uso.

| Rol visual | Token SCSS | Uso en el prototipo |
|---|---|---|
| Acción principal / activo / foco | `$color-primary #6D28D9` | botones primarios, ítem de nav activo, focus ring, filas seleccionadas |
| Hover de acción | `$color-primary-dark #5B21B6` | `:hover` de botones primarios |
| Fondo suave / hover de fila | `$color-primary-light #EDE9FE` | hover de fila, chips, botones `.btn-soft` |
| Sidebar / superficie oscura | `$color-secondary #312E81` | fondo de la sidebar (light) |
| CTA positiva (teal) | `$color-accent #0F766E` | "Completar venta", "Nueva venta" — **máx 2 por pantalla** |
| Canvas | `$color-bg #FAFAFE` | fondo de página y cabeceras de tabla |
| Superficie | `$color-surface #FFFFFF` | `.card`, inputs |
| Borde | `$color-border #E5E7EB` | bordes de card/input/tabla |
| Texto / texto fuerte / atenuado | `$color-text` / `--text-strong` / `$color-text-muted` | jerarquía de texto |
| Éxito / Advertencia / Error | `$color-success #047857` / `$color-warning #F59E0B` / `$color-error #DC2626` | badges de estado, alertas de stock, toasts |

**Regla de color (de DESIGN.md):** el ámbar/naranja es **solo** para `warning`. Nunca en marca,
headers, logos ni botones primarios.

**Tipografía** (Google Fonts, ya en `index.html`):
- UI: **Fira Sans** 400/500/700. Base 14px (tablas), 16px body, 18px títulos, 22–26px h1.
- Datos (RUT, CLP, stock, códigos): **Fira Code**, `font-variant-numeric: tabular-nums`.

**Espaciado / radio / sombras:** igual a `docs/DESIGN.md` (escala 4/8/12/16/24/32; radio 4/8/12;
sombras `0 1px 2px` y `0 4px 6px`). Nada de sombras pesadas ni gradientes salvo el panel del login.

---

## 3. Catálogo de componentes (clases CSS del prototipo)

| Componente | Clases | Notas |
|---|---|---|
| Botón primario / acento / ghost / soft / danger | `.btn .btn-primary .btn-accent .btn-ghost .btn-soft .btn-danger` | alto 38px (32 sm), radio 8px, `:active` baja 1px |
| Botón ícono | `.icon-btn` | 36px, hover `primary-soft` |
| Card | `.card .card-pad .card-head` | superficie + borde hairline + radio 12px + `shadow-sm` |
| KPI | `.kpi` (+ `.kpi-icon.violet/teal/amber/red`) | valor 26px bold, delta con icono |
| Badge de estado | `.badge .badge-success/warning/error/neutral` | pill (`9999px`), punto de color + texto |
| Tabla data-dense | `table.data` | 13.5px, header 12px uppercase, hover `primary-soft`, col. numérica alineada derecha en mono |
| Paginador | `.paginator` | "Mostrando X–Y de Z" + páginas |
| Barra de filtros | `.filter-bar` | buscador + select + seg-control |
| Segmented control | `.seg` | filtros de estado |
| Input / select / textarea | `.input .select` | 44px, borde hairline, focus ring `primary-soft` |
| Modal | `.modal-overlay .modal .modal-head .modal-body .modal-foot` | overlay con blur, animación `pop`, ESC cierra |
| Toast | `.toast` | bottom-right, auto-dismiss 2.6s, ícono por severidad |
| Ticket (PDF/QR) | `.ticket` | mono, borde punteado, encabezado de marca + QR placeholder |
| Stock bar | `.stock-bar > span` | barra de nivel con color según stock |

---

## 4. Pantallas (8)

1. **Login** — split-screen: panel de marca violeta/índigo (logo, value prop, features) + formulario
   sobre `surface` con **3 accesos demo por rol** y pista de credenciales.
2. **Panel** (overview, nuevo) — 4 KPIs (ventas hoy, órdenes abiertas, stock bajo, catálogo) +
   tabla "Alertas de stock bajo" + feed "Actividad reciente".
3. **Ventas (POS)** — catálogo de productos (grid, click agrega) + carrito (cantidad, subtotal,
   descuento, total CLP) + **elegir cliente** + "Completar venta" (teal).
4. **Registrar orden (Orden de ingreso)** — ver §7.
5. **Productos** — filtros (búsqueda, categoría, segmentado) + tabla insignia (ID, imagen, nombre,
   stock con estado, localización, costo, venta, acciones: **transacciones / editar / eliminar**) +
   "Agregar producto" (con detección de duplicados) + paginador.
6. **Bodega** — KPIs por pasillo + tabla "Stock por ubicación" con stock-bar y acción "Reponer".
7. **Reposiciones** — formulario de entrada (producto, cantidad, costo, proveedor, factura) +
   historial; al registrar → modal de confirmación.
8. **Clientes y órdenes** — tabla de clientes (RUT, nombre, teléfono, n° órdenes, acciones:
   **ver órdenes / editar / eliminar**) + tabla de órdenes recientes con ticket PDF.
9. **Administración** — tabla de usuarios (nombre, email, rol, estado, último acceso, editar/eliminar)
   + "Nuevo usuario" (formulario con rol).

> Nota: el prototipo muestra **Administración** como pantalla; en la app real es un diálogo
> (`user-management` abierto desde la navbar). Se puede mantener como diálogo o promoverlo a
> pantalla — decisión abierta en el port.

---

## 5. Modelo de roles (fiel a `form.component.ts`)

| Rol | Tabs visibles (real) | Pantallas del prototipo |
|---|---|---|
| `admin` | Registrar, Clientes, Bodega, Ventas | todas (8) |
| `warehouse` | Bodega (→ Producto + Repuestos) | Bodega, Productos, Reposiciones |
| `seller` | Ventas | Ventas |

- Login por email → rol (`admin@…`, `clerk@…` = seller, `bodega@…` = warehouse).
- El guard ya existe (`role.guard.ts`); solo hay que replicar el filtrado de nav en el shell nuevo.
- Los `allowedTabs`/`allowedSubTabs` actuales se reemplazan por `data-roles` en cada ítem de nav.

---

## 6. Diálogos de dominio

| Modal (prototipo) | Componente Angular existente | Acción |
|---|---|---|
| `modal-product` (agregar/editar) | `product/modal-edit-product` | CRUD producto |
| `modal-product-exists` (duplicado) | `product/modal-product-exists` | aviso de duplicado |
| `modal-transactions` (historial) | `product/modal-view-transactions` | historial de stock |
| `modal-refill` + `modal-refill-success` | `product/product-refill-modal` + `modal-refill-success` | reposición |
| `modal-edit-client` / `modal-delete` | `client/modal-edit-client` / `modal-delete-client` | CRUD cliente |
| `modal-client-orders` | `client/modal-orders` | órdenes del cliente |
| `modal-choice-client` | `client/modal-choice-client` | elegir cliente en venta |
| `modal-user-form` / `modal-delete` | `admin/user-management/user-form-dialog` / `user-delete-dialog` | CRUD usuario |
| `modal-ticket` (PDF/QR + imprimir) | `shared/pdf` | ticket de orden |
| `modal-delete` (genérico) | `shared/modal-confirm` + `modal-confirmar` + `modal-status` | consolidar en 1 |

> `modal-confirm`, `modal-confirmar` y `modal-status` son el mismo patrón; consolidar en un único
> modal de confirmación con variantes (peligro / info / éxito).

---

## 7. Componente RUT (rut-input)

- **Formato en vivo:** `123456789` → `12.345.678-9` (puntos cada 3, guión, dígito verificador).
- **Validación módulo 11:** dígito verificador 0–9 o `K`. Indicador ✓/✗ + hint "RUT válido/inválido".
- Ya existe `shared/rut-input`; alinearlo al spec (mono, indicador visual, mensaje de error).

```text
suma = Σ(dígito_i × multiplicador) con multiplicador 2..7 ciclando de derecha a izquierda
dv = 11 - (suma % 11)
dv = 11 → '0';  dv = 10 → 'K';  resto → dígito
```

---

## 8. Tema oscuro

- Toggle `data-theme="dark"` en `<html>` (ya existe `theme-toggle` y `theme.service`).
- Overrides: canvas `#17151F`, surface `#221E33`, hairline `#3B3649`, texto `#EDE9FE`,
  muted `#9CA3AF`, `primary-soft` `#312a4a`, sidebar `#15121d`.
- Material dark theme ya mapeado en `_theme.scss` (`mat.$violet-palette`).

---

## 9. Mapa de migración Angular (componente actual → pantalla del prototipo)

| Archivo actual (`1FRONT/src/app/…`) | Destino en el prototipo | Cambio principal |
|---|---|---|
| `shared/login` | Login | split-screen con panel de marca + acceso por rol |
| `shared/navbar` | sidebar + topbar | reescribir como shell de navegación |
| `shared/form` | shell (routing) | eliminar `mat-tab-group`; navegar por sidebar |
| `shared/footer` | — | eliminar |
| `sales/sales` | Ventas | + elegir cliente, total CLP, carrito |
| `client/register` | Registrar orden (Orden de ingreso) | + búsqueda por N°, RUT, toggle empresa, resumen QR/PDF |
| `client/finder` | Clientes y órdenes | + acciones (ver órdenes/editar/eliminar) |
| `warehouse/warehouse` | Bodega | stock-bar + KPIs por pasillo |
| `product/product` | Productos | + transacciones, detección de duplicados |
| `product/refills` | Reposiciones | + confirmación de entrada |
| `admin/user-management` | Administración | form de usuario con rol |
| `shared/rut-input` | rut-input | formato + validación módulo 11 |
| `shared/pdf` | ticket | + QR + imprimir |

---

## 10. Fases de port (orden sugerido)

1. **Tokens + base global** — asegurar que `styles.scss` use solo tokens; eliminar hex/rgb sueltos
   y los restos naranja (`app.component.css`: `.tr-row:hover` crema, `.loading` verde, spinner `warn`).
2. **Shell** — sidebar + topbar + routing por rol; eliminar tabs y footer.
3. **Login** — split-screen + login por rol.
4. **Pantalla insignia: Productos** — tabla + filtros + diálogos (transacciones, duplicado).
5. **Ventas + Registrar orden** — POS con cliente, orden de ingreso con RUT/QR/PDF.
6. **Bodega + Reposiciones** — stock-bar + confirmación de entrada.
7. **Clientes + Administración** — acciones y formularios.
8. **Pulido** — tema oscuro, responsive, focus/a11y, Fira Code en todos los datos.

---

## Decisiones pendientes

- [ ] **Bootstrap 5:** hoy convive con Angular Material. ¿Mantenerlo o migrar a Material + utilidades?
- [ ] **Administración:** ¿pantalla (como el prototipo) o diálogo (como la app actual)?
- [ ] **Spinner de carga:** corregir `color="warn"` (ámbar) al portar.
