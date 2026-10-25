# CareerConnect AI

CareerConnect AI is a privacy-first web application designed to help job seekers find recruiters and potential referrers among their own LinkedIn connections, rank them using transparent scoring heuristics, draft personalized outreach, and track outreach progress.

## Core Rules & Compliance Guarantees

- **Zero Scraping:** We strictly do not scrape LinkedIn, use undocumented internal endpoints, or drive headless browsers against LinkedIn.
- **Zero Password Sharing:** We never ask for, prompt for, or store LinkedIn account passwords.
- **Official Ingestion Only:** Contact ingestion occurs strictly via official user-exported LinkedIn data archives (`Connections.csv`) or synthetic fixtures.
- **Manual Sending Only:** Generated outreach drafts are reviewed, personalized, and copied by the user to send directly on LinkedIn. Copying is never sending. Messages are marked sent only when explicitly confirmed by the user.
- **Capability-Driven UI:** The user interface dynamically queries the backend Capability Registry (`/api/integrations/capabilities`) to ensure every rendered action is honest, working, and policy-compliant. No disabled or fake buttons exist.
- **Strict User Isolation:** Every resume, contact, message, and session is strictly bound to the authenticated user ID. Any request targeting foreign resources returns HTTP 404 (preventing user enumeration).

---

## Architecture

- **Frontend:** Next.js 14.2 (App Router), React 18, TypeScript, Tailwind CSS, TanStack Query v5, Radix UI accessible primitives.
- **Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 (async) + Alembic.
- **Database:** PostgreSQL 16 (production container) with fallback to asynchronous SQLite (`sqlite+aiosqlite`) for local development.
- **Private Storage:** Storage service abstraction supporting local filesystem storage in development and S3-compatible cloud storage (AWS S3, MinIO, Cloudflare R2) in production.
- **LLM Gateway:** Resilient multi-provider gateway with bounded retries, exponential backoff, and graceful fallback to deterministic parsing.
- **Quality Gates:** 
  - Backend: 77 comprehensive `pytest` integration and security tests.
  - Frontend: 36 `Vitest` unit tests with automated >= 70% coverage enforcement.
  - E2E: 9 `Playwright` specs including automated Axe-core WCAG 2.1 AA accessibility scans.

---

## Quickstart

### 1. Database (Optional Docker Compose)
```bash
docker compose up -d postgres
```
*(If Docker is not running locally, the backend automatically uses async SQLite with zero configuration).*

### 2. Backend Setup

**POSIX (Linux / macOS / WSL):**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
pytest -v
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Windows PowerShell:**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp ..\.env.example .env
pytest -v
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Key backend endpoints:
- Health check: `GET http://127.0.0.1:8000/health`
- Capability registry: `GET http://127.0.0.1:8000/api/integrations/capabilities`
- Interactive OpenAPI docs: `GET http://127.0.0.1:8000/docs`

### 3. Frontend Setup

**POSIX / Windows:**
```bash
cd frontend
npm install
npm run test:coverage   # Vitest unit tests (enforces >= 70% coverage gate)
npm run build           # Next.js production build verification
npm run dev             # Start development server at http://localhost:3000
npm run test:e2e        # Run Playwright E2E and Axe-core accessibility suite
```

---

## Production Deployment

### Option A: Docker Compose (VPS, EC2, DigitalOcean)

Deploy PostgreSQL 16, the FastAPI backend, and the Next.js frontend with a single command:

1. Clone repository on your production host:
   ```bash
   git clone https://github.com/vilaschannannavar/CareereConnectAI.git
   cd CareereConnectAI
   ```
2. Create production `.env` from template:
   ```bash
   cp .env.example .env
   ```
3. Generate cryptographically strong keys:
   ```bash
   # Generate SECRET_KEY:
   python -c "import secrets; print(secrets.token_hex(32))"

   # Generate ENCRYPTION_KEY:
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```
4. Set production configuration in `.env`:
   - `ENVIRONMENT=production`
   - `SECURE_COOKIES=true`
   - `FRONTEND_URL=https://your-domain.com`
   - `SECRET_KEY=<generated-hex-key>`
   - `ENCRYPTION_KEY=<generated-fernet-key>`
   - `STORAGE_BACKEND=s3` (with `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
5. Start services:
   ```bash
   docker compose up -d --build
   ```

### Option B: Cloud PaaS (Render Blueprint)

1. Connect repository in Render Dashboard.
2. Select **New +** -> **Blueprint**.
3. Render automatically provisions PostgreSQL, FastAPI with persistent disk, and Next.js frontend based on `render.yaml`.
4. Configure production secrets (`GEMINI_API_KEY`, encryption keys, S3 storage credentials) in Render environment variables.

### Option C: Vercel (Frontend) + Render / Railway (Backend)

- Deploy `frontend/` to Vercel:
  - Set `BACKEND_INTERNAL_URL=https://your-backend-api.onrender.com`
- Deploy `backend/` to Render/Railway:
  - Set `FRONTEND_URL=https://your-app.vercel.app`
  - Set `SECURE_COOKIES=true`
  - Set `DATABASE_URL` (database schema migrations run automatically on startup via `entrypoint.sh`).
