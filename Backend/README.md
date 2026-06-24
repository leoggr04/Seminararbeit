Node.js Express backend for Seminararbeit

Structure:
- server.js - application entry
- db/ - database connection (pg Pool)
- models/ - database access functions
- controllers/ - request handlers
- routes/ - express routers

Endpoints:
- GET /api/users -> { success: true, data: [ ...users ] }
- GET /api/users/:id -> { success: true, data: { id, name, email } }

Setup:
1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install dependencies: `npm install`.
3. Run in dev: `npm run dev` (requires nodemon) or `npm start`.

The endpoints expect a `users` table with at least columns: id (int), name (text), email (text).
# Node.js Express Backend

## Setup

1. Install dependencies (already done):
   ```sh
   npm install
   ```
2. Start the server:
   ```sh
   node server.js
   ```

The server will run on http://localhost:3000 by default.

## Project Structure
- `server.js`: Main Express server entry point
- `package.json`: Project metadata and dependencies

---

This is a minimal Express backend. Expand as needed for your project requirements.

## OSM tile proxy

The backend exposes `GET /api/tiles/:z/:x/:y.png` as an OpenStreetMap tile proxy.

It sets a dedicated `User-Agent`, `Referer`, and a local cache so tile requests follow the OSM usage guidelines more closely than direct client-side requests.
