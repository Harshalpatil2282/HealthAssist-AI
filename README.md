# HealthAssist — AI Healthcare Navigator for India

> Know your hospital. Know your cost. Before you go.

AI-powered healthcare navigation platform with hospital discovery, transparent cost estimation,
PMJAY eligibility checking, drug comparison, and multilingual support (8 Indian languages).

---

## 📁 Monorepo Structure

```
HealthMaster-AI/
├── client/          → React 19 + Vite frontend (HealthAssist UI)
└── server/          → FastAPI backend (REST API + NLP + Cost Engine)
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (for client)
- **Python** 3.11+ (for server)
- **Docker + Docker Compose** (optional, for full stack)

---

### Option A — Run Frontend Only (Mock Data)

```bash
cd client
npm install
npm run dev
```
Frontend opens at **http://localhost:5173**

---

### Option B — Run Backend Only (API)

```bash
cd server

# 1. Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
# Edit .env and add your API keys

# 4. Run with SQLite (no PostgreSQL needed for dev)
# In .env: set USE_SQLITE=true

# 5. Start server
uvicorn app.main:app --reload --port 8000
```
API available at **http://localhost:8000**
Interactive docs at **http://localhost:8000/docs**

---

### Option C — Full Stack (Frontend + Backend)

**Terminal 1 — Backend:**
```bash
cd server
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # add USE_SQLITE=true for quick start
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm install
npm run dev
```

Frontend at `http://localhost:5173` → proxies `/api/*` → `http://localhost:8000`

---

### Option D — Docker Compose (Full Stack with PostgreSQL + Redis)

```bash
cd server
copy .env.example .env   # fill in real keys
docker compose up --build
```

Services started:
| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## 🔑 Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (PostgreSQL mode) | PostgreSQL connection string |
| `USE_SQLITE` | No | Set `true` for local dev without PostgreSQL |
| `OPENAI_API_KEY` | No* | GPT-4o for NLP intent extraction |
| `ANTHROPIC_API_KEY` | No* | Claude fallback |
| `GOOGLE_MAPS_API_KEY` | No | For geolocation features |
| `SECRET_KEY` | Yes | JWT signing key (change in production!) |

*Without LLM keys, the system falls back to rule-based ICD-10 extraction (still functional).

---

## 🌐 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/search` | POST | Main search (NLP → hospitals + cost) |
| `/api/v1/hospitals` | GET | List hospitals with filters |
| `/api/v1/hospitals/{id}` | GET | Hospital detail |
| `/api/v1/cost-estimate` | POST | Component-level cost estimate |
| `/api/v1/pmjay-check` | POST | PMJAY eligibility check |
| `/api/v1/drugs/compare` | GET | Brand vs generic drug comparison |
| `/api/v1/triage` | POST | Symptom urgency triage |

Full interactive docs: **http://localhost:8000/docs**

---

## 🧪 Running Tests

```bash
cd server
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt

# Run all tests with coverage
pytest tests/ -v

# Run specific test files
pytest tests/test_emergency.py -v
pytest tests/test_cost.py -v
pytest tests/test_security.py -v
pytest tests/test_pmjay.py -v
pytest tests/test_search.py -v
```

**Coverage target: > 80%**

---

## 🗄️ Database Migrations (Alembic)

```bash
cd server

# Create a new migration
alembic revision --autogenerate -m "add_hospitals_table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## 🏗️ Architecture

```
CLIENT (React + Vite @ :5173)
        │  /api/* proxy
        ▼
API Gateway (FastAPI @ :8000)
        │
   ┌────┴──────────────────────────┐
   │                               │
   ▼                               ▼
NLP Intent Engine          Core Business Logic
(LLM + ICD-10 Mapper)     (Scoring + Cost Engine)
   │                               │
   ▼                               ▼
Emergency Detector         Provider Ranking Engine
(Multilingual Keywords)   (4-signal weighted score)
                                   │
                          Cost Estimation Engine
                          (5-component + geo + risk)
                                   │
                     PostgreSQL + Redis (cache)
```

---

## 🛡️ Responsible AI Guardrails

- **No diagnosis**: System maps to procedures, never diagnoses conditions
- **Cost disclaimer**: Mandatory disclaimer on every cost estimate response
- **Emergency first**: Red-flag keyword detection runs before any LLM call
- **Multilingual emergency**: Detects emergencies in EN, HI, MR, TA, TE
- **PMJAY disclaimer**: Indicative only — always redirects to pmjay.gov.in
- **Rate limiting**: 10 requests/minute per IP on all AI endpoints
- **Input sanitization**: Strips prompt injection characters on all inputs
- **No PII storage**: Health queries stored as anonymized session hashes only

---

## 📋 Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | React frontend with mock data |
| Phase 2 | ✅ Complete | FastAPI backend, cost engine, PMJAY, drug compare |
| Phase 3 | 🔜 Planned | LLM NLP integration, multi-language, ranking ML |
| Phase 4 | 🔜 Planned | Telemedicine, drug loans, ASHA worker portal |

---
<img width="1366" height="603" alt="image" src="https://github.com/user-attachments/assets/d42221cd-2422-4dd1-a801-6860463e10f7" />
<img width="1361" height="607" alt="image" src="https://github.com/user-attachments/assets/d875c26f-f284-4b2a-95c6-206d97e44913" />


## 📄 License

MIT License — HealthAssist 2026
