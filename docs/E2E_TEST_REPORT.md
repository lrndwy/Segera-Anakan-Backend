# E2E_TEST_REPORT.md

**Proyek:** SegaraAnakan Hub Backend  
**Tanggal:** 2026-06-06  
**Test runner:** Vitest 4.x  
**File test:** `tests/e2e/system.e2e.test.ts`  
**Database:** `segaraanakan_hub_test` (terpisah dari development)

---

## Ringkasan

| Metrik | Nilai |
|--------|-------|
| **Total Test Cases** | 50 |
| **Passed** | 50 |
| **Failed** | 0 |
| **Coverage (seluruh `src/**`)** | Statements **56.89%** · Lines **57.91%** · Functions **56.54%** · Branches **29.76%** |

---

## Success Criteria

| Kriteria | Status |
|----------|--------|
| Semua E2E Test Passed | ✅ |
| Semua Ownership Test Passed | ✅ |
| Semua RBAC Test Passed | ✅ |
| Semua Transaction Test Passed | ✅ |
| Semua Audit Log Test Passed | ✅ |
| Semua Notification Test Passed | ✅ |
| Tidak ada Critical Issue | ✅ |
| Tidak ada High Issue | ✅ |
| Backend siap STAGING | ✅ |

---

## Phase Coverage

| Phase | Area | Tests | Status |
|-------|------|-------|--------|
| 1 | Authentication | 6 | ✅ |
| 2 | User Management | 3 | ✅ |
| 3 | Village | 3 | ✅ |
| 4 | ROB Guardian | 3 | ✅ |
| 5 | Banyu Mili | 5 | ✅ |
| 6 | Tourism | 5 | ✅ |
| 7 | Economy | 6 | ✅ |
| 8 | Agency | 3 | ✅ |
| 9 | Settings | 3 | ✅ |
| 10 | Audit Log | 3 | ✅ |
| 11 | Transaction Tests | 3 | ✅ |
| 12 | Security Tests | 4 | ✅ |
| 13 | API Convention | 3 | ✅ |

---

## Seed Data E2E

### Villages (migration)

| ID | Nama |
|----|------|
| `11111111-1111-4111-8111-111111111101` | Ujunggagak |
| `11111111-1111-4111-8111-111111111102` | Ujungalang |
| `11111111-1111-4111-8111-111111111103` | Panikel |
| `11111111-1111-4111-8111-111111111104` | Klaces |

### Users (`tests/helpers/e2e-seed.ts`)

| Role | Email |
|------|-------|
| ADMIN_KECAMATAN | `SEED_ADMIN_EMAIL` (.env) |
| ADMIN_DESA_UJUNGALANG | `e2e.admin.ujungalang@test.local` |
| ADMIN_DESA_PANIKEL | `e2e.admin.panikel@test.local` |
| KADER_DESA_UJUNGALANG | `e2e.kader.ujungalang@test.local` |

Password E2E: `E2eTestPass123!`

### Agencies (migration + seed)

| Type | ID |
|------|-----|
| PDAM | `33333333-3333-4333-8333-333333333301` |
| BPBD | `33333333-3333-4333-8333-333333333302` |
| DINAS_SOSIAL | `33333333-3333-4333-8333-333333333303` (E2E seed) |

### Settings (migration)

`ROB_WAVE_WARNING`, `ROB_WAVE_DANGER`, `WATER_WARNING_PERCENT`, `WATER_CRITICAL_PERCENT`, `WHATSAPP_WEBHOOK_URL`, dan required keys lainnya.

---

## Verifikasi per Kategori

### Business Flow ✅

- Auth login / refresh / logout
- User CRUD (create ADMIN_DESA)
- Village update & QRIS upload
- ROB BMKG sync (mock AMAN), manual override BAHAYA, webhook test
- Water asset, report, status AMAN/SIAGA/KRITIS, critical alert + notifikasi agency
- Tourism booking guest flow, boat rotation A→B→C→A
- Economy order, reject payment, manifest flow
- Agency create, send email, send WhatsApp
- Settings create/update/delete required

