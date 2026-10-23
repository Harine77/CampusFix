# CampusFix — Campus Complaint and Maintenance Management System

CampusFix is a full-stack web application that streamlines campus maintenance reporting and resolution. It provides a centralized platform for students to report infrastructure issues, administrators to manage and assign complaints, and maintenance staff to track and complete assigned work.

Instead of relying on informal communication, CampusFix maintains a structured complaint lifecycle with role-based access, persistent database records, and an auditable history of important changes.

## Table of Contents

- [Problem Statement](#problem-statement)
- [Objectives](#objectives)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Complaint Lifecycle](#complaint-lifecycle)
- [Database Design](#database-design)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Security and Engineering Practices](#security-and-engineering-practices)
- [Limitations and Future Enhancements](#limitations-and-future-enhancements)

## Problem Statement

Campus maintenance issues such as faulty electrical equipment, damaged furniture, water leakage, and network connectivity problems are often reported through informal channels. This can make it difficult to assign responsibility, monitor progress, maintain records, and ensure accountability.

CampusFix addresses this problem through a centralized complaint management system that connects issue reporting, administrative assignment, maintenance execution, and progress tracking in one application.

## Objectives

- Provide a structured process for reporting campus maintenance issues.
- Enable administrators to prioritize complaints and assign maintenance staff.
- Allow maintenance staff to update progress and document resolutions.
- Give users visibility into complaint status and history.
- Maintain persistent records and traceable complaint updates.
- Apply role-based authorization and appropriate data validation.

## Key Features

### Student Portal

- Account registration and login.
- Submit complaints with a title, description, category, and campus location.
- View and track personally submitted complaints.
- Access complaint details and progress history.

### Administrator Portal

- View and filter campus complaints.
- Assign and reassign maintenance staff.
- Set complaint priority.
- Reject invalid complaints with a recorded reason.
- Monitor complaint statistics and progress.

### Maintenance Staff Portal

- View assigned maintenance complaints.
- Update complaint status according to the workflow.
- Add progress and resolution notes.
- Maintain a record of work performed.

### Complaint Tracking and Audit History

- Track complaint status from submission to resolution.
- Record significant status changes, assignments, and priority changes.
- Preserve assignment records and complaint history.
- Display dashboard statistics based on database records.

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js | Interactive user interface |
| Frontend tooling | Vite | Development server and production builds |
| Backend runtime | Node.js | Executes server-side JavaScript |
| Backend framework | Express.js | REST API and HTTP request handling |
| Database | PostgreSQL | Persistent relational data storage |
| Authentication | JSON Web Tokens (JWT) | Authenticated API requests |
| Password security | bcrypt | Password hashing and verification |
| Database access | PostgreSQL driver (`pg`) | Executes SQL queries |
| Version control | Git and GitHub | Source code management |
| API verification | Postman | Manual API testing |

## System Architecture

CampusFix follows a client-server architecture with a layered backend.

```mermaid
flowchart TD
    U[Student / Administrator / Staff]
    UI[React Frontend]
    API[Express REST API]
    AUTH[Authentication and Authorization]
    CTRL[Controllers]
    SVC[Services and Workflow Rules]
    MODEL[Database Models]
    DB[(PostgreSQL Database)]

    U --> UI
    UI --> API
    API --> AUTH
    AUTH --> CTRL
    CTRL --> SVC
    SVC --> MODEL
    MODEL --> DB
    DB --> MODEL
    MODEL --> SVC
    SVC --> CTRL
    CTRL --> API
    API --> UI
```

### Request Processing

1. The user performs an action in the React interface.
2. The frontend sends an HTTP request to the Express API.
3. Authentication and authorization middleware checks access where required.
4. The controller handles the request and invokes the relevant service.
5. The service applies business rules and calls the database model.
6. The model executes parameterized SQL queries against PostgreSQL.
7. The backend returns an appropriate JSON response to the frontend.

This separation of responsibilities improves maintainability, readability, and testability.

## Complaint Lifecycle

```mermaid
flowchart TD
    A[Student submits complaint]
    B[Submitted]
    C[Administrator assigns staff]
    D[Assigned]
    E[Staff begins work]
    F[In Progress]
    G[Staff records resolution]
    H[Resolved]

    A --> B --> C --> D --> E --> F --> G --> H
```

Invalid or out-of-scope complaints can be rejected by an administrator with a recorded reason. Authorized workflow transitions are enforced on the server.

## Database Design

CampusFix uses PostgreSQL as its source of truth.

The core database entities are:

| Table | Responsibility |
|---|---|
| `users` | Stores user details, roles, and password hashes |
| `complaints` | Stores complaint descriptions, locations, priority, status, and reporter references |
| `assignments` | Records maintenance staff assignments and reassignment history |
| `complaint_history` | Records significant complaint events and status changes |

### Relationships

- A user can report multiple complaints.
- A complaint belongs to its reporting user.
- A complaint can have multiple assignment records over time.
- Assignment records link complaints to maintenance staff and the administrator who made the assignment.
- A complaint can have multiple history records.
- History records identify the user responsible for an event where applicable.

Primary keys, foreign keys, constraints, and indexes help maintain data integrity and support efficient queries.

The authoritative schema is available in `database/schema.sql`.

## Project Structure

```text
CampusFix/
├── client/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── context/
│       ├── hooks/
│       ├── App.jsx
│       └── main.jsx
├── server/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── domain/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── scripts/
│       ├── services/
│       ├── validators/
│       ├── app.js
│       └── server.js
├── database/
│   └── schema.sql
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

### Backend Responsibilities

- `config/` — Environment and database configuration.
- `routes/` — API endpoint definitions.
- `controllers/` — HTTP request and response handling.
- `services/` — Application logic and authorization/workflow coordination.
- `domain/` — Complaint workflow rules.
- `models/` — PostgreSQL queries and data access.
- `middleware/` — Authentication and centralized error handling.
- `validators/` — Request input validation.
- `scripts/` — Database initialization and user provisioning.
- `app.js` — Express application configuration.
- `server.js` — Server startup.

## Prerequisites

Install the following before running CampusFix:

- Node.js 20.19 or newer.
- npm.
- PostgreSQL 15 or newer.
- Git, if cloning the repository.

Verify your installation:

```bash
node --version
npm --version
psql --version
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/Harine77/CampusFix.git
cd CampusFix
```

### 2. Install dependencies

Run this command from the repository root:

```bash
npm install
```

The project uses npm workspaces for the client and server.

### 3. Create the PostgreSQL database

Open PostgreSQL using your preferred client and create a database:

```sql
CREATE DATABASE campusfix
WITH ENCODING 'UTF8'
TEMPLATE template0;
```

If you use a different database name, update the connection configuration accordingly.

### 4. Configure environment variables

Copy the server environment template:

**Windows PowerShell**

```powershell
Copy-Item server/.env.example server/.env
```

**Linux or macOS**

```bash
cp server/.env.example server/.env
```

Update `server/.env` with your PostgreSQL connection details and a strong, randomly generated JWT secret of at least 32 characters.

Set `CLIENT_ORIGIN` to `http://localhost:5173` unless your frontend runs at a different origin.

Do not commit `server/.env` or publish database credentials and secrets.

### 5. Initialize the database

From the repository root:

```bash
npm run db:init
```

This initializes the database schema using the project's database initialization script.

### 6. Create administrator and staff accounts

Create the first administrator interactively:

```bash
npm run admin:create
```

Create a maintenance staff account:

```bash
npm run staff:create
```

Follow the terminal prompts to configure the accounts. The project provisions these privileged roles through commands rather than public registration.

## Running the Application

### Development mode

From the repository root, run:

```bash
npm run dev
```

The command starts the frontend and backend development processes together.

- **Frontend:** http://localhost:5173
- **Backend health endpoint:** http://localhost:4000/api/health

### Production build

Build the React frontend:

```bash
npm run build
```

Start the API server:

```bash
npm start
```

For a production deployment, serve the generated frontend build through an appropriately configured web server and route API requests to the backend. Configure production environment variables, HTTPS, and secure deployment settings before exposing the application publicly.

## Testing

Run the backend test suite from the repository root:

```bash
npm test --workspace server
```

The test suite should be used to verify authentication, complaint operations, authorization, workflow rules, and error handling.

Important scenarios to verify include:

- Successful registration and login.
- Rejection of invalid credentials and invalid input.
- Complaint submission and retrieval.
- Prevention of unauthorized complaint access.
- Administrator-only assignment operations.
- Valid and invalid status transitions.
- Recording of complaint history.
- Persistence of changes in PostgreSQL.

Refer to the actual test files and test output for the implemented coverage and results.

## Security and Engineering Practices

CampusFix incorporates the following design practices:

- **Password hashing:** Passwords are stored as bcrypt hashes rather than plaintext.
- **Authentication:** JWTs are used to authenticate protected API requests.
- **Role-based authorization:** Server-side checks enforce permissions for students, administrators, and maintenance staff.
- **Data validation:** Incoming data is validated before processing.
- **Parameterized SQL:** Database queries use parameters to reduce SQL injection risk.
- **Error handling:** Centralized error middleware handles failures consistently.
- **Data integrity:** Relational constraints protect references between database entities.
- **Auditability:** Complaint history records important workflow changes.
- **Configuration management:** Environment variables keep secrets outside the committed source code.
- **Separation of concerns:** Routes, controllers, services, domain logic, and models have distinct responsibilities.

### Authentication Note

The current application keeps the JWT in application memory rather than persisting it in `localStorage`. Consequently, reloading the page clears the session and requires the user to sign in again. This is an intentional implementation detail to understand when evaluating the authentication flow.

## Limitations and Future Enhancements

Potential future improvements include:

- Email or in-app notifications when complaint statuses change.
- Complaint attachments and image uploads.
- Pagination for large complaint lists.
- More comprehensive automated frontend and integration tests.
- Production deployment with HTTPS and managed PostgreSQL.
- Enhanced monitoring, audit reporting, and operational analytics.

These are potential enhancements and should not be interpreted as currently implemented functionality.

## Project Information

**Project:** CampusFix — Campus Complaint and Maintenance Management System

**Architecture:** Full-stack client-server application

**Stack:** PostgreSQL, Express.js, React.js, Node.js

**Repository:** https://github.com/Harine77/CampusFix

---

Developed as an academic full-stack software engineering project.
