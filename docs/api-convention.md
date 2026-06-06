# api-convention.md

# SegaraAnakan Hub - API Convention

Version: 1.0

Framework: Hono

Language: TypeScript

API Style: REST API

Response Format: JSON

Authentication: JWT Access Token + Refresh Token

---

# BASE URL

```text
/api/v1
```

Contoh:

```text
/api/v1/auth/login
/api/v1/destinations
/api/v1/bookings
```

---

# GENERAL PRINCIPLES

## Rules

1. Gunakan RESTful Endpoint.
2. Gunakan plural resource name.
3. Gunakan kebab-case pada URL.
4. Semua response menggunakan format yang sama.
5. Semua error menggunakan format yang sama.
6. Semua endpoint protected menggunakan JWT.
7. Semua endpoint village-scoped wajib menggunakan ownership policy.

---

# SUCCESS RESPONSE

## Single Resource

```json
{
  "success": true,
  "message": "Destination retrieved successfully",
  "data": {
    "id": "uuid"
  }
}
```

---

## Collection Resource

```json
{
  "success": true,
  "message": "Destinations retrieved successfully",
  "data": [
    {
      "id": "uuid"
    }
  ]
}
```

---

# PAGINATION RESPONSE

```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total_items": 100,
    "total_pages": 10
  }
}
```

---

# ERROR RESPONSE

## Validation Error

HTTP Status

```http
422 Unprocessable Entity
```

Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

---

## Unauthorized

```http
401 Unauthorized
```

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

---

## Forbidden

```http
403 Forbidden
```

```json
{
  "success": false,
  "message": "Forbidden"
}
```

---

## Not Found

```http
404 Not Found
```

```json
{
  "success": false,
  "message": "Resource not found"
}
```

---

## Internal Server Error

```http
500 Internal Server Error
```

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

# HTTP STATUS STANDARD

| Action           | Status |
| ---------------- | ------ |
| GET Success      | 200    |
| POST Success     | 201    |
| PATCH Success    | 200    |
| DELETE Success   | 200    |
| Validation Error | 422    |
| Unauthorized     | 401    |
| Forbidden        | 403    |
| Not Found        | 404    |
| Conflict         | 409    |
| Server Error     | 500    |

---

# PAGINATION

## Query Parameters

```http
?page=1
&limit=10
```

Example

```http
GET /destinations?page=1&limit=10
```

Default

```text
page = 1
limit = 10
```

Maximum

```text
limit = 100
```

---

# FILTERING

Format

```http
?field=value
```

Example

```http
GET /bookings?status=CONFIRMED
```

```http
GET /water-assets?village_id=uuid
```

---

# SEARCHING

Format

```http
?search=keyword
```

Example

```http
GET /fishermen?search=jono
```

---

# SORTING

Format

```http
?sort_by=created_at
&sort_order=desc
```

Allowed

```text
asc
desc
```

Example

```http
GET /bookings?sort_by=created_at&sort_order=desc
```

---

# DATE FILTER

Format

```http
?start_date=2026-01-01
&end_date=2026-01-31
```

Example

```http
GET /rob-histories
?start_date=2026-01-01
&end_date=2026-01-31
```

---

# JWT AUTHENTICATION

## Access Token

Header

```http
Authorization: Bearer <token>
```

---

## Current User

Middleware wajib menginject:

```ts
currentUser
```

Structure

```ts
{
  id: string
  villageId: string | null
  role: UserRole
}
```

---

# OWNERSHIP CHECK

Semua village scoped endpoint wajib menggunakan:

```ts
canAccessVillageResource()
```

Contoh

```ts
if (
  !canAccessVillageResource(
    currentUser,
    destination.villageId
  )
) {
  throw new ForbiddenError()
}
```

---

# FILE UPLOAD

Storage:

```text
MinIO
```

---

## Upload Endpoint

```http
POST /files/upload
```

Content-Type

```http
multipart/form-data
```

---

## Upload Response

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "uuid",
    "url": "https://..."
  }
}
```

---

# SOFT DELETE

Resource yang memiliki:

```text
deleted_at
```

tidak boleh benar-benar dihapus.

Gunakan:

```sql
deleted_at = now()
```

---

# AUDIT LOG

Semua aksi berikut wajib menghasilkan audit log:

```text
CREATE
UPDATE
DELETE
VERIFY_PAYMENT
CONFIRM_BOOKING
CONFIRM_MANIFEST
LOGIN
```

---

# API VERSIONING

Seluruh endpoint wajib menggunakan:

```text
/api/v1
```

Contoh:

```http
/api/v1/bookings
/api/v1/fishermen
/api/v1/manifests
```

---

# PUBLIC ENDPOINTS

Tidak memerlukan JWT.

## Tourism

```http
GET /destinations

GET /destinations/:id

POST /bookings

POST /booking-payments
```

---

## Commodity

```http
GET /commodity-inventory

POST /commodity-orders

POST /commodity-payments
```

---

## Monitoring

```http
GET /rob-status

GET /rob-histories

GET /water-assets

GET /water-status
```

---

# ADMIN ENDPOINTS

Seluruh endpoint selain public endpoint wajib menggunakan JWT.

---

# NAMING CONVENTION

## Table

```text
snake_case
```

Contoh:

```text
water_assets
commodity_orders
boat_assignments
```

---

## JSON Property

```text
camelCase
```

Contoh:

```json
{
  "fullName": "John Doe",
  "createdAt": ""
}
```

---

## Endpoint

```text
kebab-case
```

Contoh:

```http
/commodity-orders

/boat-owners

/water-assets
```

---

# TRANSACTION RULE

Database transaction wajib digunakan pada:

## Tourism

```text
Create Booking
Verify Payment
Assign Boat
```

---

## Economy

```text
Create Order
Verify Payment
Update Stock
Create Manifest
```

---

# AI AGENT RULES

Saat membuat endpoint:

1. Gunakan DTO validation dengan Zod.
2. Jangan mengakses database langsung dari controller.
3. Gunakan service layer.
4. Gunakan repository layer.
5. Gunakan transaction untuk proses multi tabel.
6. Gunakan audit log untuk perubahan data penting.
7. Selalu terapkan ownership policy.
8. Jangan membuat endpoint di luar dokumen ini.
