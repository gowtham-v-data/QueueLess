# QueueLess Web (Phase 1)

Local quick start:

1. cd apps/web
2. npm install
3. copy `../../.env.example` → `.env` and set `VITE_API_BASE_URL` if your API runs elsewhere.
4. npm run dev

Notes:
- This is a minimal Phase 1 scaffold: routing, login/register pages, Tailwind base, and Axios service.
- The API base defaults to `/api` and assumes the backend runs proxied on the same host during development.
