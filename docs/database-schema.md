# database-schema.md

# SegaraAnakan Hub

Version: 3.3

Database: PostgreSQL

ORM: Drizzle ORM

Storage: MinIO

Architecture: Modular Monolith

---

# ENUMS

## user_role

```text
ADMIN_KECAMATAN
ADMIN_DESA
KADER_DESA
```

## user_status

```text
ACTIVE
INACTIVE
```

## rob_status

```text
AMAN
WASPADA
BAHAYA
```

## water_status

```text
AMAN
SIAGA
KRITIS
```

## water_condition

```text
TAWAR
PAYAU
```

## booking_status

```text
PENDING_PAYMENT
WAITING_VERIFICATION
CONFIRMED
COMPLETED
CANCELLED
```

## commodity_order_status

```text
PENDING_PAYMENT
WAITING_VERIFICATION
CONFIRMED
WAITING_MANIFEST
SHIPPED
COMPLETED
CANCELLED
```

## payment_status

```text
PENDING
VERIFIED
REJECTED
```

## manifest_status

```text
DRAFT
READY
DEPARTED
COMPLETED
CANCELLED
```

## movement_type

```text
IN
OUT
ADJUSTMENT
```

## agency_type

```text
PDAM
BPBD
DINAS_SOSIAL
OTHER
```

## boat_assignment_status

```text
PENDING
CONFIRMED
COMPLETED
CANCELLED
```

---

# MASTER

## villages

```sql
id uuid pk

name varchar(100)

description text nullable

qris_file_id uuid nullable

contact_name varchar(255)

contact_phone varchar(30)

contact_email varchar(255)

created_at timestamp
updated_at timestamp
deleted_at timestamp nullable
```

---

## agencies

Instansi tujuan notifikasi.

```sql
id uuid pk

name varchar(255)

agency_type agency_type

email varchar(255) nullable

phone varchar(30) nullable

is_active boolean

created_at timestamp
updated_at timestamp
deleted_at timestamp nullable
```

---

## settings

Konfigurasi global sistem.

```sql
id uuid pk

key varchar(100) unique

value text

description text nullable

updated_at timestamp
```

Contoh:

```text
ROB_WAVE_WARNING
ROB_WAVE_DANGER

ROB_TIDE_WARNING
ROB_TIDE_DANGER

ROB_RAIN_WARNING
ROB_RAIN_DANGER

WHATSAPP_WEBHOOK_URL

WATER_CRITICAL_PERCENT
```

---

# AUTH

## users

```sql
id uuid pk

village_id uuid fk nullable

full_name varchar(255)

email varchar(255) unique

phone varchar(30)

password_hash text

role user_role

status user_status

refresh_token_version integer default 1

last_login_at timestamp nullable

created_at timestamp
updated_at timestamp
deleted_at timestamp nullable
```

---

## user_sessions

```sql
id uuid pk

user_id uuid fk

refresh_token text

expired_at timestamp

created_at timestamp
```

---

# STORAGE

## files

```sql
id uuid pk

bucket varchar(100)

object_name text

original_name text

mime_type varchar(255)

size bigint

url text

uploaded_by uuid fk users nullable

created_at timestamp
```

---

# ROB GUARDIAN

Modul Rob Guardian menggunakan tabel berikut:

```text
rob_current_status
rob_histories
rob_manual_overrides
rob_webhook_logs
```

Dashboard publik **wajib** membaca snapshot status terkini dari `rob_current_status`.
Jangan membaca baris histori terakhir pada setiap request.

---

## rob_current_status

Snapshot status rob terkini.

```sql
id uuid pk

status rob_status

score integer

wave_height decimal(10,2)

tide_height decimal(10,2)

rainfall decimal(10,2)

source varchar(50)

recorded_at timestamp

updated_at timestamp
```

---

## rob_histories

```sql
id uuid pk

status rob_status

score integer

wave_height decimal(10,2)

tide_height decimal(10,2)

rainfall decimal(10,2)

notes text nullable

recorded_at timestamp

created_at timestamp
```

---

## rob_manual_overrides

Menyimpan seluruh override manual yang dilakukan Admin Kecamatan.

```sql
id uuid pk

status rob_status

reason text

created_by uuid fk users

created_at timestamp
```

---

## rob_webhook_logs

```sql
id uuid pk

event_name varchar(100)

payload jsonb

response_status integer nullable

response_body text nullable

created_at timestamp
```

---

# BANYU MILI

## water_assets

```sql
id uuid pk

village_id uuid fk

name varchar(255)

location_name varchar(255)

latitude decimal(10,7)

longitude decimal(10,7)

capacity_liter integer

is_active boolean

created_at timestamp
updated_at timestamp
deleted_at timestamp nullable
```

---

## water_reports

```sql
id uuid pk

water_asset_id uuid fk

submitted_by uuid fk users

volume_percent integer

water_condition water_condition

estimated_days_left integer

status water_status

notes text nullable

reported_at timestamp

created_at timestamp
```

---

## water_alerts

```sql
id uuid pk

water_asset_id uuid fk

status water_status

message text

resolved boolean

resolved_at timestamp nullable

created_at timestamp
```

---

# TOURISM

## destinations

```sql
id uuid pk

village_id uuid fk

name varchar(255)

description text

price_per_person numeric(12,2)

capacity_per_day integer

max_people_per_booking integer

is_active boolean

created_by uuid fk users

updated_by uuid fk users nullable

created_at timestamp
updated_at timestamp
deleted_at timestamp nullable
```

