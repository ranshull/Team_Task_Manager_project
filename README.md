# Team Task Manager

A full-stack project management app with JWT auth, admin/member roles, projects, kanban task tracking, dashboard stats, and per-task comments.

## Architecture

- `backend/`: FastAPI, Beanie ODM, Motor, MongoDB, JWT auth.
- `frontend/`: React 18, Vite, TanStack Query, Axios, plain CSS, `@dnd-kit/core`.
- MongoDB stores users, projects, tasks, and comments. Beanie initializes all document models at FastAPI startup.

## Local Backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Backend env vars:

```bash
MONGO_URI=mongodb://localhost:27017/team_task_manager
DATABASE_NAME=team_task_manager
SECRET_KEY=replace-with-a-random-32-byte-hex-string
CORS_ORIGINS=http://localhost:5173
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

API docs are available at `http://localhost:8000/docs`.

## Local Frontend

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

Open `http://localhost:5173`.

## Seed Admin

After configuring backend env vars:

```bash
cd backend
SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_USERNAME=admin SEED_ADMIN_PASSWORD=AdminPass123! python seed.py
```

## API Reference

Use `/docs` for interactive Swagger docs. Main endpoint groups:

- Auth: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/me`
- Projects: `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/{id}`, `POST /api/projects/{id}/members`
- Tasks: `GET/POST /api/projects/{id}/tasks`, `GET/PUT/DELETE /api/tasks/{id}`
- Comments: `GET/POST /api/tasks/{id}/comments`, `DELETE /api/comments/{id}`
- Dashboard: `GET /api/dashboard`

## MongoDB Atlas Setup

1. Create a free M0 Atlas cluster.
2. Create a database user with read/write access.
3. Add `0.0.0.0/0` to Network Access for Railway egress.
4. Copy the MongoDB connection string into `MONGO_URI`.
5. Set `DATABASE_NAME=team_task_manager` or your preferred database name.

## Railway Deployment

Backend service:

- Root directory: `backend`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env vars: `MONGO_URI`, `DATABASE_NAME`, `SECRET_KEY`, `CORS_ORIGINS`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`

Frontend service:

- Root directory: `frontend`
- Build command: `npm run build`
- Start command: `npx serve dist`
- Env var: `VITE_API_URL=https://your-backend.up.railway.app`

Run seed data manually in the Railway backend shell:

```bash
python seed.py
```

## Notes

- Access tokens live in React state only.
- Refresh tokens live in `localStorage`.
- Members can update task status only.
- Admins can create projects/tasks, manage members, and delete tasks.
