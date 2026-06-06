# DATABASE_ISSUES.md

Audit: implementasi vs `docs/database-schema.md` (v3.3)

---

## Critical

| ID | Table/Column | Doc | Code | File |
|----|--------------|-----|------|------|
| DB-001 | `users.village_id` | `uuid fk nullable` → `villages` | FK ditambahkan via migrasi `0011`; schema TS tanpa `.references()` karena circular import (villages→files→users) | **critical** — ✅ Fixed (migration) |

---

## High

| ID | Table/Column | Doc | Code | File |
|----|--------------|-----|------|------|
| DB-002 | `manifest_items.commodity_order_id` | `uuid fk` (tanpa unique) | `uuid fk` + **UNIQUE** | `src/db/schema/manifest-items.ts`, `0008_economy.sql` |

> Constraint UNIQUE adalah keputusan bisnis (satu order hanya satu manifest). Perlu sinkronisasi docs, bukan penghapusan constraint.

---

## Medium

| ID | Table/Column | Doc | Code | File |
|----|--------------|-----|------|------|
| DB-003 | `users.full_name`, `email`, `phone` | `varchar(n)` | `text` | `src/db/schema/users.ts` |
| DB-004 | `settings.key` | `varchar(100)` | `text` | `src/db/schema/settings.ts` |
| DB-005 | `files.bucket`, `mime_type` | `varchar(n)` | `text` | `src/db/schema/files.ts` |
| DB-006 | `audit_logs.*` (action, module, entity_type, ip_address) | `varchar(n)` | `text` | `src/db/schema/audit-logs.ts` |
| DB-007 | `boat_assignments.status` | enum tanpa default | default `'CONFIRMED'` | `src/db/schema/boat-assignments.ts` |
| DB-008 | Settings seed keys | Contoh di docs | Seed tambahan: `BMKG_API_URL`, `WATER_*`, `EMAIL_*`, `SYSTEM_*` | `0005`–`0010` migrations |

---

## Low

| ID | Issue | Detail |
|----|-------|--------|
| DB-009 | `timestamp` vs `timestamptz` | Semua kolom timestamp memakai `withTimezone: true` |
| DB-010 | Default values | Enum status fields punya default (ACTIVE, PENDING_PAYMENT, dll.) — tidak didokumentasi |
| DB-011 | `villages.qris_file_id` | Docs: uuid nullable; code: FK → `files` (lebih ketat) |
| DB-012 | Index ekstra | Banyak index performa tidak tercantum di docs |

---

## Coverage Summary

| Metric | Result |
|--------|--------|
| Tabel di docs → schema TS | 33/33 ✅ |
| Tabel di docs → migrasi SQL | 33/33 ✅ |
| Tabel ekstra di kode | 0 |
| Tabel hilang dari implementasi | 0 |
| Enum (14) | Semua nilai cocok ✅ |
