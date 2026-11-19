# PROJECTTRACK // Issue & Workflow Engine

Full-stack issue tracking and project management system built with **Node.js**, **Express**, and **PostgreSQL**. Engineered as a compact, two-file monolith (`package.json` + `server.js`) that serves both the RESTful API and the single-page client interface from one entry point.

---

## 01 // System Architecture

```text
+-----------------------------------+
|   Client Interface (Embedded SPA) |
|   HTML5 / CSS3 / Vanilla JS       |
+-----------------+-----------------+
                  |  HTTP / JSON (Bearer JWT)
                  v
+-----------------------------------+
|   Express REST API (server.js)    |
|   - bcryptjs Password Hashing     |
|   - JWT Auth Middleware           |
+-----------------+-----------------+
                  |  SQL Queries (pg Pool)
                  v
+-----------------------------------+
|   PostgreSQL (projecttrack_db)    |
|   - users                         |
|   - projects                      |
|   - issues                        |
+-----------------------------------+
```

---

## 02 // Relational Database Schema

Tables auto-initialize on server startup via `initDb()` if they do not already exist:

| Table | Primary Key | Foreign Keys & Constraints | Purpose |
| :--- | :--- | :--- | :--- |
| **`users`** | `id (SERIAL)` | `email (UNIQUE, NOT NULL)` | Stores registered team members and salted password hashes |
| **`projects`** | `id (SERIAL)` | `lead_id -> users(id)` | Organizes workspaces owned by a project lead |
| **`issues`** | `id (SERIAL)` | `project_id -> projects(id) ON DELETE CASCADE`<br>`assignee_id -> users(id)`<br>`reporter_id -> users(id)` | Tracks tasks, priorities (`Low` to `Critical`), and status transitions |

---

## 03 // REST API Reference

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Registers a new user and hashes password |
| `POST` | `/api/auth/login` | Public | Authenticates credentials and returns a signed JWT |
| `GET` | `/api/projects` | JWT | Lists all projects with lead names |
| `POST` | `/api/projects` | JWT | Creates a new project linked to the logged-in user |
| `GET` | `/api/issues/project/:projectId` | JWT | Fetches all issues for a specific project |
| `POST` | `/api/issues` | JWT | Logs a new issue with priority and assignee ID |
| `PUT` | `/api/issues/:id/status` | JWT | Updates issue workflow state (`Open`, `In Progress`, `Resolved`, `Closed`) |

---

## 04 // End-to-End Local Setup (From 0)

### Step 1: Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher) running locally on port `5432`

### Step 2: Create the Database
Open `psql` or pgAdmin and execute:
```sql
CREATE DATABASE projecttrack_db;
```

### Step 3: Configure Credentials
Open `server.js` and update the PostgreSQL `Pool` block with your local database credentials:
```javascript
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'projecttrack_db',
  password: 'your_password',
  port: 5432,
});
```

### Step 4: Install Dependencies & Run
```bash
npm install
npm start
```

### Step 5: Verify in Browser
1. Open `http://localhost:5000`.
2. Click **Register here** to create your first user (`User ID: 1`).
3. Log in, create a project, and log an issue assigned to User ID `1`.

---

## 05 // Repository Layout

```text
ProjectTrack/
├── package.json    # Project metadata and runtime dependencies
├── server.js       # Express server, PostgreSQL schema setup, REST API, and UI
└── README.md       # System documentation
```