---

## destination_images

```sql
id uuid pk

destination_id uuid fk

file_id uuid fk files

created_at timestamp
```

---

## boat_owners

```sql
id uuid pk

village_id uuid fk

full_name varchar(255)

phone varchar(30)

boat_name varchar(255)

boat_capacity integer

is_active boolean

last_assigned_at timestamp nullable

created_at timestamp
updated_at timestamp
deleted_at timestamp nullable
```

Rotasi perahu menggunakan `boat_owners.last_assigned_at` (ASC, NULLS FIRST).

---

## bookings

```sql
id uuid pk

invoice_number varchar(100) unique

village_id uuid fk villages

destination_id uuid fk

customer_name varchar(255)

customer_email varchar(255)

customer_phone varchar(30)

booking_date date

total_people integer

total_amount numeric(12,2)

status booking_status

created_at timestamp
updated_at timestamp
```

---

## booking_payments

```sql
id uuid pk

booking_id uuid fk

file_id uuid fk files

sender_name varchar(255)

payment_status payment_status

notes text nullable

verified_by uuid fk users nullable

verified_at timestamp nullable

created_at timestamp
```

---

## boat_assignments

```sql
id uuid pk

booking_id uuid fk

boat_owner_id uuid fk

assigned_people integer

status boat_assignment_status

assigned_at timestamp

assigned_by uuid fk users
```

---

# ECONOMY

## fishermen

```sql
id uuid pk

village_id uuid fk

full_name varchar(255)

phone varchar(30) nullable

is_active boolean

created_at timestamp
updated_at timestamp
deleted_at timestamp nullable
```

---

## commodity_categories

```sql
id uuid pk

name varchar(100)

created_at timestamp
```

---

## commodities

Master komoditas.

```sql
id uuid pk

category_id uuid fk

name varchar(255)

created_at timestamp
```

---

## commodity_inventory

Stok milik nelayan.

```sql
id uuid pk

fisherman_id uuid fk

commodity_id uuid fk

available_weight_kg numeric(10,2)

price_per_kg numeric(12,2)

created_by uuid fk users

updated_by uuid fk users nullable

created_at timestamp
updated_at timestamp
```

---

## commodity_stock_movements

```sql
id uuid pk

inventory_id uuid fk

movement_type movement_type

quantity_kg numeric(10,2)

previous_stock_kg numeric(10,2)

new_stock_kg numeric(10,2)

reference_type varchar(100)

reference_id uuid nullable

notes text nullable

created_by uuid fk users

created_at timestamp
```

---

## commodity_orders

```sql
id uuid pk

invoice_number varchar(100) unique

village_id uuid fk villages

buyer_name varchar(255)

buyer_phone varchar(30)

buyer_email varchar(255)

total_amount numeric(12,2)

status commodity_order_status

created_at timestamp
updated_at timestamp
```

---

## commodity_order_items

```sql
id uuid pk

commodity_order_id uuid fk

inventory_id uuid fk

quantity_kg numeric(10,2)

price_per_kg numeric(12,2)

subtotal numeric(12,2)
```

---

## commodity_payments

```sql
id uuid pk

commodity_order_id uuid fk

file_id uuid fk files

sender_name varchar(255)

payment_status payment_status

notes text nullable

verified_by uuid fk users nullable

verified_at timestamp nullable

created_at timestamp
```

---

## manifests

```sql
id uuid pk

village_id uuid fk villages

manifest_date date

status manifest_status

departure_time timestamp nullable

estimated_arrival_time timestamp nullable

confirmed_by uuid fk users nullable

created_by uuid fk users

completed_at timestamp nullable

created_at timestamp
updated_at timestamp
```

---

## manifest_items

```sql
id uuid pk

manifest_id uuid fk

commodity_order_id uuid fk

created_at timestamp
```

---

# NOTIFICATION

## agency_notification_logs

```sql
id uuid pk

agency_id uuid fk

channel varchar(50)

subject varchar(255) nullable

message text

status varchar(50)

response text nullable

created_by uuid fk users nullable

created_at timestamp
```

---

## email_logs

```sql
id uuid pk

recipient_email varchar(255)

subject varchar(255)

status varchar(50)

error_message text nullable

created_at timestamp
```

---

## notification_logs

```sql
id uuid pk

event_name varchar(100)

channel varchar(50)

payload jsonb

status varchar(50)

created_at timestamp
```

---

# AUDIT

## audit_logs

```sql
id uuid pk

user_id uuid fk nullable

action varchar(255)

module varchar(100)

entity_type varchar(100)

entity_id uuid

old_data jsonb nullable

new_data jsonb nullable

ip_address varchar(100)

created_at timestamp
```

---

# RELATION SUMMARY

```text
rob_current_status

rob_histories

rob_manual_overrides
  └── users (created_by)

rob_webhook_logs
```

villages
├── users
├── water_assets
├── destinations
├── boat_owners
├── fishermen
├── bookings
├── commodity_orders
└── manifests

fishermen
└── commodity_inventory

commodity_inventory
├── commodity_stock_movements
└── commodity_order_items

bookings
├── booking_payments
└── boat_assignments

boat_owners
└── boat_assignments (rotation via last_assigned_at)

destinations
├── destination_images
└── bookings

water_assets
├── water_reports
└── water_alerts

files
├── destination_images
├── booking_payments
└── commodity_payments
```
