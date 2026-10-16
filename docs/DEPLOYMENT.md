# CareerConnect AI — Production Deployment & Configuration Guide

**Document Version:** 1.0  
**Updated:** 2026-10-13  
**Target Environments:** Local Docker Compose, Single-Host Virtual Machine (Ubuntu 22.04 LTS), Cloud Containers (AWS ECS / GCP Cloud Run / Kubernetes)

---

## 1. Architecture & Container Topology

```
                         [ Public Internet ]
                                 │
                   (HTTPS :443 / TLS Termination)
                                 ▼
                     ┌───────────────────────┐
                     │ Reverse Proxy / Nginx │
                     └───────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
       ┌───────────────────┐           ┌───────────────────┐
       │   Frontend Web    │           │  FastAPI Backend  │
       │ Next.js (Node 20) │           │   (Python 3.12)   │
       │    Port :3000     │           │    Port :8000     │
       └───────────────────┘           └─────────┬─────────┘
                                                 │
                               ┌─────────────────┴─────────────────┐
                               │                                   │
                               ▼                                   ▼
                     ┌───────────────────┐               ┌───────────────────┐
                     │   PostgreSQL 16   │               │  Private Storage  │
                     │  (Row-Level Sec)  │               │ (Sandboxed Disk   │
                     │    Port :5432     │               │   or S3 Bucket)   │
                     └───────────────────┘               └───────────────────┘
```

---

## 2. Environment Variables Reference

All environment variables can be provided via a `.env` file or native container environment injection.

### A. Core Application & Server
| Variable | Type | Default | Description & Production Value |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | string | `development` | Environment mode (`production`, `staging`, `development`). In production, error stack traces are suppressed. |
| `LOG_LEVEL` | string | `INFO` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `APP_NAME` | string | `CareerConnect AI` | System branding used in emails and health check endpoints. |
| `BACKEND_HOST` | string | `0.0.0.0` | Bind host for the FastAPI application. |
| `BACKEND_PORT` | integer | `8000` | Bind port for FastAPI. |
| `FRONTEND_URL` | string | `http://localhost:3000` | Full canonical URL of frontend application. Used for CORS allowlist and cookie origin validation. |

### B. Security, Cryptography & Sessions
| Variable | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `SECRET_KEY` | string | **YES** | 32+ character random string used for HMAC signing, CSRF tokens, and session integrity. Generate with: `python -c "import secrets; print(secrets.token_hex(32))"`. |
| `ENCRYPTION_KEY` | string | **YES** | 32-byte URL-safe base64-encoded Fernet key for encrypting OAuth tokens and secrets at rest. Generate with: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. |
| `SESSION_COOKIE_NAME` | string | No (`careerconnect_session`) | Name of the httpOnly session cookie. |
| `SESSION_MAX_AGE_SECONDS` | integer | No (`604800` = 7 days) | Session TTL in seconds. |
| `SECURE_COOKIES` | boolean | **YES in Prod (`true`)** | When `true`, enforces `Secure` flag on session cookies, requiring HTTPS transmission. |
| `SAME_SITE_COOKIE` | string | No (`lax`) | SameSite attribute (`lax` recommended for top-level navigation). |

### C. Database & Migrations
| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | string | **Required** | Async PostgreSQL connection string: `postgresql+asyncpg://user:password@host:5432/dbname`. |
| `POSTGRES_USER` | string | `careerconnect` | Database user for Docker Compose. |
| `POSTGRES_PASSWORD` | string | `careerconnect_dev_password` | Database password for Docker Compose. Change in production! |
| `POSTGRES_DB` | string | `careerconnect_prod` | Database name. |

### D. Private Storage
| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `STORAGE_BACKEND` | string | `local` | `local` for sandboxed directory on persistent disk, or `s3` for S3-compatible object storage. |
| `LOCAL_STORAGE_PATH` | string | `/app/data/private_storage` | Local absolute path for private resume storage. Mounted as a volume in Docker. |
| `S3_BUCKET_NAME` | string | `None` | S3 bucket name if using cloud storage backend. |
| `S3_REGION` | string | `None` | AWS / S3 region (e.g. `us-east-1`). |
| `S3_ACCESS_KEY_ID` | string | `None` | IAM Access Key ID with scoped bucket permissions. |
| `S3_SECRET_ACCESS_KEY`| string | `None` | IAM Secret Access Key. |

