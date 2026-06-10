# SWAGGER_ISSUES.md

Audit: dokumentasi OpenAPI/Swagger

---

## Compliant

Semua endpoint modul (89 handler) menggunakan `createRoute` + `router.openapi` dan muncul di `/openapi.json`.

Modul terdokumentasi: Auth, User, File, Village, ROB, Banyu Mili, Tourism, Economy, Agency, Settings, Audit Log.

---

## Medium

| ID | Issue | Detail | File |
|----|-------|--------|------|
| SW-001 | Delete/action response schema tidak lengkap | 19 endpoint DELETE/PATCH action memakai schema `{ success, message }` tanpa `data` | Berbagai `*.routes.ts` |
| SW-002 | POST status code mismatch | OpenAPI spec mendeklarasikan 200 untuk beberapa POST yang seharusnya 201 | `auth.routes.ts`, `rob.routes.ts`, dll. |

---

## Low

| ID | Issue | Detail |
|----|-------|--------|
| SW-003 | Infrastructure endpoints | `/health`, `/ready` tidak terdokumentasi di OpenAPI |
| SW-004 | CSV export | `GET /audit-logs/export` response `text/csv` — schema minimal di OpenAPI |

---

## Missing Documentation (RBAC gaps = missing routes)

Endpoint berikut tidak ada di Swagger karena route belum diimplementasi:

- `PATCH /bookings/{id}/complete`
- `PATCH /bookings/{id}/cancel`
- `/boat-assignments/*`
- `PATCH /auth/me`
- `DELETE /commodity-inventory/{id}`
