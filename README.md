# CampusFix

CampusFix is a PERN campus maintenance workflow: students report issues, administrators triage and assign them, and maintenance staff record progress and resolution. PostgreSQL is the source of truth for every complaint, dashboard count, assignment, and history event.

## Requirements

- Node.js 20.19+ (tested with Node 24)
- PostgreSQL 15+

## Local setup

1. Create a UTF-8 PostgreSQL database named `campusfix` (or choose another database and update `server/.env`):

   ```sql
   CREATE DATABASE campusfix WITH ENCODING 'UTF8' TEMPLATE template0;
   ```
2. Copy `server/.env.example` to `server/.env`. Set `DATABASE_URL` to a working PostgreSQL connection string and set `JWT_SECRET` to a random secret of at least 32 characters. Set `CLIENT_ORIGIN` to the Vite origin if it differs from `http://localhost:5173`.
3. From the repository root run `npm install`, then `npm run db:init` to create the schema. Initialization is safe to rerun.
4. Create the first admin interactively with `npm run admin:create`. The password is entered in the terminal and hashed before it is stored. Never expose this command as a public endpoint.
5. Create maintenance staff accounts interactively with `npm run staff:create`. Public registration creates students only.
6. Run `npm run dev`; the Vite app is at `http://localhost:5173`, and the API health endpoint is `http://localhost:4000/api/health`.

### Creating staff accounts

For a trusted operator, the included command prompts for the initial password and stores only a bcrypt hash:

```sh
npm run staff:create
```

## Workflow rules

- A student can create and view only their own complaints.
- An administrator can view all complaints, assign/reassign staff, set priority, or reject a non-terminal request with a reason.
- Assigned staff can move `Assigned → In Progress → Resolved`; each transition requires a note. The server verifies the assignee and valid transition.
- Every initial submission, assignment/reassignment, priority change, status transition, and rejection is recorded in `complaint_history`. The `assignments` table preserves each assignment interval/event.
- The JWT is kept only in application memory. Reloading clears the session and requires sign-in again; no bearer credential is persisted to localStorage.

## Project layout

```text
client/                 React + Vite application
server/src/config/      Environment and PostgreSQL pool
server/src/routes/      HTTP routing
server/src/controllers/ HTTP request/response handlers
server/src/services/    Authorization and workflow rules
server/src/models/      Parameterized PostgreSQL queries
server/src/middleware/  JWT auth and centralized errors
server/src/validators/  Request validation
server/src/scripts/     Database initialization and admin provisioning
database/schema.sql     Normalized PostgreSQL schema and indexes
```

## Useful commands

```sh
npm install
npm run db:init
npm run admin:create
npm run dev
npm run build
npm test --workspace server
```

`npm start` starts the API server for production. Build the client with `npm run build` and serve `client/dist` behind a web server configured to proxy `/api` to the API. Set `VITE_API_URL` at build time if the API has a different public URL.
