# INTEGRATION_REVIEW_REPORT.md

**Project:** SegaraAnakan Hub Backend  
**Date:** 2026-06-06  
**References:** `docs/database-schema.md` v3.3, `docs/rabc.md` v2.0, `docs/api-convention.md` v1.0

---

## Executive Summary

Audit menyeluruh terhadap 12 modul backend menemukan **47 issue** across 10 kategori. Mayoritas implementasi sudah konsisten dengan dokumentasi. Isu kritis terpusat pada **FK database**, **ownership file**, **transaksi stok**, **sanitasi audit log**, dan **konvensi HTTP status**.

---

## Total Issues

| Severity | Count |
|----------|-------|
| **Critical** | 1 |
| **High** | 14 |
| **Medium** | 22 |
| **Low** | 10 |
| **Total** | **47** |

---

## Critical Issues

| ID | Category | Issue | Status |
|----|----------|-------|--------|
| DB-001 | Database | `users.village_id` tanpa FK ke `villages` | ✅ Fixed (`0011_users_village_fk.sql`) |

---

## High Issues

| ID | Category | Issue | Status |
|----|----------|-------|--------|
| RBAC-001 | RBAC | `GET /files/{id}` tanpa ownership check | ✅ Fixed |
| RBAC-002 | RBAC | Missing complete booking endpoint | ⏸ Deferred (new feature) |
| RBAC-003 | RBAC | Missing cancel booking endpoint | ⏸ Deferred (new feature) |
| RBAC-004 | RBAC | Missing boat-assignment HTTP routes | ⏸ Deferred (new feature) |
| TX-001 | Transaction | Manual stock create tanpa transaksi | ✅ Fixed |
| TX-002 | Transaction | Manual stock adjust tanpa transaksi | ✅ Fixed |
| TX-003 | Transaction | ASSIGN_BOAT audit tidak atomic dengan tx | ✅ Fixed |
| AL-001 | Audit Log | Sanitasi tidak di write path | ✅ Fixed |
| AL-002 | Audit Log | Sanitizer miss snake_case keys | ✅ Fixed |
| SEC-001 | Security | Same as AL-001 | ✅ Fixed |
| SEC-002 | Security | Same as AL-002 | ✅ Fixed |
| API-001–007 | API Convention | POST success returns 200 instead of 201 | ✅ Fixed |
| API-008 | Validation | File upload bypasses Zod OpenAPI validation | ✅ Fixed |
| DB-002 | Database | `manifest_items.commodity_order_id` UNIQUE not in docs | 📋 Document only |

---

## Medium Issues (Summary)

- RBAC: extra public endpoints, missing admin-scoped list routes, missing profile/commodity routes
- API: 19 inline responses without helper, missing `data` field
- Transaction: manifest create, payment submit, reject payment without tx
- Security: auth middleware skip soft-delete, webhook URL exposed in settings API
- Settings: email config unused, ROB score boundaries hardcoded
- Database: varchar vs text type mismatches, extra seed keys
- Swagger: response schema incomplete on action endpoints

---

## Low Issues (Summary)

- Auth logout/me without explicit roleMiddleware
- timestamptz vs timestamp, default values, extra indexes
- CSV export non-JSON response
- users.softDelete without deleted_at guard

---

## Recommended Fixes (Priority Order)

### Immediate (Critical + High — in scope)

1. Tambah FK `users.village_id` → `villages(id)` via migrasi
2. Ownership check pada `FileService.findById()`
3. Wrap `commodity-inventory` create/adjustStock dengan `runTransaction`
4. Pindahkan audit `ASSIGN_BOAT` ke setelah commit transaksi
5. Sanitize audit data on write + perluas sensitive key list
6. Perbaiki POST status code 200 → 201 (8 endpoint)
7. File upload: gunakan validasi Zod via `req.valid('form')`

### Deferred (Requires new features — out of scope per fixing rules)

- Complete/cancel booking routes
- Boat assignment HTTP routes
- Update own profile endpoint
- Delete commodity inventory endpoint
- Wire admin-scoped list endpoints

### Documentation sync

- Update `database-schema.md` untuk UNIQUE constraint `manifest_items.commodity_order_id`
- Document settings seed keys tambahan

---

## Success Criteria Assessment

| Criteria | Status |
|----------|--------|
| No Critical Issues | ✅ |
| No RBAC Issues | ⚠️ 3 deferred (missing routes = new feature) |
| No Ownership Issues | ✅ |
| No Transaction Issues | ⚠️ Medium items remain |
| No Security Issues | ✅ (High fixed) |
| No Audit Log Issues | ✅ |
| Swagger complete | ⚠️ Medium gaps |
| API convention compliant | ✅ (High fixed) |

**Backend belum siap production** sampai Critical + High fixes diterapkan. Route gaps (RBAC-002–004) perlu keputusan product apakah diimplementasi sebagai fitur terpisah.

---

## Detail Reports

- [DATABASE_ISSUES.md](./DATABASE_ISSUES.md)
- [RBAC_ISSUES.md](./RBAC_ISSUES.md)
- [API_CONVENTION_ISSUES.md](./API_CONVENTION_ISSUES.md)
- [TRANSACTION_ISSUES.md](./TRANSACTION_ISSUES.md)
- [AUDIT_LOG_ISSUES.md](./AUDIT_LOG_ISSUES.md)
- [VALIDATION_ISSUES.md](./VALIDATION_ISSUES.md)
- [SWAGGER_ISSUES.md](./SWAGGER_ISSUES.md)
- [SECURITY_ISSUES.md](./SECURITY_ISSUES.md)
- [SOFT_DELETE_ISSUES.md](./SOFT_DELETE_ISSUES.md)
- [SETTINGS_ISSUES.md](./SETTINGS_ISSUES.md)
