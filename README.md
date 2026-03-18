# Honours Project

## Authentication Model

This project now uses a login-only user flow.

- Public user registration is disabled.
- Users can only access personal profile/results after login.
- An admin account is automatically seeded on server startup.
- New user accounts can only be created by an authenticated admin.

## Seeded Admin Account

On backend startup, `server/routes/authRoutes.js` ensures an admin exists.

Default values (change these in `.env`):

- `ADMIN_EMAIL=admin@ai-platform.local`
- `ADMIN_PASSWORD=ChangeMeNow123!`
- `ADMIN_NAME=Platform Admin`
- `JWT_SECRET=your-secret-value`

If an account already exists with `ADMIN_EMAIL`, it is elevated to role `admin`.

## Main Auth Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me` (requires bearer token)
- `POST /api/auth/register` (admin only, requires bearer token)
- `GET /api/auth/admin/status` (admin only)

## Run

```bash
npm install
npm run dev
```

Backend runs from `server/server.js` and frontend from Vite.
