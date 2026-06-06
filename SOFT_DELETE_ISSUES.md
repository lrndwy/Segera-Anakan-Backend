# SOFT_DELETE_ISSUES.md

Audit: soft delete vs `docs/api-convention.md`

---

## Compliant

Semua entitas dengan `deleted_at` menggunakan soft delete (`deletedAt = now()`), bukan hard delete:

| Entity | Repository | Service |
|--------|------------|---------|
| users | `softDelete()` | ✅ |
| agencies | `softDelete()` | ✅ |
| water_assets | `softDelete()` | ✅ |
| destinations | `softDelete()` | ✅ |
| boat_owners | `softDelete()` | ✅ |
| fishermen | `softDelete()` | ✅ |

Query read/update memfilter `isNull(deletedAt)`.

---

## Low

| ID | Issue | Detail | File |
|----|-------|--------|------|
| SD-001 | `users.softDelete` tanpa guard | Tidak cek `deletedAt IS NULL` sebelum update | `user.repository.ts:99-106` |
| SD-002 | villages — no delete | Kolom `deleted_at` ada, tidak ada operasi delete | `village.service.ts` |

---

## Hard Delete (Sah)

| Table | Reason |
|-------|--------|
| `destination_images` | Junction table, tanpa `deleted_at` |
| `user_sessions` | Data ephemeral |
| `settings` | Tanpa `deleted_at` |
| `files` | Tanpa `deleted_at` |

**Tidak ada pelanggaran hard delete pada entitas bisnis yang wajib soft delete.**
