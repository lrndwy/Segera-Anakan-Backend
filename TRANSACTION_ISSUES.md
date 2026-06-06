# TRANSACTION_ISSUES.md

Audit: transaksi DB vs `docs/api-convention.md` (TRANSACTION RULE)

---

## High

| ID | Operation | Issue | File |
|----|-----------|-------|------|
| TX-001 | Manual stock create | `update()` + `createStockMovement()` tanpa transaksi | `commodity-inventory.service.ts:create()` |
| TX-002 | Manual stock adjust | `update()` + `createStockMovement()` tanpa transaksi | `commodity-inventory.service.ts:adjustStock()` |
| TX-003 | ASSIGN_BOAT audit | Audit log ditulis di dalam transaksi via koneksi root `db` — tidak atomic; rollback tx tidak rollback audit | `boat-assignment.service.ts:69-81` |

---

## Medium

| ID | Operation | Issue | File |
|----|-----------|-------|------|
| TX-004 | Create manifest | Single insert tanpa transaksi (docs wajibkan) | `manifest.service.ts:create()` |
| TX-005 | Submit booking payment | Payment + status update tanpa transaksi | `booking.service.ts:submitPayment()` |
| TX-006 | Submit commodity payment | Payment + status update tanpa transaksi | `commodity-payment.service.ts` |
| TX-007 | Reject commodity payment | Multi-update tanpa transaksi | `commodity-order.service.ts:rejectPayment()` |
| TX-008 | Create booking (public) | Single insert (docs wajibkan transaksi) | `booking.service.ts:createPublic()` |
| TX-009 | CREATE_COMMODITY_ORDER audit | Audit di dalam tx callback tapi memakai koneksi non-tx | `commodity-order.service.ts:157` |

---

## Compliant

| Operation | Status | File |
|-----------|--------|------|
| Booking verification | ✅ `runTransaction` | `booking.service.ts:verifyPayment()` |
| Boat assignment (DB writes) | ✅ dalam `tx` | `boat-assignment.service.ts` |
| Commodity payment verification + stock deduction | ✅ `runTransaction` | `commodity-order.service.ts:verifyPayment()` |
| Manifest add item | ✅ `runTransaction` | `manifest.service.ts:addItem()` |
| Create commodity order | ✅ `runTransaction` | `commodity-order.service.ts:createPublic()` |