### E. LLM & Cost Protection
| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `LLM_PROVIDER` | string | `gemini` | Configured provider: `gemini`, `openai`, or `mock`. |
| `GEMINI_API_KEY` | string | Optional | Google Gemini API key. If absent or placeholder, falls back safely to mock parser. |
| `LLM_MODEL_NAME` | string | `gemini-1.5-flash` | Model identifier. |
| `LLM_TEMPERATURE` | float | `0.3` | Decoding temperature (low temperature ensures deterministic factual extraction). |
| `LLM_USER_BUDGET_CAP_USD` | float | `1.00` | Configurable per-user spending cap in USD. Halts LLM calls with HTTP 429 when exhausted. |

### F. Optional LinkedIn OIDC Sign-In
| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `LINKEDIN_CLIENT_ID` | string | Optional | OAuth Client ID from LinkedIn Developer Portal. |
| `LINKEDIN_CLIENT_SECRET` | string | Optional | OAuth Client Secret. Encrypted at rest. |
| `LINKEDIN_REDIRECT_URI` | string | `https://yourdomain.com/api/v1/auth/linkedin/callback` | Authorized redirect URI. |

---

## 3. Database Migration & Storage Setup

### Running Alembic Migrations
When starting a new deployment or updating database schemas, run Alembic migrations from inside the backend container or CI/CD deployment pipeline:

```bash
# From within the backend directory or container:
alembic upgrade head
```

This applies all 4 versioned migrations:
1. `0001_initial`: Base UUID extensions and session tables.
2. `0002_core_models_and_rls`: Core models (`users`, `resumes`, `contacts`, etc.) and PostgreSQL Row-Level Security policies.
3. `0003_phase4_scoring_and_shortlists`: Scoring analyses, shortlists, and shortlist items with RLS.
4. `0004_phase5_messaging_state_machine`: Outreach draft columns, state machine statuses, and follow-up tracking.

### Row-Level Security (RLS) Verification
In production PostgreSQL, verify that RLS is active:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```
All tenant tables should report `rowsecurity = true`.

---

## 4. HTTPS, Cookie Hardening & Reverse Proxy

In production, all HTTP traffic must terminate at a reverse proxy (e.g. Nginx, Caddy, or Cloudflare) enforcing TLS 1.3 and forwarding client IP headers.

### Sample Nginx Configuration (`/etc/nginx/sites-available/careerconnect.conf`)
```nginx
server {
    listen 80;
    server_name careerconnect.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name careerconnect.example.com;

    ssl_certificate /etc/letsencrypt/live/careerconnect.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/careerconnect.example.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';" always;

    # Backend API routes
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M; # Accommodates 5MB resume uploads
    }

    # Frontend Next.js routes
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 5. Step-by-Step Deploy Guide

### Option 1: Quick Deployment with Docker Compose
1. Clone the repository to your host:
   ```bash
   git clone https://github.com/your-org/careerconnect-ai.git /opt/careerconnect
   cd /opt/careerconnect
   ```
2. Create production `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env and supply production SECRET_KEY, ENCRYPTION_KEY, GEMINI_API_KEY, and SECURE_COOKIES=true
   nano .env
   ```
3. Build and launch all services:
   ```bash
   docker compose up -d --build
   ```
4. Run migrations inside backend container:
   ```bash
   docker compose exec backend alembic upgrade head
   ```
5. Confirm services are healthy:
   ```bash
   docker compose ps
   curl http://localhost:8000/health
   ```

---

## 6. LinkedIn Developer App Setup Guide

To enable optional "Sign In with LinkedIn using OpenID Connect":

1. Navigate to the **LinkedIn Developer Portal** at [linkedin.com/developers](https://www.linkedin.com/developers/) and log in.
2. Click **Create App**:
   - **App Name**: CareerConnect AI
   - **LinkedIn Page**: Associate with your verified company or university page.
   - **Privacy Policy URL**: `https://yourdomain.com/privacy`
   - Upload app logo and submit.
3. In the **Products** tab of your app:
   - Select **Sign In with LinkedIn using OpenID Connect** and click **Request Access**.
   - Review and accept the terms. This product is self-serve and is instantly approved.
4. In the **Auth** tab:
   - Copy the **Client ID** and **Client Secret**.
   - Under **Authorized redirect URLs for your app**, add:
     ```
     https://yourdomain.com/api/v1/auth/linkedin/callback
     ```
     *(For local development: `http://localhost:8000/api/v1/auth/linkedin/callback`)*
5. Configure in CareerConnect AI `.env`:
   ```env
   LINKEDIN_CLIENT_ID=your_client_id_here
   LINKEDIN_CLIENT_SECRET=your_client_secret_here
   LINKEDIN_REDIRECT_URI=https://yourdomain.com/api/v1/auth/linkedin/callback
   ```
6. Restart the backend container. The "Sign in with LinkedIn" button on `/login` and the LinkedIn card on `/integrations` will automatically activate.
