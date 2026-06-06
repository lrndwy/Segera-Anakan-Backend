# VALIDATION_ISSUES.md

Audit: validasi Zod pada POST/PATCH/PUT

---

## High

| ID | Endpoint | Issue | File |
|----|----------|-------|------|
| VAL-001 | `POST /api/v1/files/upload` | Handler memakai `parseBody()` manual, tidak `context.req.valid('form')` | `file.routes.ts:164-168` |

---

## Compliant

- Semua endpoint mutasi lain memakai `createRoute` + `context.req.valid('json')` dengan schema Zod ✅
- Endpoint PATCH tanpa body (verify-payment, depart, complete) memvalidasi params via Zod ✅
- Tidak ada endpoint `PUT` di codebase ✅
- Error validasi global: 422 via error handler ✅

---

## Low

| ID | Note |
|----|------|
| VAL-002 | `uploadFileFormSchema` memakai `z.any()` untuk field file — validasi file type/size dilakukan di service layer |
