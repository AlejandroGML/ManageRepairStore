# ManageRepairStore API Contract

Frontend API services (`1FRONT/src/app/services/`) consume these backend endpoints (`2BACK/src/*/*.controller.ts`). Base URL: `getApiUrl()` (front, always same-origin `/api`) / NestJS controllers (back).

Tables verified against code on 2026-10-03 (port of the ABAGAS contract). Rows marked "no front consumer" are backend-only surface (kept for tooling/compat).

## Products

| Frontend method | HTTP | Endpoint | Backend controller method |
|-----------------|------|----------|---------------------------|
| `ProductsApiService.createProduct(formData)` | POST | `/product` | `ProductController.createProduct()` |
| `ProductsApiService.searchProductById(id)` | GET | `/product/by-id/:id` | `ProductController.getProductById()` |
| `ProductsApiService.searchProductsByName(name)` | GET | `/product/by-name` | `ProductController.getProductsByName()` |
| `ProductsApiService.searchProductsByLocation(loc)` | GET | `/product/by-location` | `ProductController.getProductsByLocation()` |
| — no front consumer | PATCH | `/product/update/:id` | `ProductController.updateProductById()` |
| `ProductsApiService.getProductsWithLastTransaction()` | GET | `/product/lastTransaction` | `ProductController.getProductsWithLastTransaction()` |
| `ProductsApiService.getActiveProducts()` | GET | `/product/active` | `ProductController.getActiveProducts()` |
| — no front consumer | GET | `/product/all` | `ProductController.getAllProducts()` |
| `ProductsApiService.softDeleteProduct(id)` | DELETE | `/product/delete/:id` | `ProductController.softDeleteProduct()` |
| `ProductsApiService.getProductTransactions(id)` | GET | `/product/:productId/transactions` | `ProductController.getProductTransactions()` |
| `ProductsApiService.createProductTransaction(id, fd)` | POST | `/product/:id/transaction` | `ProductController.createProductTransaction()` |
| `ProductsApiService.checkProductNameExists(name)` | GET | `/product/exists` | `ProductController.checkProductNameExists()` |
| — server-side search (refills form) | GET | `/product/search` | `ProductController.searchProducts()` |
| — export XLSX stock bajo | GET | `/product/export/low-stock` | `ProductController.exportLowStock()` |
| `SalesApiService.createRefillBatch(data)` | POST | `/product/refills/batch` | `ProductController.createRefillBatch()` |
| — historial reposiciones | GET | `/product/refills/history` | `ProductController.refillHistory()` |

Note: POST `/product` registers a new product (multipart); exact normalized
duplicate names return 409. Product movements go through POST
`/product/:id/transaction`.

## Sales

| Frontend method | HTTP | Endpoint | Backend controller method |
|-----------------|------|----------|---------------------------|
| `SalesApiService.getTodaySummary()` | GET | `/sales` | `SalesController.getTodaySummary()` |
| `SalesApiService.createSaleBatch(data)` | POST | `/sales/batch` | `SalesController.createSaleBatch()` |
| `SalesApiService.generateSalePdf(data)` | POST | `/sales/pdf` | `SalesController.generateSalePdf()` |

> Removed 2026-10: legacy non-atomic `POST /sales` (`SalesController.createSale()`) — superseded by `POST /sales/batch`.

## Orders

| Frontend method | HTTP | Endpoint | Backend controller method |
|-----------------|------|----------|---------------------------|
| `OrdersApiService.create(body)` | POST | `/order` | `OrderController.create()` |
| `OrdersApiService.findOrderByUser(user)` | GET | `/order/user/:id` | `OrderController.getOrderByUserId()` |
| `OrdersApiService.findOrderByCode(code)` | GET | `/order/code/:code` | `OrderController.getOrdersByCode()` |
| `OrdersApiService.getRecentOrders(limit)` | GET | `/order/recent` | `OrderController.findRecent()` |
| `OrdersApiService.updateStatus(order)` | PATCH | `/order/status/:id` | `OrderController.updateStatus()` |
| `OrdersApiService.getAllOrders()` | GET | `/order/all` | `OrderController.findAll()` |
| `PdfService.generatePDFServer(order)` | POST | `/order/pdf` | `OrderController.generatePdf()` |
| — no front consumer | PATCH | `/order/:id` | `OrderController.update()` |

Note: `POST /order` resolves the company inside its transaction (spec
`companies`): explicit `companyId` (400 if the client RUT does not match
the company), `is_company=true` + meaningful RUT auto-links or creates,
everything else stays `company_id = NULL`. Registered orders get
`code = ORD-{1000+id}`.

## Clients

