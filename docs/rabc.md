# rbac.md

# SegaraAnakan Hub - Role Based Access Control

Version: 2.0

---

# ROLE DEFINITIONS

## ADMIN_KECAMATAN

Akses penuh terhadap seluruh sistem.

Tidak dibatasi oleh village_id.

Dapat mengakses seluruh data dari seluruh desa.

---

## ADMIN_DESA

Administrator operasional desa.

Dibatasi hanya pada data desa miliknya.

Mengelola:

* Wisata
* Komoditas
* Manifest
* Pemilik Perahu
* Nelayan

---

## KADER_DESA

Petugas monitoring air.

Dibatasi hanya pada data desa miliknya.

Mengelola:

* Laporan air
* Monitoring tandon
* Monitoring status air

---

# AUTHORIZATION MODEL

Backend WAJIB menggunakan 2 lapisan authorization.

```text
Authentication
↓
Role Authorization
↓
Ownership Authorization
```

Role saja tidak cukup.

---

# OWNERSHIP POLICY

## Village Scoped Resources

Semua resource berikut dianggap milik desa tertentu:

```text
Users
Water Assets
Water Reports
Water Alerts

Destinations
Boat Owners

Fishermen
Commodity Inventory
Commodity Orders

Manifests
Bookings
```

---

## Ownership Rule

ADMIN_DESA dan KADER_DESA wajib memenuhi:

```ts
resource.villageId === currentUser.villageId
```

Jika tidak sesuai:

```http
403 Forbidden
```

---

## Example

User:

```json
{
  "role": "ADMIN_DESA",
  "villageId": "UJUNGALANG"
}
```

Resource:

```json
{
  "villageId": "PANIKEL"
}
```

Result:

```http
403 Forbidden
```

---

# POLICY HELPERS

AI Agent wajib membuat reusable policy helper.

Contoh:

```ts
canAccessVillageResource(
  currentUser,
  resourceVillageId
)
```

Return:

```ts
true
false
```

---

Contoh:

```ts
if (
  !canAccessVillageResource(
    currentUser,
    destination.villageId
  )
) {
  throw ForbiddenException
}
```

---

# GLOBAL RULES

## ADMIN_KECAMATAN

Bypass seluruh ownership policy.

```text
Semua Desa
```

---

## ADMIN_DESA

Wajib lolos ownership policy.

---

## KADER_DESA

Wajib lolos ownership policy.

---

# AUTH MODULE

## Login

| Role            |
| --------------- |
| ADMIN_KECAMATAN |
| ADMIN_DESA      |
| KADER_DESA      |

---

## Logout

| Role            |
| --------------- |
| ADMIN_KECAMATAN |
| ADMIN_DESA      |
| KADER_DESA      |

---

## Refresh Token

| Role            |
| --------------- |
| ADMIN_KECAMATAN |
| ADMIN_DESA      |
| KADER_DESA      |

---

## View Profile

| Role            |
| --------------- |
| ADMIN_KECAMATAN |
| ADMIN_DESA      |
| KADER_DESA      |

---

## Update Own Profile

| Role            |
| --------------- |
| ADMIN_KECAMATAN |
| ADMIN_DESA      |
| KADER_DESA      |

---

# USER MANAGEMENT

## List Users

| Admin Kecamatan | Admin Desa | Kader |
| --------------- | ---------- | ----- |
| ✅               | ❌          | ❌     |

---

## View User

| Admin Kecamatan | Admin Desa | Kader |
| --------------- | ---------- | ----- |
| ✅               | ❌          | ❌     |

---

## Create User

| Admin Kecamatan | Admin Desa | Kader |
| --------------- | ---------- | ----- |
| ✅               | ❌          | ❌     |

---

## Update User

| Admin Kecamatan | Admin Desa | Kader |
| --------------- | ---------- | ----- |
| ✅               | ❌          | ❌     |

---

## Disable User

| Admin Kecamatan | Admin Desa | Kader |
| --------------- | ---------- | ----- |
| ✅               | ❌          | ❌     |

---

# VILLAGES

## View Village

| Admin Kecamatan | Admin Desa | Kader |
| --------------- | ---------- | ----- |
| ✅               | ✅          | ✅     |

---

## Update Village

| Admin Kecamatan | Admin Desa | Kader |
| --------------- | ---------- | ----- |
| ✅               | ❌          | ❌     |

---

# ROB GUARDIAN

## View Current Status

| Admin Kecamatan | Admin Desa | Kader |
| --------------- | ---------- | ----- |
| ✅               | ✅          | ✅     |

---

## View History

| Admin Kecamatan | Admin Desa | Kader |
| --------------- | ---------- | ----- |
| ✅               | ✅          | ✅     |

---

## Manual Override

| Admin Kecamatan | Admin Desa | Kader |
| --------------- | ---------- | ----- |
| ✅               | ❌          | ❌     |

---

## Trigger Webhook

| Admin Kecamatan | Admin Desa | Kader |
| --------------- | ---------- | ----- |
| ✅               | ❌          | ❌     |

---

# BANYU MILI

## Water Assets

