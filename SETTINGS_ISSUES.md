# SETTINGS_ISSUES.md

Audit: hardcoded config vs `settings` table

---

## Compliant (Runtime)

| Config | Source | File |
|--------|--------|------|
| ROB wave/tide/rain thresholds | `settingsService.getNumber()` | `rob-guardian.service.ts` |
| Water critical/warning/daily drop | `settingsService` via `water-thresholds.ts` | `water-report.service.ts` |
| WhatsApp webhook URL | `settingsService.get()` | `webhook.service.ts`, `water-notification.service.ts`, `agency-notification.service.ts` |

Seed values di migration (`0005`–`0010`) adalah inisialisasi DB, bukan hardcode runtime.

---

## Medium

| ID | Issue | Detail | File |
|----|-------|--------|------|
| SET-001 | Email config tidak terpakai | `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS` di settings; worker stub | `email.worker.ts`, `env.ts` |
| SET-002 | ROB score boundaries hardcoded | `determineRobStatus()` score >= 4/1 | `rob-score.ts` |
| SET-003 | BMKG fallback metrics hardcoded | wave 0.8, tide 1.2, rain 5 | `bmkg.service.ts` |

---

## Low

| ID | Issue | Detail |
|----|-------|--------|
| SET-004 | Legacy key `WATER_SIAGA_PERCENT` | Dimigrasi ke `WATER_WARNING_PERCENT` di `0010` |
| SET-005 | `BMKG_API_URL` di env | Endpoint API eksternal, bukan webhook |

---

## No Hardcoded Threshold/Webhook/Email at Runtime

Threshold ROB, threshold air, webhook URL, dan konfigurasi notifikasi **tidak di-hardcode** di path operasional utama.