| Frontend method | HTTP | Endpoint | Backend controller method |
|-----------------|------|----------|---------------------------|
| `ClientsApiService.exportClients()` | GET | `/client/export` | `ClientController.exportClients()` |
| `ClientsApiService.getUserById(id)` | GET | `/client/:id` | `ClientController.getUserById()` |
| `ClientsApiService.findUserByRut(rut)` | GET | `/client/by-rut/:rut` | `ClientController.findByRut()` |
| `ClientsApiService.findUserByName(name)` | GET | `/client/by-name/:name` | `ClientController.findByName()` |
| `ClientsApiService.findUserByAddress(address)` | GET | `/client/by-address/:address` | `ClientController.findByAddress()` |
| `ClientsApiService.searchClients(q, field, limit)` | GET | `/client/search` | `ClientController.searchClients()` |
| `ClientsApiService.checkDuplicates(input)` | POST | `/client/duplicates-check` | `ClientController.checkDuplicates()` |
| `ClientsApiService.updateUser(user)` | PATCH | `/client/:id` | `ClientController.updateUser()` |
| `ClientsApiService.deleteUserById(id)` | DELETE | `/client/:id` | `ClientController.deleteUser()` |
| `ClientsApiService.getCountClients()` | GET | `/client/count` | `ClientController.getCountUsers()` |
| — no front consumer | GET | `/client/data` | `ClientController.getAllUsers()` |

Note: `findByRut()` serves `GET /client/by-rut/:rut` and returns an array;
`getUserById()` returns the single active client by id (company relation
loaded). `checkDuplicates` excludes the explicitly selected `clientId` and
every branch of the selected `companyId`. The legacy string-based
`GET /client/companies` was removed (see Companies).

## Companies (spec `companies`, 2026-10-03)

| Frontend method | HTTP | Endpoint | Backend controller method |
|-----------------|------|----------|---------------------------|
| `CompaniesApiService.search(q, limit)` | GET | `/company?q=&limit=` | `CompanyController.list()` |
| `CompaniesApiService.list(page, limit, q)` | GET | `/company?page=&limit=&q=` | `CompanyController.list()` |
| `CompaniesApiService.clients(companyId)` | GET | `/company/:id/clients` | `CompanyController.getClients()` |
| `CompaniesApiService.rename(id, name)` | PATCH | `/company/:id` | `CompanyController.rename()` |

Notes: `/company` lists active companies paginated (default 10) with `branchCount`;
`rename` returns 400 (nombre vacío/id inválido), 404 (empresa inexistente) and
409 (nombre duplicado normalizado entre empresas activas).

## Users

| Frontend method | HTTP | Endpoint | Backend controller method |
|-----------------|------|----------|---------------------------|
| `UsersService.getAll()` | GET | `/users` | `UsersController.findAll()` |
| `UsersService.getById(id)` | GET | `/users/:id` | `UsersController.findById()` |
| `UsersService.create(dto)` | POST | `/users` | `UsersController.create()` |
| `UsersService.update(id, dto)` | PATCH | `/users/:id` | `UsersController.update()` |
| `UsersService.deactivate(id)` / `activate(id)` | PATCH | `/users/:id` (`{active:false\|true}`) | `UsersController.update()` |
| `UsersService.remove(id)` | DELETE | `/users/:id` | `UsersController.remove()` |

Note: every response is mapped to `PublicUser` (`passwordHash` never
serializes).

## Auth

| Frontend method | HTTP | Endpoint | Backend controller method |
|-----------------|------|----------|---------------------------|
| `AuthApiService.login(email, password)` | POST | `/auth/login` | `AuthController.login()` |
| — session check | GET | `/auth/me` | `AuthController.me()` |
| `AuthApiService.changePassword(current, next)` | PATCH | `/auth/password` | `AuthController.changePassword()` |

## Log

| Frontend method | HTTP | Endpoint | Backend controller method |
|-----------------|------|----------|---------------------------|
| `LogApiService.getData()` | GET | `/log/data` | `LogController.getAllLogs()` |
| `LogApiService.create(body)` | POST | `/log` | `LogController.createLog()` |

## Categories / Workers

| Frontend method | HTTP | Endpoint | Backend controller method |
|-----------------|------|----------|---------------------------|
| category management | GET/POST/PATCH/DELETE | `/category[/:id]` | `CategoryController.*` |
| worker management | GET/POST/DELETE | `/worker[/:id]` | `WorkerController.*` |

## Demo (MRS-only, ephemeral install)

| Frontend method | HTTP | Endpoint | Backend controller method |
|-----------------|------|----------|---------------------------|
| demo reset on boot | POST | `/demo/reset` | `DemoController.reset()` |

Disabled with `DEMO_MODE=false`. Data seeding only — outside the migration
system.

## Transactions (backend-only surface)

The `TransactionController` routes (`/transaction/*`) have no direct frontend consumer. Frontend touches transactions only through `ProductController` (`/product/:productId/transactions`, `/product/:id/transaction`).

## Alignment history

- Tables ported from the ABAGAS contract on 2026-10-03 and verified against
  MRS controllers the same day (companies formalization landed).
- MRS-only sections kept: Demo, Categories/Workers, `/auth/me`, product
  search/export endpoints.