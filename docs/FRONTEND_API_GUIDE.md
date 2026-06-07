# SegaraAnakan Hub — Panduan API untuk Frontend

Dokumen ini menjelaskan **seluruh endpoint REST API** yang tersedia di backend Hono untuk kebutuhan integrasi frontend. Gunakan bersama:

- **Swagger UI:** `GET /docs`
- **OpenAPI Spec:** `GET /openapi.json`
- **Postman Collection:** `Postman.json` di root proyek
- **Konvensi umum:** `docs/api-convention.md`

---

## Daftar Isi

1. [Informasi Dasar](#1-informasi-dasar)
2. [Autentikasi & Role](#2-autentikasi--role)
3. [Format Response & Error](#3-format-response--error)
4. [Pagination](#4-pagination)
5. [Ringkasan Endpoint](#5-ringkasan-endpoint)
6. [Infrastruktur](#6-infrastruktur)
7. [Auth](#7-auth)
8. [User Management](#8-user-management)
9. [File Upload](#9-file-upload)
10. [Village Management](#10-village-management)
11. [ROB Guardian](#11-rob-guardian)
12. [Banyu Mili (Air)](#12-banyu-mili-air)
13. [Tourism (Wisata)](#13-tourism-wisata)
14. [Economy (Ekonomi)](#14-economy-ekonomi)
15. [Agency](#15-agency)
16. [Settings](#16-settings)
17. [Audit Log](#17-audit-log)
18. [Alur Bisnis Frontend](#18-alur-bisnis-frontend)
19. [Referensi Enum](#19-referensi-enum)

---

## 1. Informasi Dasar

| Item | Nilai |
|------|-------|
| Nama aplikasi | SegaraAnakan Hub |
| Base URL (dev) | `http://localhost:3000` |
| API Prefix | `/api/v1` (env: `API_PREFIX`) |
| Content-Type | `application/json` (kecuali upload file) |
| Auth header | `Authorization: Bearer <accessToken>` |

### Header yang Didukung

| Header | Arah | Keterangan |
|--------|------|------------|
| `Authorization` | Request | JWT access token |
| `Content-Type` | Request | `application/json` atau `multipart/form-data` |
| `X-Request-Id` | Request/Response | Opsional; jika tidak dikirim, server generate UUID |
| `X-Rate-Limit-Remaining` | Response | Sisa kuota rate limit |
| `X-Rate-Limit-Reset` | Response | Waktu reset rate limit (epoch ms) |

### CORS

- Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
- Credentials: `true`
- Origin: dikonfigurasi via env `CORS_ORIGINS`

### Rate Limit

- Default: 120 request per 60 detik per IP + path
- **Dikecualikan:** `/health`, `/ready`, `/openapi*`, `/api/v1/realtime*`
- Response `429` jika limit terlampaui

---

## 2. Autentikasi & Role

### Cara Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "ChangeMe123!"
}
```

Simpan `accessToken` dan `refreshToken` dari response. Access token default berlaku **15 menit**, refresh token **30 hari**.

### Refresh Token

Ketika access token expired (`401`), panggil:

```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

### Role Pengguna

| Kode | Nama | Deskripsi |
|------|------|-----------|
| `AK` | `ADMIN_KECAMATAN` | Akses penuh kecamatan |
| `AD` | `ADMIN_DESA` | Akses terbatas pada desa (`villageId`) |
| `KD` | `KADER_DESA` | Kader desa; fokus monitoring air |

### Legenda Auth di Dokumen Ini

| Simbol | Arti |
|--------|------|
| 🌐 Public | Tidak perlu token |
| 🔒 Bearer | Wajib JWT |
| 🔒 AK | Bearer + role `ADMIN_KECAMATAN` |
| 🔒 AD+ | Bearer + role `ADMIN_KECAMATAN` atau `ADMIN_DESA` |
| 🔒 View | Bearer + role `AK`, `AD`, atau `KD` |
| 🔒 KD | Bearer + role `KADER_DESA` |

> **Catatan village-scoped:** User `ADMIN_DESA` dan `KADER_DESA` hanya dapat mengakses data desa mereka sendiri (`villageId` dari token/`/auth/me`). Backend menegakkan ini di service layer.

---

## 3. Format Response & Error

### Response Sukses (dengan data)

```json
{
  "success": true,
  "message": "Deskripsi operasi",
  "data": { }
}
```

### Response Sukses (paginated)

```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [ ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total_items": 100,
    "total_pages": 10
  }
}
```

### Response Sukses (message only)

Beberapa endpoint (delete, verify, resolve) hanya mengembalikan:

```json
{
  "success": true,
  "message": "Operation completed"
}
```

### Response Error

```json
{
  "success": false,
  "message": "Unauthorized",
  "errors": [
    { "field": "email", "message": "Email is required" }
  ]
}
```

Field `errors` hanya muncul pada validasi gagal (status `422`).

### HTTP Status Codes

| Code | Arti |
|------|------|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized — token invalid/expired atau user inactive |
| `403` | Forbidden — role tidak cukup |
| `404` | Not Found |
| `409` | Conflict — mis. email sudah terdaftar |
| `422` | Validation Error |
| `429` | Too Many Requests |
| `500` | Internal Server Error |

---

## 4. Pagination

Semua endpoint list mendukung query:

| Parameter | Tipe | Default | Max | Keterangan |
|-----------|------|---------|-----|------------|
| `page` | number | `1` | — | Halaman (1-based) |
| `limit` | number | `10` | `100` | Jumlah item per halaman |

Contoh: `GET /api/v1/users?page=2&limit=20`

---

## 5. Ringkasan Endpoint

Total: **93 endpoint HTTP** (89 modul + 4 infrastruktur)

| Modul | Prefix | Jumlah | Public |
|-------|--------|--------|--------|
| Infrastruktur | `/health`, `/ready`, `/docs` | 4 | 4 |
| Auth | `/api/v1/auth` | 4 | 2 |
| Dashboard | `/api/v1/dashboard` | 1 | 0 |
| Reports | `/api/v1/reports` | 1 | 0 |
| Users | `/api/v1/users` | 6 | 0 |
| Files | `/api/v1/files` | 3 | 0 |
| Villages | `/api/v1/villages` | 4 | 0 |
| ROB Guardian | `/api/v1/rob-status`, `/rob-histories`, `/rob` | 5 | 2 |
| Banyu Mili | `/api/v1/water-*` | 12 | 2 |
| Tourism | `/api/v1/destinations`, `/boat-owners`, `/bookings`, `/booking-payments` | 14 | 5 |
| Economy | `/api/v1/commodities`, `/fishermen`, `/commodity-*`, `/manifests` | 23 | 5 |
| Agency | `/api/v1/agencies` | 7 | 0 |
| Settings | `/api/v1/settings` | 5 | 0 |
| Audit Log | `/api/v1/audit-logs` | 4 | 0 |

---

## 6. Infrastruktur

### `GET /health` 🌐

Health check aplikasi.

**Response 200:**
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "ok",
    "appName": "pltu-app-hono",
    "requestId": "uuid",
    "uptimeSeconds": 123.45
  }
}
```

---

### `GET /ready` 🌐

Readiness check — memverifikasi koneksi database dan Redis.

**Response 200:**
```json
{
  "success": true,
  "message": "Service is ready",
  "data": {
    "status": "ready",
    "db": true,
    "redis": true
  }
}
```

---

### `GET /openapi.json` 🌐

Spesifikasi OpenAPI 3.1 lengkap.

---

### `GET /docs` 🌐

Swagger UI interaktif.

---

## 7. Auth

Base path: `/api/v1/auth`

### `POST /api/v1/auth/login` 🌐

Login dan dapatkan token.

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `email` | string | ✅ | Format email valid |
| `password` | string | ✅ | — |

**Response 201:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "uuid",
      "fullName": "Admin Kecamatan",
      "email": "admin@example.com",
      "role": "ADMIN_KECAMATAN",
      "villageId": null
    }
  }
}
```

**Error:** `401` kredensial salah, `403` akun inactive, `422` validasi gagal

---

### `POST /api/v1/auth/refresh-token` 🌐

Perbarui access token.

**Request Body:**

| Field | Tipe | Wajib |
|-------|------|-------|
| `refreshToken` | string | ✅ |

**Response 201:**
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### `POST /api/v1/auth/logout` 🔒 Bearer

Logout dan invalidate refresh token.

**Request Body:**

| Field | Tipe | Wajib |
|-------|------|-------|
| `refreshToken` | string | ✅ |

**Response 200:** `{ "success": true, "message": "Logout successful" }`

---

### `GET /api/v1/auth/me` 🔒 Bearer

Profil user yang sedang login.

**Response 200:**
```json
{
  "success": true,
  "message": "Current user retrieved",
  "data": {
    "id": "uuid",
    "fullName": "Admin Kecamatan",
    "email": "admin@example.com",
    "phone": "08123456789",
    "role": "ADMIN_KECAMATAN",
    "status": "ACTIVE",
    "villageId": null
  }
}
```

---

## 8. User Management

Base path: `/api/v1/users` — Semua endpoint: 🔒 **AK**

### `GET /api/v1/users`

List semua user.

**Query Parameters:**

| Param | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `page` | number | — | Default: 1 |
| `limit` | number | — | Default: 10, max: 100 |
| `search` | string | — | Cari nama/email |
| `role` | enum | — | `ADMIN_KECAMATAN`, `ADMIN_DESA`, `KADER_DESA` |
| `status` | enum | — | `ACTIVE`, `INACTIVE` |

**Response 200 — item:**
```json
{
  "id": "uuid",
  "fullName": "string",
  "email": "string",
  "role": "ADMIN_DESA",
  "status": "ACTIVE",
  "phone": "string",
  "villageId": "uuid"
}
```

---

### `GET /api/v1/users/{id}`

Detail user by UUID.

**Response 200:**
```json
{
  "id": "uuid",
  "fullName": "string",
  "email": "string",
  "role": "ADMIN_DESA",
  "status": "ACTIVE"
}
```

---

### `POST /api/v1/users`

Buat user baru.

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `fullName` | string | ✅ | — |
| `email` | string | ✅ | Format email |
| `phone` | string | ✅ | — |
| `password` | string | ✅ | — |
| `role` | enum | ✅ | `ADMIN_KECAMATAN`, `ADMIN_DESA`, `KADER_DESA` |
| `villageId` | uuid \| null | — | Wajib untuk AD/KD; harus `null` untuk AK |

**Response 201:** user detail (sama seperti GET detail)

**Error:** `409` email sudah digunakan

---

### `PATCH /api/v1/users/{id}`

Update user (semua field opsional).

| Field | Tipe | Keterangan |
|-------|------|------------|
| `fullName` | string | — |
| `phone` | string | — |
| `role` | enum | — |
| `villageId` | uuid \| null | — |
| `status` | enum | `ACTIVE`, `INACTIVE` |

---

### `PATCH /api/v1/users/{id}/reset-password`

Reset password user.

**Request Body:**

| Field | Tipe | Wajib |
|-------|------|-------|
| `newPassword` | string | ✅ |

**Response 200:** message only

---

### `DELETE /api/v1/users/{id}`

Soft delete user.

**Response 200:** message only

---

## 9. File Upload

Base path: `/api/v1/files`

File disimpan di MinIO. Upload file **terlebih dahulu**, lalu gunakan `data.id` sebagai `fileId` di endpoint lain (QRIS, bukti bayar, gambar destinasi).

### `POST /api/v1/files/upload` 🔒 View

**Content-Type:** `multipart/form-data`

| Field | Tipe | Wajib |
|-------|------|-------|
| `file` | binary | ✅ |

**Response 201:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "uuid",
    "bucket": "pltu-files",
    "objectName": "path/to/file",
    "originalName": "bukti.jpg",
    "mimeType": "image/jpeg",
    "size": 12345,
    "url": "https://..."
  }
}
```

---

### `GET /api/v1/files/{id}` 🔒 View

**Response 200:**
```json
{
  "success": true,
  "message": "File retrieved successfully",
  "data": {
    "id": "uuid",
    "url": "https://..."
  }
}
```

---

### `DELETE /api/v1/files/{id}` 🔒 AD+

**Response 200:** message only

---

## 10. Village Management

Base path: `/api/v1/villages`

### `GET /api/v1/villages` 🔒 View

**Query:** `page`, `limit`, `search`

**Response 200 — item:**
```json
{
  "id": "uuid",
  "name": "Desa Segara Anakan",
  "contactName": "string",
  "contactPhone": "string",
  "contactEmail": "email@example.com"
}
```

---

### `GET /api/v1/villages/{id}` 🔒 View

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Desa Segara Anakan",
  "description": "string | null",
  "contactName": "string",
  "contactPhone": "string",
  "contactEmail": "email@example.com",
  "qris": {
    "id": "uuid",
    "url": "https://..."
  }
}
```

> `qris` bernilai `null` jika belum diatur.

---

### `PATCH /api/v1/villages/{id}` 🔒 AK

Update informasi desa.

| Field | Tipe | Wajib |
|-------|------|-------|
| `description` | string | — |
| `contactName` | string | — |
| `contactPhone` | string | — |
| `contactEmail` | string (email) | — |

---

### `PATCH /api/v1/villages/{id}/qris` 🔒 AK

Set QRIS desa dari file yang sudah di-upload.

**Request Body:**

| Field | Tipe | Wajib |
|-------|------|-------|
| `fileId` | uuid | ✅ |

---

## 11. ROB Guardian

Modul monitoring risiko rob (Rising Ocean/Banjir).

### `GET /api/v1/rob-status` 🌐

Status rob terkini.

**Response 200:**
```json
{
  "success": true,
  "message": "Current rob status retrieved",
  "data": {
    "status": "AMAN",
    "score": 25,
    "waveHeight": 0.5,
    "tideHeight": 1.2,
    "rainfall": 0,
    "recordedAt": "2026-06-06T10:00:00.000Z"
  }
}
```

**Status enum:** `AMAN`, `WASPADA`, `BAHAYA`

**Error:** `404` jika belum ada data

---

### `GET /api/v1/rob-histories` 🌐

Riwayat status rob.

**Query:**

| Param | Tipe | Keterangan |
|-------|------|------------|
| `page`, `limit` | number | Pagination |
| `start_date` | string | Format `YYYY-MM-DD` |
| `end_date` | string | Format `YYYY-MM-DD` |

**Response 200 — item:**
```json
{
  "id": "uuid",
  "status": "WASPADA",
  "score": 55,
  "waveHeight": 1.0,
  "tideHeight": 1.5,
  "rainfall": 10,
  "notes": "string | null",
  "recordedAt": "2026-06-06T10:00:00.000Z"
}
```

---

### `POST /api/v1/rob/manual-override` 🔒 AK

Override status rob secara manual.

**Request Body:**

| Field | Tipe | Wajib |
|-------|------|-------|
| `status` | enum | ✅ `AMAN`, `WASPADA`, `BAHAYA` |
| `reason` | string | ✅ |

**Response 201:** message only

---

### `POST /api/v1/rob/webhook/test` 🔒 AK

Kirim test webhook notifikasi rob.

**Response 201:** message only

---

## 12. Banyu Mili (Air)

Modul monitoring ketersediaan air desa.

### `GET /api/v1/water-status` 🌐

Status air semua desa.

**Response 200:**
```json
{
  "success": true,
  "message": "Water status retrieved",
  "data": [
    {
      "villageId": "uuid",
      "villageName": "Desa Segara Anakan",
      "status": "AMAN",
      "lastUpdated": "2026-06-06T10:00:00.000Z"
    }
  ]
}
```

**Status enum:** `AMAN`, `SIAGA`, `KRITIS`

---

### Water Assets — `/api/v1/water-assets`

#### `GET /api/v1/water-assets/public` 🌐

Daftar aset air aktif (ringkas, tanpa auth).

**Response 200 — item:**
```json
{
  "id": "uuid",
  "name": "Embung Utama",
  "locationName": "Dusun A",
  "capacityLiter": 50000,
  "villageId": "uuid",
  "villageName": "Desa Segara Anakan"
}
```

---

#### `GET /api/v1/water-assets` 🔒 View

List aset air (admin).

**Query:** `page`, `limit`, `search`

**Response 200 — item:**
```json
{
  "id": "uuid",
  "villageId": "uuid",
  "name": "string",
  "locationName": "string",
  "latitude": -7.5,
  "longitude": 109.0,
  "capacityLiter": 50000,
  "isActive": true
}
```

---

#### `GET /api/v1/water-assets/{id}` 🔒 View

Detail aset air.

---

#### `POST /api/v1/water-assets` 🔒 AK

Buat aset air.

| Field | Tipe | Wajib |
|-------|------|-------|
| `villageId` | uuid | ✅ |
| `name` | string | ✅ |
| `locationName` | string | ✅ |
| `latitude` | number | ✅ |
| `longitude` | number | ✅ |
| `capacityLiter` | number (int, >0) | ✅ |

---

#### `PATCH /api/v1/water-assets/{id}` 🔒 AK

Update aset air. Semua field opsional: `name`, `locationName`, `latitude`, `longitude`, `capacityLiter`, `isActive`.

---

#### `DELETE /api/v1/water-assets/{id}` 🔒 AK

Soft delete aset air.

---

### Water Reports — `/api/v1/water-reports`

#### `GET /api/v1/water-reports` 🔒 View

**Query:** `page`, `limit`, `start_date` (`YYYY-MM-DD`), `end_date` (`YYYY-MM-DD`)

**Response 200 — item:**
```json
{
  "id": "uuid",
  "waterAssetId": "uuid",
  "submittedBy": "uuid",
  "volumePercent": 75,
  "waterCondition": "TAWAR",
  "estimatedDaysLeft": 14,
  "status": "AMAN",
  "notes": "string | null",
  "reportedAt": "2026-06-06T10:00:00.000Z"
}
```

**waterCondition enum:** `TAWAR`, `PAYAU`

---

#### `POST /api/v1/water-reports` 🔒 KD

Kader desa submit laporan air.

| Field | Tipe | Wajib |
|-------|------|-------|
| `waterAssetId` | uuid | ✅ |
| `volumePercent` | number (0–100) | ✅ |
| `waterCondition` | enum | ✅ `TAWAR`, `PAYAU` |
| `notes` | string | — |

---

#### `PATCH /api/v1/water-reports/{id}` 🔒 KD

Update laporan milik sendiri. Field opsional: `volumePercent`, `waterCondition`, `notes`.

---

### Water Alerts — `/api/v1/water-alerts`

#### `GET /api/v1/water-alerts` 🔒 View

**Query:** `page`, `limit`

**Response 200 — item:**
```json
{
  "id": "uuid",
  "waterAssetId": "uuid",
  "status": "KRITIS",
  "message": "Volume air di bawah 20%",
  "resolved": false,
  "resolvedAt": null,
  "createdAt": "2026-06-06T10:00:00.000Z"
}
```

---

#### `PATCH /api/v1/water-alerts/{id}/resolve` 🔒 AK

Resolve alert.

**Request Body:**

| Field | Tipe | Wajib |
|-------|------|-------|
| `notes` | string | ✅ |

---

## 13. Tourism (Wisata)

### Destinations — `/api/v1/destinations`

#### `GET /api/v1/destinations` 🌐

**Query:** `page`, `limit`, `search`

**Response 200 — item:**
```json
{
  "id": "uuid",
  "villageId": "uuid",
  "villageName": "Desa Segara Anakan",
  "name": "Pantai Segara Anakan",
  "description": "string",
  "pricePerPerson": 50000,
  "capacityPerDay": 100,
  "maxPeoplePerBooking": 10,
  "isActive": true,
  "thumbnailUrl": "https://... | null"
}
```

---

#### `GET /api/v1/destinations/{id}` 🌐

Detail destinasi + galeri gambar.

**Response 200 — tambahan field:**
```json
{
  "images": [
    { "id": "uuid", "fileId": "uuid", "url": "https://..." }
  ]
}
```

---

#### `POST /api/v1/destinations` 🔒 AD+

| Field | Tipe | Wajib |
|-------|------|-------|
| `villageId` | uuid | ✅ |
| `name` | string | ✅ |
| `description` | string | ✅ |
| `pricePerPerson` | number (>0) | ✅ |
| `capacityPerDay` | number (int, >0) | ✅ |
| `maxPeoplePerBooking` | number (int, >0) | ✅ |
| `imageFileIds` | uuid[] | — |

---

#### `PATCH /api/v1/destinations/{id}` 🔒 AD+

Field opsional: `name`, `description`, `pricePerPerson`, `capacityPerDay`, `maxPeoplePerBooking`, `isActive`, `imageFileIds`.

---

#### `DELETE /api/v1/destinations/{id}` 🔒 AD+

Soft delete destinasi.

---

### Boat Owners — `/api/v1/boat-owners` (semua 🔒 AD+)

#### `GET /api/v1/boat-owners`

**Query:** `page`, `limit`, `search`

**Response 200 — item:**
```json
{
  "id": "uuid",
  "villageId": "uuid",
  "fullName": "string",
  "phone": "string",
  "boatName": "string",
  "boatCapacity": 20,
  "isActive": true,
  "lastAssignedAt": "2026-06-06T10:00:00.000Z | null"
}
```

---

#### `GET /api/v1/boat-owners/{id}`

Detail pemilik perahu.

---

#### `POST /api/v1/boat-owners`

| Field | Tipe | Wajib |
|-------|------|-------|
| `villageId` | uuid | ✅ |
| `fullName` | string | ✅ |
| `phone` | string | ✅ |
| `boatName` | string | ✅ |
| `boatCapacity` | number (int, >0) | ✅ |

---

#### `PATCH /api/v1/boat-owners/{id}`

Field opsional: `fullName`, `phone`, `boatName`, `boatCapacity`, `isActive`.

---

#### `DELETE /api/v1/boat-owners/{id}`

Soft delete.

---

### Bookings — `/api/v1/bookings`

#### `POST /api/v1/bookings` 🌐

Buat booking wisata (public).

| Field | Tipe | Wajib |
|-------|------|-------|
| `destinationId` | uuid | ✅ |
| `customerName` | string | ✅ |
| `customerEmail` | string (email) | ✅ |
| `customerPhone` | string | ✅ |
| `bookingDate` | string | ✅ Format `YYYY-MM-DD` |
| `totalPeople` | number (int, >0) | ✅ |

**Response 201:**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "bookingId": "uuid",
    "invoiceNumber": "BK-2026-0001",
    "totalAmount": 500000,
    "qris": {
      "villageId": "uuid",
      "url": "https://..."
    }
  }
}
```

> `qris` bernilai `null` jika desa belum mengatur QRIS.

---

#### `GET /api/v1/bookings` 🔒 AD+

**Query:** `page`, `limit`, `status`

**Response 200 — item:**
```json
{
  "id": "uuid",
  "invoiceNumber": "BK-2026-0001",
  "villageId": "uuid",
  "destinationId": "uuid",
  "destinationName": "Pantai Segara Anakan",
  "customerName": "string",
  "customerEmail": "string",
  "customerPhone": "string",
  "bookingDate": "2026-07-01",
  "totalPeople": 5,
  "totalAmount": 250000,
  "status": "PENDING_PAYMENT",
  "createdAt": "2026-06-06T10:00:00.000Z"
}
```

---

#### `PATCH /api/v1/bookings/{id}/verify-payment` 🔒 AD+

Verifikasi pembayaran booking.

**Response 200:** message only

---

### Booking Payments — `/api/v1/booking-payments`

#### `POST /api/v1/booking-payments` 🌐

Submit bukti pembayaran booking.

| Field | Tipe | Wajib |
|-------|------|-------|
| `bookingId` | uuid | ✅ |
| `fileId` | uuid | ✅ ID dari upload file |
| `senderName` | string | ✅ |

**Response 201:**
```json
{
  "success": true,
  "message": "Booking payment submitted successfully",
  "data": {
    "id": "uuid",
    "bookingId": "uuid",
    "senderName": "Budi",
    "paymentStatus": "PENDING",
    "createdAt": "2026-06-06T10:00:00.000Z"
  }
}
```

---

## 14. Economy (Ekonomi)

### Commodity Inventory — `/api/v1/commodity-inventory`

#### `GET /api/v1/commodity-inventory` 🌐

Katalog komoditas tersedia (public).

**Query:** `page`, `limit`, `search`, `commodity_id` (uuid)

**Response 200 — item:**
```json
{
  "id": "uuid",
  "fishermanId": "uuid",
  "fishermanName": "string",
  "commodityId": "uuid",
  "commodityName": "Ikan Bandeng",
  "villageId": "uuid",
  "villageName": "Desa Segara Anakan",
  "availableWeightKg": 50.5,
  "pricePerKg": 25000
}
```

---

#### `GET /api/v1/commodity-inventory/{id}` 🌐

Detail inventory.

---

#### `POST /api/v1/commodity-inventory` 🔒 AD+

| Field | Tipe | Wajib |
|-------|------|-------|
| `fishermanId` | uuid | ✅ |
| `commodityId` | uuid | ✅ |
| `availableWeightKg` | number (>0) | ✅ |
| `pricePerKg` | number (>0) | ✅ |

---

#### `PATCH /api/v1/commodity-inventory/{id}` 🔒 AD+

Field opsional: `availableWeightKg`, `pricePerKg`.

---

#### `PATCH /api/v1/commodity-inventory/{id}/adjust` 🔒 AD+

Penyesuaian stok manual.

| Field | Tipe | Wajib |
|-------|------|-------|
| `availableWeightKg` | number (≥0) | ✅ |
| `notes` | string | — |

---

#### `GET /api/v1/commodity-inventory/{id}/movements` 🔒 AD+

Riwayat pergerakan stok.

**Response 200 — item:**
```json
{
  "id": "uuid",
  "inventoryId": "uuid",
  "movementType": "OUT",
  "quantityKg": 5,
  "previousStockKg": 50,
  "newStockKg": 45,
  "referenceType": "ORDER",
  "referenceId": "uuid | null",
  "notes": "string | null",
  "createdAt": "2026-06-06T10:00:00.000Z"
}
```

**movementType enum:** `IN`, `OUT`, `ADJUSTMENT`

---

### Fishermen — `/api/v1/fishermen` (semua 🔒 AD+)

#### `GET /api/v1/fishermen`

**Query:** `page`, `limit`, `search`

**Response 200 — item:**
```json
{
  "id": "uuid",
  "villageId": "uuid",
  "fullName": "string",
  "phone": "string | null",
  "isActive": true
}
```

---

#### `GET /api/v1/fishermen/{id}`

Detail nelayan.

---

#### `POST /api/v1/fishermen`

| Field | Tipe | Wajib |
|-------|------|-------|
| `villageId` | uuid | ✅ |
| `fullName` | string | ✅ |
| `phone` | string | — |

---

#### `PATCH /api/v1/fishermen/{id}`

Field opsional: `fullName`, `phone`, `isActive`.

---

#### `DELETE /api/v1/fishermen/{id}`

Soft delete.

---

### Commodity Orders — `/api/v1/commodity-orders`

#### `POST /api/v1/commodity-orders` 🌐

Buat pesanan komoditas (public).

| Field | Tipe | Wajib |
|-------|------|-------|
| `buyerName` | string | ✅ |
| `buyerPhone` | string | ✅ |
| `buyerEmail` | string (email) | ✅ |
| `items` | array | ✅ Min 1 item |
| `items[].inventoryId` | uuid | ✅ |
| `items[].quantityKg` | number (>0) | ✅ |

**Response 201:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "uuid",
    "invoiceNumber": "CO-2026-0001",
    "totalAmount": 500000,
    "qris": {
      "villageId": "uuid",
      "url": "https://..."
    }
  }
}
```

---

#### `GET /api/v1/commodity-orders` 🔒 AD+

**Query:** `page`, `limit`, `status`

**Response 200 — item:**
```json
{
  "id": "uuid",
  "invoiceNumber": "CO-2026-0001",
  "villageId": "uuid",
  "buyerName": "string",
  "buyerPhone": "string",
  "buyerEmail": "string",
  "totalAmount": 500000,
  "status": "PENDING_PAYMENT",
  "createdAt": "2026-06-06T10:00:00.000Z"
}
```

---

#### `PATCH /api/v1/commodity-orders/{id}/verify-payment` 🔒 AD+

Verifikasi pembayaran pesanan.

---

#### `PATCH /api/v1/commodity-orders/{id}/reject-payment` 🔒 AD+

Tolak pembayaran.

**Request Body:**

| Field | Tipe | Wajib |
|-------|------|-------|
| `notes` | string | ✅ |

---

### Commodity Payments — `/api/v1/commodity-payments`

#### `POST /api/v1/commodity-payments` 🌐

Submit bukti pembayaran pesanan.

| Field | Tipe | Wajib |
|-------|------|-------|
| `commodityOrderId` | uuid | ✅ |
| `fileId` | uuid | ✅ |
| `senderName` | string | ✅ |

**Response 201:**
```json
{
  "success": true,
  "message": "Payment submitted successfully",
  "data": {
    "id": "uuid",
    "commodityOrderId": "uuid",
    "senderName": "string",
    "paymentStatus": "PENDING",
    "createdAt": "2026-06-06T10:00:00.000Z"
  }
}
```

---

### Manifests — `/api/v1/manifests` (semua 🔒 AD+)

Manifest pengiriman pesanan komoditas.

#### `GET /api/v1/manifests`

**Query:** `page`, `limit`

**Response 200 — item:**
```json
{
  "id": "uuid",
  "villageId": "uuid",
  "manifestDate": "2026-06-06",
  "status": "DRAFT",
  "itemCount": 3,
  "createdAt": "2026-06-06T10:00:00.000Z"
}
```

---

#### `GET /api/v1/manifests/{id}`

Detail manifest + items.

**Response 200 — tambahan:**
```json
{
  "departureTime": "2026-06-06T14:00:00.000Z | null",
  "completedAt": "2026-06-06T18:00:00.000Z | null",
  "items": [
    {
      "id": "uuid",
      "commodityOrderId": "uuid",
      "invoiceNumber": "CO-2026-0001",
      "buyerName": "string"
    }
  ]
}
```

---

#### `POST /api/v1/manifests`

Buat manifest baru.

| Field | Tipe | Wajib |
|-------|------|-------|
| `manifestDate` | string | ✅ Format `YYYY-MM-DD` |
| `villageId` | uuid | — Default: desa user (AD) |

---

#### `POST /api/v1/manifests/{id}/items`

Tambahkan pesanan ke manifest.

| Field | Tipe | Wajib |
|-------|------|-------|
| `commodityOrderId` | uuid | ✅ |

---

#### `PATCH /api/v1/manifests/{id}/depart`

Tandai manifest berangkat.

---

#### `PATCH /api/v1/manifests/{id}/complete`

Tandai manifest selesai.

---

## 15. Agency

Base path: `/api/v1/agencies` — Semua endpoint: 🔒 **AK**

### `GET /api/v1/agencies`

**Query:** `page`, `limit`, `search`, `agency_type`

**agency_type enum:** `PDAM`, `BPBD`, `DINAS_SOSIAL`, `OTHER`

**Response 200 — item:**
```json
{
  "id": "uuid",
  "name": "PDAM Kabupaten",
  "agencyType": "PDAM",
  "email": "pdam@example.com",
  "phone": "08123456789",
  "isActive": true,
  "createdAt": "2026-06-06T10:00:00.000Z",
  "updatedAt": "2026-06-06T10:00:00.000Z"
}
```

---

### `GET /api/v1/agencies/{id}`

Detail instansi.

---

### `POST /api/v1/agencies`

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `name` | string | ✅ | — |
| `agencyType` | enum | ✅ | `PDAM`, `BPBD`, `DINAS_SOSIAL`, `OTHER` |
| `email` | string (email) | — | Minimal salah satu: email atau phone |
| `phone` | string | — | — |
| `isActive` | boolean | — | Default: true |

---

### `PATCH /api/v1/agencies/{id}`

Field opsional: `name`, `agencyType`, `email`, `phone`, `isActive`.

---

### `DELETE /api/v1/agencies/{id}`

Soft delete.

---

### `POST /api/v1/agencies/{id}/send-email`

Kirim email ke instansi.

| Field | Tipe | Wajib |
|-------|------|-------|
| `subject` | string | ✅ |
| `message` | string | ✅ |

**Response 201:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "emailLogId": "uuid",
    "agencyNotificationLogId": "uuid",
    "status": "QUEUED"
  }
}
```

---

### `POST /api/v1/agencies/{id}/send-whatsapp`

Kirim notifikasi WhatsApp via webhook.

| Field | Tipe | Wajib |
|-------|------|-------|
| `message` | string | ✅ |

**Response 201:**
```json
{
  "success": true,
  "message": "WhatsApp webhook triggered successfully",
  "data": {
    "notificationLogId": "uuid",
    "agencyNotificationLogId": "uuid",
    "status": "QUEUED"
  }
}
```

---

## 16. Settings

Base path: `/api/v1/settings` — Semua endpoint: 🔒 **AK**

Pengaturan sistem berbasis key-value (contoh: `WATER_WARNING_PERCENT`).

### `GET /api/v1/settings`

**Query:** `page`, `limit`, `search`

**Response 200 — item:**
```json
{
  "key": "WATER_WARNING_PERCENT",
  "value": "30",
  "description": "Persentase volume air untuk status SIAGA",
  "updatedAt": "2026-06-06T10:00:00.000Z"
}
```

---

### `GET /api/v1/settings/{key}`

Detail setting by key.

---

### `POST /api/v1/settings`

| Field | Tipe | Wajib |
|-------|------|-------|
| `key` | string | ✅ Max 100 karakter |
| `value` | string | ✅ |
| `description` | string | — |

**Error:** `409` key sudah ada

---

### `PATCH /api/v1/settings/{key}`

Field opsional: `value`, `description`.

---

### `DELETE /api/v1/settings/{key}`

**Error:** `409` jika setting protected/tidak bisa dihapus

---

## 17. Audit Log

Base path: `/api/v1/audit-logs` — Semua endpoint: 🔒 **AK**

### `GET /api/v1/audit-logs`

**Query:**

| Param | Tipe | Keterangan |
|-------|------|------------|
| `page`, `limit` | number | Pagination |
| `search` | string | Pencarian umum |
| `module` | string | Filter modul |
| `action` | string | Filter aksi |
| `user_id` | uuid | Filter user |
| `start_date`, `end_date` | string | `YYYY-MM-DD` |
| `sort_by` | enum | `createdAt`, `action`, `module`, `entityType` |
| `sort_order` | enum | `asc`, `desc` |

**Response 200 — item:**
```json
{
  "id": "uuid",
  "action": "CREATE",
  "module": "USER",
  "entityType": "user",
  "entityId": "uuid",
  "userId": "uuid",
  "userName": "Admin Kecamatan",
  "ipAddress": "127.0.0.1",
  "createdAt": "2026-06-06T10:00:00.000Z"
}
```

---

### `GET /api/v1/audit-logs/summary`

Ringkasan statistik audit log.

**Response 200:**
```json
{
  "success": true,
  "message": "Audit summary retrieved",
  "data": {
    "totalLogs": 1500,
    "todayLogs": 42,
    "topModules": [{ "module": "USER", "count": 300 }],
    "topActions": [{ "action": "CREATE", "count": 500 }]
  }
}
```

---

### `GET /api/v1/audit-logs/export`

Export audit log sebagai CSV.

**Query:** sama seperti list + `format=csv` (opsional)

**Response 200:**
- Content-Type: `text/csv; charset=utf-8`
- Header: `Content-Disposition: attachment; filename="audit-logs-2026-06-06.csv"`
- Body: raw CSV (bukan JSON envelope)

---

### `GET /api/v1/audit-logs/{id}`

Detail audit log.

**Response 200:**
```json
{
  "success": true,
  "message": "Audit log retrieved successfully",
  "data": {
    "id": "uuid",
    "action": "UPDATE",
    "module": "USER",
    "entityType": "user",
    "entityId": "uuid",
    "user": { "id": "uuid", "fullName": "Admin" },
    "oldData": { "status": "ACTIVE" },
    "newData": { "status": "INACTIVE" },
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-06-06T10:00:00.000Z"
  }
}
```

---

## 18. Dashboard

Base path: `/api/v1/dashboard`

### `GET /api/v1/dashboard/stats` 🔒 AD+

Statistik utama dashboard.

**Response 200:**
```json
{
  "success": true,
  "message": "Dashboard stats retrieved",
  "data": {
    "totalRevenue": 15000000,
    "activeBookings": 24,
    "totalFishermen": 150,
    "totalCommodities": 45,
    "revenueGrowth": 12.5,
    "bookingGrowth": 5.2
  }
}
```

**Ownership:** `ADMIN_DESA` hanya data desa sendiri; `ADMIN_KECAMATAN` semua desa.

---

## 19. Reports

Base path: `/api/v1/reports`

### `GET /api/v1/reports` 🔒 AD+

Laporan revenue dan pengunjung per periode.

**Query (wajib):**

| Param | Tipe | Keterangan |
|-------|------|------------|
| `start_date` | string | `YYYY-MM-DD` |
| `end_date` | string | `YYYY-MM-DD` |

**Response 200:**
```json
{
  "success": true,
  "message": "Reports retrieved",
  "data": {
    "chartData": [
      { "date": "2026-06-01", "revenue": 500000, "visitors": 10 }
    ],
    "summary": {
      "averageDailyRevenue": 550000,
      "totalPeriodRevenue": 1650000
    }
  }
}
```

**Ownership:** `ADMIN_DESA` hanya data desa sendiri.

---

## 20. ROB Village Alert (tambahan)

### `POST /api/v1/rob/webhook/village-alert` 🔒 AK

Kirim peringatan rob ke desa tertentu via webhook.

**Request Body:**

| Field | Tipe | Wajib |
|-------|------|-------|
| `villageId` | uuid | ✅ |
| `message` | string | ✅ |
| `severityLevel` | enum | ✅ `AMAN`, `WASPADA`, `BAHAYA` |

**Response 200:** `{ "success": true, "message": "Alert sent to village successfully" }`

---

## 21. Commodity Catalog (tambahan)

### `GET /api/v1/commodities` 🌐

Katalog komoditas master (public).

**Query:** `search` (opsional)

**Response 200 — item:**
```json
{
  "id": "uuid",
  "name": "Ikan Bandeng",
  "categoryName": "Ikan"
}
```

Diurutkan: `categoryName ASC`, `name ASC`.

---

## 22. Alur Bisnis Frontend

### Alur Autentikasi

```
1. POST /auth/login          → simpan accessToken + refreshToken
2. GET  /auth/me             → ambil profil & role
3. [setiap request]          → header Authorization: Bearer <token>
4. [jika 401]                → POST /auth/refresh-token
5. POST /auth/logout         → kirim refreshToken, hapus token lokal
```

### Alur Upload File

```
1. POST /files/upload (multipart)  → dapat fileId + url
2. Gunakan fileId di:
   - PATCH /villages/{id}/qris
   - POST /booking-payments
   - POST /commodity-payments
   - POST /destinations (imageFileIds)
```

### Alur Booking Wisata (Public)

```
1. GET  /destinations              → pilih destinasi
2. POST /bookings                  → dapat bookingId, invoiceNumber, totalAmount, qris
3. [user transfer + upload bukti]
4. POST /files/upload              → dapat fileId
5. POST /booking-payments          → submit bukti bayar
6. [admin] GET  /bookings          → lihat status WAITING_VERIFICATION
7. [admin] PATCH /bookings/{id}/verify-payment
```

**Status booking:** `PENDING_PAYMENT` → `WAITING_VERIFICATION` → `CONFIRMED` → `COMPLETED` / `CANCELLED`

### Alur Pesanan Komoditas (Public)

```
1. GET  /commodity-inventory       → pilih produk
2. POST /commodity-orders          → dapat orderId, invoiceNumber, totalAmount, qris
3. POST /files/upload              → upload bukti bayar
4. POST /commodity-payments        → submit bukti
5. [admin] PATCH /commodity-orders/{id}/verify-payment
   atau PATCH /commodity-orders/{id}/reject-payment
6. [admin] POST /manifests         → buat manifest
7. [admin] POST /manifests/{id}/items
8. [admin] PATCH /manifests/{id}/depart
9. [admin] PATCH /manifests/{id}/complete
```

**Status pesanan:** `PENDING_PAYMENT` → `WAITING_VERIFICATION` → `CONFIRMED` → `WAITING_MANIFEST` → `SHIPPED` → `COMPLETED` / `CANCELLED`

### Alur Monitoring Air (Kader)

```
1. GET  /water-assets              → lihat aset air desa
2. POST /water-reports             → submit laporan volume
3. GET  /water-alerts              → lihat alert (jika ada)
4. [AK] PATCH /water-alerts/{id}/resolve
```

### Dashboard Publik

Endpoint yang bisa dipanggil tanpa login untuk halaman publik:

| Data | Endpoint |
|------|----------|
| Status rob | `GET /rob-status` |
| Riwayat rob | `GET /rob-histories` |
| Status air desa | `GET /water-status` |
| Aset air | `GET /water-assets/public` |
| Destinasi wisata | `GET /destinations` |
| Katalog komoditas | `GET /commodity-inventory` |

---

## 23. Referensi Enum

### User

| Enum | Values |
|------|--------|
| `role` | `ADMIN_KECAMATAN`, `ADMIN_DESA`, `KADER_DESA` |
| `status` | `ACTIVE`, `INACTIVE` |

### ROB

| Enum | Values |
|------|--------|
| `robStatus` | `AMAN`, `WASPADA`, `BAHAYA` |

### Air (Banyu Mili)

| Enum | Values |
|------|--------|
| `waterStatus` | `AMAN`, `SIAGA`, `KRITIS` |
| `waterCondition` | `TAWAR`, `PAYAU` |

### Tourism

| Enum | Values |
|------|--------|
| `bookingStatus` | `PENDING_PAYMENT`, `WAITING_VERIFICATION`, `CONFIRMED`, `COMPLETED`, `CANCELLED` |
| `paymentStatus` | `PENDING`, `VERIFIED`, `REJECTED` |
| `boatAssignmentStatus` | `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED` |

### Economy

| Enum | Values |
|------|--------|
| `commodityOrderStatus` | `PENDING_PAYMENT`, `WAITING_VERIFICATION`, `CONFIRMED`, `WAITING_MANIFEST`, `SHIPPED`, `COMPLETED`, `CANCELLED` |
| `movementType` | `IN`, `OUT`, `ADJUSTMENT` |
| `manifestStatus` | `DRAFT`, `READY`, `DEPARTED`, `COMPLETED`, `CANCELLED` |

### Agency

| Enum | Values |
|------|--------|
| `agencyType` | `PDAM`, `BPBD`, `DINAS_SOSIAL`, `OTHER` |

---

## Tips Integrasi Frontend

1. **Buat HTTP client terpusat** yang otomatis attach `Authorization` header dan handle refresh token pada `401`.
2. **TypeScript types** bisa di-generate dari `GET /openapi.json` menggunakan tools seperti `openapi-typescript`.
3. **Pagination UI** — gunakan `meta.total_pages` dan `meta.total_items` untuk pager.
4. **Upload file** — selalu upload dulu sebelum submit form yang butuh `fileId`.
5. **Tanggal** — kirim sebagai string `YYYY-MM-DD` untuk field date; response datetime dalam format ISO 8601.
6. **UUID** — semua ID resource menggunakan format UUID v4.
7. **Village scope** — untuk user AD/KD, filter UI berdasarkan `villageId` dari `/auth/me`; backend sudah enforce di sisi server.
8. **Testing** — gunakan `Postman.json` yang sudah disediakan dengan variabel `baseUrl`, `accessToken`, dll.

---

*Dokumen ini di-generate dari kode sumber backend. Untuk schema terbaru, selalu rujuk `GET /openapi.json` atau `GET /docs`.*
