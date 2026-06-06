# RBAC_ISSUES.md

Audit: implementasi vs `docs/rabc.md` (v2.0)

---

## High

| ID | Endpoint | Issue | Expected | Actual | File |
|----|----------|-------|----------|--------|------|
| RBAC-001 | `GET /api/v1/files/{id}` | Missing ownership check | ADMIN_DESA/KADER hanya file desa sendiri | `findById()` tanpa `assertVillageAccess` | `file.service.ts:115-126` |
| RBAC-002 | `PATCH /api/v1/bookings/{id}/complete` | Missing endpoint | ADMIN_KECAMATAN + ADMIN_DESA* | Route tidak ada | `tourism.routes.ts` |
| RBAC-003 | `PATCH /api/v1/bookings/{id}/cancel` | Missing endpoint | ADMIN_KECAMATAN + ADMIN_DESA* | Route tidak ada | `tourism.routes.ts` |
| RBAC-004 | `GET/POST/PATCH /api/v1/boat-assignments/*` | Missing endpoints | View/Create/Update + ownership | Hanya internal via verify-payment | `tourism.routes.ts` |

> RBAC-002 s/d RBAC-004: confirm booking digabung ke verify-payment (RBAC-002 partial). Complete/cancel/boat-assignment belum diexpose sebagai HTTP route.

---

## Medium

| ID | Endpoint | Issue | File |
|----|----------|-------|------|
| RBAC-005 | `GET /api/v1/water-assets/public` | Extra public endpoint (tidak di PUBLIC ACCESS) | `water.routes.ts` |
| RBAC-006 | `GET /api/v1/destinations/` (admin scoped) | `findAllAdmin()` ada di service, tidak di-wire ke route | `destination.service.ts`, `tourism.routes.ts` |
| RBAC-007 | `GET /api/v1/commodity-inventory/{id}` | Extra public endpoint | `economy.routes.ts` |
| RBAC-008 | `DELETE /api/v1/commodity-inventory/{id}` | Missing endpoint | `economy.routes.ts` |
| RBAC-009 | Admin commodity list | `findAllAdmin()` tidak di-wire | `commodity-inventory.service.ts` |
| RBAC-010 | `PATCH /api/v1/commodity-orders/{id}/status` | Missing generic status update | `economy.routes.ts` |
| RBAC-011 | `PATCH /api/v1/auth/me` | Update Own Profile tidak diimplementasi | `auth.routes.ts` |

---

## Low

| ID | Endpoint | Issue | File |
|----|----------|-------|------|
| RBAC-012 | `POST /api/v1/auth/logout` | Tidak ada `roleMiddleware` eksplisit | `auth.routes.ts` |
| RBAC-013 | `GET /api/v1/auth/me` | Tidak ada `roleMiddleware` eksplisit | `auth.routes.ts` |
| RBAC-014 | Destination Images | Upload/delete terpisah tidak ada (embedded di CRUD) | `tourism.routes.ts` |

---

## Compliant Modules

User Management, Village, ROB admin, Water Reports/Alerts, Boat Owners, Fishermen, Manifests, Agency, Settings, Audit Log — role gate dan ownership policy sesuai spesifikasi.
