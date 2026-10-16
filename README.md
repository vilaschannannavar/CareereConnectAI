# CareerConnect AI

CareerConnect AI is a privacy-first web application designed to help job seekers find recruiters and potential referrers among their own LinkedIn connections, rank them, draft personalized outreach, and track conversations.

## Architecture

- **Frontend:** Next.js 14.2 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 (async) + Alembic.
- **Database:** PostgreSQL 16 (via Docker Compose for container environments) + async SQLite engine for local testing.
- **Storage:** Private storage abstraction (local filesystem in dev, S3-compatible in prod).
- **Capability Registry:** Single source of truth exposed at `/api/integrations/capabilities` and `/api/v1/capabilities`.
- **Testing:** pytest (backend), Vitest + Playwright (frontend).

## Core Rules & Compliance

- **No Scraping:** We strictly do not scrape LinkedIn or automate browser interactions against `linkedin.com`.
- **No Password Requests:** We never prompt for or store LinkedIn account passwords.
- **Data Source:** Ingestion occurs strictly via official user-exported LinkedIn archives (`Connections.csv`) or synthetic fixtures.
- **Manual Sending:** Generated outreach drafts are copied by the user to send on LinkedIn. Copying != sending. Messages are only marked as manually sent if the user explicitly records it.
- **Capability-Driven UI:** The frontend dynamically renders features based on the backend Capability Registry (`/api/integrations/capabilities`). No broken or fake placeholder buttons exist.

## Quickstart

### 1. Database (Docker Compose)
```bash
docker compose up -d postgres
```
*(If Docker is not installed on the local system, the backend test suite and dev server seamlessly run with local async SQLite fallback).*

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On CMD:
.\.venv\Scripts\activate.bat

pip install -r requirements.txt
cp ../.env.example .env
pytest -v
uvicorn app.main:app --reload --port 8000
```
Key endpoints:
- Health check: `GET http://localhost:8000/health`
- Capability registry: `GET http://localhost:8000/api/integrations/capabilities`

### 3. Frontend Setup
```bash
cd frontend
cmd /c npm install
cmd /c npm test          # Vitest unit tests
cmd /c npm run build     # Next.js production build
cmd /c npm run dev       # Development server at http://localhost:3000
cmd /c npm run test:e2e  # Playwright E2E tests
```
