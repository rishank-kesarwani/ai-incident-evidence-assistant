# AI Incident Evidence & Runbook Assistant

[![CI Tests](https://img.shields.io/badge/tests-26%20passed-brightgreen.svg)]()
[![Backend](https://img.shields.io/badge/backend-NestJS%2011-ea284e.svg)]()
[![Frontend](https://img.shields.io/badge/frontend-Next.js%2014-000000.svg)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.8-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

> **Production-grade AI-assisted incident investigation platform** that correlates sanitized logs, distributed traces, deployment events, and runbooks into evidence-linked timelines and operator-approved remediation plans.

---

## Table of Contents
1. [Overview & Architecture](#1-overview--architecture)
2. [Key Features](#2-key-features)
3. [Security, Redaction & Approval Boundaries](#3-security-redaction--approval-boundaries)
4. [Public Access Flag (`PUBLIC_ACCESS_ENABLE`)](#4-public-access-flag-public_access_enable)
5. [Shared Services Integration](#5-shared-services-integration)
6. [Persistence Strategy](#6-persistence-strategy)
7. [Local Quickstart & Setup](#7-local-quickstart--setup)
8. [Environment Variables](#8-environment-variables)
9. [API Documentation](#9-api-documentation)
10. [Testing & Quality Gates](#10-testing--quality-gates)
11. [Deployment Guides](#11-deployment-guides)
    - [Backend on Render](#backend-on-render)
    - [Frontend on Vercel](#frontend-on-vercel)
12. [Deployment Smoke-Test Checklist](#12-deployment-smoke-test-checklist)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview & Architecture

Modern SRE teams face cognitive overload during high-severity production outages. Fragmented dashboards, high-volume logs, distributed traces, and scattered runbooks lead to slow MTTR (Mean Time to Resolution) and risky ad-hoc remediation.

**AI Incident Evidence & Runbook Assistant** solves this by enforcing a disciplined investigation cycle:
1. **Ingest & Sanitize:** Captures application logs, OpenTelemetry traces, CI/CD deployments, and runbooks while stripping passwords, API keys, tokens, and PII prior to persistence or external AI calls.
2. **Correlate:** Builds an interactive chronological timeline linking observed metric anomalies to deployment events.
3. **Hypothesize:** Generates hypotheses with clear separation between **Observable Facts** and **AI Interpretation**.
4. **Diagnose:** Produces safe read-only PromQL, LogQL, SQL, and kubectl queries.
5. **Remediate:** Suggests risk-classified remediation plans with **mandatory rollback procedures**.
6. **Approval Gate:** Strictly blocks autonomous production changes; requires explicit operator review, approval notes, and dry-run verification before simulated execution.

```
                           +-------------------------------------+
                           |   Next.js 14 SRE Console (Vercel)   |
                           |   Vanilla CSS / Dark Mode Tokens    |
                           +------------------+------------------+
                                              | HTTPS / JWT
                                              v
                           +-------------------------------------+
                           |    NestJS 11 Backend API (Render)   |
                           |  PublicAccessGuard / Sanitizer Util |
                           +---------+-----------------+---------+
                                     |                 |
                   +-----------------+                 +------------------+
                   |                                                      |
                   v                                                      v
     +--------------------------+                           +--------------------------+
     |   Persistence Layer      |                           |    Shared Adapters       |
     | - MongoDB via Mongoose   |                           | - AI Platform Adapter    |
     | - In-Memory ACID fallback|                           | - Notification Adapter   |
     | - Redis Timeline Cache   |                           | - Redis Cache Client     |
     +--------------------------+                           +--------------------------+
```

---

## 2. Key Features

- **Chronological Incident Timeline:** Automatically links logs, traces, and deployments to identify incident onset.
- **Evidence-Linked Hypotheses:** Transparently distinguishes ground-truth telemetry from probabilistic AI inferences.
- **Safe Read-Only Diagnostic Queries:** Auto-generates executable queries for Prometheus, Loki, Postgres, and Kubernetes with expected output benchmarks.
- **Runbook Recommendations:** Matches operator-authored playbooks against incident error signatures.
- **Risk-Classified Remediation with Rollbacks:** Every remediation plan includes risk levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), expected impact, prerequisites checklist, execution steps, and emergency rollback instructions.
- **Operator Approval Gate:** Default recommendation-only mode. Never executes arbitrary shell commands or production mutations autonomously.
- **Compliance Audit Ledger:** Immutable audit trail logging who approved, rejected, or simulated remediation actions with cryptographic SHA-256 tokens.
- **Realistic Synthetic Demo Mode:** 1-click loading of realistic multi-stage production scenarios (`[SYNTHETIC]` markers) with zero production impact.

---

## 3. Security, Redaction & Approval Boundaries

### Evidence Sanitization Engine (`EvidenceSanitizer`)
All data ingested via API or UI passes through the regex and pattern-matching sanitizer before being stored in the database or transmitted to external AI endpoints:
- **Database Connection Strings:** Strips embedded credentials (`postgres://user:pass@host` -> `postgres://[REDACTED_USER]:[REDACTED_PASS]@host`).
- **Authorization & Tokens:** Masks JWT Bearer tokens, Slack tokens, AWS access keys (`AKIA...`), GitHub PATs (`ghp_...`), and API keys.
- **PII:** Masks public IP addresses, email addresses, and credit card numbers.
- **Audit Metrics:** Ingestion responses return `tokensRedacted` and `patternsDetected` metadata.

### Recommendation-Only Safety Boundary
- Autonomous execution of shell commands is strictly prohibited.
- Remediation plans default to `PENDING_APPROVAL`.
- Approvals require operator authentication and explicit verification notes.
- Simulated dry-run execution generates cryptographic execution tokens and validates pre-flight safeguards without touching live infrastructure.

---

## 4. Public Access Flag (`PUBLIC_ACCESS_ENABLE`)

`PUBLIC_ACCESS_ENABLE` is a server-enforced security flag parsed at startup:

| `PUBLIC_ACCESS_ENABLE` | Behavior |
| :--- | :--- |
| **`false` (Default)** | All protected endpoints require a valid `Authorization: Bearer <JWT>` token or service-to-service `x-api-key`. Unauthenticated requests return `401 Unauthorized`. |
| **`true`** | Unauthenticated users can view the dashboard, browse public/demo incidents, and inspect synthetic timelines (`PUBLIC_VIEWER` role). **Destructive operations (incident deletion, remediation approval, simulation execution) remain strictly protected** and return `403 Forbidden` unless authenticated as an `OPERATOR` or `ADMIN`. |

---

## 5. Shared Services Integration

The backend connects to external platform microservices using typed adapters with automatic graceful degradation:

### 1. Shared AI Platform
- **Verified Endpoint:** `POST ${AI_PLATFORM_URL}/api/v1/ai/chat`
- **Authentication:** `x-api-key: ${AI_PLATFORM_API_KEY}`
- **Fallback Behavior:** If `AI_PLATFORM_API_KEY` is omitted or the service is unreachable, the adapter activates the built-in deterministic correlation engine, returning `provider: 'local-correlation-engine'` without throwing errors or falsely claiming external connectivity.

### 2. Notification Service
- **Verified Endpoint:** `POST ${NOTIFICATION_SERVICE_URL}/v1/notifications`
- **Authentication:** `x-api-key: ${NOTIFICATION_SERVICE_API_KEY}`
- **Channel:** Dispatches critical P1/P2 email alerts to `ALERT_EMAIL_RECIPIENT`.
- **Fallback Behavior:** If unconfigured, alerts are routed to internal structured logs (`simulated-logger`).

### 3. Redis Cache
- **Connection:** `REDIS_URL`
- **Usage:** Caches timeline queries, deduplicates logs, and rate-limits requests.
- **Fallback Behavior:** Gracefully falls back to high-speed in-memory TTL caching if Redis is omitted or disconnected.

---

## 6. Persistence Strategy

- **Production Strategy (MongoDB):** When `MONGODB_URI` is provided, the backend connects via Mongoose to store incidents, evidence items, timeline events, remediation proposals, and audit records with compound indexes and timestamps.
- **Local Dev & Testing Strategy (In-Memory Repository):** When `MONGODB_URI` is omitted (e.g. running unit tests or local preview), the backend initializes a synchronized in-memory repository implementing identical CRUD, indexing, and search capabilities.
- **Zero Local Filesystem Storage:** Ephemeral local file storage is never used for production state.

---

## 7. Local Quickstart & Setup

### Prerequisites
- Node.js `>= 18.x` (tested on Node 22.x)
- npm `>= 9.x`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/rishank-kesarwani/ai-incident-evidence-assistant.git
cd ai-incident-evidence-assistant

# Install root, backend, and frontend dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(Default settings in `.env.example` allow instant local startup with in-memory persistence and demo mode).*

### 3. Start Development Servers
```bash
# Start backend (Port 4000)
npm run start:backend

# Start frontend in a separate terminal (Port 3000)
npm run start:frontend
```

Open `http://localhost:3000` in your browser. Default operator credentials:
- **Operator Handle:** `operator`
- **Password:** `operator123!`

---

## 8. Environment Variables

| Variable | Description | Default / Example | Required |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` | No |
| `PORT` | Backend listening port | `4000` | No |
| `API_PREFIX` | Global API route prefix | `api/v1` | No |
| `PUBLIC_ACCESS_ENABLE` | Enable unauthenticated read-only guest inspection | `false` | No |
| `JWT_SECRET` | Secret key for signing operator session JWTs | *(Generated)* | Yes in Prod |
| `OPERATOR_ADMIN_PASSWORD` | Password for operator authentication | `operator123!` | Yes in Prod |
| `SERVICE_API_KEY` | Key for server-to-server API integrations | *(Generated)* | Yes in Prod |
| `MONGODB_URI` | MongoDB connection string (falls back to memory store) | `mongodb://...` | Optional |
| `REDIS_URL` | Redis URL for caching and deduplication | `redis://localhost:6379` | Optional |
| `AI_PLATFORM_URL` | Base URL for Shared AI Platform | `https://ai-platform.onrender.com` | Optional |
| `AI_PLATFORM_API_KEY` | Service API key for AI Platform | *(Secret)* | Optional |
| `NOTIFICATION_SERVICE_URL` | Base URL for Shared Notification Service | `https://notification-service.onrender.com` | Optional |
| `NOTIFICATION_SERVICE_API_KEY`| Service API key for Notification Service | *(Secret)* | Optional |
| `ALERT_EMAIL_RECIPIENT` | On-call email recipient for incident alerts | `sre-oncall@example.com` | Optional |
| `NEXT_PUBLIC_API_URL` | Backend URL consumed by Next.js frontend | `http://localhost:4000/api/v1` | Yes |

---

## 9. API Documentation

OpenAPI Swagger UI is available at `http://localhost:4000/docs`.

### Core Endpoints

#### Health
- `GET /health` — Application readiness, database mode, and integration status.
- `GET /health/live` — Kubernetes liveness probe.
- `GET /health/ready` — Kubernetes readiness probe.

#### Authentication
- `POST /api/v1/auth/login` — Authenticate operator and receive JWT token.
- `GET /api/v1/auth/status` — Inspect public access flag and auth requirements.
- `GET /api/v1/auth/me` — Retrieve active operator profile.

#### Incidents
- `GET /api/v1/incidents` — List and filter incidents (`severity`, `status`, `service`, `search`).
- `POST /api/v1/incidents` — Declare a new incident (dispatches alert on P1/P2).
- `GET /api/v1/incidents/:id` — Get full incident metadata.
- `PATCH /api/v1/incidents/:id` — Update incident status or triage notes.
- `DELETE /api/v1/incidents/:id` — Delete incident (Operator role required).

#### Evidence Ingestion (Auto-Sanitized)
- `POST /api/v1/incidents/:id/evidence/log` — Ingest raw error logs.
- `POST /api/v1/incidents/:id/evidence/trace` — Ingest distributed trace spans.
- `POST /api/v1/incidents/:id/evidence/deployment` — Ingest CI/CD release events.
- `POST /api/v1/incidents/:id/evidence/runbook` — Ingest Markdown runbook documentation.
- `GET /api/v1/incidents/:id/evidence` — Retrieve all sanitized evidence for an incident.

#### Timeline & Correlation
- `GET /api/v1/incidents/:id/timeline` — Correlated chronological incident timeline.
- `POST /api/v1/incidents/:id/timeline` — Manually append an event node.

#### AI Analysis & Remediation
- `POST /api/v1/incidents/:id/analyze` — Trigger evidence correlation, hypotheses, and diagnostic queries.
- `GET /api/v1/incidents/:id/remediations` — List reviewable remediation proposals.
- `POST /api/v1/remediations/:id/approve` — Operator approval gate (Operator role required).
- `POST /api/v1/remediations/:id/reject` — Operator rejection gate (Operator role required).
- `POST /api/v1/remediations/:id/execute-simulation` — Dry-run simulation of approved plan.

#### Audit Trail
- `GET /api/v1/audit` — List compliance ledger records.

#### Demo Seed
- `POST /api/v1/demo/seed` — Seed realistic multi-stage synthetic incidents.

---

## 10. Testing & Quality Gates

Run the verified test suites:

```bash
# Run all backend unit & integration tests
npm run test:backend

# Run frontend tests
npm run test:frontend

# Run full test suite
npm test

# Run ESLint across backend and frontend
npm run lint

# Verify production builds
npm run build
```

### Verified Test Coverage
- `sanitizer.util.spec.ts`: Redaction of database passwords, AWS keys, GitHub tokens, Slack tokens, JWTs, IPs, and cards.
- `public-access.guard.spec.ts`: Authorization verification under `PUBLIC_ACCESS_ENABLE=false`, `PUBLIC_ACCESS_ENABLE=true`, service API key validation, and blocking unauthenticated mutations.
- `incidents.service.spec.ts`: Incident lifecycle, filtering, and P1/P2 alert dispatching.
- `evidence.service.spec.ts`: Evidence ingestion, automated sanitization, and timeline event linking.
- `remediation.service.spec.ts`: Approval gates, unauthorized blocking, unapproved execution blocking, and dry-run execution tokens.
- `ai-platform.adapter.spec.ts`: External AI Platform integration and deterministic local correlation fallback.
- `api.spec.ts`: Frontend API client and authorization headers.

---

## 11. Deployment Guides

### Backend on Render
The repository includes a verified `render.yaml` blueprint.

1. Create a **Web Service** on Render connected to this repository.
2. Configure settings:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Health Check Path:** `/health`
3. Configure Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `4000` (Render binds automatically)
   - `PUBLIC_ACCESS_ENABLE`: `false` (or `true` for public preview)
   - `JWT_SECRET`: Secure random 32+ character string
   - `OPERATOR_ADMIN_PASSWORD`: Strong operator password
   - `SERVICE_API_KEY`: Service-to-service key
   - `MONGODB_URI`: Connection string to MongoDB Atlas / Render MongoDB
   - `REDIS_URL`: (Optional) Redis connection URL

### Frontend on Vercel
1. Import repository into Vercel.
2. Configure Project Settings:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
3. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://<your-render-backend-url>/api/v1`

---

## 12. Deployment Smoke-Test Checklist

After deploying, verify the following checks:
- [ ] `GET /health` returns HTTP 200 with `status: "UP"` and sanitized database/redis mode.
- [ ] `GET /api/v1/auth/status` returns accurate `publicAccessEnabled` status.
- [ ] Unauthenticated requests to `/api/v1/incidents` are blocked with 401 when `PUBLIC_ACCESS_ENABLE=false`.
- [ ] `POST /api/v1/auth/login` successfully issues a JWT token.
- [ ] `POST /api/v1/demo/seed` seeds synthetic demo incidents without errors.
- [ ] `POST /api/v1/incidents/:id/evidence/log` redacts credentials before storing.
- [ ] Remediation proposals cannot be executed without prior operator approval.
- [ ] Approvals and simulations generate entries in `/api/v1/audit`.
- [ ] Frontend mobile layout renders correctly on 375px and 768px viewports without horizontal scroll.

---

## 13. Troubleshooting

| Symptom | Cause | Resolution |
| :--- | :--- | :--- |
| `401 Unauthorized` on all endpoints | `PUBLIC_ACCESS_ENABLE=false` and no token provided | Log in via `/login` to obtain an operator token or set `PUBLIC_ACCESS_ENABLE=true`. |
| `403 Forbidden` on remediation approval | Attempted approval while unauthenticated or in public viewer mode | Sign in with an operator account (`OPERATOR` role). Public viewer mode is read-only. |
| AI Platform returns local fallback results | `AI_PLATFORM_API_KEY` is not set or network blocked | The application automatically uses its local deterministic correlation engine. Set `AI_PLATFORM_API_KEY` to connect to the live Railway AI Platform. |
| Port 4000 conflict during local start | Another service is using port 4000 | Set `PORT=4001` in `.env` and update `NEXT_PUBLIC_API_URL=http://localhost:4001/api/v1`. |

---

## License
MIT © 2026 Rishank Kesarwani
