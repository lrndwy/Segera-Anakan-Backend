# MODULE_TEST_REPORT.md

**Modul:** ROB Guardian  
**Tanggal:** 2026-06-06  
**Test runner:** Vitest 4.x  
**File test:** `tests/integration/rob/rob.integration.test.ts`

---

## Ringkasan

| Metrik | Nilai |
|--------|-------|
| **Total Test** | 27 |
| **Passed** | 27 |
| **Failed** | 0 |
| **Coverage (modul `src/modules/rob/**`)** | Statements **50.2%** · Lines **50.82%** · Functions **54.38%** · Branches **24%** |

---

## Perbaikan yang Diterapkan

### 1. Validasi HTTP 422

**Masalah:** `@hono/zod-openapi` mengembalikan **400** pada validasi gagal.  
**Perbaikan:** Tambah `openApiDefaultHook` di `src/lib/openapi-router.ts` dan gunakan `createOpenAPIRouter()` di seluruh route handler agar error validasi konsisten **422** dengan envelope `{ success: false, message, errors? }`.

### 2. Transaksi atomic pada `manualOverride`

**Masalah:** Operasi multi-tabel (`rob_manual_overrides`, `rob_current_status`, `rob_histories`, `audit_logs`) tidak dibungkus transaksi — kegagalan audit log meninggalkan partial commit.  
**Perbaikan:** `RobGuardianService.manualOverride()` menggunakan `runTransaction()`. Audit log ikut dalam transaksi via parameter `db` opsional di `AuditLogService.create()`. Webhook dipanggil **setelah** commit.

---

## Endpoint Coverage

| Endpoint | Happy | Validation | 401 | 403 | Ownership | 404 | Audit | Response | Business Flow |
|----------|-------|------------|-----|-----|-----------|-----|-------|----------|---------------|
| `GET /rob-status` | ✅ | N/A | N/A (public) | N/A (public) | N/A (global) | ✅ | N/A | ✅ | ✅ |
| `GET /rob-histories` | ✅ | ✅ | N/A (public) | N/A (public) | N/A (global) | N/A | N/A | ✅ | ✅ |
| `POST /rob/manual-override` | ✅ | ✅ | ✅ | ✅ | ✅* | N/A | ✅ | ✅ | ✅ |
| `POST /rob/webhook/test` | ✅ | N/A | ✅ | ✅ | ✅* | N/A | ✅ | ✅ | ✅ |

\* Modul ROB bersifat **global** (bukan village-scoped). Test ownership diverifikasi via **403 role-based** (`ADMIN_DESA` / `KADER_DESA` dari desa manapun), sesuai `docs/rabc.md`.

---

## Verifikasi per Kategori

### Business Flow ✅

- Manual override memperbarui `rob_current_status`, menambah `rob_histories`, dan tercermin di `GET /rob-status` + `GET /rob-histories`.
- Webhook test membuat entri `rob_webhook_logs`.

### RBAC ✅

- `POST /rob/manual-override` dan `POST /rob/webhook/test` hanya `ADMIN_KECAMATAN`.
- `ADMIN_DESA` dan `KADER_DESA` menerima **403 Forbidden**.

### Ownership Policy ✅ (N/A global)

- Resource ROB tidak terikat `village_id`. Akses dibatasi oleh role, bukan ownership desa.

### Validation ✅

- Input invalid mengembalikan **422 Unprocessable Entity** dengan error envelope standar.

### Transaction ✅

- `manualOverride` multi-table dibungkus `runTransaction()` — kegagalan audit log memicu rollback penuh.

### Audit Log ✅

| Action | Module | Entity Type | Verified |
|--------|--------|-------------|----------|
| `ROB_OVERRIDE` | `ROB_GUARDIAN` | `rob_manual_overrides` | ✅ |
| `ROB_WEBHOOK_TEST` | `ROB_GUARDIAN` | `rob_webhook_logs` | ✅ |

### Response Format ✅

- Sukses dengan `data`: `GET /rob-status`, `GET /rob-histories` (termasuk `meta` pagination).
- Sukses message-only: `POST /rob/manual-override`, `POST /rob/webhook/test`.
- Error: `{ success: false, message }` pada 401, 403, 404, 422, 500.

---

## Coverage per File

| File | Statements | Lines | Functions | Branches |
|------|------------|-------|-----------|----------|
| `rob.routes.ts` | 94.44% | 94.44% | 100% | 50% |
| `rob-guardian.service.ts` | 70.21% | 70.21% | 70% | 50% |
| `rob.repository.ts` | 66.66% | 66.66% | 77.77% | 50% |
| `webhook.service.ts` | 61.53% | 61.53% | 100% | 25% |
| `rob-score.ts` | 41.66% | 41.66% | 33.33% | 30.76% |
| `bmkg.service.ts` | 2.53% | 2.63% | 5.55% | 0% |
| `rob.schema.ts` | 100% | 100% | 100% | 100% |
| `rob.types.ts` | 100% | 100% | 100% | 100% |
| `bmkg.constants.ts` | 100% | 100% | 100% | 100% |

**Belum ter-cover:** `runSyncCycle()`, `BmkgService.fetchMetrics()`, webhook dispatch ke URL eksternal, cabang scoring lanjutan di `rob-score.ts`.

---

## Cara Menjalankan

```bash
# Pastikan Postgres + Redis berjalan (docker compose up)
npm run seed
npm run test:integration

# Dengan coverage
npm run test:coverage
```

**Prasyarat env test** (di-override otomatis di `tests/setup.ts`):

- `REDIS_URL=redis://localhost:6380`
- `STORAGE_ENDPOINT=http://localhost:9000`

---

## Rekomendasi Lanjutan (opsional)

1. Tambah integration test untuk `runSyncCycle()` jika worker BMKG sync perlu diverifikasi.
2. Tingkatkan coverage `bmkg.service.ts` dan `rob-score.ts` dengan test unit terpisah.
