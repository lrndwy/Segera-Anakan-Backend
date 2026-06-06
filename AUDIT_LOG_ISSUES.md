# AUDIT_LOG_ISSUES.md

Audit: audit log untuk aksi penting vs spesifikasi review

---

## Required Actions — Status

| Action | Module | Status | File |
|--------|--------|--------|------|
| LOGIN | Auth | ✅ | `auth.service.ts:104` |
| LOGOUT | Auth | ✅ | `auth.service.ts:165` |
| CREATE_USER | User | ✅ | `user-management.service.ts:124` |
| UPDATE_USER | User | ✅ | `user-management.service.ts:164` |
| RESET_PASSWORD | User | ✅ | `user-management.service.ts:196` |
| DELETE_USER | User | ✅ | `user-management.service.ts:221` |
| CREATE_BOOKING | Tourism | ✅ | `booking.service.ts:149` |
| VERIFY_BOOKING_PAYMENT | Tourism | ✅ | `booking.service.ts:255` |
| ASSIGN_BOAT | Tourism | ✅ (timing issue — lihat TX-003) | `boat-assignment.service.ts:69` |
| VERIFY_COMMODITY_PAYMENT | Economy | ✅ | `commodity-order.service.ts:238` |
| CREATE_MANIFEST | Economy | ✅ | `manifest.service.ts:110` |
| COMPLETE_MANIFEST | Economy | ✅ | `manifest.service.ts:206` |
| CREATE_SETTING | Settings | ✅ | `settings.service.ts:124` |
| UPDATE_SETTING | Settings | ✅ | `settings.service.ts:155` |
| DELETE_SETTING | Settings | ✅ | `settings.service.ts:182` |

**Semua 15 aksi wajib sudah membuat audit log.**

---

## High

| ID | Issue | Detail | File |
|----|-------|--------|------|
| AL-001 | Sanitasi tidak di write path | `AuditLogService.create()` menyimpan `oldData`/`newData` mentah | `src/services/audit-log.service.ts` |
| AL-002 | Sanitizer miss snake_case | `password_hash`, `refresh_token` tidak match | `audit-log.sanitize.ts` |

---

## Medium

| ID | Issue | Detail |
|----|-------|--------|
| AL-003 | ASSIGN_BOAT audit timing | Audit ditulis sebelum commit transaksi — lihat TX-003 |
| AL-004 | CREATE_COMMODITY_ORDER audit timing | Audit di dalam tx callback dengan koneksi terpisah |

---

## Low

| ID | Issue | Detail |
|----|-------|--------|
| AL-005 | Multi-step tanpa tx | login, resetPassword, delete user — audit ada tapi tidak dalam transaksi DB |
