# API_CONVENTION_ISSUES.md

Audit: implementasi vs `docs/api-convention.md` (v1.0)

---

## High

| ID | Endpoint | Issue | Expected | Actual | File |
|----|----------|-------|----------|--------|------|
| API-001 | `POST /api/v1/auth/login` | Wrong status code | 201 | 200 | `auth.routes.ts:185` |
| API-002 | `POST /api/v1/auth/refresh-token` | Wrong status code | 201 | 200 | `auth.routes.ts:191` |
| API-003 | `POST /api/v1/rob/manual-override` | Wrong status code | 201 | 200 | `rob.routes.ts` |
| API-004 | `POST /api/v1/rob/webhook/test` | Wrong status code | 201 | 200 | `rob.routes.ts` |
| API-005 | `POST /api/v1/manifests/{id}/items` | Wrong status code | 201 | 200 | `economy.routes.ts` |
| API-006 | `POST /api/v1/agencies/{id}/send-email` | Wrong status code | 201 | 200 | `agency.routes.ts` |
| API-007 | `POST /api/v1/agencies/{id}/send-whatsapp` | Wrong status code | 201 | 200 | `agency.routes.ts` |
| API-008 | `POST /api/v1/files/upload` | Zod validation bypass | `context.req.valid('form')` | `parseBody()` manual | `file.routes.ts:164-168` |

---

## Medium

| ID | Issue | Count | Detail |
|----|-------|-------|--------|
| API-009 | Inline response tanpa helper | 19 | DELETE/PATCH action endpoints memakai `{ success, message }` inline, bukan `successResponse()` |
| API-010 | Missing `data` field | 19+ | Action-only responses tidak mengembalikan `data` |
| API-011 | `PATCH /api/v1/villages/{id}` | No resource in response | PATCH success seharusnya mengembalikan resource di `data` |

Endpoint terdampak inline response: logout, reset-password, delete user, village patch/qris, delete file, rob actions, delete water-asset, resolve alert, delete destination/boat-owner/fisherman, verify/reject payment, manifest depart/complete, delete agency, delete setting.

---

## Low

| ID | Endpoint | Issue |
|----|----------|-------|
| API-012 | `GET /api/v1/audit-logs/export` | Response CSV (bukan JSON envelope) — acceptable untuk export |
| API-013 | `POST /api/v1/auth/logout` | POST non-create mengembalikan 200 (konvensi tidak membedakan) |

---

## Compliant

- Error handler global: `errorResponse()` + 422 untuk validasi ✅
- Mayoritas GET/POST create/PATCH menggunakan `successResponse` / `paginatedResponse` ✅
- Prefix `/api/v1` via `env.API_PREFIX` ✅
- camelCase JSON properties ✅
- kebab-case URL ✅
