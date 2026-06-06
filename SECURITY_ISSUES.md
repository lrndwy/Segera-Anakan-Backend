# SECURITY_ISSUES.md

Audit: keamanan backend

---

## High

| ID | Issue | Severity | Detail | File |
|----|-------|----------|--------|------|
| SEC-001 | Audit log sanitasi write path | High | Data sensitif bisa tersimpan permanen di DB | `src/services/audit-log.service.ts` |
| SEC-002 | Sanitizer snake_case | High | `password_hash`, `refresh_token` tidak di-redact | `audit-log.sanitize.ts` |

---

## Medium

| ID | Issue | Detail | File |
|----|-------|--------|------|
| SEC-003 | Auth middleware skip soft-delete | User soft-deleted masih bisa pakai access token | `auth.middleware.ts` |
| SEC-004 | Webhook URL exposed | `WHATSAPP_WEBHOOK_URL` dikembalikan utuh via settings API | `settings.service.ts` |

---

## Low

| ID | Issue | Detail | File |
|----|-------|--------|------|
| SEC-005 | `findByEmail` tanpa filter soft-delete | Email user deleted tidak bisa didaftarkan ulang | `user.repository.ts` |

---

## Compliant

| Area | Status | Evidence |
|------|--------|----------|
| Password hashing | ✅ bcrypt | `src/lib/password.service.ts` |
| JWT access + refresh | ✅ | `src/lib/jwt.service.ts`, rotate on refresh |
| `password_hash` tidak di API response | ✅ | `user-management.service.ts` mapping |
| `refresh_token` hanya di auth endpoints | ✅ | By design |
| Audit log read path sanitization | ✅ | `audit-log.service.ts` (module) `findById` |