| Action | Admin Kecamatan | Admin Desa | Kader |
| ------ | --------------- | ---------- | ----- |
| View   | ✅               | ✅*         | ✅*    |
| Create | ✅               | ❌          | ❌     |
| Update | ✅               | ❌          | ❌     |
| Delete | ✅               | ❌          | ❌     |

* Ownership Policy berlaku.

---

## Water Reports

| Action | Admin Kecamatan | Admin Desa | Kader |
| ------ | --------------- | ---------- | ----- |
| View   | ✅               | ✅*         | ✅*    |
| Create | ❌               | ❌          | ✅     |
| Update | ❌               | ❌          | ✅     |
| Delete | ❌               | ❌          | ❌     |

* Ownership Policy berlaku.

---

## Water Alerts

| Action  | Admin Kecamatan | Admin Desa | Kader |
| ------- | --------------- | ---------- | ----- |
| View    | ✅               | ✅*         | ✅*    |
| Resolve | ✅               | ❌          | ❌     |

* Ownership Policy berlaku.

---

# TOURISM

## Destinations

| Action | Admin Kecamatan | Admin Desa |
| ------ | --------------- | ---------- |
| View   | ✅               | ✅*         |
| Create | ✅               | ✅          |
| Update | ✅               | ✅*         |
| Delete | ✅               | ✅*         |

* Ownership Policy berlaku.

---

## Destination Images

| Action | Admin Kecamatan | Admin Desa |
| ------ | --------------- | ---------- |
| Upload | ✅               | ✅*         |
| Delete | ✅               | ✅*         |

* Ownership Policy berlaku.

---

## Boat Owners

| Action | Admin Kecamatan | Admin Desa |
| ------ | --------------- | ---------- |
| View   | ✅               | ✅*         |
| Create | ✅               | ✅          |
| Update | ✅               | ✅*         |
| Delete | ✅               | ✅*         |

* Ownership Policy berlaku.

---

## Bookings

| Action           | Admin Kecamatan | Admin Desa |
| ---------------- | --------------- | ---------- |
| View             | ✅               | ✅*         |
| Verify Payment   | ✅               | ✅*         |
| Confirm Booking  | ✅               | ✅*         |
| Complete Booking | ✅               | ✅*         |
| Cancel Booking   | ✅               | ✅*         |

* Ownership Policy berlaku.

---

## Boat Assignment

| Action | Admin Kecamatan | Admin Desa |
| ------ | --------------- | ---------- |
| View   | ✅               | ✅*         |
| Create | ✅               | ✅*         |
| Update | ✅               | ✅*         |

* Ownership Policy berlaku.

---

# ECONOMY

## Fishermen

| Action | Admin Kecamatan | Admin Desa |
| ------ | --------------- | ---------- |
| View   | ✅               | ✅*         |
| Create | ✅               | ✅          |
| Update | ✅               | ✅*         |
| Delete | ✅               | ✅*         |

* Ownership Policy berlaku.

---

## Commodity Inventory

| Action | Admin Kecamatan | Admin Desa |
| ------ | --------------- | ---------- |
| View   | ✅               | ✅*         |
| Create | ✅               | ✅          |
| Update | ✅               | ✅*         |
| Delete | ✅               | ✅*         |

* Ownership Policy berlaku.

---

## Commodity Orders

| Action         | Admin Kecamatan | Admin Desa |
| -------------- | --------------- | ---------- |
| View           | ✅               | ✅*         |
| Verify Payment | ✅               | ✅*         |
| Update Status  | ✅               | ✅*         |

* Ownership Policy berlaku.

---

## Commodity Stock Movements

| Action            | Admin Kecamatan | Admin Desa |
| ----------------- | --------------- | ---------- |
| View History      | ✅               | ✅*         |
| Manual Adjustment | ✅               | ✅*         |

* Ownership Policy berlaku.

---

## Manifests

| Action            | Admin Kecamatan | Admin Desa |
| ----------------- | --------------- | ---------- |
| View              | ✅               | ✅*         |
| Create            | ✅               | ✅          |
| Add Order         | ✅               | ✅*         |
| Confirm Departure | ✅               | ✅*         |
| Complete Manifest | ✅               | ✅*         |

* Ownership Policy berlaku.

---

# AGENCIES

Semua agency management hanya Admin Kecamatan.

---

# SETTINGS

Semua settings hanya Admin Kecamatan.

---

# FILES

## Upload

| Admin Kecamatan | Admin Desa | Kader |
| --------------- | ---------- | ----- |
| ✅               | ✅          | ✅     |

---

## Delete

| Admin Kecamatan | Admin Desa |
| --------------- | ---------- |
| ✅               | ✅*         |

* Ownership Policy berlaku.

---

# AUDIT LOG

Hanya Admin Kecamatan yang dapat mengakses audit log.

---

# PUBLIC ACCESS

Tanpa login.

## Tourism

```text
GET Destinations
GET Destination Detail

POST Booking
POST Upload Payment Proof
```

## Commodity

```text
GET Commodity Listing

POST Commodity Order
POST Upload Payment Proof
```

## Monitoring

```text
GET Rob Status
GET Rob History

GET Water Status
```

Tidak ada endpoint public yang dapat mengubah data internal desa.