### RBAC ✅

- ADMIN_KECAMATAN: akses penuh sesuai matrix
- ADMIN_DESA / KADER_DESA: dibatasi role middleware (403 pada endpoint terlarang)
- Guest: public endpoints tanpa token

### Ownership Policy ✅

- KADER Ujungalang → water asset Panikel: 403
- ADMIN_DESA Panikel → verify booking Ujungalang: 403
- ADMIN_DESA Panikel → inventory movements Ujungalang: 403

### Transaction ✅

- Tourism: boat assignment gagal → booking verification rollback
- Economy: stock deduction gagal → payment verification rollback
- Manifest: insert item gagal → manifest item rollback, order tetap CONFIRMED

### Audit Log ✅

- LOGIN, LOGOUT
- Summary 200, export CSV
- Sanitization: `passwordHash`, `refreshToken`, `accessToken` tidak muncul di detail

### Notification ✅

- Critical water → `water_alerts`, `agency_notification_logs`
- Agency email → `email_logs`, `agency_notification_logs`
- Agency WhatsApp → `notification_logs`, `agency_notification_logs`

### Settings ✅

- Create custom setting 201
- Update → cache invalidated (via `SettingsService.get`)
- Delete required setting → 409

### Public Endpoint ✅

- `GET /rob-status`, `GET /destinations`, `GET /water-status` tanpa auth

### API Convention ✅

- Success: `{ success, message, data }`
- Error: `{ success: false, message }`
- Pagination: `{ success, data[], meta }`

---

## Issues

### Critical Issues

Tidak ada.

### High Issues

Tidak ada.

### Medium Issues

Tidak ada.

### Low Issues

| # | Issue | Dampak | Rekomendasi |
|---|-------|--------|-------------|
| L1 | `POST /auth/login` dan `POST /auth/refresh-token` mengembalikan **201**, bukan 200 seperti contoh prompt | Dokumentasi / ekspektasi tester | Pertahankan 201 (REST create semantics) atau selaraskan docs |
| L2 | Coverage cabang (branches) **29.76%** — cabang error BMKG live, worker, edge validation belum ter-cover E2E | Coverage rendah di branch | Tambah unit test atau E2E untuk worker BMKG sync & error paths |
| L3 | WhatsApp agency test menghasilkan status `SKIPPED` jika `WHATSAPP_WEBHOOK_URL` kosong | Perilaku expected, log tetap dibuat | Set webhook URL di env staging untuk verifikasi end-to-end webhook |

---

## Infrastruktur Test

| File | Fungsi |
|------|--------|
| `vitest.e2e.config.ts` | Config khusus E2E |
| `tests/e2e/setup.ts` | Database test terpisah (`*_test`) |
| `tests/helpers/ensure-test-database.ts` | Auto-create DB test jika belum ada |
| `tests/helpers/e2e-seed.ts` | Seed users & agencies E2E |
| `tests/helpers/e2e-http.ts` | HTTP helpers seluruh modul |
| `tests/helpers/e2e-db.ts` | Query & assertion DB |

---

## Cara Menjalankan

```bash
# Pastikan Postgres + Redis (:6380) + MinIO (:9000) berjalan
# Opsional: set database test eksplisit
# TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/segaraanakan_hub_test

npm run test:e2e

# Dengan coverage
npm run test:e2e -- --coverage

# Integration tests (modul per modul, DB development/test via TEST_DATABASE_URL)
npm run test:integration
```

**Prasyarat env test** (override di `tests/setup.ts`):

- `TEST_DATABASE_URL` atau derivasi otomatis `{DATABASE_URL}_test`
- `REDIS_URL=redis://localhost:6380`
- `STORAGE_ENDPOINT=http://localhost:9000`

---

## Kesimpulan

Seluruh **50 test case E2E lulus**. Sistem memenuhi kriteria kesiapan **STAGING** untuk business flow, RBAC, ownership, transaksi atomic, audit log, notifikasi, settings, dan konvensi API.
