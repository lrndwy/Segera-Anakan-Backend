# HONO-BACKEND

Template backend modern berbasis Hono + TypeScript untuk SaaS/startup.

## Stack

- Hono
- PostgreSQL + Drizzle ORM
- MinIO / S3 compatible storage
- WebSocket realtime chat
- Redis + BullMQ
- JWT auth + bcrypt
- Zod validation

## Struktur Proyek

```text
src/
  app.ts              # komposisi middleware & route
  server.ts           # bootstrap HTTP server
  worker.ts           # bootstrap background worker
  cli/
    seed.ts           # seed data awal
  config/
  db/
    migrations/       # SQL migration files
    schema/           # Drizzle schema
  lib/
  middlewares/
  modules/
    auth/
    job/
    realtime/
    storage/
    user/
  types/
  utils/
```

## Menjalankan

1. Salin `.env.example` ke `.env` dan sesuaikan nilainya.
2. Install dependensi: `npm install`
3. Build: `npm run build`
4. Jalankan migrasi: `npm run db:migrate`
5. Seed admin: `npm run seed`
6. Jalankan server: `npm run dev`
7. Jalankan worker: `npm run dev:worker`

Untuk mode Docker Compose, `DATABASE_URL` di-override ke hostname service `postgres` dari dalam container, jadi `.env` lokal bisa tetap memakai `localhost` untuk command yang dijalankan langsung dari host.

```bash
docker compose up --build
```

## Base URL & Format Response

| Item | Nilai default |
|---|---|
| Base URL | `http://localhost:3000` |
| API Prefix | `/api/v1` |
| Auth header | `Authorization: Bearer <token>` |

**Response sukses:**

```json
{
  "success": true,
  "data": {}
}
```

**Response error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid payload",
    "details": {}
  }
}
```

## Daftar Endpoint

> Semua path di bawah diasumsikan menggunakan prefix `/api/v1` kecuali endpoint sistem.

### Sistem

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/health` | — | Health check aplikasi |
| `GET` | `/ready` | — | Readiness check (DB + Redis) |
| `GET` | `/openapi.json` | — | Metadata OpenAPI dasar |

### Auth (`/auth`)

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/auth/register` | — | Registrasi user baru |
| `POST` | `/auth/login` | — | Login, mendapatkan JWT token |
| `POST` | `/auth/logout` | User | Logout & revoke session |

### User (`/users`)

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/users/profile` | User | Ambil profil user saat ini |
| `PATCH` | `/users/profile` | User | Update profil (nama, telepon) |
| `PUT` | `/users/profile/photo` | User | Upload foto profil (multipart) |
| `GET` | `/users/me` | User | Alias `GET /users/profile` |
| `PATCH` | `/users/me` | User | Alias `PATCH /users/profile` |

### Admin User (`/admin/users`)

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/admin/users` | Admin | List user (pagination) |
| `GET` | `/admin/users/:userId` | Admin | Detail user by ID |
| `PUT` | `/admin/users/:userId` | Admin | Update user oleh admin |

### Storage (`/storage`)

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/storage/buckets` | User | List bucket |
| `POST` | `/storage/buckets/ensure` | User | Pastikan bucket ada |
| `DELETE` | `/storage/buckets/:bucket` | User | Hapus bucket |
| `POST` | `/storage/files/upload` | User | Upload file langsung (multipart) |
| `POST` | `/storage/files/presign` | User | Generate presigned upload URL |
| `POST` | `/storage/files/download-url` | User | Generate presigned download URL |

### Background Job (`/jobs`)

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/jobs/email` | User | Enqueue email welcome |
| `POST` | `/jobs/email/digest` | User | Enqueue email digest |
| `POST` | `/jobs/email/schedule` | User | Jadwalkan email digest harian (cron) |

### Realtime (`/realtime`)

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/realtime/chat/:roomId` | — | Info koneksi WebSocket room |
| `GET` | `/realtime/rooms/:roomId` | — | Jumlah client terhubung di room |
| `WS` | `/realtime/ws/:roomId` | — | WebSocket chat room |

## Role & Autentikasi

| Role | Akses |
|---|---|
| `participant` | Endpoint user biasa (profile, storage, jobs) |
| `admin` | Semua akses participant + `/admin/users/*` |

Login sebagai admin default (setelah seed):

- Email: `admin@example.com`
- Password: `ChangeMe123!`

## Scripts NPM

| Script | Fungsi |
|---|---|
| `npm run dev` | Development server dengan hot reload |
| `npm run dev:worker` | Development worker dengan hot reload |
| `npm run build` | Compile TypeScript ke `dist/` |
| `npm run start` | Jalankan server production |
| `npm run worker` | Jalankan worker production |
| `npm run db:migrate` | Jalankan SQL migration |
| `npm run db:generate` | Generate migration dari Drizzle schema |
| `npm run db:push` | Push schema ke database (dev) |
| `npm run db:studio` | Buka Drizzle Studio |
| `npm run seed` | Seed user admin |

## Dokumentasi Lengkap

Panduan detail mencakup:

- Setup environment & Docker
- Contoh request/response setiap endpoint
- Cara membuat modul CRUD baru
- Middleware auth & role guard
- File storage (upload, presign, download)
- Background job & cron scheduler
- WebSocket realtime chat
- Database migration & schema
- Konvensi error handling & validasi

Baca: **[docs/DOCUMENTATION.md](./docs/DOCUMENTATION.md)**
