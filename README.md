# QueueLess

Never Wait in Line Again.

QueueLess is a cloud-based smart queue management platform for organizations such as hospitals, banks, colleges, government offices, restaurants, vehicle service centers, and salons.

## Phase 1: Foundation

This phase establishes the production-ready baseline:

- Monorepo workspace scaffold
- Firebase Firestore data layer for auth/profile storage
- Express + TypeScript backend foundation
- Firebase Auth-backed authentication core
- Health endpoint and auth endpoint structure
- React + Vite frontend shell with reusable UI primitives
- Shared environment configuration and project conventions

## Folder Structure

```text
apps/
  api/
    prisma/
    src/
      config/
      controllers/
      middlewares/
      repositories/
      routes/
      services/
      types/
      utils/
  web/
    src/
      components/
      context/
      hooks/
      layouts/
      pages/
      routes/
      services/
      styles/
      utils/
```

## Database Schema

Phase 1 now uses Firebase Firestore for the active auth/profile flow, while the legacy Prisma schema remains in the repo for non-migrated domain work.

- Users
- Organizations
- OrganizationMemberships
- Branches
- Services
- Counters
- Queues
- RefreshTokens
- Notifications
- Feedback
- Subscriptions
- Reports
- AuditLogs

The schema is stored in `apps/api/prisma/schema.prisma`.
The Firebase-backed auth/profile logic lives in `apps/api/src/services/auth.service.ts`.

## Backend API Endpoints

### Health

- `GET /health`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/send-verification`
- `POST /auth/verify-email`

## Frontend UI Components

Phase 1 includes the first reusable primitives and screens:

- Button
- Card
- Input
- Badge
- Landing page
- Login page
- Register page
- Dashboard shell

## Testing Instructions

1. Copy `.env.example` to `.env` and provide Firebase values.
2. Install dependencies from the repository root.
3. If you are using the legacy Prisma path, run `npm run prisma:generate`.
4. Run `npm run dev`.
5. Validate the API health endpoint at `http://localhost:4000/health`.
6. Open the frontend at `http://localhost:5173`.

## Notes

- Real customer data should live in Firebase Firestore and Firebase Auth.
- Cloudinary is reserved for media and QR assets.
- The frontend will talk to the API through environment-based configuration.
